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
