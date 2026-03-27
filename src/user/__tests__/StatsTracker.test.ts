// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock localStorage
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storageMap.set(key, value)),
  removeItem: vi.fn((key: string) => storageMap.delete(key)),
  clear: vi.fn(() => storageMap.clear()),
  get length() { return storageMap.size; },
  key: vi.fn((index: number) => [...storageMap.keys()][index] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

// Mock ConfigFile (Tauri)
vi.mock("../ConfigFile", () => ({
  readConfigFile: vi.fn(() => Promise.resolve(null)),
  writeConfigFile: vi.fn(() => Promise.resolve()),
}));

import { createDefaultStats } from "../UserStats";
import { StatsTracker } from "../StatsTracker";

// --- Minimal mocks for dependencies ---

function createMockDoc() {
  const strokeChangeCallbacks: (() => void)[] = [];
  let strokes: { id: string; points: { x: number; y: number }[]; color: string; width: number; timestamp: number }[] = [];
  let shapes: { id: string; type: string }[] = [];

  return {
    getStrokes: () => strokes,
    getShapes: () => shapes,
    onStrokesChanged: (cb: () => void) => { strokeChangeCallbacks.push(cb); },
    getDoc: () => ({}),
    getStrokesArray: () => ({}),
    // Test helper: simulate adding a stroke
    _addStroke(stroke: { id: string; points: { x: number; y: number }[]; color: string; width: number; timestamp: number }) {
      strokes = [...strokes, stroke];
      for (const cb of strokeChangeCallbacks) cb();
    },
    _addShape(shape: { id: string; type: string }) {
      shapes = [...shapes, shape];
      for (const cb of strokeChangeCallbacks) cb();
    },
    _reset() {
      strokes = [];
      shapes = [];
    },
  };
}

function createMockCamera(x = 0, y = 0, zoom = 1) {
  return { x, y, zoom };
}

function createMockUndoManager() {
  const listeners = new Map<string, Set<(event: { type: string }) => void>>();

  return {
    getRawUndoManager: () => ({
      on: (event: string, cb: (event: { type: string }) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
      },
      off: (event: string, cb: (event: { type: string }) => void) => {
        listeners.get(event)?.delete(cb);
      },
    }),
    // Test helper
    _simulateStackItemAdded(type: "undo" | "redo") {
      const cbs = listeners.get("stack-item-popped");
      if (cbs) for (const cb of cbs) cb({ type });
    },
  };
}

function createMockSyncManager() {
  const connectionCallbacks = new Set<(state: string) => void>();

  return {
    onConnectionStateChange: (cb: (state: string) => void) => {
      connectionCallbacks.add(cb);
      return () => connectionCallbacks.delete(cb);
    },
    _simulateConnect() {
      for (const cb of connectionCallbacks) cb("connected");
    },
  };
}

describe("StatsTracker", () => {
  let tracker: StatsTracker;
  let stats: ReturnType<typeof createDefaultStats>;
  let doc: ReturnType<typeof createMockDoc>;
  let camera: ReturnType<typeof createMockCamera>;
  let undoManager: ReturnType<typeof createMockUndoManager>;
  let syncManager: ReturnType<typeof createMockSyncManager>;

  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();

    stats = createDefaultStats();
    doc = createMockDoc();
    camera = createMockCamera();
    undoManager = createMockUndoManager();
    syncManager = createMockSyncManager();
  });

  afterEach(() => {
    if (tracker) tracker.destroy();
    vi.useRealTimers();
  });

  function createTracker(sync: ReturnType<typeof createMockSyncManager> | null = syncManager) {
    tracker = new StatsTracker(
      stats,
      doc as unknown as import("../../crdt/DrawfinityDoc").DrawfinityDoc,
      camera as unknown as import("../../camera/Camera").Camera,
      undoManager as unknown as import("../../crdt/UndoManager").UndoManager,
      sync as unknown as import("../../sync/SyncManager").SyncManager,
    );
    return tracker;
  }

  it("increments totalDrawingSessions on construction", () => {
    createTracker();
    expect(stats.totalDrawingSessions).toBe(1);
  });

  it("sets lastSessionAt on construction", () => {
    const before = Date.now();
    createTracker();
    expect(stats.lastSessionAt).toBeGreaterThanOrEqual(before);
  });

  it("preserves firstSessionAt if already set", () => {
    stats.firstSessionAt = 1000;
    createTracker();
    expect(stats.firstSessionAt).toBe(1000);
  });

  it("sets firstSessionAt if it was 0", () => {
    stats.firstSessionAt = 0;
    createTracker();
    expect(stats.firstSessionAt).toBeGreaterThan(0);
  });

  it("increments totalStrokes when strokes are added via doc observation", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(stats.totalStrokes).toBe(1);

    doc._addStroke({ id: "s2", points: [{ x: 0, y: 0 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(stats.totalStrokes).toBe(2);
  });

  it("tracks longestStrokePoints", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(stats.longestStrokePoints).toBe(3);

    doc._addStroke({ id: "s2", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(stats.longestStrokePoints).toBe(3); // unchanged — shorter
  });

  it("increments totalShapes when shapes are added", () => {
    createTracker();
    doc._addShape({ id: "sh1", type: "rectangle" });
    expect(stats.totalShapes).toBe(1);
  });

  it("tracks undo and redo events separately", () => {
    createTracker();
    undoManager._simulateStackItemAdded("undo");
    undoManager._simulateStackItemAdded("undo");
    undoManager._simulateStackItemAdded("redo");
    expect(stats.totalUndos).toBe(2);
    expect(stats.totalRedos).toBe(1);
  });

  it("tracks zoom records via updateCamera", () => {
    createTracker();
    camera.zoom = 5;
    tracker.updateCamera(camera as unknown as import("../../camera/Camera").Camera);
    expect(stats.maxZoomLevel).toBe(5);

    camera.zoom = 0.01;
    tracker.updateCamera(camera as unknown as import("../../camera/Camera").Camera);
    expect(stats.minZoomLevel).toBe(0.01);
  });

  it("accumulates pan distance and flushes every 5 seconds", () => {
    createTracker();
    camera.x = 100;
    camera.y = 0;
    tracker.updateCamera(camera as unknown as import("../../camera/Camera").Camera);
    expect(stats.totalPanDistance).toBe(0); // not flushed yet

    vi.advanceTimersByTime(5_000);
    expect(stats.totalPanDistance).toBe(100);
  });

  it("records erase actions", () => {
    createTracker();
    tracker.recordEraseAction();
    tracker.recordEraseAction();
    expect(stats.totalEraseActions).toBe(2);
  });

  it("records exports", () => {
    createTracker();
    tracker.recordExport();
    expect(stats.totalExports).toBe(1);
  });

  it("records bookmark creation", () => {
    createTracker();
    tracker.recordBookmarkCreated();
    expect(stats.bookmarksCreated).toBe(1);
  });

  it("records tool usage", () => {
    createTracker();
    tracker.recordToolUsage("pen");
    tracker.recordToolUsage("pen");
    tracker.recordToolUsage("marker");
    expect(stats.toolUsage).toEqual({ pen: 2, marker: 1 });
  });

  it("records turtle run results", () => {
    createTracker();
    tracker.recordTurtleRun(
      { success: true },
      "forward(100)\nright(90)",
      [
        { type: "forward", distance: 100 },
        { type: "right", angle: 90 },
        { type: "forward", distance: 50 },
        { type: "left", angle: 45 },
        { type: "spawn", id: "t1" },
      ],
      1,
    );
    expect(stats.totalTurtleRuns).toBe(1);
    expect(stats.totalTurtleErrors).toBe(0);
    expect(stats.totalTurtleForwardDistance).toBe(150);
    expect(stats.totalTurtleTurns).toBe(2);
    expect(stats.totalTurtlesSpawned).toBe(1);
    expect(stats.longestTurtleScript).toBe("forward(100)\nright(90)".length);
  });

  it("records turtle errors", () => {
    createTracker();
    tracker.recordTurtleRun(
      { success: false, error: "syntax error" },
      "bad code",
      [],
      0,
    );
    expect(stats.totalTurtleRuns).toBe(0);
    expect(stats.totalTurtleErrors).toBe(1);
  });

  it("records collaboration session on connect", () => {
    createTracker();
    syncManager._simulateConnect();
    expect(stats.totalCollabSessions).toBe(1);
  });

  it("records exchange script imports", () => {
    createTracker();
    tracker.recordExchangeScriptImported();
    expect(stats.exchangeScriptsImported).toBe(1);
  });

  it("records scripts shared to room", () => {
    createTracker();
    tracker.recordScriptSharedToRoom();
    expect(stats.scriptsSharedToRoom).toBe(1);
  });

  it("debounced save fires after 30 seconds when dirty", () => {
    createTracker();
    // Stats are dirty from construction (session increment)
    vi.advanceTimersByTime(30_000);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:user-stats",
      expect.any(String),
    );
  });

  it("does not save when not dirty", () => {
    createTracker();
    // Force initial save at 30s
    vi.advanceTimersByTime(30_000);
    mockLocalStorage.setItem.mockClear();

    // Advance 5s — not yet at the 60s session timer, and no new changes
    vi.advanceTimersByTime(5_000);
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("accumulates session duration on 60s intervals", () => {
    createTracker();
    vi.advanceTimersByTime(60_000);
    expect(stats.totalSessionDurationMs).toBeGreaterThanOrEqual(60_000);
  });

  it("destroy saves final state and clears timers", () => {
    createTracker();
    tracker.destroy();
    // Should have saved (setItem was called)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:user-stats",
      expect.any(String),
    );
  });

  it("works without a sync manager", () => {
    createTracker(null);
    expect(stats.totalDrawingSessions).toBe(1);
    tracker.destroy();
  });

  it("evaluates badges on construction and earns getting-started", () => {
    // Construction increments totalDrawingSessions to 1, triggering "getting-started"
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener("drawfinity:badge-unlocked", handler);

    createTracker();

    expect(events.length).toBe(1);
    const unlocked = events[0].detail;
    const ids = unlocked.map((e: { badge: { id: string } }) => e.badge.id);
    expect(ids).toContain("getting-started");

    window.removeEventListener("drawfinity:badge-unlocked", handler);
  });

  it("evaluates badges after debounced save and fires custom event", () => {
    createTracker();

    // Clear initial badge events
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener("drawfinity:badge-unlocked", handler);

    // Add a stroke to earn "first-stroke"
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }], color: "#000", width: 2, timestamp: Date.now() });

    // Trigger the 30s save interval
    vi.advanceTimersByTime(30_000);

    expect(events.length).toBe(1);
    const unlocked = events[0].detail;
    const ids = unlocked.map((e: { badge: { id: string } }) => e.badge.id);
    expect(ids).toContain("first-stroke");

    window.removeEventListener("drawfinity:badge-unlocked", handler);
  });

  // --- Canvas Records integration ---

  it("updates longestSingleStroke record when a new stroke is longer", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], color: "#000", width: 2, timestamp: Date.now() });
    const records = tracker.getRecords();
    expect(records.longestSingleStroke.value).toBe(3);

    // Shorter stroke should not update
    doc._addStroke({ id: "s2", points: [{ x: 0, y: 0 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(records.longestSingleStroke.value).toBe(3);

    // Longer stroke should update
    doc._addStroke({ id: "s3", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }], color: "#000", width: 2, timestamp: Date.now() });
    expect(records.longestSingleStroke.value).toBe(5);
  });

  it("updates widestBrushUsed record from stroke width", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }], color: "#000", width: 8, timestamp: Date.now() });
    expect(tracker.getRecords().widestBrushUsed.value).toBe(8);

    doc._addStroke({ id: "s2", points: [{ x: 0, y: 0 }], color: "#000", width: 20, timestamp: Date.now() });
    expect(tracker.getRecords().widestBrushUsed.value).toBe(20);
  });

  it("fires drawfinity:record-broken event on new personal best", () => {
    createTracker();
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener("drawfinity:record-broken", handler);

    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: "#000", width: 5, timestamp: Date.now() });

    // Should have fired for longestSingleStroke, widestBrushUsed, and mostStrokesInOneSession
    const keys = events.map(e => e.detail.key);
    expect(keys).toContain("longestSingleStroke");
    expect(keys).toContain("widestBrushUsed");
    expect(keys).toContain("mostStrokesInOneSession");

    // Verify event detail shape
    const strokeEvent = events.find(e => e.detail.key === "longestSingleStroke")!;
    expect(strokeEvent.detail.newValue).toBe(2);
    expect(strokeEvent.detail.oldValue).toBe(0);

    window.removeEventListener("drawfinity:record-broken", handler);
  });

  it("tracks deepestZoom and widestZoom records via updateCamera", () => {
    createTracker();
    camera.zoom = 1000;
    tracker.updateCamera(camera as unknown as import("../../camera/Camera").Camera);
    expect(tracker.getRecords().deepestZoom.value).toBe(1000);

    camera.zoom = 0.001;
    tracker.updateCamera(camera as unknown as import("../../camera/Camera").Camera);
    expect(tracker.getRecords().widestZoom.value).toBe(1000); // 1/0.001
  });

  it("tracks turtle records from recordTurtleRun", () => {
    createTracker();
    tracker.recordTurtleRun(
      { success: true },
      "spiral script content",
      [
        { type: "forward", distance: 100 },
        { type: "right", angle: 90 },
        { type: "forward", distance: 200 },
        { type: "left", angle: 45 },
      ],
      3,
      500,
    );
    const records = tracker.getRecords();
    expect(records.mostTurtlesInOneRun.value).toBe(3);
    expect(records.longestTurtleDistance.value).toBe(300);
    expect(records.mostTurtleTurns.value).toBe(2);
    expect(records.longestTurtleRuntime.value).toBe(500);
    expect(records.mostTurtlesInOneRun.context).toBe("spiral script content");
  });

  it("records mostConcurrentCollaborators", () => {
    createTracker();
    tracker.recordCollaboratorCount(3);
    expect(tracker.getRecords().mostConcurrentCollaborators.value).toBe(3);
    tracker.recordCollaboratorCount(2);
    expect(tracker.getRecords().mostConcurrentCollaborators.value).toBe(3); // not lower
    tracker.recordCollaboratorCount(5);
    expect(tracker.getRecords().mostConcurrentCollaborators.value).toBe(5);
  });

  it("saves records alongside stats on debounced timer", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: "#000", width: 2, timestamp: Date.now() });
    vi.advanceTimersByTime(30_000);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:canvas-records",
      expect.any(String),
    );
  });

  it("saves records on destroy", () => {
    createTracker();
    doc._addStroke({ id: "s1", points: [{ x: 0, y: 0 }], color: "#000", width: 2, timestamp: Date.now() });
    mockLocalStorage.setItem.mockClear();
    tracker.destroy();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "drawfinity:canvas-records",
      expect.any(String),
    );
  });

  // --- Turtle awards stats ---

  it("tracks consecutiveCleanRuns incrementing on success and resetting on error", () => {
    createTracker();
    // 3 successful runs
    for (let i = 0; i < 3; i++) {
      tracker.recordTurtleRun({ success: true }, "forward(10)", [{ type: "forward", distance: 10 }], 0);
    }
    expect(stats.consecutiveCleanRuns).toBe(3);

    // An error resets the streak
    tracker.recordTurtleRun({ success: false, error: "oops" }, "bad", [], 0);
    expect(stats.consecutiveCleanRuns).toBe(0);

    // Successful run after error starts new streak
    tracker.recordTurtleRun({ success: true }, "forward(10)", [{ type: "forward", distance: 10 }], 0);
    expect(stats.consecutiveCleanRuns).toBe(1);
  });

  it("earns error-free-streak badge after 10 consecutive clean runs", () => {
    createTracker();

    // Clear initial badge events
    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener("drawfinity:badge-unlocked", handler);

    // Run 10 successful turtle scripts
    for (let i = 0; i < 10; i++) {
      tracker.recordTurtleRun({ success: true }, "forward(10)", [{ type: "forward", distance: 10 }], 0);
    }
    expect(stats.consecutiveCleanRuns).toBe(10);

    // Trigger badge evaluation via debounced save
    vi.advanceTimersByTime(30_000);

    const allBadgeIds = events.flatMap(e => e.detail.map((u: { badge: { id: string } }) => u.badge.id));
    expect(allBadgeIds).toContain("error-free-streak");

    window.removeEventListener("drawfinity:badge-unlocked", handler);
  });

  it("tracks uniquePenColors from pencolor commands", () => {
    createTracker();
    tracker.recordTurtleRun(
      { success: true },
      "pencolor('red')\npencolor('blue')\npencolor('red')",
      [
        { type: "pencolor", color: "#ff0000" },
        { type: "pencolor", color: "#0000ff" },
        { type: "pencolor", color: "#ff0000" },
      ],
      0,
    );
    expect(stats.uniquePenColors).toBe(2);
  });

  it("tracks turtleApiBreadth from diverse commands", () => {
    createTracker();
    tracker.recordTurtleRun(
      { success: true },
      "test script",
      [
        { type: "forward", distance: 100 },
        { type: "pencolor", color: "#ff0000" },
        { type: "spawn", id: "t1" },
        { type: "rectangle", width: 50, height: 50 },
      ],
      1,
    );
    // movement, pen, spawn, shapes = 4 categories
    expect(stats.turtleApiBreadth).toBe(4);
  });

  it("tracks maxSpawnDepth from recordTurtleRun parameter", () => {
    createTracker();
    tracker.recordTurtleRun({ success: true }, "test", [{ type: "forward", distance: 10 }], 0, undefined, 3);
    expect(stats.maxSpawnDepth).toBe(3);

    // Lower depth should not reduce
    tracker.recordTurtleRun({ success: true }, "test", [{ type: "forward", distance: 10 }], 0, undefined, 1);
    expect(stats.maxSpawnDepth).toBe(3);
  });

  it("tracks fastestTurtleCompletionMs and longestTurtleRuntimeMs", () => {
    createTracker();
    // Generate 101+ commands
    const manyCommands = Array.from({ length: 110 }, (_, i) => ({ type: "forward" as const, distance: i + 1 }));

    tracker.recordTurtleRun({ success: true }, "big script", manyCommands, 0, 800);
    expect(stats.fastestTurtleCompletionMs).toBe(800);
    expect(stats.longestTurtleRuntimeMs).toBe(800);

    // Faster run should update fastest
    tracker.recordTurtleRun({ success: true }, "faster script", manyCommands, 0, 500);
    expect(stats.fastestTurtleCompletionMs).toBe(500);

    // Slower run should update longest but not fastest
    tracker.recordTurtleRun({ success: true }, "slow script", manyCommands, 0, 2000);
    expect(stats.fastestTurtleCompletionMs).toBe(500);
    expect(stats.longestTurtleRuntimeMs).toBe(2000);
  });

  it("tracks mostTurtlesInSingleRun", () => {
    createTracker();
    tracker.recordTurtleRun({ success: true }, "test", [{ type: "forward", distance: 10 }], 5);
    expect(stats.mostTurtlesInSingleRun).toBe(5);

    tracker.recordTurtleRun({ success: true }, "test", [{ type: "forward", distance: 10 }], 3);
    expect(stats.mostTurtlesInSingleRun).toBe(5); // not decreased
  });

  it("does not re-earn badges already in badge state", () => {
    // Pre-seed badge state with "getting-started"
    storageMap.set("drawfinity:badge-state", JSON.stringify({
      earned: [{ id: "getting-started", earnedAt: 1000 }],
      lastCheckedAt: 1000,
    }));

    const events: CustomEvent[] = [];
    const handler = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener("drawfinity:badge-unlocked", handler);

    createTracker();

    // Should NOT re-fire getting-started
    for (const event of events) {
      const ids = event.detail.map((e: { badge: { id: string } }) => e.badge.id);
      expect(ids).not.toContain("getting-started");
    }

    window.removeEventListener("drawfinity:badge-unlocked", handler);
  });
});
