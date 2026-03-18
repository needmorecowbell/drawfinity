import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  documentDir: vi.fn(async () => "/home/user/Documents"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));

import {
  readFile,
  writeFile,
  exists,
  remove,
} from "@tauri-apps/plugin-fs";
import { DrawingManager } from "../DrawingManager";

describe("DrawingManager", () => {
  let manager: DrawingManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DrawingManager();
    // Default: no existing manifest
    vi.mocked(exists).mockResolvedValue(false);
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  describe("getDefaultSaveDirectory", () => {
    it("returns ~/Documents/Drawfinity", async () => {
      const dir = await manager.getDefaultSaveDirectory();
      expect(dir).toBe("/home/user/Documents/Drawfinity");
    });
  });

  describe("listDrawings", () => {
    it("returns empty array when no manifest exists", async () => {
      const list = await manager.listDrawings();
      expect(list).toEqual([]);
    });

    it("returns drawings from existing manifest", async () => {
      const manifest = {
        version: 1,
        drawings: [
          {
            id: "d1",
            name: "Drawing 1",
            createdAt: "2026-01-01T00:00:00.000Z",
            modifiedAt: "2026-01-01T00:00:00.000Z",
            fileName: "d1.drawfinity",
          },
        ],
      };
      vi.mocked(exists).mockImplementation(async (path) => {
        if (typeof path === "string" && path.endsWith("manifest.json"))
          return true;
        return false;
      });
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(manifest)),
      );

      const list = await manager.listDrawings();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("Drawing 1");
    });
  });

  describe("createDrawing", () => {
    it("creates a new drawing with correct metadata", async () => {
      const result = await manager.createDrawing("My New Drawing");

      expect(result.name).toBe("My New Drawing");
      expect(result.id).toBeTruthy();
      expect(result.fileName).toMatch(/\.drawfinity$/);
      expect(result.createdAt).toBeTruthy();
      expect(result.modifiedAt).toBeTruthy();
    });

    it("writes an empty file and saves manifest", async () => {
      await manager.createDrawing("Test");

      // writeFile called twice: once for the .drawfinity file, once for manifest
      expect(writeFile).toHaveBeenCalledTimes(2);
    });

    it("adds drawing to the list", async () => {
      await manager.createDrawing("First");
      await manager.createDrawing("Second");

      const list = await manager.listDrawings();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe("First");
      expect(list[1].name).toBe("Second");
    });
  });

  describe("openDrawing", () => {
    it("reads the drawing file by ID", async () => {
      const stateBytes = new Uint8Array([1, 2, 3, 4]);
      const drawing = await manager.createDrawing("Open Test");
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(stateBytes);

      const data = await openDrawingSafe(manager, drawing.id);
      expect(data).toEqual(stateBytes);
    });

    it("throws for unknown ID", async () => {
      await expect(manager.openDrawing("nonexistent")).rejects.toThrow(
        "Drawing not found",
      );
    });

    it("returns empty Uint8Array when file does not exist on disk", async () => {
      const drawing = await manager.createDrawing("Missing File");
      vi.mocked(exists).mockResolvedValue(false);

      const data = await manager.openDrawing(drawing.id);
      expect(data).toEqual(new Uint8Array(0));
    });
  });

  describe("saveDrawing", () => {
    it("writes state bytes and updates modifiedAt", async () => {
      const drawing = await manager.createDrawing("Save Test");
      const originalModified = drawing.modifiedAt;

      // Advance time slightly
      await new Promise((r) => setTimeout(r, 10));

      vi.clearAllMocks();
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const state = new Uint8Array([10, 20, 30]);
      await manager.saveDrawing(drawing.id, state);

      expect(writeFile).toHaveBeenCalled();
      const list = await manager.listDrawings();
      const saved = list.find((d) => d.id === drawing.id)!;
      expect(saved.modifiedAt).not.toBe(originalModified);
    });

    it("throws for unknown ID", async () => {
      await expect(
        manager.saveDrawing("bad-id", new Uint8Array()),
      ).rejects.toThrow("Drawing not found");
    });
  });

  describe("deleteDrawing", () => {
    it("removes drawing from manifest and deletes file", async () => {
      const drawing = await manager.createDrawing("Delete Me");
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(remove).mockResolvedValue(undefined);

      await manager.deleteDrawing(drawing.id);

      const list = await manager.listDrawings();
      expect(list.find((d) => d.id === drawing.id)).toBeUndefined();
      expect(remove).toHaveBeenCalled();
    });

    it("handles missing file gracefully", async () => {
      const drawing = await manager.createDrawing("Already Gone");
      vi.mocked(exists).mockResolvedValue(false);

      await manager.deleteDrawing(drawing.id);

      expect(remove).not.toHaveBeenCalled();
      const list = await manager.listDrawings();
      expect(list).toHaveLength(0);
    });

    it("throws for unknown ID", async () => {
      await expect(manager.deleteDrawing("nope")).rejects.toThrow(
        "Drawing not found",
      );
    });
  });

  describe("renameDrawing", () => {
    it("updates the name in manifest", async () => {
      const drawing = await manager.createDrawing("Old Name");

      vi.clearAllMocks();
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await manager.renameDrawing(drawing.id, "New Name");

      const list = await manager.listDrawings();
      expect(list.find((d) => d.id === drawing.id)!.name).toBe("New Name");
    });

    it("throws for unknown ID", async () => {
      await expect(manager.renameDrawing("bad", "Name")).rejects.toThrow(
        "Drawing not found",
      );
    });
  });

  describe("duplicateDrawing", () => {
    it("creates a copy with new ID and name", async () => {
      const original = await manager.createDrawing("Original");
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));

      const copy = await manager.duplicateDrawing(original.id, "Copy");

      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe("Copy");
      expect(copy.fileName).not.toBe(original.fileName);

      const list = await manager.listDrawings();
      expect(list).toHaveLength(2);
    });

    it("copies thumbnail from original", async () => {
      const original = await manager.createDrawing("With Thumb");

      vi.clearAllMocks();
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await manager.updateThumbnail(original.id, "data:image/png;base64,abc");
      vi.mocked(readFile).mockResolvedValue(new Uint8Array([]));

      const copy = await manager.duplicateDrawing(
        original.id,
        "Copy With Thumb",
      );
      expect(copy.thumbnail).toBe("data:image/png;base64,abc");
    });

    it("throws for unknown ID", async () => {
      await expect(manager.duplicateDrawing("bad", "Copy")).rejects.toThrow(
        "Drawing not found",
      );
    });
  });

  describe("setSaveDirectory", () => {
    it("changes the save directory", async () => {
      manager.setSaveDirectory("/custom/path");

      // Creating a drawing should use the new path
      await manager.createDrawing("Custom Dir");

      const writeCalls = vi.mocked(writeFile).mock.calls;
      const paths = writeCalls.map((c) => c[0] as string);
      expect(paths.some((p) => p.startsWith("/custom/path"))).toBe(true);
    });
  });

  describe("updateThumbnail", () => {
    it("stores thumbnail in manifest entry", async () => {
      const drawing = await manager.createDrawing("Thumbed");

      vi.clearAllMocks();
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await manager.updateThumbnail(
        drawing.id,
        "data:image/png;base64,xyz",
      );

      const list = await manager.listDrawings();
      expect(list.find((d) => d.id === drawing.id)!.thumbnail).toBe(
        "data:image/png;base64,xyz",
      );
    });
  });

  describe("getDrawingFilePath", () => {
    it("returns full path for a drawing", async () => {
      const drawing = await manager.createDrawing("Path Test");
      const filePath = await manager.getDrawingFilePath(drawing.id);
      expect(filePath).toContain(drawing.fileName);
      expect(filePath).toContain("Drawfinity");
    });
  });
});

async function openDrawingSafe(
  manager: DrawingManager,
  id: string,
): Promise<Uint8Array> {
  return manager.openDrawing(id);
}
