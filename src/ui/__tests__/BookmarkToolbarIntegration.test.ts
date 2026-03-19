// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BookmarkPanel } from "../BookmarkPanel";
import { DrawfinityDoc } from "../../crdt/DrawfinityDoc";
import { Camera } from "../../camera/Camera";
import { CameraBookmark } from "../../model/Bookmark";
import { ICONS } from "../ToolbarIcons";

describe("Bookmark Toolbar Integration", () => {
  let panel: BookmarkPanel;
  let doc: DrawfinityDoc;
  let camera: Camera;
  let navigateSpy: ReturnType<typeof vi.fn<(bookmark: CameraBookmark) => void>>;

  beforeEach(() => {
    doc = new DrawfinityDoc();
    camera = new Camera();
    camera.x = 100;
    camera.y = 200;
    camera.zoom = 1.5;
    navigateSpy = vi.fn<(bookmark: CameraBookmark) => void>();
    panel = new BookmarkPanel(doc, camera, {
      onNavigate: navigateSpy,
      getUserId: () => "test-user",
      getUserName: () => "Test User",
    });
  });

  afterEach(() => {
    panel.destroy();
  });

  describe("Ctrl+B toggle behavior", () => {
    it("toggle() shows panel when hidden", () => {
      expect(panel.isVisible()).toBe(false);
      panel.toggle();
      expect(panel.isVisible()).toBe(true);
    });

    it("toggle() hides panel when shown", () => {
      panel.show();
      panel.toggle();
      expect(panel.isVisible()).toBe(false);
    });

    it("repeated toggle cycles visibility", () => {
      panel.toggle();
      expect(panel.isVisible()).toBe(true);
      panel.toggle();
      expect(panel.isVisible()).toBe(false);
      panel.toggle();
      expect(panel.isVisible()).toBe(true);
    });
  });

  describe("Ctrl+D quick-add behavior", () => {
    it("addBookmark() captures current camera position", () => {
      panel.addBookmark();

      const bookmarks = doc.getBookmarks();
      expect(bookmarks.length).toBe(1);
      expect(bookmarks[0].x).toBe(100);
      expect(bookmarks[0].y).toBe(200);
      expect(bookmarks[0].zoom).toBe(1.5);
    });

    it("addBookmark() uses auto-incrementing default label", () => {
      panel.addBookmark();
      panel.addBookmark();
      panel.addBookmark();

      const bookmarks = doc.getBookmarks();
      expect(bookmarks[0].label).toBe("Bookmark 1");
      expect(bookmarks[1].label).toBe("Bookmark 2");
      expect(bookmarks[2].label).toBe("Bookmark 3");
    });

    it("addBookmark() opens panel if not visible", () => {
      expect(panel.isVisible()).toBe(false);
      panel.addBookmark();
      expect(panel.isVisible()).toBe(true);
    });

    it("addBookmark() does not close panel if already visible", () => {
      panel.show();
      panel.addBookmark();
      expect(panel.isVisible()).toBe(true);
    });

    it("addBookmark() with custom label uses that label", () => {
      panel.addBookmark("My Custom View");

      const bookmarks = doc.getBookmarks();
      expect(bookmarks[0].label).toBe("My Custom View");
    });
  });

  describe("Toolbar bookmark button", () => {
    it("bookmark icon SVG is available in ICONS", () => {
      expect(ICONS.bookmark).toBeDefined();
      expect(ICONS.bookmark).toContain("<svg");
      expect(ICONS.bookmark).toContain("</svg>");
    });

    it("button can be created with bookmark icon and wired to toggle", () => {
      const button = document.createElement("button");
      button.className = "toolbar-btn bookmark-btn";
      button.innerHTML = ICONS.bookmark;
      button.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        panel.toggle();
      });
      document.body.appendChild(button);

      expect(panel.isVisible()).toBe(false);
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(panel.isVisible()).toBe(true);
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(panel.isVisible()).toBe(false);

      button.remove();
    });
  });

  describe("Navigate callback", () => {
    it("clicking bookmark triggers onNavigate with bookmark data", () => {
      doc.addBookmark({
        id: "nav-1",
        label: "Test View",
        x: 500,
        y: 600,
        zoom: 3,
        createdBy: "user-1",
        createdAt: Date.now(),
      });
      panel.show();

      const label = document.querySelector(".bm-label") as HTMLElement;
      label.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(navigateSpy).toHaveBeenCalledOnce();
      expect(navigateSpy.mock.calls[0][0]).toMatchObject({
        id: "nav-1",
        x: 500,
        y: 600,
        zoom: 3,
      });
    });
  });

  describe("Keyboard shortcut simulation", () => {
    it("simulated Ctrl+B dispatches toggle", () => {
      // Simulate how CanvasApp handles Ctrl+B
      const handler = (e: KeyboardEvent) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && (e.key === "b" || e.key === "B") && !e.shiftKey) {
          e.preventDefault();
          panel.toggle();
        }
      };
      document.addEventListener("keydown", handler);

      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "b",
        ctrlKey: true,
        bubbles: true,
      }));
      expect(panel.isVisible()).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "b",
        ctrlKey: true,
        bubbles: true,
      }));
      expect(panel.isVisible()).toBe(false);

      document.removeEventListener("keydown", handler);
    });

    it("simulated Ctrl+D dispatches addBookmark", () => {
      const handler = (e: KeyboardEvent) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && (e.key === "d" || e.key === "D") && !e.shiftKey) {
          e.preventDefault();
          panel.addBookmark();
        }
      };
      document.addEventListener("keydown", handler);

      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "d",
        ctrlKey: true,
        bubbles: true,
      }));
      expect(doc.getBookmarks().length).toBe(1);
      expect(panel.isVisible()).toBe(true);

      document.removeEventListener("keydown", handler);
    });
  });
});
