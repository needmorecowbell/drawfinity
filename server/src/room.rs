use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

/// A collaborative room holding connected clients and accumulated document state.
#[allow(dead_code)]
pub struct Room {
    pub id: String,
    /// Broadcast channel for distributing updates to all clients in the room.
    pub tx: broadcast::Sender<Vec<u8>>,
    /// Number of connected clients (tracked manually since broadcast doesn't expose this).
    pub client_count: usize,
    /// Accumulated Yjs document state as raw bytes.
    pub doc_state: Vec<u8>,
}

impl Room {
    pub fn new(id: String) -> Self {
        let (tx, _) = broadcast::channel(256);
        Self {
            id,
            tx,
            client_count: 0,
            doc_state: Vec::new(),
        }
    }

}

/// Manages all active rooms, providing create/join/leave semantics.
pub struct RoomManager {
    rooms: Arc<RwLock<HashMap<String, Arc<RwLock<Room>>>>>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get or create a room by ID. Returns the room handle.
    pub async fn get_or_create_room(&self, room_id: &str) -> Arc<RwLock<Room>> {
        // Fast path: room already exists
        {
            let rooms = self.rooms.read().await;
            if let Some(room) = rooms.get(room_id) {
                return Arc::clone(room);
            }
        }

        // Slow path: create the room
        let mut rooms = self.rooms.write().await;
        // Double-check after acquiring write lock
        if let Some(room) = rooms.get(room_id) {
            return Arc::clone(room);
        }

        let room = Arc::new(RwLock::new(Room::new(room_id.to_string())));
        rooms.insert(room_id.to_string(), Arc::clone(&room));
        tracing::info!(room_id = room_id, "Created new room");
        room
    }

    /// Join a room: increments client count, returns (broadcast_sender, current_doc_state).
    pub async fn join_room(&self, room_id: &str) -> (broadcast::Sender<Vec<u8>>, Vec<u8>) {
        let room = self.get_or_create_room(room_id).await;
        let mut room_guard = room.write().await;
        room_guard.client_count += 1;
        let tx = room_guard.tx.clone();
        let state = room_guard.doc_state.clone();
        tracing::info!(
            room_id = room_id,
            clients = room_guard.client_count,
            "Client joined room"
        );
        (tx, state)
    }

    /// Leave a room: decrements client count, cleans up empty rooms after a brief period.
    pub async fn leave_room(&self, room_id: &str) {
        let should_remove = {
            let rooms = self.rooms.read().await;
            if let Some(room) = rooms.get(room_id) {
                let mut room_guard = room.write().await;
                room_guard.client_count = room_guard.client_count.saturating_sub(1);
                tracing::info!(
                    room_id = room_id,
                    clients = room_guard.client_count,
                    "Client left room"
                );
                room_guard.client_count == 0
            } else {
                false
            }
        };

        if should_remove {
            // Clean up empty rooms after a timeout to allow reconnections
            let rooms = Arc::clone(&self.rooms);
            let room_id = room_id.to_string();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                let mut rooms = rooms.write().await;
                if let Some(room) = rooms.get(&room_id) {
                    let room_guard = room.read().await;
                    if room_guard.client_count == 0 {
                        drop(room_guard);
                        rooms.remove(&room_id);
                        tracing::info!(room_id = room_id, "Cleaned up empty room");
                    }
                }
            });
        }
    }

    /// Update the stored document state for a room.
    pub async fn update_doc_state(&self, room_id: &str, state: Vec<u8>) {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(room_id) {
            let mut room_guard = room.write().await;
            room_guard.doc_state = state;
        }
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_or_create_room() {
        let manager = RoomManager::new();
        let room = manager.get_or_create_room("test-room").await;
        let guard = room.read().await;
        assert_eq!(guard.id, "test-room");
        assert_eq!(guard.client_count, 0);
        assert!(guard.doc_state.is_empty());
    }

    #[tokio::test]
    async fn test_join_room_creates_if_missing() {
        let manager = RoomManager::new();
        let (_tx, state) = manager.join_room("new-room").await;
        assert!(state.is_empty());

        // Verify client count incremented
        let room = manager.get_or_create_room("new-room").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 1);
    }

    #[tokio::test]
    async fn test_join_room_sends_existing_state() {
        let manager = RoomManager::new();

        // Set up a room with some state
        let room = manager.get_or_create_room("state-room").await;
        {
            let mut guard = room.write().await;
            guard.doc_state = vec![1, 2, 3, 4];
        }

        // Join should return existing state
        let (_tx, state) = manager.join_room("state-room").await;
        assert_eq!(state, vec![1, 2, 3, 4]);
    }

    #[tokio::test]
    async fn test_multiple_joins() {
        let manager = RoomManager::new();
        manager.join_room("multi").await;
        manager.join_room("multi").await;
        manager.join_room("multi").await;

        let room = manager.get_or_create_room("multi").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 3);
    }

    #[tokio::test]
    async fn test_leave_room_decrements() {
        let manager = RoomManager::new();
        manager.join_room("leave-test").await;
        manager.join_room("leave-test").await;

        manager.leave_room("leave-test").await;

        let room = manager.get_or_create_room("leave-test").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 1);
    }

    #[tokio::test]
    async fn test_update_doc_state() {
        let manager = RoomManager::new();
        manager.join_room("update-test").await;
        manager
            .update_doc_state("update-test", vec![10, 20, 30])
            .await;

        let room = manager.get_or_create_room("update-test").await;
        let guard = room.read().await;
        assert_eq!(guard.doc_state, vec![10, 20, 30]);
    }

    #[tokio::test]
    async fn test_broadcast_to_subscribers() {
        let manager = RoomManager::new();
        let (tx, _state) = manager.join_room("broadcast-test").await;

        let mut rx = tx.subscribe();
        tx.send(vec![42, 43]).unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg, vec![42, 43]);
    }
}
