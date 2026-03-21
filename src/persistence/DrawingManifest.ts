import {
  readFile,
  writeFile,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

export interface DrawingMetadata {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  thumbnail?: string;
  fileName: string;
}

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
  return JSON.parse(text) as Manifest;
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
