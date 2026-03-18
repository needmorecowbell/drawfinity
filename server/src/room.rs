use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{broadcast, RwLock};

use crate::persistence::{DebouncedWriter, Persistence};

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Serializable metadata for a room (excludes doc state and channels).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoomMetadata {
    pub id: String,
    pub name: Option<String>,
    pub created_at: u64,
    pub last_active_at: u64,
    pub creator_name: Option<String>,
}

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
    /// Optional human-readable name for this room.
    pub name: Option<String>,
    /// Unix timestamp (seconds) when the room was created.
    pub created_at: u64,
    /// Unix timestamp (seconds) of last activity (message received).
    pub last_active_at: u64,
    /// Name of the user who created this room.
    pub creator_name: Option<String>,
}

impl Room {
    pub fn new(id: String) -> Self {
        let (tx, _) = broadcast::channel(256);
        let now = unix_timestamp();
        Self {
            id,
            tx,
            client_count: 0,
            doc_state: Vec::new(),
            name: None,
            created_at: now,
            last_active_at: now,
            creator_name: None,
        }
    }

    pub fn with_state(id: String, doc_state: Vec<u8>) -> Self {
        let (tx, _) = broadcast::channel(256);
        let now = unix_timestamp();
        Self {
            id,
            tx,
            client_count: 0,
            doc_state,
            name: None,
            created_at: now,
            last_active_at: now,
            creator_name: None,
        }
    }

    /// Create a room restored from persisted state and metadata.
    pub fn with_state_and_metadata(id: String, doc_state: Vec<u8>, metadata: RoomMetadata) -> Self {
        let (tx, _) = broadcast::channel(256);
        Self {
            id,
            tx,
            client_count: 0,
            doc_state,
            name: metadata.name,
            created_at: metadata.created_at,
            last_active_at: metadata.last_active_at,
            creator_name: metadata.creator_name,
        }
    }

    /// Extract serializable metadata from this room.
    pub fn metadata(&self) -> RoomMetadata {
        RoomMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            created_at: self.created_at,
            last_active_at: self.last_active_at,
            creator_name: self.creator_name.clone(),
        }
    }
}

/// Manages all active rooms, providing create/join/leave semantics.
pub struct RoomManager {
    rooms: Arc<RwLock<HashMap<String, Arc<RwLock<Room>>>>>,
    persistence: Arc<Persistence>,
    debounced_writer: DebouncedWriter,
}

impl RoomManager {
    pub fn new(persistence: Arc<Persistence>) -> Self {
        let debounced_writer = DebouncedWriter::spawn(
            Arc::clone(&persistence),
            std::time::Duration::from_secs(5),
        );
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
            persistence,
            debounced_writer,
        }
    }

    /// Get or create a room by ID. Returns the room handle.
    /// Loads persisted state and metadata from disk if the room doesn't exist in memory.
    pub async fn get_or_create_room(&self, room_id: &str) -> Arc<RwLock<Room>> {
        // Fast path: room already exists
        {
            let rooms = self.rooms.read().await;
            if let Some(room) = rooms.get(room_id) {
                return Arc::clone(room);
            }
        }

        // Slow path: create the room, loading persisted state if available
        let mut rooms = self.rooms.write().await;
        // Double-check after acquiring write lock
        if let Some(room) = rooms.get(room_id) {
            return Arc::clone(room);
        }

        let state = self.persistence.load(room_id).await;
        let metadata = self.persistence.load_metadata(room_id).await;

        let room = match (state, metadata) {
            (Some(state), Some(meta)) => {
                tracing::info!(room_id = room_id, bytes = state.len(), "Restored room from disk with metadata");
                Arc::new(RwLock::new(Room::with_state_and_metadata(room_id.to_string(), state, meta)))
            }
            (Some(state), None) => {
                tracing::info!(room_id = room_id, bytes = state.len(), "Restored room from disk (no metadata)");
                Arc::new(RwLock::new(Room::with_state(room_id.to_string(), state)))
            }
            _ => {
                Arc::new(RwLock::new(Room::new(room_id.to_string())))
            }
        };

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

    /// Leave a room: decrements client count, persists and cleans up empty rooms after a brief period.
    pub async fn leave_room(&self, room_id: &str) {
        let (should_remove, state_to_persist, metadata_to_persist) = {
            let rooms = self.rooms.read().await;
            if let Some(room) = rooms.get(room_id) {
                let mut room_guard = room.write().await;
                room_guard.client_count = room_guard.client_count.saturating_sub(1);
                tracing::info!(
                    room_id = room_id,
                    clients = room_guard.client_count,
                    "Client left room"
                );
                let empty = room_guard.client_count == 0;
                let (state, metadata) = if empty {
                    (Some(room_guard.doc_state.clone()), Some(room_guard.metadata()))
                } else {
                    (None, None)
                };
                (empty, state, metadata)
            } else {
                (false, None, None)
            }
        };

        // Immediately persist when room becomes empty
        if let Some(state) = state_to_persist {
            if !state.is_empty() {
                if let Err(e) = self.persistence.save(room_id, &state).await {
                    tracing::error!(room_id = room_id, error = %e, "Failed to persist on room empty");
                }
            }
            if let Some(meta) = metadata_to_persist {
                if let Err(e) = self.persistence.save_metadata(room_id, &meta).await {
                    tracing::error!(room_id = room_id, error = %e, "Failed to persist metadata on room empty");
                }
            }
        }

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

    /// Update the stored document state for a room, with debounced persistence.
    /// Also updates `last_active_at` timestamp and persists metadata alongside state.
    pub async fn update_doc_state(&self, room_id: &str, state: Vec<u8>) {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(room_id) {
            let mut room_guard = room.write().await;
            room_guard.doc_state = state.clone();
            room_guard.last_active_at = unix_timestamp();
            let metadata = room_guard.metadata();
            // Queue debounced write to disk (state + metadata)
            self.debounced_writer
                .queue_save_with_metadata(room_id.to_string(), state, metadata);
        }
    }

    /// List metadata for all currently tracked rooms.
    pub async fn list_rooms(&self) -> Vec<(RoomMetadata, usize)> {
        let rooms = self.rooms.read().await;
        let mut result = Vec::with_capacity(rooms.len());
        for room in rooms.values() {
            let guard = room.read().await;
            result.push((guard.metadata(), guard.client_count));
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn test_persistence(dir: &TempDir) -> Arc<Persistence> {
        Arc::new(Persistence::new(dir.path().to_path_buf()))
    }

    #[tokio::test]
    async fn test_get_or_create_room() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        let room = manager.get_or_create_room("test-room").await;
        let guard = room.read().await;
        assert_eq!(guard.id, "test-room");
        assert_eq!(guard.client_count, 0);
        assert!(guard.doc_state.is_empty());
    }

    #[tokio::test]
    async fn test_join_room_creates_if_missing() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        let (_tx, state) = manager.join_room("new-room").await;
        assert!(state.is_empty());

        // Verify client count incremented
        let room = manager.get_or_create_room("new-room").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 1);
    }

    #[tokio::test]
    async fn test_join_room_sends_existing_state() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);

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
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        manager.join_room("multi").await;
        manager.join_room("multi").await;
        manager.join_room("multi").await;

        let room = manager.get_or_create_room("multi").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 3);
    }

    #[tokio::test]
    async fn test_leave_room_decrements() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        manager.join_room("leave-test").await;
        manager.join_room("leave-test").await;

        manager.leave_room("leave-test").await;

        let room = manager.get_or_create_room("leave-test").await;
        let guard = room.read().await;
        assert_eq!(guard.client_count, 1);
    }

    #[tokio::test]
    async fn test_update_doc_state() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
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
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        let (tx, _state) = manager.join_room("broadcast-test").await;

        let mut rx = tx.subscribe();
        tx.send(vec![42, 43]).unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg, vec![42, 43]);
    }

    #[tokio::test]
    async fn test_room_loads_persisted_state() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();

        // Pre-persist some state
        p.save("persisted-room", &[99, 88, 77]).await.unwrap();

        let manager = RoomManager::new(p);
        let (_tx, state) = manager.join_room("persisted-room").await;
        assert_eq!(state, vec![99, 88, 77]);
    }

    #[tokio::test]
    async fn test_room_metadata_fields() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);

        let room = manager.get_or_create_room("meta-test").await;
        let guard = room.read().await;
        assert_eq!(guard.name, None);
        assert_eq!(guard.creator_name, None);
        assert!(guard.created_at > 0);
        assert!(guard.last_active_at > 0);
        assert_eq!(guard.created_at, guard.last_active_at);
    }

    #[tokio::test]
    async fn test_room_metadata_serialization() {
        let meta = RoomMetadata {
            id: "test-room".to_string(),
            name: Some("My Drawing".to_string()),
            created_at: 1710000000,
            last_active_at: 1710003600,
            creator_name: Some("Alice".to_string()),
        };

        let json = serde_json::to_string(&meta).unwrap();
        let deserialized: RoomMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "test-room");
        assert_eq!(deserialized.name, Some("My Drawing".to_string()));
        assert_eq!(deserialized.created_at, 1710000000);
        assert_eq!(deserialized.last_active_at, 1710003600);
        assert_eq!(deserialized.creator_name, Some("Alice".to_string()));
    }

    #[tokio::test]
    async fn test_update_doc_state_updates_last_active_at() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);
        manager.join_room("activity-test").await;

        let room = manager.get_or_create_room("activity-test").await;
        let initial_active;
        {
            let guard = room.read().await;
            initial_active = guard.last_active_at;
        }

        // Small delay so timestamp changes
        tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
        manager
            .update_doc_state("activity-test", vec![1, 2, 3])
            .await;

        let guard = room.read().await;
        assert!(guard.last_active_at >= initial_active);
    }

    #[tokio::test]
    async fn test_room_loads_persisted_metadata() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();

        // Pre-persist state and metadata
        p.save("meta-persist", &[1, 2, 3]).await.unwrap();
        let meta = RoomMetadata {
            id: "meta-persist".to_string(),
            name: Some("Persisted Room".to_string()),
            created_at: 1710000000,
            last_active_at: 1710003600,
            creator_name: Some("Bob".to_string()),
        };
        p.save_metadata("meta-persist", &meta).await.unwrap();

        let manager = RoomManager::new(p);
        let room = manager.get_or_create_room("meta-persist").await;
        let guard = room.read().await;
        assert_eq!(guard.name, Some("Persisted Room".to_string()));
        assert_eq!(guard.created_at, 1710000000);
        assert_eq!(guard.last_active_at, 1710003600);
        assert_eq!(guard.creator_name, Some("Bob".to_string()));
    }

    #[tokio::test]
    async fn test_list_rooms() {
        let dir = TempDir::new().unwrap();
        let p = test_persistence(&dir);
        p.init().await.unwrap();
        let manager = RoomManager::new(p);

        manager.join_room("room-a").await;
        manager.join_room("room-b").await;
        manager.join_room("room-b").await;

        let listing = manager.list_rooms().await;
        assert_eq!(listing.len(), 2);

        let room_a = listing.iter().find(|(m, _)| m.id == "room-a").unwrap();
        assert_eq!(room_a.1, 1); // 1 client

        let room_b = listing.iter().find(|(m, _)| m.id == "room-b").unwrap();
        assert_eq!(room_b.1, 2); // 2 clients
    }
}
