import {
  readFile,
  writeFile,
  exists,
  remove,
} from "@tauri-apps/plugin-fs";
import { documentDir, join } from "@tauri-apps/api/path";
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

export class DrawingManager {
  private saveDir: string | null = null;
  private manifest: Manifest | null = null;

  async getDefaultSaveDirectory(): Promise<string> {
    const docDir = await documentDir();
    return join(docDir, DEFAULT_FOLDER_NAME);
  }

  async getSaveDirectory(): Promise<string> {
    if (this.saveDir) return this.saveDir;
    this.saveDir = await this.getDefaultSaveDirectory();
    return this.saveDir;
  }

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

  async listDrawings(): Promise<DrawingMetadata[]> {
    const manifest = await this.ensureManifest();
    return manifest.drawings;
  }

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

  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    entry.thumbnail = thumbnail;
    await this.persistManifest();
  }

  async getDrawingFilePath(id: string): Promise<string> {
    const manifest = await this.ensureManifest();
    const entry = manifest.drawings.find((d) => d.id === id);
    if (!entry) {
      throw new Error(`Drawing not found: ${id}`);
    }
    const dir = await this.getSaveDirectory();
    return join(dir, entry.fileName);
  }
}
