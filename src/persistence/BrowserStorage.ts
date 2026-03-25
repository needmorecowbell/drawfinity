import * as Y from "yjs";
import type { DrawingMetadata } from "./DrawingManifest";
import {
  isAvailable as isIDBAvailable,
  saveDocument as idbSaveDocument,
  loadDocument as idbLoadDocument,
  deleteDocument as idbDeleteDocument,
  loadManifestFromIDB,
  saveManifestToIDB,
} from "./IndexedDBStorage";

const LS_DRAWINGS_KEY = "drawfinity:drawings";

function lsLoadDrawings(): DrawingMetadata[] {
  try {
    const raw = localStorage.getItem(LS_DRAWINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSaveDrawings(drawings: DrawingMetadata[]): void {
  try { localStorage.setItem(LS_DRAWINGS_KEY, JSON.stringify(drawings)); } catch { /* quota */ }
}

/** Encode Uint8Array to base64 (safe for large arrays). */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode base64 to Uint8Array. */
export function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Minimum available storage (1 MB) before showing a warning. */
const LOW_STORAGE_THRESHOLD = 1 * 1024 * 1024;

/**
 * Check available storage quota using the Storage Manager API.
 * Returns `{ usage, quota, available }` in bytes, or `null` if the API is unsupported.
 */
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  available: number;
} | null> {
  try {
    if (navigator?.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const usage = est.usage ?? 0;
      const quota = est.quota ?? 0;
      return { usage, quota, available: quota - usage };
    }
  } catch {
    // API unavailable or permission denied
  }
  return null;
}

/**
 * Returns true when available storage is below the warning threshold.
 */
export async function isStorageLow(): Promise<boolean> {
  const info = await checkStorageQuota();
  return info !== null && info.available < LOW_STORAGE_THRESHOLD;
}

/** Result of validating Yjs state bytes. */
export interface ValidationResult {
  valid: boolean;
  doc: Y.Doc | null;
  error: Error | null;
}

/**
 * Validate Yjs state bytes by attempting to apply them to a fresh document.
 * Returns the loaded document on success, or the error on failure.
 */
export function validateYjsState(state: Uint8Array): ValidationResult {
  try {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state);
    return { valid: true, doc, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Drawfinity: corrupt Yjs state detected", {
      stateLength: state.length,
      firstBytes: Array.from(state.slice(0, 16)),
      error,
    });
    return { valid: false, doc: null, error };
  }
}

/** Key used to store a backup copy of the last-known-good state. */
function backupKey(drawingId: string): string {
  return `${drawingId}__backup`;
}

/**
 * Creates a browser-mode persistence adapter.
 * Uses IndexedDB when available; falls back to localStorage.
 */
export async function createBrowserStorage() {
  const useIDB = await isIDBAvailable();
  const storageLabel = useIDB ? "IndexedDB" : "localStorage";
  console.log(`Drawfinity: browser persistence using ${storageLabel}`);

  // Migrate existing localStorage data into IndexedDB on first use
  if (useIDB) {
    try {
      const existing = await loadManifestFromIDB();
      if (existing.length === 0) {
        const lsDrawings = lsLoadDrawings();
        if (lsDrawings.length > 0) {
          console.log(`Drawfinity: migrating ${lsDrawings.length} drawing(s) from localStorage to IndexedDB`);
          await saveManifestToIDB(lsDrawings);
          for (const d of lsDrawings) {
            const b64 = localStorage.getItem(`drawfinity:doc:${d.id}`);
            if (b64) {
              await idbSaveDocument(d.id, base64ToUint8(b64));
              localStorage.removeItem(`drawfinity:doc:${d.id}`);
            }
          }
          localStorage.removeItem(LS_DRAWINGS_KEY);
          console.log("Drawfinity: migration complete");
        }
      }
    } catch (err) {
      console.warn("Drawfinity: localStorage→IndexedDB migration failed, data kept in both", err);
    }
  }

  // Load manifest into memory
  let memDrawings: DrawingMetadata[] = useIDB
    ? await loadManifestFromIDB()
    : lsLoadDrawings();

  async function persistManifest(): Promise<void> {
    if (useIDB) {
      await saveManifestToIDB(memDrawings);
    } else {
      lsSaveDrawings(memDrawings);
    }
  }

  return {
    useIDB,
    storageLabel,
    memDrawings,
    persistManifest,

    async saveDocState(drawingId: string, state: Uint8Array): Promise<void> {
      // Check quota before saving
      const quotaInfo = await checkStorageQuota();
      if (quotaInfo && quotaInfo.available < LOW_STORAGE_THRESHOLD) {
        const availMB = (quotaInfo.available / (1024 * 1024)).toFixed(1);
        console.warn(`Drawfinity: storage running low — ${availMB} MB remaining`);
        this.onStorageLow?.(quotaInfo.available);
      }

      try {
        // Backup the current (known-good) state before overwriting
        try {
          const existing = useIDB
            ? await idbLoadDocument(drawingId)
            : (() => {
                const b64 = localStorage.getItem(`drawfinity:doc:${drawingId}`);
                return b64 ? base64ToUint8(b64) : null;
              })();
          if (existing) {
            const bk = backupKey(drawingId);
            if (useIDB) {
              await idbSaveDocument(bk, existing);
            } else {
              localStorage.setItem(`drawfinity:doc:${bk}`, uint8ToBase64(existing));
            }
          }
        } catch (backupErr) {
          console.warn("Drawfinity: failed to create backup before save", backupErr);
        }

        if (useIDB) {
          await idbSaveDocument(drawingId, state);
        } else {
          const b64 = uint8ToBase64(state);
          localStorage.setItem(`drawfinity:doc:${drawingId}`, b64);
        }
      } catch (err) {
        console.error("Drawfinity: save failed", err);
        this.onSaveError?.(err instanceof Error ? err : new Error(String(err)));
        throw err; // Re-throw so callers know the save failed
      }
    },

    /** Called when available storage drops below 1 MB. */
    onStorageLow: null as ((availableBytes: number) => void) | null,

    /** Called when a save fails (quota exceeded, write error, etc.). */
    onSaveError: null as ((error: Error) => void) | null,

    async loadDocState(drawingId: string): Promise<Uint8Array | null> {
      if (useIDB) {
        return idbLoadDocument(drawingId);
      }
      const b64 = localStorage.getItem(`drawfinity:doc:${drawingId}`);
      return b64 ? base64ToUint8(b64) : null;
    },

    async deleteDocState(drawingId: string): Promise<void> {
      if (useIDB) {
        await idbDeleteDocument(drawingId);
        await idbDeleteDocument(backupKey(drawingId));
      } else {
        localStorage.removeItem(`drawfinity:doc:${drawingId}`);
        localStorage.removeItem(`drawfinity:doc:${backupKey(drawingId)}`);
      }
    },

    async loadBackupState(drawingId: string): Promise<Uint8Array | null> {
      const bk = backupKey(drawingId);
      if (useIDB) {
        return idbLoadDocument(bk);
      }
      const b64 = localStorage.getItem(`drawfinity:doc:${bk}`);
      return b64 ? base64ToUint8(b64) : null;
    },
  };
}

export type BrowserStorage = Awaited<ReturnType<typeof createBrowserStorage>>;
