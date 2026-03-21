import {
  readFile,
  writeFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

/**
 * Metadata for a saved drawing, stored in the manifest file.
 *
 * Each entry in the {@link Manifest} `drawings` array is a `DrawingMetadata`
 * record that describes a single drawing without containing its actual
 * stroke/shape data. Used by the home screen to list drawings, display
 * thumbnails, and resolve file paths for loading.
 *
 * @property id - Unique identifier for the drawing (UUID).
 * @property name - User-visible display name of the drawing.
 * @property createdAt - ISO 8601 timestamp of when the drawing was first created.
 * @property modifiedAt - ISO 8601 timestamp of the most recent save.
 * @property thumbnail - Base64-encoded PNG data URI for the home screen preview (optional).
 * @property fileName - Name of the `.drawfinity` binary file that stores the drawing's Yjs document state.
 */
export interface DrawingMetadata {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  thumbnail?: string;
  fileName: string;
}

/**
 * Root structure of the `manifest.json` file persisted in the save directory.
 *
 * The manifest acts as an index of all saved drawings, storing their metadata
 * so the home screen can list them without opening each document file.
 *
 * @property version - Schema version number. Currently always `1`.
 * @property drawings - Array of {@link DrawingMetadata} entries, one per saved drawing.
 */
export interface Manifest {
  version: 1;
  drawings: DrawingMetadata[];
}

const MANIFEST_FILE = "manifest.json";

function createEmptyManifest(): Manifest {
  return { version: 1, drawings: [] };
}

/**
 * Loads the drawing manifest from the specified directory.
 *
 * Reads and parses the `manifest.json` file that tracks all saved drawings
 * and their metadata. If no manifest file exists yet, returns an empty
 * manifest with version 1 and no drawings.
 *
 * @param dir - Absolute path to the save directory containing `manifest.json`.
 * @returns The parsed {@link Manifest} object, or a fresh empty manifest if the file does not exist.
 * @throws If the file exists but contains invalid JSON or cannot be read.
 */
export async function loadManifest(dir: string): Promise<Manifest> {
  const path = await join(dir, MANIFEST_FILE);
  const fileExists = await exists(path);
  if (!fileExists) {
    return createEmptyManifest();
  }
  const data = await readFile(path);
  const text = new TextDecoder().decode(data);
  if (!text.trim()) {
    console.warn("DrawingManifest: manifest file is empty, returning fresh manifest");
    return createEmptyManifest();
  }
  try {
    return JSON.parse(text) as Manifest;
  } catch (err) {
    console.error("DrawingManifest: failed to parse manifest.json, returning fresh manifest", err);
    return createEmptyManifest();
  }
}

/**
 * Persists the drawing manifest to the specified directory as `manifest.json`.
 *
 * Serializes the manifest to pretty-printed JSON and writes it to disk.
 * If the target directory does not exist, it is created recursively before writing.
 *
 * @param dir - Absolute path to the save directory where `manifest.json` will be written.
 * @param manifest - The {@link Manifest} object to persist.
 * @throws If the file cannot be written (e.g., permission denied or disk full).
 */
export async function saveManifest(
  dir: string,
  manifest: Manifest,
): Promise<void> {
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
  const path = await join(dir, MANIFEST_FILE);
  const text = JSON.stringify(manifest, null, 2);
  const data = new TextEncoder().encode(text);
  await writeFile(path, data);
}
