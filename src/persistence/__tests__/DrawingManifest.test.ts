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

import { readFile, writeFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { loadManifest, saveManifest, Manifest } from "../DrawingManifest";

describe("DrawingManifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadManifest", () => {
    it("returns empty manifest when file does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);

      const manifest = await loadManifest("/test/dir");
      expect(manifest).toEqual({ version: 1, drawings: [] });
    });

    it("parses manifest.json when it exists", async () => {
      const data: Manifest = {
        version: 1,
        drawings: [
          {
            id: "abc",
            name: "Test Drawing",
            createdAt: "2026-01-01T00:00:00.000Z",
            modifiedAt: "2026-01-01T00:00:00.000Z",
            fileName: "abc.drawfinity",
          },
        ],
      };
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(data)),
      );

      const manifest = await loadManifest("/test/dir");
      expect(manifest.version).toBe(1);
      expect(manifest.drawings).toHaveLength(1);
      expect(manifest.drawings[0].name).toBe("Test Drawing");
    });

    it("preserves optional thumbnail field", async () => {
      const data: Manifest = {
        version: 1,
        drawings: [
          {
            id: "abc",
            name: "With Thumb",
            createdAt: "2026-01-01T00:00:00.000Z",
            modifiedAt: "2026-01-01T00:00:00.000Z",
            thumbnail: "data:image/png;base64,abc123",
            fileName: "abc.drawfinity",
          },
        ],
      };
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(data)),
      );

      const manifest = await loadManifest("/test/dir");
      expect(manifest.drawings[0].thumbnail).toBe(
        "data:image/png;base64,abc123",
      );
    });
  });

  describe("saveManifest", () => {
    it("writes manifest.json to the directory", async () => {
      vi.mocked(exists).mockResolvedValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const manifest: Manifest = {
        version: 1,
        drawings: [
          {
            id: "x1",
            name: "My Drawing",
            createdAt: "2026-01-01T00:00:00.000Z",
            modifiedAt: "2026-01-02T00:00:00.000Z",
            fileName: "x1.drawfinity",
          },
        ],
      };

      await saveManifest("/test/dir", manifest);

      expect(writeFile).toHaveBeenCalledOnce();
      const [path, data] = vi.mocked(writeFile).mock.calls[0];
      expect(path).toBe("/test/dir/manifest.json");
      const text = new TextDecoder().decode(data as Uint8Array);
      const parsed = JSON.parse(text);
      expect(parsed.version).toBe(1);
      expect(parsed.drawings[0].name).toBe("My Drawing");
    });

    it("creates directory if it does not exist", async () => {
      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await saveManifest("/new/dir", { version: 1, drawings: [] });

      expect(mkdir).toHaveBeenCalledWith("/new/dir", { recursive: true });
    });
  });
});
