import type { DrawingMetadata } from "./DrawingManifest";

const DB_NAME = "drawfinity";
const DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";
const MANIFEST_STORE = "manifest";
const MANIFEST_KEY = "drawings";

/**
 * Opens (or creates) the Drawfinity IndexedDB database.
 *
 * The database has two object stores:
 * - `documents` — keyed by drawing ID, stores binary Yjs state as Uint8Array
 * - `manifest` — keyed by a fixed string, stores the drawing metadata array
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        db.createObjectStore(DOCUMENTS_STORE);
      }
      if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
        db.createObjectStore(MANIFEST_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check whether IndexedDB is available and functional in the current browser.
 * Some browsers (e.g. Firefox/Safari private browsing) may throw or return
 * undefined for `indexedDB`.
 */
export async function isAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === "undefined") return false;
    const db = await openDB();
    db.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a drawing's Yjs state to IndexedDB as a raw Uint8Array (no base64 overhead).
 */
export async function saveDocument(
  drawingId: string,
  state: Uint8Array,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCUMENTS_STORE, "readwrite");
    tx.objectStore(DOCUMENTS_STORE).put(state, drawingId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Load a drawing's Yjs state from IndexedDB.
 * Returns null if the drawing does not exist.
 */
export async function loadDocument(
  drawingId: string,
): Promise<Uint8Array | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCUMENTS_STORE, "readonly");
    const req = tx.objectStore(DOCUMENTS_STORE).get(drawingId);
    req.onsuccess = () => {
      db.close();
      const result = req.result;
      if (result instanceof Uint8Array) {
        resolve(result);
      } else if (result) {
        // Handle ArrayBuffer stored by older code paths
        resolve(new Uint8Array(result as ArrayBuffer));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Delete a drawing's Yjs state from IndexedDB.
 */
export async function deleteDocument(drawingId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCUMENTS_STORE, "readwrite");
    tx.objectStore(DOCUMENTS_STORE).delete(drawingId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Load the drawing manifest (metadata array) from IndexedDB.
 * Returns an empty array if no manifest is stored.
 */
export async function loadManifestFromIDB(): Promise<DrawingMetadata[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MANIFEST_STORE, "readonly");
    const req = tx.objectStore(MANIFEST_STORE).get(MANIFEST_KEY);
    req.onsuccess = () => {
      db.close();
      resolve(Array.isArray(req.result) ? req.result : []);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Save the drawing manifest (metadata array) to IndexedDB.
 */
export async function saveManifestToIDB(
  drawings: DrawingMetadata[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MANIFEST_STORE, "readwrite");
    tx.objectStore(MANIFEST_STORE).put(drawings, MANIFEST_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Clear all Drawfinity data from IndexedDB (documents + manifest).
 */
export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DOCUMENTS_STORE, MANIFEST_STORE], "readwrite");
    tx.objectStore(DOCUMENTS_STORE).clear();
    tx.objectStore(MANIFEST_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
