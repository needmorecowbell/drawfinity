use yrs::updates::decoder::Decode;
use yrs::{Doc, ReadTxn, StateVector, Transact, Update};

/// Wraps a `yrs::Doc` with helper methods for applying and encoding Yjs state.
pub struct YrsDocHolder {
    doc: Doc,
}

impl Default for YrsDocHolder {
    fn default() -> Self {
        Self::new()
    }
}

impl YrsDocHolder {
    /// Create a new empty document.
    pub fn new() -> Self {
        Self { doc: Doc::new() }
    }

    /// Create a document initialized from a persisted state update.
    /// Returns an error if `state` contains invalid Yjs data.
    pub fn from_state(state: &[u8]) -> Result<Self, yrs::error::Error> {
        let holder = Self::new();
        let update = Update::decode_v1(state)?;
        holder.doc.transact_mut().apply_update(update)?;
        Ok(holder)
    }

    /// Apply an incremental Yjs update (from YjsUpdate messages).
    pub fn apply_update(&self, update_bytes: &[u8]) -> Result<(), yrs::error::Error> {
        let update = Update::decode_v1(update_bytes)?;
        self.doc.transact_mut().apply_update(update)?;
        Ok(())
    }

    /// Apply a full state (from SyncStep2). Functionally identical to `apply_update`
    /// since yrs handles both via `Update::decode_v1`.
    pub fn apply_state(&self, state: &[u8]) -> Result<(), yrs::error::Error> {
        self.apply_update(state)
    }

    /// Encode the full document state as bytes.
    pub fn encode_state(&self) -> Vec<u8> {
        self.doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Map, Transact};

    #[test]
    fn empty_doc_encodes_non_empty() {
        let holder = YrsDocHolder::new();
        let state = holder.encode_state();
        assert!(!state.is_empty(), "encoded state of empty doc should be non-empty");
    }

    #[test]
    fn roundtrip_update_between_docs() {
        // Create a doc with some data
        let doc1 = Doc::new();
        {
            let map = doc1.get_or_insert_map("test");
            let mut txn = doc1.transact_mut();
            map.insert(&mut txn, "key", "hello");
        }
        let update = doc1
            .transact()
            .encode_state_as_update_v1(&StateVector::default());

        // Apply to a YrsDocHolder and read back
        let holder = YrsDocHolder::from_state(&update).unwrap();
        let state = holder.encode_state();

        // Verify by loading into yet another doc
        let doc2 = Doc::new();
        {
            let u = Update::decode_v1(&state).unwrap();
            doc2.transact_mut().apply_update(u).unwrap();
        }
        let map = doc2.get_or_insert_map("test");
        let txn = doc2.transact();
        let val = map.get(&txn, "key").unwrap().to_string(&txn);
        assert_eq!(val, "hello");
    }

    #[test]
    fn incremental_apply_update() {
        let holder = YrsDocHolder::new();

        // Create an update from a separate doc
        let source = Doc::new();
        {
            let map = source.get_or_insert_map("data");
            let mut txn = source.transact_mut();
            map.insert(&mut txn, "a", 42i32);
        }
        let update = source
            .transact()
            .encode_state_as_update_v1(&StateVector::default());

        holder.apply_update(&update).unwrap();

        // Verify the data is in the holder
        let state = holder.encode_state();
        let verify = Doc::new();
        {
            let u = Update::decode_v1(&state).unwrap();
            verify.transact_mut().apply_update(u).unwrap();
        }
        let map = verify.get_or_insert_map("data");
        let txn = verify.transact();
        assert!(map.get(&txn, "a").is_some());
    }

    #[test]
    fn from_state_invalid_bytes_returns_error() {
        let result = YrsDocHolder::from_state(&[0xFF, 0xFF, 0xFF]);
        assert!(result.is_err(), "invalid bytes should produce an error");
    }
}
