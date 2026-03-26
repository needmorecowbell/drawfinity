// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RemoteTurtleRenderer, hueFromClientId } from "../RemoteTurtleRenderer";
import { Camera } from "../../camera/Camera";
import type { SyncManager, RemoteTurtles } from "../../sync/SyncManager";

function createMockSyncManager() {
  let turtleCallback: ((turtles: RemoteTurtles[]) => void) | null = null;
  const mock = {
    onRemoteTurtlesChange: vi.fn((cb: (turtles: RemoteTurtles[]) => void) => {
      turtleCallback = cb;
      return () => {
        turtleCallback = null;
      };
    }),
    // Helper to simulate awareness updates from remote clients
    _emit(turtles: RemoteTurtles[]) {
      turtleCallback?.(turtles);
    },
  };
  return mock as unknown as SyncManager & { _emit: (t: RemoteTurtles[]) => void };
}

function makeRemoteTurtles(
  userId: string,
  userName: string,
  turtles: Array<{
    id: string;
    x: number;
    y: number;
    heading: number;
    color?: string;
    visible?: boolean;
  }>,
): RemoteTurtles {
  return {
    userId,
    userName,
    userColor: "#888888",
    turtles: turtles.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      heading: t.heading,
      color: t.color ?? "#000000",
      visible: t.visible ?? true,
    })),
  };
}

describe("RemoteTurtleRenderer", () => {
  let root: HTMLElement;
  let camera: Camera;
  let renderer: RemoteTurtleRenderer;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    camera = new Camera();
    camera.setViewportSize(800, 600);
    renderer = new RemoteTurtleRenderer(root, camera);
  });

  afterEach(() => {
    renderer.destroy();
    root.remove();
  });

  describe("initial state", () => {
    it("starts hidden by default", () => {
      expect(renderer.isVisible()).toBe(false);
    });

    it("has no indicators initially", () => {
      expect(renderer.count()).toBe(0);
    });
  });

  describe("syncFromAwareness", () => {
    it("creates indicators for remote turtles", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      expect(renderer.count()).toBe(1);
      const el = root.querySelector('[data-turtle-id="user-1:main"]');
      expect(el).toBeTruthy();
    });

    it("creates multiple indicators for multiple remote turtles", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
          { id: "child1", x: 10, y: 20, heading: 45 },
        ]),
      ]);

      expect(renderer.count()).toBe(2);
    });

    it("handles multiple remote clients", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
        makeRemoteTurtles("user-2", "Bob", [
          { id: "main", x: 100, y: 100, heading: 90 },
        ]),
      ]);

      expect(renderer.count()).toBe(2);
      expect(root.querySelector('[data-turtle-id="user-1:main"]')).toBeTruthy();
      expect(root.querySelector('[data-turtle-id="user-2:main"]')).toBeTruthy();
    });

    it("removes stale indicators when turtles disappear", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
          { id: "child1", x: 10, y: 10, heading: 0 },
        ]),
      ]);
      expect(renderer.count()).toBe(2);

      // Second sync with only main — child1 should be removed
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);
      expect(renderer.count()).toBe(1);
      expect(root.querySelector('[data-turtle-id="user-1:child1"]')).toBeNull();
    });

    it("removes all indicators when client sends empty turtles", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);
      expect(renderer.count()).toBe(1);

      // Client clears all turtles (script ended)
      renderer.syncFromAwareness([]);
      expect(renderer.count()).toBe(0);
    });

    it("updates existing indicators without re-creating", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);
      const el1 = root.querySelector('[data-turtle-id="user-1:main"]');

      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 50, y: 50, heading: 90 },
        ]),
      ]);
      const el2 = root.querySelector('[data-turtle-id="user-1:main"]');

      // Same DOM element reused
      expect(el1).toBe(el2);
      expect(renderer.count()).toBe(1);
    });
  });

  describe("visual distinction", () => {
    it("applies reduced opacity (0.5) to remote indicators", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.opacity).toBe("0.5");
    });

    it("applies dashed stroke to SVG path", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const path = root.querySelector('[data-turtle-id="user-1:main"] path');
      expect(path?.getAttribute("stroke-dasharray")).toBe("3 2");
    });

    it("adds turtle-indicator--remote CSS class", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]');
      expect(el?.classList.contains("turtle-indicator--remote")).toBe(true);
    });

    it("uses 18x18 SVG size for remote indicators", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const svg = root.querySelector('[data-turtle-id="user-1:main"] svg');
      expect(svg?.getAttribute("width")).toBe("18");
      expect(svg?.getAttribute("height")).toBe("18");
    });

    it("sets data-remote-client attribute", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]');
      expect(el?.getAttribute("data-remote-client")).toBe("user-1");
    });
  });

  describe("client hue coloring", () => {
    it("applies hue-derived color from client ID", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      // jsdom converts HSL to RGB, so just check color is set and non-empty
      expect(el.style.color).toBeTruthy();
      expect(el.style.color).not.toBe("#000000");
    });

    it("different clients get different hues", () => {
      const hue1 = hueFromClientId("user-1");
      const hue2 = hueFromClientId("user-2");
      // Very unlikely to collide for different strings
      expect(hue1).not.toBe(hue2);
    });
  });

  describe("client name label", () => {
    it("displays client name below indicator", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const label = root.querySelector(
        '[data-turtle-id="user-1:main"] .turtle-indicator__label',
      ) as HTMLElement;
      expect(label).toBeTruthy();
      expect(label.textContent).toBe("Alice");
    });

    it("updates label text when client name changes", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice (updated)", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const label = root.querySelector(
        '[data-turtle-id="user-1:main"] .turtle-indicator__label',
      ) as HTMLElement;
      expect(label.textContent).toBe("Alice (updated)");
    });
  });

  describe("positioning", () => {
    it("positions at screen center when turtle is at camera center", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      // screenX = (0-0)*1 + 400 = 400, screenY = (0-0)*1 + 300 = 300
      // offset by -9 (half of 18) for centering
      expect(el.style.transform).toBe("translate(391px, 291px) rotate(0deg)");
    });

    it("accounts for camera offset", () => {
      camera.x = 100;
      camera.y = 50;
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      // screenX = (0-100)*1 + 400 = 300, screenY = (0-50)*1 + 300 = 250
      expect(el.style.transform).toBe("translate(291px, 241px) rotate(0deg)");
    });

    it("accounts for zoom level", () => {
      camera.zoom = 2;
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 50, y: 25, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      // screenX = (50-0)*2 + 400 = 500, screenY = (25-0)*2 + 300 = 350
      expect(el.style.transform).toBe("translate(491px, 341px) rotate(0deg)");
    });

    it("applies heading rotation", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 90 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.transform).toBe("translate(391px, 291px) rotate(90deg)");
    });
  });

  describe("visibility", () => {
    it("indicators start hidden when globalVisible is false", () => {
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });

    it("show() makes all remote indicators visible", () => {
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.show();
      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.display).toBe("");
    });

    it("hide() hides all remote indicators", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.hide();
      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });

    it("invisible remote turtles are hidden regardless of global visibility", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0, visible: false },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });

    it("invisible turtle becomes visible on next sync", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0, visible: false },
        ]),
      ]);

      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0, visible: true },
        ]),
      ]);

      const el = root.querySelector('[data-turtle-id="user-1:main"]') as HTMLElement;
      expect(el.style.display).toBe("");
    });
  });

  describe("SyncManager integration", () => {
    it("subscribes to remote turtle changes when setSyncManager is called", () => {
      const syncManager = createMockSyncManager();
      renderer.setSyncManager(syncManager);

      expect(syncManager.onRemoteTurtlesChange).toHaveBeenCalledOnce();
    });

    it("creates indicators when SyncManager emits turtle updates", () => {
      const syncManager = createMockSyncManager();
      renderer.show();
      renderer.setSyncManager(syncManager);

      syncManager._emit([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      expect(renderer.count()).toBe(1);
    });

    it("unsubscribes when setSyncManager is called with null", () => {
      const syncManager = createMockSyncManager();
      renderer.show();
      renderer.setSyncManager(syncManager);

      syncManager._emit([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);
      expect(renderer.count()).toBe(1);

      renderer.setSyncManager(null);
      // Should clear indicators
      expect(renderer.count()).toBe(0);
    });

    it("unsubscribes previous SyncManager when a new one is set", () => {
      const sm1 = createMockSyncManager();
      const sm2 = createMockSyncManager();
      renderer.show();

      renderer.setSyncManager(sm1);
      sm1._emit([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.setSyncManager(sm2);
      // Old SM emission should no longer affect renderer
      sm1._emit([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
          { id: "child1", x: 10, y: 10, heading: 0 },
        ]),
      ]);
      // Should only have whatever sm2 emits (nothing yet, so the old state persists
      // but the new emission from sm1 should be ignored)
      // Actually after setSyncManager(sm2), the indicators from sm1 are NOT cleared
      // automatically — only setting null clears. The subscription is just detached.
      // So count should be 1 from the original emission
      expect(renderer.count()).toBe(1);
    });
  });

  describe("removeClient", () => {
    it("removes all indicators for a specific client", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
          { id: "child1", x: 10, y: 10, heading: 0 },
        ]),
        makeRemoteTurtles("user-2", "Bob", [
          { id: "main", x: 50, y: 50, heading: 0 },
        ]),
      ]);
      expect(renderer.count()).toBe(3);

      renderer.removeClient("user-1");
      expect(renderer.count()).toBe(1);
      expect(root.querySelector('[data-turtle-id="user-1:main"]')).toBeNull();
      expect(root.querySelector('[data-turtle-id="user-1:child1"]')).toBeNull();
      expect(root.querySelector('[data-turtle-id="user-2:main"]')).toBeTruthy();
    });

    it("is a no-op for unknown client", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.removeClient("user-99");
      expect(renderer.count()).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all remote indicators from the DOM", () => {
      renderer.show();
      renderer.syncFromAwareness([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
        makeRemoteTurtles("user-2", "Bob", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.clear();
      expect(renderer.count()).toBe(0);
      expect(root.querySelectorAll(".turtle-indicator--remote").length).toBe(0);
    });
  });

  describe("destroy", () => {
    it("clears indicators, unsubscribes, and hides", () => {
      const syncManager = createMockSyncManager();
      renderer.setSyncManager(syncManager);
      renderer.show();

      syncManager._emit([
        makeRemoteTurtles("user-1", "Alice", [
          { id: "main", x: 0, y: 0, heading: 0 },
        ]),
      ]);

      renderer.destroy();
      expect(renderer.count()).toBe(0);
      expect(renderer.isVisible()).toBe(false);
    });
  });
});

describe("hueFromClientId", () => {
  it("returns a value between 0 and 360", () => {
    for (const id of ["user-1", "user-2", "abc", "xyz-long-id-123"]) {
      const hue = hueFromClientId(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("returns consistent results for the same input", () => {
    expect(hueFromClientId("user-1")).toBe(hueFromClientId("user-1"));
  });

  it("returns different results for different inputs", () => {
    const hue1 = hueFromClientId("user-1");
    const hue2 = hueFromClientId("user-2");
    expect(hue1).not.toBe(hue2);
  });

  it("handles empty string", () => {
    const hue = hueFromClientId("");
    expect(hue).toBe(0);
  });
});
