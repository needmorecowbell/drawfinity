use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};

use crate::room::RoomManager;

/// Maximum allowed size for a single WebSocket binary message (1 MiB).
const MAX_MESSAGE_SIZE: usize = 1024 * 1024;

/// Yjs sync protocol message type constants.
/// See: https://github.com/yjs/y-protocols/blob/master/sync.js
const YJS_MSG_SYNC_STEP1: u8 = 0;
const YJS_MSG_SYNC_STEP2: u8 = 1;
const YJS_MSG_SYNC_UPDATE: u8 = 2;

/// Validates that a binary message conforms to the Yjs sync protocol.
///
/// At minimum, the message must:
/// - Be non-empty
/// - Not exceed `MAX_MESSAGE_SIZE`
/// - Start with a valid Yjs message type byte (0, 1, or 2)
fn is_valid_yjs_message(data: &[u8]) -> bool {
    if data.is_empty() || data.len() > MAX_MESSAGE_SIZE {
        return false;
    }
    matches!(
        data[0],
        YJS_MSG_SYNC_STEP1 | YJS_MSG_SYNC_STEP2 | YJS_MSG_SYNC_UPDATE
    )
}

/// WebSocket upgrade handler at `/ws/{room_id}`.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<String>,
    State(room_manager): State<Arc<RoomManager>>,
) -> impl IntoResponse {
    tracing::info!(room_id = %room_id, "WebSocket upgrade request");
    ws.on_upgrade(move |socket| handle_socket(socket, room_id, room_manager))
}

async fn handle_socket(socket: WebSocket, room_id: String, room_manager: Arc<RoomManager>) {
    let (tx, initial_state) = room_manager.join_room(&room_id).await;
    let mut rx = tx.subscribe();

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Send the current document state as the first message
    if !initial_state.is_empty() {
        if ws_sender
            .send(Message::Binary(initial_state.into()))
            .await
            .is_err()
        {
            room_manager.leave_room(&room_id).await;
            return;
        }
    }

    // Spawn a task to forward broadcast messages to this client's WebSocket
    let forward_room_id = room_id.clone();
    let forward_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if ws_sender.send(Message::Binary(msg.into())).await.is_err() {
                break;
            }
        }
        let _ = forward_room_id; // keep for logging if needed
    });

    // Read messages from the client and broadcast to the room
    let broadcast_room_id = room_id.clone();
    let broadcast_rm = Arc::clone(&room_manager);
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Binary(data) => {
                let bytes: Vec<u8> = data.into();
                if !is_valid_yjs_message(&bytes) {
                    tracing::warn!(
                        room_id = %broadcast_room_id,
                        len = bytes.len(),
                        first_byte = bytes.first().copied().unwrap_or(0),
                        "Rejected invalid WebSocket binary message"
                    );
                    continue;
                }
                // Accumulate state: append the update to the room's doc state
                broadcast_rm
                    .update_doc_state(&broadcast_room_id, bytes.clone())
                    .await;
                // Broadcast to all other clients (they filter their own messages via broadcast)
                let _ = tx.send(bytes);
            }
            Message::Close(_) => break,
            _ => {} // Ignore text/ping/pong
        }
    }

    // Clean up
    forward_task.abort();
    room_manager.leave_room(&room_id).await;
    tracing::info!(room_id = %room_id, "Client disconnected");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_sync_step1() {
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_STEP1, 1, 2, 3]));
    }

    #[test]
    fn test_valid_sync_step2() {
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_STEP2, 10, 20]));
    }

    #[test]
    fn test_valid_sync_update() {
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_UPDATE, 0xFF]));
    }

    #[test]
    fn test_single_byte_valid() {
        // A single type byte with no payload is structurally valid at this level
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_STEP1]));
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_STEP2]));
        assert!(is_valid_yjs_message(&[YJS_MSG_SYNC_UPDATE]));
    }

    #[test]
    fn test_reject_empty_message() {
        assert!(!is_valid_yjs_message(&[]));
    }

    #[test]
    fn test_reject_invalid_type_byte() {
        assert!(!is_valid_yjs_message(&[3, 1, 2, 3]));
        assert!(!is_valid_yjs_message(&[0xFF, 0, 0]));
        assert!(!is_valid_yjs_message(&[42]));
    }

    #[test]
    fn test_reject_oversized_message() {
        let oversized = vec![YJS_MSG_SYNC_UPDATE; MAX_MESSAGE_SIZE + 1];
        assert!(!is_valid_yjs_message(&oversized));
    }

    #[test]
    fn test_accept_max_size_message() {
        let max = vec![YJS_MSG_SYNC_UPDATE; MAX_MESSAGE_SIZE];
        assert!(is_valid_yjs_message(&max));
    }
}
