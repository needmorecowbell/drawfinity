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
