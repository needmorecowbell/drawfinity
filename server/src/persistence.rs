use std::path::PathBuf;
use tokio::fs;
use tokio::sync::mpsc;
use tokio::time::{Duration, Instant};

use crate::room::RoomMetadata;

/// Handles persisting room document state to disk as binary files.
pub struct Persistence {
    data_dir: PathBuf,
}

impl Persistence {
    pub fn new(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    /// Ensure the data directory exists.
    pub async fn init(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.data_dir).await
    }

    fn sanitize_id(&self, room_id: &str) -> String {
        room_id
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
            .collect()
    }

    fn room_path(&self, room_id: &str) -> PathBuf {
        let safe_id = self.sanitize_id(room_id);
        self.data_dir.join(format!("{safe_id}.bin"))
    }

    fn metadata_path(&self, room_id: &str) -> PathBuf {
        let safe_id = self.sanitize_id(room_id);
        self.data_dir.join(format!("{safe_id}.meta.json"))
    }

    /// Load a room's document state from disk, if it exists.
    pub async fn load(&self, room_id: &str) -> Option<Vec<u8>> {
        let path = self.room_path(room_id);
        match fs::read(&path).await {
            Ok(data) if !data.is_empty() => {
                tracing::info!(room_id = room_id, path = %path.display(), "Loaded persisted room state");
                Some(data)
            }
            Ok(_) => None,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
            Err(e) => {
                tracing::error!(room_id = room_id, error = %e, "Failed to load room state");
                None
            }
        }
    }

    /// Load a room's metadata from disk, if it exists.
    pub async fn load_metadata(&self, room_id: &str) -> Option<RoomMetadata> {
        let path = self.metadata_path(room_id);
        match fs::read_to_string(&path).await {
            Ok(json) => match serde_json::from_str(&json) {
                Ok(meta) => {
                    tracing::info!(room_id = room_id, "Loaded persisted room metadata");
                    Some(meta)
                }
                Err(e) => {
                    tracing::error!(room_id = room_id, error = %e, "Failed to parse room metadata");
                    None
                }
            },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
            Err(e) => {
                tracing::error!(room_id = room_id, error = %e, "Failed to load room metadata");
                None
            }
        }
    }

    /// Save a room's document state to disk.
    pub async fn save(&self, room_id: &str, data: &[u8]) -> std::io::Result<()> {
        let path = self.room_path(room_id);
        fs::write(&path, data).await?;
        tracing::debug!(room_id = room_id, bytes = data.len(), "Persisted room state");
        Ok(())
    }

    /// Save a room's metadata to disk as JSON.
    pub async fn save_metadata(&self, room_id: &str, metadata: &RoomMetadata) -> std::io::Result<()> {
        let path = self.metadata_path(room_id);
        let json = serde_json::to_string_pretty(metadata)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        fs::write(&path, json).await?;
        tracing::debug!(room_id = room_id, "Persisted room metadata");
        Ok(())
    }
}

/// Message sent to the debounced writer.
struct SaveRequest {
    room_id: String,
    data: Vec<u8>,
    metadata: Option<RoomMetadata>,
}

/// A debounced writer that batches save requests per room.
/// Sends a save request and the writer waits for the debounce period before flushing.
pub struct DebouncedWriter {
    tx: mpsc::UnboundedSender<SaveRequest>,
}

impl DebouncedWriter {
    /// Spawn a debounced writer that persists room state after a quiet period.
    pub fn spawn(persistence: std::sync::Arc<Persistence>, debounce: Duration) -> Self {
        let (tx, mut rx) = mpsc::unbounded_channel::<SaveRequest>();

        tokio::spawn(async move {
            use std::collections::HashMap;

            // Track the latest state, metadata, and deadline per room
            let mut pending: HashMap<String, (Vec<u8>, Option<RoomMetadata>, Instant)> = HashMap::new();

            loop {
                // Calculate sleep duration: next deadline or a long default
                let sleep_until = pending
                    .values()
                    .map(|(_, _, deadline)| *deadline)
                    .min()
                    .unwrap_or_else(|| Instant::now() + Duration::from_secs(3600));

                tokio::select! {
                    msg = rx.recv() => {
                        match msg {
                            Some(req) => {
                                let deadline = Instant::now() + debounce;
                                pending.insert(req.room_id, (req.data, req.metadata, deadline));
                            }
                            None => {
                                // Channel closed — flush all pending
                                for (room_id, (data, metadata, _)) in pending.drain() {
                                    if let Err(e) = persistence.save(&room_id, &data).await {
                                        tracing::error!(room_id = room_id, error = %e, "Failed to persist on shutdown");
                                    }
                                    if let Some(meta) = metadata {
                                        if let Err(e) = persistence.save_metadata(&room_id, &meta).await {
                                            tracing::error!(room_id = room_id, error = %e, "Failed to persist metadata on shutdown");
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                    _ = tokio::time::sleep_until(sleep_until) => {
                        // Flush all rooms past their deadline
                        let now = Instant::now();
                        let expired: Vec<String> = pending
                            .iter()
                            .filter(|(_, (_, _, deadline))| *deadline <= now)
                            .map(|(k, _)| k.clone())
                            .collect();

                        for room_id in expired {
                            if let Some((data, metadata, _)) = pending.remove(&room_id) {
                                if let Err(e) = persistence.save(&room_id, &data).await {
                                    tracing::error!(room_id = room_id, error = %e, "Failed to persist room state");
                                }
                                if let Some(meta) = metadata {
                                    if let Err(e) = persistence.save_metadata(&room_id, &meta).await {
                                        tracing::error!(room_id = room_id, error = %e, "Failed to persist metadata on shutdown");
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        Self { tx }
    }

    /// Queue a save for a room. The actual write is debounced.
    pub fn queue_save(&self, room_id: String, data: Vec<u8>) {
        let _ = self.tx.send(SaveRequest { room_id, data, metadata: None });
    }

    /// Queue a save for a room's state and metadata. The actual write is debounced.
    pub fn queue_save_with_metadata(&self, room_id: String, data: Vec<u8>, metadata: RoomMetadata) {
        let _ = self.tx.send(SaveRequest { room_id, data, metadata: Some(metadata) });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_persistence_save_and_load() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        p.save("room-1", &[1, 2, 3, 4]).await.unwrap();
        let loaded = p.load("room-1").await;
        assert_eq!(loaded, Some(vec![1, 2, 3, 4]));
    }

    #[tokio::test]
    async fn test_persistence_load_missing() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        assert_eq!(p.load("nonexistent").await, None);
    }

    #[tokio::test]
    async fn test_persistence_overwrite() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        p.save("room-2", &[10, 20]).await.unwrap();
        p.save("room-2", &[30, 40, 50]).await.unwrap();
        assert_eq!(p.load("room-2").await, Some(vec![30, 40, 50]));
    }

    #[tokio::test]
    async fn test_path_traversal_sanitization() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        // Path traversal attempts should be sanitized
        p.save("../evil", &[1]).await.unwrap();
        let path = p.room_path("../evil");
        assert!(path.starts_with(dir.path()));
    }

    #[tokio::test]
    async fn test_metadata_save_and_load() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        let meta = RoomMetadata {
            id: "meta-room".to_string(),
            name: Some("Test Room".to_string()),
            created_at: 1710000000,
            last_active_at: 1710003600,
            creator_name: Some("Alice".to_string()),
        };

        p.save_metadata("meta-room", &meta).await.unwrap();
        let loaded = p.load_metadata("meta-room").await.unwrap();
        assert_eq!(loaded.id, "meta-room");
        assert_eq!(loaded.name, Some("Test Room".to_string()));
        assert_eq!(loaded.created_at, 1710000000);
        assert_eq!(loaded.last_active_at, 1710003600);
        assert_eq!(loaded.creator_name, Some("Alice".to_string()));
    }

    #[tokio::test]
    async fn test_metadata_load_missing() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        p.init().await.unwrap();

        assert!(p.load_metadata("nonexistent").await.is_none());
    }

    #[tokio::test]
    async fn test_metadata_path_format() {
        let dir = TempDir::new().unwrap();
        let p = Persistence::new(dir.path().to_path_buf());
        let path = p.metadata_path("my-room");
        assert!(path.to_str().unwrap().ends_with("my-room.meta.json"));
    }

    #[tokio::test]
    async fn test_debounced_writer() {
        let dir = TempDir::new().unwrap();
        let persistence = std::sync::Arc::new(Persistence::new(dir.path().to_path_buf()));
        persistence.init().await.unwrap();

        let writer = DebouncedWriter::spawn(
            std::sync::Arc::clone(&persistence),
            Duration::from_millis(100),
        );

        // Queue multiple writes — only the last should persist
        writer.queue_save("debounce-room".into(), vec![1]);
        writer.queue_save("debounce-room".into(), vec![2]);
        writer.queue_save("debounce-room".into(), vec![3, 4, 5]);

        // Wait for debounce to flush
        tokio::time::sleep(Duration::from_millis(300)).await;

        let loaded = persistence.load("debounce-room").await;
        assert_eq!(loaded, Some(vec![3, 4, 5]));
    }

    #[tokio::test]
    async fn test_debounced_writer_with_metadata() {
        let dir = TempDir::new().unwrap();
        let persistence = std::sync::Arc::new(Persistence::new(dir.path().to_path_buf()));
        persistence.init().await.unwrap();

        let writer = DebouncedWriter::spawn(
            std::sync::Arc::clone(&persistence),
            Duration::from_millis(100),
        );

        let meta = RoomMetadata {
            id: "debounce-meta".to_string(),
            name: Some("Debounced".to_string()),
            created_at: 1710000000,
            last_active_at: 1710003600,
            creator_name: None,
        };

        writer.queue_save_with_metadata("debounce-meta".into(), vec![10, 20], meta);

        // Wait for debounce to flush
        tokio::time::sleep(Duration::from_millis(300)).await;

        let loaded_state = persistence.load("debounce-meta").await;
        assert_eq!(loaded_state, Some(vec![10, 20]));

        let loaded_meta = persistence.load_metadata("debounce-meta").await.unwrap();
        assert_eq!(loaded_meta.name, Some("Debounced".to_string()));
    }
}
