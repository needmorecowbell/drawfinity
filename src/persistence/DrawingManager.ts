import {
  readFile,
  writeFile,
  exists,
  remove,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
import { getDefaultFilePath } from "./LocalStorage";
import {
  DrawingMetadata,
  Manifest,
  loadManifest,
  saveManifest,
} from "./DrawingManifest";

const DEFAULT_FOLDER_NAME = "Drawfinity";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * File persistence manager for drawing CRUD operations via Tauri filesystem APIs.
 *
 * Manages a collection of `.drawfinity` files within a save directory, tracked
 * by a JSON manifest (`manifest.json`). Each drawing is stored as a binary file
 * containing Yjs CRDT state, with metadata (name, timestamps, thumbnail) kept
 * in the manifest.
 *
 * This class requires a Tauri environment — it uses `@tauri-apps/plugin-fs` and
 * `@tauri-apps/api/path` for all I/O. In browser-only mode, the app bypasses
 * this class entirely via dynamic import fallback in `main.ts`.
 *
 * @example
 * ```ts
 * const manager = new DrawingManager();
 * const drawing = await manager.createDrawing("My Sketch");
 * await manager.saveDrawing(drawing.id, crdtState);
 * const data = await manager.openDrawing(drawing.id);
 * ```
 */
export class DrawingManager {
  private saveDir: string | null = null;
  private manifest: Manifest | null = null;

  /**
   * Returns the default save directory path (`<Documents>/Drawfinity`).
   *
   * @returns The absolute path to the default save directory.
   */
  async getDefaultSaveDirectory(): Promise<string> {
    const docDir = await documentDir();
    return join(docDir, DEFAULT_FOLDER_NAME);
  }

  /**
   * Returns the current save directory, initializing to the default if not yet set.
   *
   * The resolved path is cached for subsequent calls. Use {@link setSaveDirectory}
   * to override the default location.
   *
   * @returns The absolute path to the active save directory.
   */
  async getSaveDirectory(): Promise<string> {
    if (this.saveDir) return this.saveDir;
    this.saveDir = await this.getDefaultSaveDirectory();
    return this.saveDir;
  }

  /**
   * Overrides the save directory path. Clears the cached manifest so it will
   * be reloaded from the new location on next access.
   *
   * @param path - Absolute path to the new save directory.
   */
  setSaveDirectory(path: string): void {
    this.saveDir = path;
    this.manifest = null;
  }

  private async ensureManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest;
    const dir = await this.getSaveDirectory();
    this.manifest = await loadManifest(dir);
    return this.manifest;
  }

  private async persistManifest(): Promise<void> {
    if (!this.manifest) return;
    const dir = await this.getSaveDirectory();
    await saveManifest(dir, this.manifest);
  }

  /**
   * Returns metadata for all drawings tracked by the manifest.
   *
   * @returns Array of drawing metadata entries, in manifest order.
   */
  async listDrawings(): Promise<DrawingMetadata[]> {
    const manifest = await this.ensureManifest();
    return manifest.drawings;
  }

  /**
   * Returns the name of a drawing by its ID.
   *
   * @param id - The drawing's unique identifier.
   * @returns The drawing name, or `"Untitled"` if the ID is not found.
   */
  async getDrawingName(id: string): Promise<string> {
    const manifest = await this.ensureManifest();
    const drawing = manifest.drawings.find((d) => d.id === id);
    return drawing?.name ?? "Untitled";
  }

  /**
   * Creates a new drawing with the given name.
   *
   * Generates a unique ID, writes an empty `.drawfinity` file to disk,
   * and adds the entry to the manifest.
   *
   * @param name - Display name for the new drawing.
   * @returns Metadata for the newly created drawing.
   */
  async createDrawing(name: string): Promise<DrawingMetadata> {
    const manifest = await this.ensureManifest();
    const id = generateId();
    const fileName = `${id}.drawfinity`;
    const now = new Date().toISOString();

    const metadata: DrawingMetadata = {
      id,
      name,
      createdAt: now,
      modifiedAt: now,
      fileName,
    };

    const dir = await this.getSaveDirectory();
    const filePath = await join(dir, fileName);
    await writeFile(filePath, new Uint8Array(0));

    manifest.drawings.push(metadata);
    await this.persistManifest();
    return metadata;
  }

  /**
   * Reads a drawing's binary data (Yjs CRDT state) from disk.
   *
   * Returns an empty `Uint8Array` if the file does not exist on disk
   * (e.g., it was deleted externally), rather than throwing.
   *
   * @param id - The drawing's unique identifier.
   * @returns The raw binary content of the `.drawfinity` file.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async openDrawing(id: string): Promise<Uint8Array> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    const dir = await this.getSaveDirectory();
    const filePath = await join(dir, entry.fileName);
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return new Uint8Array(0);
    }
    return readFile(filePath);
  }

  /**
   * Writes binary state data to an existing drawing's file.
   *
   * Updates the drawing's `modifiedAt` timestamp in the manifest.
   *
   * @param id - The drawing's unique identifier.
   * @param state - The Yjs CRDT state bytes to persist.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async saveDrawing(id: string, state: Uint8Array): Promise<void> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    const dir = await this.getSaveDirectory();
    const filePath = await join(dir, entry.fileName);
    await writeFile(filePath, state);
    entry.modifiedAt = new Date().toISOString();
    await this.persistManifest();
  }

  /**
   * Deletes a drawing's file from disk and removes it from the manifest.
   *
   * Silently skips file removal if the file is already absent on disk.
   *
   * @param id - The drawing's unique identifier.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async deleteDrawing(id: string): Promise<void> {
    const manifest = await this.ensureManifest();
    const idx = manifest.drawings.findIndex((d) => d.id === id);
    if (idx === -1) {
      throw new Error(`Drawing not found: ${id}`);
    }
    const entry = manifest.drawings[idx];
    const dir = await this.getSaveDirectory();
    const filePath = await join(dir, entry.fileName);
    const fileExists = await exists(filePath);
    if (fileExists) {
      await remove(filePath);
    }
    manifest.drawings.splice(idx, 1);
    await this.persistManifest();
  }

  /**
   * Renames a drawing in the manifest. Updates the `modifiedAt` timestamp.
   *
   * The underlying file on disk is not renamed — only the display name changes.
   *
   * @param id - The drawing's unique identifier.
   * @param name - The new display name.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async renameDrawing(id: string, name: string): Promise<void> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    entry.name = name;
    entry.modifiedAt = new Date().toISOString();
    await this.persistManifest();
  }

  /**
   * Creates a copy of an existing drawing with a new name.
   *
   * Copies the binary file on disk (or creates an empty file if the source
   * is missing) and adds a new manifest entry with fresh ID and timestamps.
   * The duplicate inherits the source drawing's thumbnail.
   *
   * @param id - The source drawing's unique identifier.
   * @param newName - Display name for the duplicate.
   * @returns Metadata for the newly created duplicate.
   * @throws {Error} If the source drawing ID is not found in the manifest.
   */
  async duplicateDrawing(
    id: string,
    newName: string,
  ): Promise<DrawingMetadata> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }

    const newId = generateId();
    const newFileName = `${newId}.drawfinity`;
    const now = new Date().toISOString();
    const dir = await this.getSaveDirectory();

    const srcPath = await join(dir, entry.fileName);
    const dstPath = await join(dir, newFileName);

    const fileExists = await exists(srcPath);
    if (fileExists) {
      const data = await readFile(srcPath);
      await writeFile(dstPath, data);
    } else {
      await writeFile(dstPath, new Uint8Array(0));
    }

    const newMetadata: DrawingMetadata = {
      id: newId,
      name: newName,
      createdAt: now,
      modifiedAt: now,
      thumbnail: entry.thumbnail,
      fileName: newFileName,
    };

    manifest.drawings.push(newMetadata);
    await this.persistManifest();
    return newMetadata;
  }

  /**
   * Updates the thumbnail data URI for a drawing in the manifest.
   *
   * @param id - The drawing's unique identifier.
   * @param thumbnail - Base64-encoded data URI of the thumbnail image.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    entry.thumbnail = thumbnail;
    await this.persistManifest();
  }

  /**
   * Returns the absolute filesystem path for a drawing's `.drawfinity` file.
   *
   * @param id - The drawing's unique identifier.
   * @returns The absolute path to the drawing file on disk.
   * @throws {Error} If the drawing ID is not found in the manifest.
   */
  async getDrawingFilePath(id: string): Promise<string> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    const dir = await this.getSaveDirectory();
    return join(dir, entry.fileName);
  }

  /**
   * Detect and migrate a legacy single-file drawing into the manifest system.
   * On first launch, if the old `drawing.drawfinity` exists at the legacy path
   * and the manifest is empty, copy it into the manifest as "Untitled Drawing".
   * Returns the migrated drawing's metadata, or null if no migration was needed.
   */
  async migrateFromSingleFile(): Promise<DrawingMetadata | null> {
    const manifest = await this.ensureManifest();
    if (manifest.drawings.length > 0) {
      return null; // Already has drawings, no migration needed
    }

    const legacyPath = await getDefaultFilePath();
    const legacyExists = await exists(legacyPath);
    if (!legacyExists) {
      return null; // No legacy file to migrate
    }

    const legacyData = await readFile(legacyPath);
    if (legacyData.length === 0) {
      return null; // Empty legacy file, nothing to migrate
    }

    const id = generateId();
    const fileName = `${id}.drawfinity`;
    const now = new Date().toISOString();

    const metadata: DrawingMetadata = {
      id,
      name: "Untitled Drawing",
      createdAt: now,
      modifiedAt: now,
      fileName,
    };

    const dir = await this.getSaveDirectory();
    const filePath = await join(dir, fileName);
    await writeFile(filePath, legacyData);

    manifest.drawings.push(metadata);
    await this.persistManifest();
    return metadata;
  }
}
