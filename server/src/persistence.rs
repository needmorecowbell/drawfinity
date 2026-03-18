use std::path::PathBuf;
use tokio::fs;
use tokio::sync::mpsc;
use tokio::time::{Duration, Instant};

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

    fn room_path(&self, room_id: &str) -> PathBuf {
        // Sanitize room_id to prevent path traversal
        let safe_id: String = room_id
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
            .collect();
        self.data_dir.join(format!("{safe_id}.bin"))
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

    /// Save a room's document state to disk.
    pub async fn save(&self, room_id: &str, data: &[u8]) -> std::io::Result<()> {
        let path = self.room_path(room_id);
        fs::write(&path, data).await?;
        tracing::debug!(room_id = room_id, bytes = data.len(), "Persisted room state");
        Ok(())
    }

}

/// A debounced writer that batches save requests per room.
/// Sends a save request and the writer waits for the debounce period before flushing.
pub struct DebouncedWriter {
    tx: mpsc::UnboundedSender<(String, Vec<u8>)>,
}

impl DebouncedWriter {
    /// Spawn a debounced writer that persists room state after a quiet period.
    pub fn spawn(persistence: std::sync::Arc<Persistence>, debounce: Duration) -> Self {
        let (tx, mut rx) = mpsc::unbounded_channel::<(String, Vec<u8>)>();

        tokio::spawn(async move {
            use std::collections::HashMap;

            // Track the latest state and deadline per room
            let mut pending: HashMap<String, (Vec<u8>, Instant)> = HashMap::new();

            loop {
                // Calculate sleep duration: next deadline or a long default
                let sleep_until = pending
                    .values()
                    .map(|(_, deadline)| *deadline)
                    .min()
                    .unwrap_or_else(|| Instant::now() + Duration::from_secs(3600));

                tokio::select! {
                    msg = rx.recv() => {
                        match msg {
                            Some((room_id, data)) => {
                                let deadline = Instant::now() + debounce;
                                pending.insert(room_id, (data, deadline));
                            }
                            None => {
                                // Channel closed — flush all pending
                                for (room_id, (data, _)) in pending.drain() {
                                    if let Err(e) = persistence.save(&room_id, &data).await {
                                        tracing::error!(room_id = room_id, error = %e, "Failed to persist on shutdown");
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
                            .filter(|(_, (_, deadline))| *deadline <= now)
                            .map(|(k, _)| k.clone())
                            .collect();

                        for room_id in expired {
                            if let Some((data, _)) = pending.remove(&room_id) {
                                if let Err(e) = persistence.save(&room_id, &data).await {
                                    tracing::error!(room_id = room_id, error = %e, "Failed to persist room state");
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
        let _ = self.tx.send((room_id, data));
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
}
