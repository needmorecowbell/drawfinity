// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculatePlacedImageSize,
  createCanvasImageFromFile,
  dataTransferHasImageContent,
  extractImageFileFromDataTransfer,
  isFileSizeWithinLimit,
  isSupportedImageFile,
  resizeDataUriToLimit,
} from "../ImageUpload";
import { MAX_IMAGE_SOURCE_BYTES } from "../../model";

function makeFileOfSize(bytes: number, type = "image/png"): File {
  const file = new File(["x"], "huge.png", { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 400;
  naturalWidth = 800;
  naturalHeight = 400;

  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

describe("ImageUpload", () => {
  const OriginalImage = globalThis.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.Image = OriginalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    vi.restoreAllMocks();
  });

  it("accepts PNG, JPG, JPEG, and WebP files only", () => {
    expect(isSupportedImageFile(new File([""], "a.png", { type: "image/png" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "a.jpg", { type: "image/jpg" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "a.jpeg", { type: "image/jpeg" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "a.webp", { type: "image/webp" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "a.gif", { type: "image/gif" }))).toBe(false);
  });

  // Minimal DataTransfer stand-in: jsdom does not build a real one, and the
  // WebKitGTK (Tauri) WebView often only populates `items`, not `files`.
  function makeDataTransfer(opts: {
    files?: File[];
    items?: Array<{ kind: string; type: string; file?: File | null }>;
  }): Pick<DataTransfer, "files" | "items"> {
    return {
      files: (opts.files ?? []) as unknown as FileList,
      items: (opts.items ?? []).map((i) => ({
        kind: i.kind,
        type: i.type,
        getAsFile: () => i.file ?? null,
      })) as unknown as DataTransferItemList,
    };
  }

  it("extracts a pasted image from .files when present", () => {
    const file = new File(["x"], "p.png", { type: "image/png" });
    expect(extractImageFileFromDataTransfer(makeDataTransfer({ files: [file] }))).toBe(file);
  });

  it("falls back to .items when .files is empty (WebKitGTK paste path)", () => {
    const file = new File(["x"], "p.png", { type: "image/png" });
    const data = makeDataTransfer({
      items: [{ kind: "file", type: "image/png", file }],
    });
    expect(extractImageFileFromDataTransfer(data)).toBe(file);
  });

  it("ignores unsupported item types and null blobs", () => {
    expect(
      extractImageFileFromDataTransfer(
        makeDataTransfer({ items: [{ kind: "file", type: "image/gif", file: new File(["x"], "g.gif", { type: "image/gif" }) }] }),
      ),
    ).toBeNull();
    expect(
      extractImageFileFromDataTransfer(
        makeDataTransfer({ items: [{ kind: "file", type: "image/png", file: null }] }),
      ),
    ).toBeNull();
    expect(extractImageFileFromDataTransfer(null)).toBeNull();
  });

  it("detects image content even when no usable file can be extracted", () => {
    expect(
      dataTransferHasImageContent(makeDataTransfer({ items: [{ kind: "file", type: "image/png", file: null }] })),
    ).toBe(true);
    expect(
      dataTransferHasImageContent(makeDataTransfer({ items: [{ kind: "string", type: "text/plain" }] })),
    ).toBe(false);
    expect(dataTransferHasImageContent(null)).toBe(false);
  });

  it("sizes inserted images to half the viewport width in world space", () => {
    const size = calculatePlacedImageSize(
      { width: 1600, height: 800 },
      { viewportWidth: 1000, zoom: 2 },
    );

    expect(size.width).toBe(250);
    expect(size.height).toBe(125);
  });

  it("creates a canvas image from a file at the requested world center", async () => {
    const promise = createCanvasImageFromFile(
      new File(["hello"], "photo.png", { type: "image/png" }),
      { viewportWidth: 800, viewportHeight: 600, zoom: 1, centerX: 12, centerY: 34 },
    );
    await vi.runAllTimersAsync();
    const image = await promise;

    expect(image.id).toMatch(/^image-/);
    expect(image.src).toMatch(/^data:image\/png;base64,/);
    expect(image.x).toBe(12);
    expect(image.y).toBe(34);
    expect(image.width).toBe(400);
    expect(image.height).toBe(200);
    expect(image.opacity).toBe(1);
  });

  it("reports whether a raw file is within the inline byte limit", () => {
    expect(isFileSizeWithinLimit(makeFileOfSize(MAX_IMAGE_SOURCE_BYTES))).toBe(true);
    expect(isFileSizeWithinLimit(makeFileOfSize(MAX_IMAGE_SOURCE_BYTES + 1))).toBe(false);
  });

  it("rejects an oversized file up-front instead of silently downsampling it", async () => {
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as unknown as typeof originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,small");

    const oversized = makeFileOfSize(MAX_IMAGE_SOURCE_BYTES + 1);
    const promise = createCanvasImageFromFile(oversized, {
      viewportWidth: 800,
      viewportHeight: 600,
      zoom: 1,
      centerX: 0,
      centerY: 0,
    });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow(/too large|2(\.0)? ?MB/i);
    // Guard must fire before any resize/draw work happens.
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it("resizes oversized data URIs until they fit the inline byte limit", async () => {
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as unknown as typeof originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,small");

    const oversized = `data:image/png;base64,${"a".repeat(120)}`;
    const promise = resizeDataUriToLimit(oversized, "image/png", 80);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.src).toBe("data:image/png;base64,small");
    expect(result.dimensions.width).toBeLessThan(800);
    expect(context.drawImage).toHaveBeenCalled();
  });
});
