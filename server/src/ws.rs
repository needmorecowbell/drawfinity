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

/// Top-level y-websocket transport message type constants.
/// See: https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js
const YWS_MSG_SYNC: u8 = 0;
const YWS_MSG_AWARENESS: u8 = 1;
const YWS_MSG_AUTH: u8 = 2;
const YWS_MSG_QUERY_AWARENESS: u8 = 3;

/// Validates that a binary message is a recognized y-websocket transport message.
///
/// The message must:
/// - Be non-empty
/// - Not exceed `MAX_MESSAGE_SIZE`
/// - Start with a valid y-websocket transport type byte (0–3)
fn is_valid_yws_message(data: &[u8]) -> bool {
    if data.is_empty() || data.len() > MAX_MESSAGE_SIZE {
        return false;
    }
    matches!(
        data[0],
        YWS_MSG_SYNC | YWS_MSG_AWARENESS | YWS_MSG_AUTH | YWS_MSG_QUERY_AWARENESS
    )
}

/// Yjs sync sub-protocol message types (byte[1] inside a messageSync envelope).
/// See: https://github.com/yjs/y-protocols/blob/master/sync.js
const YJS_SYNC_STEP2: u8 = 1; // full encoded document state

/// Returns true if the message should be persisted as document state.
///
/// Only `messageSyncStep2` (full encoded doc state) is safe to store by replacement.
/// `messageSyncStep1` (sub-type 0) is a state-vector query, and `messageYjsUpdate`
/// (sub-type 2) is an incremental delta — neither can be stored via full replacement
/// without corrupting the document for late-joining clients.
fn is_persistable_sync_message(data: &[u8]) -> bool {
    data.len() >= 2 && data[0] == YWS_MSG_SYNC && data[1] == YJS_SYNC_STEP2
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
                if !is_valid_yws_message(&bytes) {
                    tracing::warn!(
                        room_id = %broadcast_room_id,
                        len = bytes.len(),
                        first_byte = bytes.first().copied().unwrap_or(0),
                        "Rejected invalid WebSocket binary message"
                    );
                    continue;
                }
                // Only persist sync step2/update — step1 is a query, awareness/auth are ephemeral
                if is_persistable_sync_message(&bytes) {
                    // Strip y-websocket transport envelope (2 bytes: transport type + sync sub-type)
                    broadcast_rm
                        .apply_update(&broadcast_room_id, &bytes[2..])
                        .await;
                }
                // Broadcast all valid messages (including awareness) to peers
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
    fn test_valid_sync_message() {
        assert!(is_valid_yws_message(&[YWS_MSG_SYNC, 1, 2, 3]));
    }

    #[test]
    fn test_valid_awareness_message() {
        assert!(is_valid_yws_message(&[YWS_MSG_AWARENESS, 10, 20]));
    }

    #[test]
    fn test_valid_auth_message() {
        assert!(is_valid_yws_message(&[YWS_MSG_AUTH, 0xFF]));
    }

    #[test]
    fn test_valid_query_awareness_message() {
        assert!(is_valid_yws_message(&[YWS_MSG_QUERY_AWARENESS, 0]));
    }

    #[test]
    fn test_single_byte_valid() {
        assert!(is_valid_yws_message(&[YWS_MSG_SYNC]));
        assert!(is_valid_yws_message(&[YWS_MSG_AWARENESS]));
        assert!(is_valid_yws_message(&[YWS_MSG_AUTH]));
        assert!(is_valid_yws_message(&[YWS_MSG_QUERY_AWARENESS]));
    }

    #[test]
    fn test_reject_empty_message() {
        assert!(!is_valid_yws_message(&[]));
    }

    #[test]
    fn test_reject_invalid_type_byte() {
        assert!(!is_valid_yws_message(&[4, 1, 2, 3]));
        assert!(!is_valid_yws_message(&[0xFF, 0, 0]));
        assert!(!is_valid_yws_message(&[42]));
    }

    #[test]
    fn test_reject_oversized_message() {
        let oversized = vec![YWS_MSG_SYNC; MAX_MESSAGE_SIZE + 1];
        assert!(!is_valid_yws_message(&oversized));
    }

    #[test]
    fn test_accept_max_size_message() {
        let max = vec![YWS_MSG_SYNC; MAX_MESSAGE_SIZE];
        assert!(is_valid_yws_message(&max));
    }

    #[test]
    fn test_persistable_sync_step2() {
        assert!(is_persistable_sync_message(&[YWS_MSG_SYNC, YJS_SYNC_STEP2, 0xFF]));
    }

    #[test]
    fn test_reject_sync_update_from_persistence() {
        // YjsUpdate (sub-type 2) is an incremental delta — cannot be stored by replacement
        assert!(!is_persistable_sync_message(&[YWS_MSG_SYNC, 2, 0x01]));
    }

    #[test]
    fn test_reject_sync_step1_from_persistence() {
        // SyncStep1 (sub-type 0) is a state-vector query — must NOT be persisted
        assert!(!is_persistable_sync_message(&[YWS_MSG_SYNC, 0, 0x01]));
    }

    #[test]
    fn test_reject_non_sync_from_persistence() {
        assert!(!is_persistable_sync_message(&[YWS_MSG_AWARENESS, 0, 1]));
        assert!(!is_persistable_sync_message(&[YWS_MSG_AUTH, 0]));
        assert!(!is_persistable_sync_message(&[YWS_MSG_QUERY_AWARENESS, 0]));
    }

    #[test]
    fn test_reject_too_short_for_persistence() {
        // Need at least 2 bytes (transport type + sync sub-type)
        assert!(!is_persistable_sync_message(&[]));
        assert!(!is_persistable_sync_message(&[YWS_MSG_SYNC]));
    }
}
