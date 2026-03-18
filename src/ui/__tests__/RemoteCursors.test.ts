// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RemoteCursors } from "../RemoteCursors";
import type { Camera } from "../../camera/Camera";
import type { SyncManager, RemoteUser } from "../../sync/SyncManager";

function createMockCamera(overrides: Partial<Camera> = {}): Camera {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    getViewportSize: () => [800, 600] as [number, number],
    ...overrides,
  } as Camera;
}

function createMockSyncManager(): {
  syncManager: SyncManager;
  triggerUsers: (users: RemoteUser[]) => void;
} {
  let callback: ((users: RemoteUser[]) => void) | null = null;
  const syncManager = {
    onRemoteUsersChange: vi.fn((cb: (users: RemoteUser[]) => void) => {
      callback = cb;
      return () => {
        callback = null;
      };
    }),
  } as unknown as SyncManager;

  return {
    syncManager,
    triggerUsers: (users: RemoteUser[]) => {
      if (callback) callback(users);
    },
  };
}

function makeUser(id: string, cursor: { x: number; y: number } | null = { x: 100, y: 200 }): RemoteUser {
  return {
    id,
    name: `User ${id}`,
    color: `#${id.padStart(6, "0")}`,
    cursor,
  };
}

describe("RemoteCursors", () => {
  let root: HTMLElement;
  let camera: Camera;
  let remoteCursors: RemoteCursors;
  let rafCallbacks: Array<FrameRequestCallback>;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    camera = createMockCamera();
    remoteCursors = new RemoteCursors(root, camera);

    // Mock requestAnimationFrame
    rafCallbacks = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    remoteCursors.detach();
    root.remove();
    vi.restoreAllMocks();
  });

  it("creates cursor elements for remote users with active cursors", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc")]);

    const cursors = root.querySelectorAll(".remote-cursor");
    expect(cursors.length).toBe(1);

    const label = root.querySelector(".remote-cursor-label");
    expect(label?.textContent).toBe("User abc");
  });

  it("hides cursor elements when user has null cursor", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc", null)]);

    const cursor = root.querySelector(".remote-cursor") as HTMLElement;
    expect(cursor.style.display).toBe("none");
  });

  it("positions cursor using camera transforms", () => {
    camera = createMockCamera({ x: 50, y: 100, zoom: 2 });
    remoteCursors = new RemoteCursors(root, camera);

    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc", { x: 150, y: 200 })]);

    const cursor = root.querySelector(".remote-cursor") as HTMLElement;
    // screenX = (150 - 50) * 2 + 400 = 600
    // screenY = (200 - 100) * 2 + 300 = 500
    expect(cursor.style.transform).toBe("translate(600px, 500px)");
  });

  it("removes cursor elements when users disconnect", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc"), makeUser("def")]);
    expect(root.querySelectorAll(".remote-cursor").length).toBe(2);

    triggerUsers([makeUser("abc")]);
    expect(root.querySelectorAll(".remote-cursor").length).toBe(1);
    expect(root.querySelector(".remote-cursor-label")?.textContent).toBe("User abc");
  });

  it("updates cursor color and name when they change", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc")]);

    const updated: RemoteUser = {
      id: "abc",
      name: "New Name",
      color: "#ff0000",
      cursor: { x: 100, y: 200 },
    };
    triggerUsers([updated]);

    const label = root.querySelector(".remote-cursor-label") as HTMLElement;
    expect(label.textContent).toBe("New Name");
    expect(label.style.background).toBe("rgb(255, 0, 0)");
  });

  it("cleans up all cursors on detach", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc"), makeUser("def")]);
    expect(root.querySelectorAll(".remote-cursor").length).toBe(2);

    remoteCursors.detach();
    expect(root.querySelectorAll(".remote-cursor").length).toBe(0);
  });

  it("unsubscribes from SyncManager on detach", () => {
    const { syncManager } = createMockSyncManager();
    remoteCursors.attach(syncManager);
    remoteCursors.detach();

    expect(syncManager.onRemoteUsersChange).toHaveBeenCalledTimes(1);
  });

  it("reuses existing cursor elements for the same user", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc", { x: 10, y: 20 })]);
    const cursor1 = root.querySelector(".remote-cursor");

    triggerUsers([makeUser("abc", { x: 30, y: 40 })]);
    const cursor2 = root.querySelector(".remote-cursor");

    expect(cursor1).toBe(cursor2);
    expect(root.querySelectorAll(".remote-cursor").length).toBe(1);
  });

  it("fades cursors after idle timeout", () => {
    vi.useFakeTimers();
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc")]);

    // Advance time past idle timeout
    vi.advanceTimersByTime(5001);

    // Trigger the animation frame
    if (rafCallbacks.length > 0) {
      rafCallbacks[rafCallbacks.length - 1](performance.now());
    }

    const cursor = root.querySelector(".remote-cursor") as HTMLElement;
    expect(cursor.style.opacity).toBe("0");

    vi.useRealTimers();
  });

  it("renders SVG arrow in cursor element", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc")]);

    const svg = root.querySelector(".remote-cursor-arrow svg");
    expect(svg).not.toBeNull();
  });

  it("updatePositions repositions all cursors", () => {
    const { syncManager, triggerUsers } = createMockSyncManager();
    remoteCursors.attach(syncManager);

    triggerUsers([makeUser("abc", { x: 100, y: 200 })]);

    // Change camera
    camera.x = 100;
    camera.zoom = 2;
    remoteCursors.updatePositions();

    const cursor = root.querySelector(".remote-cursor") as HTMLElement;
    // screenX = (100 - 100) * 2 + 400 = 400
    // screenY = (200 - 0) * 2 + 300 = 700
    expect(cursor.style.transform).toBe("translate(400px, 700px)");
  });
});
