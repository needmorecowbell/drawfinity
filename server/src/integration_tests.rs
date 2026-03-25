//! Integration tests for the full edit-disconnect-reconnect cycle.
//!
//! Simulates the scenario from issue #29: a client edits a document,
//! disconnects (triggering persistence), the server restarts, and a
//! new client reconnects and receives the persisted edits.

use std::sync::Arc;

use tempfile::TempDir;
use yrs::updates::decoder::Decode;
use yrs::{Doc, Map, ReadTxn, StateVector, Transact, Update};

use crate::persistence::Persistence;
use crate::room::RoomManager;

/// Full edit → disconnect → server restart → reconnect cycle.
///
/// 1. Client A joins an empty room.
/// 2. Client A sends a Yjs update with some data.
/// 3. Client A leaves (triggers persistence to disk).
/// 4. The RoomManager is dropped and a new one is created from the same
///    persistence directory (simulating a server restart).
/// 5. Client B joins the same room and verifies Client A's edits are present.
#[tokio::test]
async fn test_edit_disconnect_reconnect_cycle() {
    let dir = TempDir::new().unwrap();
    let persistence_dir = dir.path().to_path_buf();

    // --- Phase 1: Client A edits and disconnects ---
    {
        let persistence = Arc::new(Persistence::new(persistence_dir.clone()));
        persistence.init().await.unwrap();
        let manager = RoomManager::new(persistence);

        // Client A joins "test-room" → gets empty state
        let (_tx, initial_state) = manager.join_room("test-room").await;
        assert!(!initial_state.is_empty(), "even empty yrs doc encodes to bytes");

        // Client A creates a local yrs Doc, inserts data, and encodes an update
        let client_a_doc = Doc::new();
        {
            let map = client_a_doc.get_or_insert_map("drawings");
            let mut txn = client_a_doc.transact_mut();
            map.insert(&mut txn, "stroke-1", "red-circle");
            map.insert(&mut txn, "stroke-2", "blue-line");
        }
        let update = client_a_doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());

        // Simulate a YjsUpdate message arriving at the server
        manager.apply_update("test-room", &update).await;

        // Client A disconnects — triggers persistence
        manager.leave_room("test-room").await;

        // Give the persistence a moment to flush (leave_room persists synchronously
        // when client_count reaches 0, so this should be immediate, but we allow
        // a small delay for safety).
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    // RoomManager is dropped here — simulates server shutdown.

    // --- Phase 2: Server restart, Client B reconnects ---
    {
        let persistence = Arc::new(Persistence::new(persistence_dir));
        persistence.init().await.unwrap();
        let manager = RoomManager::new(persistence);

        // Client B joins the same room
        let (_tx, state) = manager.join_room("test-room").await;

        // Decode the state and verify Client A's edits are present
        let client_b_doc = Doc::new();
        {
            let u = Update::decode_v1(&state).expect("state should be valid yrs update");
            client_b_doc.transact_mut().apply_update(u).unwrap();
        }

        let map = client_b_doc.get_or_insert_map("drawings");
        let txn = client_b_doc.transact();

        let stroke_1 = map
            .get(&txn, "stroke-1")
            .expect("stroke-1 should exist after reconnect")
            .to_string(&txn);
        assert_eq!(stroke_1, "red-circle");

        let stroke_2 = map
            .get(&txn, "stroke-2")
            .expect("stroke-2 should exist after reconnect")
            .to_string(&txn);
        assert_eq!(stroke_2, "blue-line");
    }
}

/// Verify that multiple clients' edits survive a server restart.
#[tokio::test]
async fn test_multiple_clients_edits_persist_across_restart() {
    let dir = TempDir::new().unwrap();
    let persistence_dir = dir.path().to_path_buf();

    {
        let persistence = Arc::new(Persistence::new(persistence_dir.clone()));
        persistence.init().await.unwrap();
        let manager = RoomManager::new(persistence);

        // Two clients join
        manager.join_room("collab-room").await;
        manager.join_room("collab-room").await;

        // Client A sends an update
        let doc_a = Doc::new();
        {
            let map = doc_a.get_or_insert_map("data");
            let mut txn = doc_a.transact_mut();
            map.insert(&mut txn, "author", "alice");
        }
        let update_a = doc_a
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        manager.apply_update("collab-room", &update_a).await;

        // Client B sends an update
        let doc_b = Doc::new();
        {
            let map = doc_b.get_or_insert_map("data");
            let mut txn = doc_b.transact_mut();
            map.insert(&mut txn, "reviewer", "bob");
        }
        let update_b = doc_b
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        manager.apply_update("collab-room", &update_b).await;

        // Both clients leave
        manager.leave_room("collab-room").await;
        manager.leave_room("collab-room").await;

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // Server restart
    {
        let persistence = Arc::new(Persistence::new(persistence_dir));
        persistence.init().await.unwrap();
        let manager = RoomManager::new(persistence);

        let (_tx, state) = manager.join_room("collab-room").await;

        let verify = Doc::new();
        {
            let u = Update::decode_v1(&state).unwrap();
            verify.transact_mut().apply_update(u).unwrap();
        }
        let map = verify.get_or_insert_map("data");
        let txn = verify.transact();

        assert_eq!(
            map.get(&txn, "author").unwrap().to_string(&txn),
            "alice"
        );
        assert_eq!(
            map.get(&txn, "reviewer").unwrap().to_string(&txn),
            "bob"
        );
    }
}
