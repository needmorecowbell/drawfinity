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
const YJS_UPDATE: u8 = 2; // incremental Yjs update

/// Returns true if the message carries a document update that should be applied
/// to the server-side Yjs doc.
///
/// Both `messageSyncStep2` (full state) and `messageYjsUpdate` (incremental delta)
/// are applied via `yrs::Doc::apply_update`, which handles merging correctly.
/// `messageSyncStep1` (sub-type 0) is a state-vector query and is not a doc update.
fn is_doc_update_message(data: &[u8]) -> bool {
    data.len() >= 2
        && data[0] == YWS_MSG_SYNC
        && (data[1] == YJS_SYNC_STEP2 || data[1] == YJS_UPDATE)
}

/// Read a lib0 var-uint from a byte slice, returning (value, bytes_consumed).
///
/// lib0 var-uint encoding uses the MSB as a continuation bit:
/// each byte contributes 7 bits of value; if bit 7 is set, read another byte.
fn read_var_uint(data: &[u8]) -> Option<(usize, usize)> {
    let mut value: usize = 0;
    let mut shift = 0;
    for (i, &byte) in data.iter().enumerate() {
        value |= ((byte & 0x7F) as usize) << shift;
        if byte & 0x80 == 0 {
            return Some((value, i + 1));
        }
        shift += 7;
        if shift > 35 {
            return None; // overflow protection
        }
    }
    None // ran out of bytes
}

/// Extract the raw Yjs update bytes from a y-protocols sync message.
///
/// After the 2-byte y-websocket envelope `[msgType, syncSubType]`, y-protocols
/// encodes the payload using lib0's `writeVarUint8Array`: a var-uint length prefix
/// followed by the raw bytes. This function strips both the envelope and the
/// length prefix, returning only the raw Yjs update bytes.
fn extract_yjs_payload(data: &[u8]) -> Option<&[u8]> {
    if data.len() < 3 {
        return None;
    }
    let after_envelope = &data[2..];
    let (len, consumed) = read_var_uint(after_envelope)?;
    let payload_start = consumed;
    let payload_end = payload_start + len;
    if payload_end > after_envelope.len() {
        return None;
    }
    Some(&after_envelope[payload_start..payload_end])
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
    if !initial_state.is_empty()
        && ws_sender
            .send(Message::Binary(initial_state))
            .await
            .is_err()
    {
        room_manager.leave_room(&room_id).await;
        return;
    }

    // Spawn a task to forward broadcast messages to this client's WebSocket
    let forward_room_id = room_id.clone();
    let forward_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if ws_sender.send(Message::Binary(msg)).await.is_err() {
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
                let bytes: Vec<u8> = data;
                if !is_valid_yws_message(&bytes) {
                    tracing::warn!(
                        room_id = %broadcast_room_id,
                        len = bytes.len(),
                        first_byte = bytes.first().copied().unwrap_or(0),
                        "Rejected invalid WebSocket binary message"
                    );
                    continue;
                }
                // Apply doc updates (SyncStep2 + YjsUpdate) — step1 is a query, awareness/auth are ephemeral
                if is_doc_update_message(&bytes) {
                    // Strip y-websocket envelope + lib0 var-uint length prefix to get raw Yjs bytes
                    if let Some(payload) = extract_yjs_payload(&bytes) {
                        broadcast_rm
                            .apply_update(&broadcast_room_id, payload)
                            .await;
                    } else {
                        tracing::warn!(
                            room_id = %broadcast_room_id,
                            len = bytes.len(),
                            "Failed to extract Yjs payload from sync message"
                        );
                    }
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
    fn test_doc_update_sync_step2() {
        assert!(is_doc_update_message(&[YWS_MSG_SYNC, YJS_SYNC_STEP2, 0xFF]));
    }

    #[test]
    fn test_doc_update_yjs_update() {
        // YjsUpdate (sub-type 2) is now applied via yrs merging
        assert!(is_doc_update_message(&[YWS_MSG_SYNC, YJS_UPDATE, 0x01]));
    }

    #[test]
    fn test_reject_sync_step1_from_doc_update() {
        // SyncStep1 (sub-type 0) is a state-vector query — not a doc update
        assert!(!is_doc_update_message(&[YWS_MSG_SYNC, 0, 0x01]));
    }

    #[test]
    fn test_reject_non_sync_from_doc_update() {
        assert!(!is_doc_update_message(&[YWS_MSG_AWARENESS, 0, 1]));
        assert!(!is_doc_update_message(&[YWS_MSG_AUTH, 0]));
        assert!(!is_doc_update_message(&[YWS_MSG_QUERY_AWARENESS, 0]));
    }

    #[test]
    fn test_reject_too_short_for_doc_update() {
        // Need at least 2 bytes (transport type + sync sub-type)
        assert!(!is_doc_update_message(&[]));
        assert!(!is_doc_update_message(&[YWS_MSG_SYNC]));
    }

    // --- read_var_uint tests ---

    #[test]
    fn test_read_var_uint_single_byte() {
        assert_eq!(read_var_uint(&[0]), Some((0, 1)));
        assert_eq!(read_var_uint(&[42]), Some((42, 1)));
        assert_eq!(read_var_uint(&[127]), Some((127, 1)));
    }

    #[test]
    fn test_read_var_uint_multi_byte() {
        // 128 = 0x80 → encoded as [0x80, 0x01] (continuation bit set on first byte)
        assert_eq!(read_var_uint(&[0x80, 0x01]), Some((128, 2)));
        // 300 = 0x12C → encoded as [0xAC, 0x02]
        assert_eq!(read_var_uint(&[0xAC, 0x02]), Some((300, 2)));
    }

    #[test]
    fn test_read_var_uint_empty() {
        assert_eq!(read_var_uint(&[]), None);
    }

    #[test]
    fn test_read_var_uint_truncated() {
        // Continuation bit set but no next byte
        assert_eq!(read_var_uint(&[0x80]), None);
    }

    // --- extract_yjs_payload tests ---

    #[test]
    fn test_extract_payload_simple() {
        // Envelope [0, 2] + var-uint length 3 + 3 bytes of payload
        let msg = vec![YWS_MSG_SYNC, YJS_UPDATE, 3, 0xAA, 0xBB, 0xCC];
        let payload = extract_yjs_payload(&msg).unwrap();
        assert_eq!(payload, &[0xAA, 0xBB, 0xCC]);
    }

    #[test]
    fn test_extract_payload_large_length() {
        // 128-byte payload → var-uint length [0x80, 0x01]
        let mut msg = vec![YWS_MSG_SYNC, YJS_SYNC_STEP2, 0x80, 0x01];
        msg.extend(vec![0xFF; 128]);
        let payload = extract_yjs_payload(&msg).unwrap();
        assert_eq!(payload.len(), 128);
        assert!(payload.iter().all(|&b| b == 0xFF));
    }

    #[test]
    fn test_extract_payload_too_short() {
        // Only envelope, no length prefix
        assert!(extract_yjs_payload(&[YWS_MSG_SYNC, YJS_UPDATE]).is_none());
        // Length says 5 but only 2 bytes available
        assert!(extract_yjs_payload(&[YWS_MSG_SYNC, YJS_UPDATE, 5, 0xAA, 0xBB]).is_none());
    }
}
