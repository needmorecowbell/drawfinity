use yrs::updates::decoder::Decode;
use yrs::{Doc, ReadTxn, StateVector, Transact, Update};

/// Error type for YrsDocHolder operations, covering both decode and apply failures.
#[derive(Debug)]
pub enum YrsDocError {
    Decode(yrs::encoding::read::Error),
    Apply(yrs::error::UpdateError),
}

impl std::fmt::Display for YrsDocError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            YrsDocError::Decode(e) => write!(f, "decode error: {e}"),
            YrsDocError::Apply(e) => write!(f, "apply error: {e}"),
        }
    }
}

impl From<yrs::encoding::read::Error> for YrsDocError {
    fn from(e: yrs::encoding::read::Error) -> Self {
        YrsDocError::Decode(e)
    }
}

impl From<yrs::error::UpdateError> for YrsDocError {
    fn from(e: yrs::error::UpdateError) -> Self {
        YrsDocError::Apply(e)
    }
}

/// Read a lib0 var-uint from a byte slice and return the remaining bytes after it.
///
/// Old persisted files use lib0's `writeVarUint8Array` which prefixes the payload
/// with a var-uint length. This strips that prefix.
fn strip_var_uint_prefix(data: &[u8]) -> Option<&[u8]> {
    let mut shift = 0;
    for (i, &byte) in data.iter().enumerate() {
        if byte & 0x80 == 0 {
            return Some(&data[i + 1..]);
        }
        shift += 7;
        if shift > 35 {
            return None;
        }
    }
    None
}

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
    ///
    /// Handles backward compatibility with old-format persisted files:
    /// 1. Try decoding bytes directly as a yrs `Update` (new format: raw yrs state).
    /// 2. If that fails and bytes start with `[0, 1]` (y-websocket SyncStep2 envelope),
    ///    strip the 2-byte envelope + lib0 var-uint length prefix and retry.
    /// 3. If both fail, return an error (caller decides whether to fall back to empty doc).
    pub fn from_state(state: &[u8]) -> Result<Self, YrsDocError> {
        let holder = Self::new();

        // Check for old format first: y-websocket SyncStep2 envelope [0, 1, ...]
        // Old persistence saved the entire WebSocket message:
        //   [0, 1, lib0_var_uint_length, ...raw_yrs_bytes...]
        // We try stripping the envelope before raw decode because [0, 1, <valid bytes>]
        // can accidentally parse as valid-but-wrong yrs data.
        if state.len() > 2 && state[0] == 0 && state[1] == 1 {
            let after_envelope = &state[2..];
            // Strip the lib0 var-uint length prefix to get raw Yjs bytes
            if let Some(payload) = strip_var_uint_prefix(after_envelope) {
                if let Ok(update) = Update::decode_v1(payload) {
                    tracing::info!("Detected old-format persisted state with y-websocket envelope, stripped envelope + length prefix");
                    holder.doc.transact_mut().apply_update(update)?;
                    return Ok(holder);
                }
            }
            // Fallback: try without length prefix stripping (in case old format varied)
            if let Ok(update) = Update::decode_v1(after_envelope) {
                tracing::info!("Detected old-format persisted state with y-websocket envelope, stripped 2-byte prefix");
                holder.doc.transact_mut().apply_update(update)?;
                return Ok(holder);
            }
        }

        // Try decoding directly (new format: raw yrs state)
        let update = Update::decode_v1(state)?;
        holder.doc.transact_mut().apply_update(update)?;
        Ok(holder)
    }

    /// Apply an incremental Yjs update (from YjsUpdate messages).
    pub fn apply_update(&self, update_bytes: &[u8]) -> Result<(), YrsDocError> {
        let update = Update::decode_v1(update_bytes)?;
        self.doc.transact_mut().apply_update(update)?;
        Ok(())
    }

    /// Apply a full state (from SyncStep2). Functionally identical to `apply_update`
    /// since yrs handles both via `Update::decode_v1`.
    pub fn apply_state(&self, state: &[u8]) -> Result<(), YrsDocError> {
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

    /// Encode a usize as a lib0 var-uint byte sequence.
    fn encode_var_uint(mut value: usize) -> Vec<u8> {
        let mut buf = Vec::new();
        loop {
            let mut byte = (value & 0x7F) as u8;
            value >>= 7;
            if value > 0 {
                byte |= 0x80;
            }
            buf.push(byte);
            if value == 0 {
                break;
            }
        }
        buf
    }

    #[test]
    fn from_state_strips_old_format_sync_step2_envelope() {
        // Create valid yrs state bytes
        let doc = Doc::new();
        {
            let map = doc.get_or_insert_map("test");
            let mut txn = doc.transact_mut();
            map.insert(&mut txn, "legacy", "data");
        }
        let raw_state = doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());

        // Simulate old-format persisted data:
        // [0, 1] (y-websocket SyncStep2 envelope) + lib0 var-uint length + raw yrs bytes
        let mut old_format = vec![0u8, 1u8];
        old_format.extend_from_slice(&encode_var_uint(raw_state.len()));
        old_format.extend_from_slice(&raw_state);

        // from_state should detect the envelope, strip it + length prefix
        let holder = YrsDocHolder::from_state(&old_format)
            .expect("should handle old-format persisted data");

        // Verify the data roundtripped correctly
        let state = holder.encode_state();
        let verify = Doc::new();
        {
            let u = Update::decode_v1(&state).unwrap();
            verify.transact_mut().apply_update(u).unwrap();
        }
        let map = verify.get_or_insert_map("test");
        let txn = verify.transact();
        let val = map.get(&txn, "legacy").unwrap().to_string(&txn);
        assert_eq!(val, "data");
    }
}
