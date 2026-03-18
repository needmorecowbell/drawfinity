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
