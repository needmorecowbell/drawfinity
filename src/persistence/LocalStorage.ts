import * as Y from "yjs";
import {
  readFile,
  writeFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import type { DrawingManager } from "./DrawingManager";

const DEFAULT_FOLDER_NAME = "Drawfinity";
const DEFAULT_FILE_NAME = "drawing.drawfinity";

export async function getDefaultSavePath(): Promise<string> {
  const docDir = await documentDir();
  return join(docDir, DEFAULT_FOLDER_NAME);
}

export async function getDefaultFilePath(): Promise<string> {
  const folder = await getDefaultSavePath();
  return join(folder, DEFAULT_FILE_NAME);
}

/**
 * Persists a Yjs document's full state to a binary file on the local filesystem.
 *
 * Encodes the document using {@link Y.encodeStateAsUpdate} and writes the resulting
 * binary data to `filePath`. Parent directories are created automatically if they
 * do not already exist.
 *
 * @param doc - The Yjs document whose state will be serialized and saved.
 * @param filePath - Absolute path where the `.drawfinity` file will be written.
 * @returns Resolves when the file has been written successfully.
 * @throws If the filesystem write fails (e.g., permission denied, disk full).
 */
export async function saveDocument(
  doc: Y.Doc,
  filePath: string,
): Promise<void> {
  const update = Y.encodeStateAsUpdate(doc);

  // Ensure parent directory exists
  const lastSep = filePath.lastIndexOf("/");
  if (lastSep > 0) {
    const dir = filePath.substring(0, lastSep);
    const dirExists = await exists(dir);
    if (!dirExists) {
      await mkdir(dir, { recursive: true });
    }
  }

  await writeFile(filePath, update);
}

/**
 * Loads a Yjs document from a `.drawfinity` binary file on the local filesystem.
 *
 * Reads the binary state from `filePath` and applies it to a fresh {@link Y.Doc}
 * instance using {@link Y.applyUpdate}. Returns `null` if the file does not exist,
 * allowing callers to distinguish between a missing file and an empty document.
 *
 * @param filePath - Absolute path to the `.drawfinity` file to load.
 * @returns A hydrated Yjs document, or `null` if the file does not exist.
 * @throws If the file exists but cannot be read (e.g., permission denied, corrupt data).
 */
export async function loadDocument(filePath: string): Promise<Y.Doc | null> {
  const fileExists = await exists(filePath);
  if (!fileExists) {
    return null;
  }

  const data = await readFile(filePath);
  const doc = new Y.Doc();
  Y.applyUpdate(doc, data);
  return doc;
}

/**
 * Save a Y.Doc to a drawing managed by DrawingManager, identified by drawing ID.
 */
export async function saveDocumentById(
  doc: Y.Doc,
  drawingId: string,
  manager: DrawingManager,
): Promise<void> {
  const state = Y.encodeStateAsUpdate(doc);
  await manager.saveDrawing(drawingId, state);
}

/**
 * Load a Y.Doc from a drawing managed by DrawingManager, identified by drawing ID.
 * Returns null if the drawing state is empty.
 */
export async function loadDocumentById(
  drawingId: string,
  manager: DrawingManager,
): Promise<Y.Doc | null> {
  const state = await manager.openDrawing(drawingId);
  if (state.length === 0) {
    return null;
  }
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  return doc;
}
