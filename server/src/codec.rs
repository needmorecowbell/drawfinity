// lib0 variable-length unsigned integer encoding/decoding.
//
// lib0 var-uint uses the MSB of each byte as a continuation bit:
// each byte contributes 7 bits of value; if bit 7 is set, read another byte.

/// Read a lib0 var-uint from a byte slice, returning `(value, bytes_consumed)`.
///
/// Returns `None` if the slice is empty, truncated (continuation bit set on
/// last byte), or the value would overflow a `usize`.
pub fn read_var_uint(data: &[u8]) -> Option<(usize, usize)> {
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

/// Skip a lib0 var-uint length prefix and return the remaining bytes.
///
/// This is a convenience wrapper for stripping the length prefix from
/// lib0's `writeVarUint8Array` encoding without needing the length value.
pub fn skip_var_uint_prefix(data: &[u8]) -> Option<&[u8]> {
    let (_, consumed) = read_var_uint(data)?;
    Some(&data[consumed..])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_byte_values() {
        assert_eq!(read_var_uint(&[0]), Some((0, 1)));
        assert_eq!(read_var_uint(&[42]), Some((42, 1)));
        assert_eq!(read_var_uint(&[127]), Some((127, 1)));
    }

    #[test]
    fn multi_byte_values() {
        // 128 = 0x80 → encoded as [0x80, 0x01]
        assert_eq!(read_var_uint(&[0x80, 0x01]), Some((128, 2)));
        // 300 = 0x12C → encoded as [0xAC, 0x02]
        assert_eq!(read_var_uint(&[0xAC, 0x02]), Some((300, 2)));
    }

    #[test]
    fn empty_input() {
        assert_eq!(read_var_uint(&[]), None);
    }

    #[test]
    fn truncated_input() {
        // Continuation bit set but no next byte
        assert_eq!(read_var_uint(&[0x80]), None);
    }

    #[test]
    fn skip_prefix_basic() {
        // Length byte 3 followed by payload
        let data = &[3, 0xAA, 0xBB, 0xCC];
        assert_eq!(skip_var_uint_prefix(data), Some(&[0xAA, 0xBB, 0xCC][..]));
    }

    #[test]
    fn skip_prefix_multi_byte_length() {
        // var-uint 128 = [0x80, 0x01] followed by payload
        let mut data = vec![0x80, 0x01];
        data.extend(vec![0xFF; 128]);
        let result = skip_var_uint_prefix(&data).unwrap();
        assert_eq!(result.len(), 128);
    }

    #[test]
    fn skip_prefix_empty() {
        assert_eq!(skip_var_uint_prefix(&[]), None);
    }
}
