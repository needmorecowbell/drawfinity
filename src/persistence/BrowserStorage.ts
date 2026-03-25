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
      if (useIDB) {
        await idbSaveDocument(drawingId, state);
      } else {
        const b64 = uint8ToBase64(state);
        localStorage.setItem(`drawfinity:doc:${drawingId}`, b64);
      }
    },

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
      } else {
        localStorage.removeItem(`drawfinity:doc:${drawingId}`);
      }
    },
  };
}

export type BrowserStorage = Awaited<ReturnType<typeof createBrowserStorage>>;
