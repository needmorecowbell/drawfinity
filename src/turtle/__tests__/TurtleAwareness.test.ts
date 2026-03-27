import { describe, it, expect, vi, beforeEach } from "vitest";
import { TurtleAwareness } from "../TurtleAwareness";
import { TurtleRegistry } from "../TurtleRegistry";
import type { SyncManager } from "../../sync/SyncManager";
import type { AwarenessTurtleState } from "../../sync/SyncManager";
import { Stroke, DocumentModel } from "../../model/Stroke";
import type { Shape } from "../../model/Shape";

class MockDocument implements DocumentModel {
  strokes: Stroke[] = [];
  shapes: Shape[] = [];
  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
  }
  getStrokes(): Stroke[] {
    return this.strokes;
  }
  removeStroke(strokeId: string): boolean {
    const idx = this.strokes.findIndex((s) => s.id === strokeId);
    if (idx === -1) return false;
    this.strokes.splice(idx, 1);
    return true;
  }
  addShape(shape: Shape): void {
    this.shapes.push(shape);
  }
  getShapes(): Shape[] {
    return this.shapes;
  }
  removeShape(shapeId: string): boolean {
    const idx = this.shapes.findIndex((s) => s.id === shapeId);
    if (idx === -1) return false;
    this.shapes.splice(idx, 1);
    return true;
  }
}

function createMockSyncManager(): SyncManager & {
  lastTurtleStates: AwarenessTurtleState[];
  updateCount: number;
} {
  const mock = {
    lastTurtleStates: [] as AwarenessTurtleState[],
    updateCount: 0,
    updateTurtleStates: vi.fn((turtles: AwarenessTurtleState[]) => {
      mock.lastTurtleStates = turtles;
      mock.updateCount++;
    }),
  };
  return mock as unknown as SyncManager & {
    lastTurtleStates: AwarenessTurtleState[];
    updateCount: number;
  };
}

describe("TurtleAwareness", () => {
  let registry: TurtleRegistry;
  let doc: MockDocument;
  let syncManager: ReturnType<typeof createMockSyncManager>;
  const scriptId = "test-script";

  beforeEach(() => {
    registry = new TurtleRegistry();
    doc = new MockDocument();
    syncManager = createMockSyncManager();
  });

  describe("update", () => {
    it("broadcasts turtle states via SyncManager", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(syncManager, registry, scriptId);

      awareness.update();

      expect(syncManager.updateTurtleStates).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "main",
          x: expect.any(Number),
          y: expect.any(Number),
          heading: expect.any(Number),
          color: expect.any(String),
          visible: true,
        }),
      ]);
    });

    it("includes spawned turtles in the broadcast", () => {
      registry.createMain(scriptId, doc);
      registry.spawn("child1", scriptId, doc, undefined, {
        x: 50,
        y: 100,
        color: "#00ff00",
      });

      const awareness = new TurtleAwareness(syncManager, registry, scriptId);
      awareness.update();

      const states = syncManager.lastTurtleStates;
      expect(states).toHaveLength(2);
      const ids = states.map((t) => t.id).sort();
      expect(ids).toEqual(["child1", "main"]);
    });

    it("reflects current turtle position and heading", () => {
      registry.createMain(scriptId, doc);
      const entry = registry.get(`${scriptId}:main`)!;
      entry.state.x = 200;
      entry.state.y = 300;
      entry.state.angle = 90;
      entry.state.pen.color = "#ff0000";

      const awareness = new TurtleAwareness(syncManager, registry, scriptId);
      awareness.update();

      const mainState = syncManager.lastTurtleStates.find(
        (t) => t.id === "main",
      )!;
      expect(mainState.heading).toBe(90);
      expect(mainState.color).toBe("#ff0000");
    });

    it("reflects visibility state", () => {
      registry.createMain(scriptId, doc);
      const entry = registry.get(`${scriptId}:main`)!;
      entry.state.visible = false;

      const awareness = new TurtleAwareness(syncManager, registry, scriptId);
      awareness.update();

      expect(syncManager.lastTurtleStates[0].visible).toBe(false);
    });
  });

  describe("throttling", () => {
    it("throttles updates to maxFps rate", () => {
      registry.createMain(scriptId, doc);
      // 10 fps = 100ms minimum interval
      const awareness = new TurtleAwareness(
        syncManager,
        registry,
        scriptId,
        10,
      );

      // First call should send
      const first = awareness.update();
      expect(first).toBe(true);
      expect(syncManager.updateCount).toBe(1);

      // Immediate second call should be throttled
      const second = awareness.update();
      expect(second).toBe(false);
      expect(syncManager.updateCount).toBe(1);
    });

    it("allows update after enough time has passed", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(
        syncManager,
        registry,
        scriptId,
        10,
      );

      awareness.update();
      expect(syncManager.updateCount).toBe(1);

      // Simulate time passing by manipulating performance.now
      const originalNow = performance.now;
      let mockTime = originalNow.call(performance) + 200; // 200ms later
      vi.spyOn(performance, "now").mockReturnValue(mockTime);

      const result = awareness.update();
      expect(result).toBe(true);
      expect(syncManager.updateCount).toBe(2);

      vi.restoreAllMocks();
    });
  });

  describe("forceUpdate", () => {
    it("sends update regardless of throttle", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(
        syncManager,
        registry,
        scriptId,
        10,
      );

      awareness.update(); // first call OK
      awareness.forceUpdate(); // should bypass throttle

      expect(syncManager.updateCount).toBe(2);
    });
  });

  describe("clear", () => {
    it("sends empty turtles array to clear remote indicators", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(syncManager, registry, scriptId);

      awareness.update();
      awareness.clear();

      expect(syncManager.updateTurtleStates).toHaveBeenLastCalledWith([]);
    });

    it("resets throttle timer so next update goes through", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(
        syncManager,
        registry,
        scriptId,
        10,
      );

      awareness.update();
      awareness.clear();

      // Should be able to update immediately after clear
      const result = awareness.update();
      expect(result).toBe(true);
    });
  });

  describe("null SyncManager", () => {
    it("gracefully handles null SyncManager (offline mode)", () => {
      registry.createMain(scriptId, doc);
      const awareness = new TurtleAwareness(null, registry, scriptId);

      const result = awareness.update();
      expect(result).toBe(false);

      // Should not throw
      awareness.forceUpdate();
      awareness.clear();
    });
  });
});
