// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExportDialog } from "../ExportDialog";
import type { ExportDialogResult } from "../ExportDialog";

describe("ExportDialog", () => {
  let dialog: ExportDialog;
  let onExport: ReturnType<typeof vi.fn<(options: ExportDialogResult) => void>>;
  let button: HTMLButtonElement;

  beforeEach(() => {
    onExport = vi.fn();
    button = document.createElement("button");
    document.body.appendChild(button);
  });

  afterEach(() => {
    dialog?.destroy();
    button.remove();
  });

  function createDialog() {
    dialog = new ExportDialog({ onExport });
    dialog.attach(button);
    return dialog;
  }

  function openPopover() {
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  }

  describe("initialization", () => {
    it("starts closed", () => {
      createDialog();
      expect(dialog.isOpen()).toBe(false);
    });

    it("does not create popover DOM until opened", () => {
      createDialog();
      expect(document.querySelector(".export-popover")).toBeNull();
    });
  });

  describe("popover toggle", () => {
    it("opens popover on button click", () => {
      createDialog();
      openPopover();
      expect(dialog.isOpen()).toBe(true);
      expect(document.querySelector(".export-popover")).not.toBeNull();
    });

    it("closes popover on second button click", () => {
      createDialog();
      openPopover();
      expect(dialog.isOpen()).toBe(true);
      openPopover();
      expect(dialog.isOpen()).toBe(false);
    });

    it("removes popover from DOM when hidden", () => {
      createDialog();
      openPopover();
      expect(document.querySelector(".export-popover")).not.toBeNull();
      dialog.hidePopover();
      expect(document.querySelector(".export-popover")).toBeNull();
    });

    it("positions popover with fixed positioning", () => {
      createDialog();
      openPopover();
      const popover = document.querySelector(".export-popover") as HTMLElement;
      expect(popover.style.position).toBe("fixed");
    });
  });

  describe("popover content", () => {
    it("creates scope option buttons", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const texts = Array.from(options).map(o => o.textContent);
      expect(texts).toContain("Current viewport");
      expect(texts).toContain("Fit all content");
    });

    it("creates resolution option buttons", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const texts = Array.from(options).map(o => o.textContent);
      expect(texts).toContain("1x");
      expect(texts).toContain("2x");
      expect(texts).toContain("4x");
    });

    it("creates background option buttons", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const texts = Array.from(options).map(o => o.textContent);
      expect(texts).toContain("Include");
      expect(texts).toContain("Transparent");
    });

    it("creates export confirm button", () => {
      createDialog();
      openPopover();
      const btn = document.querySelector(".export-confirm-btn");
      expect(btn).not.toBeNull();
      expect(btn?.textContent).toBe("Export PNG");
    });

    it("has labels for each section", () => {
      createDialog();
      openPopover();
      const labels = document.querySelectorAll(".export-label");
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain("Scope");
      expect(texts).toContain("Resolution");
      expect(texts).toContain("Background");
    });
  });

  describe("default selections", () => {
    it("defaults to fitAll scope", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const fitAll = Array.from(options).find(o => o.textContent === "Fit all content");
      expect(fitAll?.classList.contains("active")).toBe(true);
    });

    it("defaults to 1x resolution", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const oneX = Array.from(options).find(o => o.textContent === "1x");
      expect(oneX?.classList.contains("active")).toBe(true);
    });

    it("defaults to include background", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const include = Array.from(options).find(o => o.textContent === "Include");
      expect(include?.classList.contains("active")).toBe(true);
    });
  });

  describe("option selection", () => {
    it("switches scope to viewport", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const viewport = Array.from(options).find(o => o.textContent === "Current viewport") as HTMLButtonElement;
      viewport.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(viewport.classList.contains("active")).toBe(true);
      const fitAll = Array.from(options).find(o => o.textContent === "Fit all content");
      expect(fitAll?.classList.contains("active")).toBe(false);
    });

    it("switches resolution to 2x", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const twoX = Array.from(options).find(o => o.textContent === "2x") as HTMLButtonElement;
      twoX.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(twoX.classList.contains("active")).toBe(true);
    });

    it("switches background to transparent", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const transparent = Array.from(options).find(o => o.textContent === "Transparent") as HTMLButtonElement;
      transparent.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(transparent.classList.contains("active")).toBe(true);
    });
  });

  describe("export confirm", () => {
    it("calls onExport with default options", () => {
      createDialog();
      openPopover();
      const btn = document.querySelector(".export-confirm-btn") as HTMLButtonElement;
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(onExport).toHaveBeenCalledWith({
        format: "png",
        scope: "fitAll",
        scale: 1,
        includeBackground: true,
      });
    });

    it("calls onExport with selected options", () => {
      createDialog();
      openPopover();

      // Select viewport scope
      const options = document.querySelectorAll(".export-option");
      const viewport = Array.from(options).find(o => o.textContent === "Current viewport") as HTMLButtonElement;
      viewport.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Select 4x resolution
      const fourX = Array.from(options).find(o => o.textContent === "4x") as HTMLButtonElement;
      fourX.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Select transparent
      const transparent = Array.from(options).find(o => o.textContent === "Transparent") as HTMLButtonElement;
      transparent.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Confirm export
      const btn = document.querySelector(".export-confirm-btn") as HTMLButtonElement;
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(onExport).toHaveBeenCalledWith({
        format: "png",
        scope: "viewport",
        scale: 4,
        includeBackground: false,
      });
    });

    it("closes popover after export", () => {
      createDialog();
      openPopover();
      const btn = document.querySelector(".export-confirm-btn") as HTMLButtonElement;
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(dialog.isOpen()).toBe(false);
    });
  });

  describe("dismiss", () => {
    it("closes on click outside after next frame", async () => {
      createDialog();
      openPopover();
      expect(dialog.isOpen()).toBe(true);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      document.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(dialog.isOpen()).toBe(false);
    });

    it("does not close when clicking inside popover", async () => {
      createDialog();
      openPopover();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const popover = document.querySelector(".export-popover") as HTMLElement;
      popover.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(dialog.isOpen()).toBe(true);
    });
  });

  describe("format selector", () => {
    it("creates format option buttons (PNG and SVG)", () => {
      createDialog();
      openPopover();
      const labels = document.querySelectorAll(".export-label");
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain("Format");
      const options = document.querySelectorAll(".export-option");
      const optTexts = Array.from(options).map(o => o.textContent);
      expect(optTexts).toContain("PNG");
      expect(optTexts).toContain("SVG");
    });

    it("defaults to PNG format", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const png = Array.from(options).find(o => o.textContent === "PNG");
      expect(png?.classList.contains("active")).toBe(true);
      const svg = Array.from(options).find(o => o.textContent === "SVG");
      expect(svg?.classList.contains("active")).toBe(false);
    });

    it("hides resolution row when SVG is selected", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const svgBtn = Array.from(options).find(o => o.textContent === "SVG") as HTMLButtonElement;
      svgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const labels = document.querySelectorAll(".export-label");
      const resLabel = Array.from(labels).find(l => l.textContent === "Resolution");
      const resRow = resLabel?.closest(".export-row") as HTMLElement;
      expect(resRow.style.display).toBe("none");
    });

    it("shows resolution row when switching back to PNG", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const svgBtn = Array.from(options).find(o => o.textContent === "SVG") as HTMLButtonElement;
      const pngBtn = Array.from(options).find(o => o.textContent === "PNG") as HTMLButtonElement;

      svgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      pngBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const labels = document.querySelectorAll(".export-label");
      const resLabel = Array.from(labels).find(l => l.textContent === "Resolution");
      const resRow = resLabel?.closest(".export-row") as HTMLElement;
      expect(resRow.style.display).toBe("");
    });

    it("updates export button text when format changes", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const svgBtn = Array.from(options).find(o => o.textContent === "SVG") as HTMLButtonElement;
      svgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const exportBtn = document.querySelector(".export-confirm-btn");
      expect(exportBtn?.textContent).toBe("Export SVG");
    });

    it("calls onExport with svg format when SVG is selected", () => {
      createDialog();
      openPopover();
      const options = document.querySelectorAll(".export-option");
      const svgBtn = Array.from(options).find(o => o.textContent === "SVG") as HTMLButtonElement;
      svgBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const btn = document.querySelector(".export-confirm-btn") as HTMLButtonElement;
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(onExport).toHaveBeenCalledWith({
        format: "svg",
        scope: "fitAll",
        scale: 1,
        includeBackground: true,
      });
    });
  });

  describe("lifecycle", () => {
    it("cleans up popover on destroy", () => {
      createDialog();
      openPopover();
      expect(document.querySelector(".export-popover")).not.toBeNull();
      dialog.destroy();
      expect(document.querySelector(".export-popover")).toBeNull();
    });

    it("detaches event listeners on destroy", () => {
      createDialog();
      dialog.destroy();
      openPopover();
      expect(dialog.isOpen()).toBe(false);
    });
  });
});
