import { describe, it, expect, beforeEach } from "vitest";
import { TurtleState } from "../TurtleState";
import type { TurtleCommand } from "../LuaRuntime";

describe("TurtleState", () => {
  let state: TurtleState;

  beforeEach(() => {
    state = new TurtleState();
  });

  describe("initial state", () => {
    it("starts at origin (0, 0) facing up", () => {
      expect(state.x).toBe(0);
      expect(state.y).toBe(0);
      expect(state.angle).toBe(0);
    });

    it("starts with pen down, black, width 3, full opacity", () => {
      expect(state.pen.down).toBe(true);
      expect(state.pen.color).toBe("#000000");
      expect(state.pen.width).toBe(3);
      expect(state.pen.opacity).toBe(1.0);
    });

    it("starts with speed 5", () => {
      expect(state.speed).toBe(5);
    });
  });

  describe("forward / backward", () => {
    it("moves forward (heading 0 = up, negative Y)", () => {
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.x).toBeCloseTo(0);
      expect(state.y).toBeCloseTo(-100);
      expect(seg).not.toBeNull();
      expect(seg!.fromX).toBe(0);
      expect(seg!.fromY).toBe(0);
      expect(seg!.toX).toBeCloseTo(0);
      expect(seg!.toY).toBeCloseTo(-100);
    });

    it("moves backward", () => {
      const seg = state.applyCommand({ type: "backward", distance: 50 });
      expect(state.x).toBeCloseTo(0);
      expect(state.y).toBeCloseTo(50);
      expect(seg).not.toBeNull();
    });

    it("moves forward after turning right 90 degrees (east)", () => {
      state.applyCommand({ type: "right", angle: 90 });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.x).toBeCloseTo(100);
      expect(state.y).toBeCloseTo(0);
      expect(seg).not.toBeNull();
    });

    it("moves forward after turning left 90 degrees (west)", () => {
      state.applyCommand({ type: "left", angle: 90 });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.x).toBeCloseTo(-100);
      expect(state.y).toBeCloseTo(0);
      expect(seg).not.toBeNull();
    });

    it("moves forward at 45 degrees", () => {
      state.applyCommand({ type: "right", angle: 45 });
      state.applyCommand({ type: "forward", distance: Math.SQRT2 * 100 });
      expect(state.x).toBeCloseTo(100);
      expect(state.y).toBeCloseTo(-100);
    });

    it("returns null when pen is up", () => {
      state.applyCommand({ type: "penup" });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(seg).toBeNull();
      // Position still changes
      expect(state.y).toBeCloseTo(-100);
    });
  });

  describe("turning", () => {
    it("right increases heading", () => {
      state.applyCommand({ type: "right", angle: 90 });
      expect(state.angle).toBe(90);
    });

    it("left decreases heading", () => {
      state.applyCommand({ type: "left", angle: 90 });
      expect(state.angle).toBe(270);
    });

    it("wraps heading at 360", () => {
      state.applyCommand({ type: "right", angle: 400 });
      expect(state.angle).toBeCloseTo(40);
    });

    it("wraps negative heading", () => {
      state.applyCommand({ type: "left", angle: 400 });
      expect(state.angle).toBeCloseTo(320);
    });

    it("returns null (no movement)", () => {
      const seg = state.applyCommand({ type: "right", angle: 90 });
      expect(seg).toBeNull();
    });
  });

  describe("goto", () => {
    it("moves to absolute position with pen down (zoom=1, no scaling)", () => {
      const seg = state.applyCommand({ type: "goto", x: 50, y: 75 });
      expect(state.x).toBe(50);
      expect(state.y).toBe(75);
      expect(seg).not.toBeNull();
      expect(seg!.fromX).toBe(0);
      expect(seg!.fromY).toBe(0);
      expect(seg!.toX).toBe(50);
      expect(seg!.toY).toBe(75);
    });

    it("moves to absolute position without drawing when pen up", () => {
      state.applyCommand({ type: "penup" });
      const seg = state.applyCommand({ type: "goto", x: 50, y: 75 });
      expect(state.x).toBe(50);
      expect(state.y).toBe(75);
      expect(seg).toBeNull();
    });
  });

  describe("home", () => {
    it("returns to origin", () => {
      state.applyCommand({ type: "forward", distance: 100 });
      state.applyCommand({ type: "right", angle: 45 });
      const seg = state.applyCommand({ type: "home" });
      expect(state.x).toBe(0);
      expect(state.y).toBe(0);
      // home does not reset heading
      expect(state.angle).toBe(45);
      expect(seg).not.toBeNull();
    });

    it("returns to custom origin set via setOrigin", () => {
      state.setOrigin(200, 300);
      state.applyCommand({ type: "home" });
      expect(state.x).toBe(200);
      expect(state.y).toBe(300);
    });
  });

  describe("pen control", () => {
    it("penup / pendown toggle", () => {
      state.applyCommand({ type: "penup" });
      expect(state.pen.down).toBe(false);
      state.applyCommand({ type: "pendown" });
      expect(state.pen.down).toBe(true);
    });

    it("pencolor sets color", () => {
      state.applyCommand({ type: "pencolor", color: "#ff0000" });
      expect(state.pen.color).toBe("#ff0000");
    });

    it("penwidth sets width", () => {
      state.applyCommand({ type: "penwidth", width: 10 });
      expect(state.pen.width).toBe(10);
    });

    it("penopacity sets opacity", () => {
      state.applyCommand({ type: "penopacity", opacity: 0.5 });
      expect(state.pen.opacity).toBe(0.5);
    });

    it("movement segment captures current pen state", () => {
      state.applyCommand({ type: "pencolor", color: "#ff0000" });
      state.applyCommand({ type: "penwidth", width: 5 });
      state.applyCommand({ type: "penopacity", opacity: 0.7 });
      const seg = state.applyCommand({ type: "forward", distance: 10 });
      expect(seg).not.toBeNull();
      expect(seg!.pen.color).toBe("#ff0000");
      expect(seg!.pen.width).toBe(5);
      expect(seg!.pen.opacity).toBe(0.7);
    });

    it("segment pen state is a copy, not a reference", () => {
      const seg = state.applyCommand({ type: "forward", distance: 10 });
      state.applyCommand({ type: "pencolor", color: "#ff0000" });
      expect(seg!.pen.color).toBe("#000000");
    });
  });

  describe("speed", () => {
    it("sets speed value", () => {
      state.applyCommand({ type: "speed", value: 0 });
      expect(state.speed).toBe(0);
      state.applyCommand({ type: "speed", value: 10 });
      expect(state.speed).toBe(10);
    });
  });

  describe("non-movement commands return null", () => {
    const nonMovement: TurtleCommand[] = [
      { type: "penup" },
      { type: "pendown" },
      { type: "pencolor", color: "#fff" },
      { type: "penwidth", width: 1 },
      { type: "penopacity", opacity: 0.5 },
      { type: "speed", value: 3 },
      { type: "clear" },
      { type: "sleep", ms: 100 },
      { type: "print", message: "hello" },
      { type: "right", angle: 90 },
      { type: "left", angle: 90 },
    ];

    nonMovement.forEach((cmd) => {
      it(`${cmd.type} returns null`, () => {
        expect(state.applyCommand(cmd)).toBeNull();
      });
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      state.applyCommand({ type: "forward", distance: 100 });
      state.applyCommand({ type: "right", angle: 45 });
      state.applyCommand({ type: "pencolor", color: "#ff0000" });
      state.applyCommand({ type: "penwidth", width: 10 });
      state.applyCommand({ type: "speed", value: 0 });
      state.applyCommand({ type: "penup" });

      state.reset();

      expect(state.x).toBe(0);
      expect(state.y).toBe(0);
      expect(state.angle).toBe(0);
      expect(state.pen.down).toBe(true);
      expect(state.pen.color).toBe("#000000");
      expect(state.pen.width).toBe(3);
      expect(state.pen.opacity).toBe(1.0);
      expect(state.speed).toBe(5);
    });

    it("resets to custom origin", () => {
      state.setOrigin(100, 200);
      state.applyCommand({ type: "forward", distance: 50 });
      state.reset();
      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
    });
  });

  describe("TurtleStateQuery interface", () => {
    it("getPosition returns current coordinates", () => {
      state.applyCommand({ type: "forward", distance: 50 });
      const pos = state.getPosition();
      expect(pos.x).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(-50);
    });

    it("getHeading returns current angle", () => {
      state.applyCommand({ type: "right", angle: 135 });
      expect(state.getHeading()).toBe(135);
    });

    it("isDown returns pen state", () => {
      expect(state.isDown()).toBe(true);
      state.applyCommand({ type: "penup" });
      expect(state.isDown()).toBe(false);
    });
  });

  describe("snapshot", () => {
    it("captures full state", () => {
      state.applyCommand({ type: "forward", distance: 10 });
      state.applyCommand({ type: "right", angle: 30 });
      state.applyCommand({ type: "pencolor", color: "#abc" });
      const snap = state.snapshot();
      expect(snap.x).toBeCloseTo(0);
      expect(snap.y).toBeCloseTo(-10);
      expect(snap.angle).toBe(30);
      expect(snap.pen.color).toBe("#abc");
      expect(snap.speed).toBe(5);
    });

    it("snapshot is a detached copy", () => {
      const snap = state.snapshot();
      state.applyCommand({ type: "pencolor", color: "#fff" });
      expect(snap.pen.color).toBe("#000000");
    });
  });

  describe("zoom-aware scaling", () => {
    it("forward(100) at zoom 2 produces 50-unit movement", () => {
      state.zoomScale = 1 / 2;
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.y).toBeCloseTo(-50);
      expect(seg).not.toBeNull();
      expect(seg!.toY).toBeCloseTo(-50);
    });

    it("forward(100) at zoom 0.5 produces 200-unit movement", () => {
      state.zoomScale = 1 / 0.5;
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.y).toBeCloseTo(-200);
      expect(seg).not.toBeNull();
      expect(seg!.toY).toBeCloseTo(-200);
    });

    it("set_world_space(true) makes forward(100) always 100 units regardless of zoom", () => {
      state.zoomScale = 1 / 4;
      state.applyCommand({ type: "set_world_space", enabled: true });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(state.y).toBeCloseTo(-100);
      expect(seg).not.toBeNull();
      expect(seg!.toY).toBeCloseTo(-100);
    });

    it("pen width is scaled by the same factor as movement", () => {
      state.zoomScale = 1 / 2;
      state.applyCommand({ type: "penwidth", width: 10 });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(seg).not.toBeNull();
      // Movement scaled: 100 * 0.5 = 50
      expect(seg!.toY).toBeCloseTo(-50);
      // Pen width scaled: 10 * 0.5 = 5
      expect(seg!.pen.width).toBeCloseTo(5);
    });

    it("pen width is not scaled when world space is enabled", () => {
      state.zoomScale = 1 / 2;
      state.applyCommand({ type: "set_world_space", enabled: true });
      state.applyCommand({ type: "penwidth", width: 10 });
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      expect(seg).not.toBeNull();
      expect(seg!.pen.width).toBe(10);
    });

    it("backward is also zoom-scaled", () => {
      state.zoomScale = 1 / 2;
      const seg = state.applyCommand({ type: "backward", distance: 100 });
      expect(state.y).toBeCloseTo(50);
      expect(seg).not.toBeNull();
      expect(seg!.toY).toBeCloseTo(50);
    });

    it("goto coordinates and pen width are zoom-scaled", () => {
      state.zoomScale = 1 / 4;
      state.applyCommand({ type: "penwidth", width: 8 });
      const seg = state.applyCommand({ type: "goto", x: 50, y: 50 });
      expect(seg).not.toBeNull();
      // Coordinates scaled: 50 * 0.25 = 12.5
      expect(seg!.toX).toBeCloseTo(12.5);
      expect(seg!.toY).toBeCloseTo(12.5);
      expect(state.x).toBeCloseTo(12.5);
      expect(state.y).toBeCloseTo(12.5);
      // Pen width scaled: 8 * 0.25 = 2
      expect(seg!.pen.width).toBeCloseTo(2);
    });

    it("goto(100,0) at zoom 0.5 produces 200-unit position", () => {
      state.zoomScale = 1 / 0.5;
      state.applyCommand({ type: "penup" });
      state.applyCommand({ type: "goto", x: 100, y: 0 });
      // 100 * 2 = 200
      expect(state.x).toBeCloseTo(200);
      expect(state.y).toBeCloseTo(0);
    });

    it("goto coordinates scale relative to origin", () => {
      state.setOrigin(100, 100);
      state.reset(); // moves to origin
      state.zoomScale = 1 / 2;
      state.applyCommand({ type: "penup" });
      // goto(200, 200): offset from origin is (100, 100), scaled by 0.5 = (50, 50)
      // final position = origin + scaled offset = (150, 150)
      state.applyCommand({ type: "goto", x: 200, y: 200 });
      expect(state.x).toBeCloseTo(150);
      expect(state.y).toBeCloseTo(150);
    });

    it("reset clears worldSpace flag", () => {
      state.applyCommand({ type: "set_world_space", enabled: true });
      expect(state.worldSpace).toBe(true);
      state.reset();
      expect(state.worldSpace).toBe(false);
    });

    it("set_world_space returns null (non-movement)", () => {
      const seg = state.applyCommand({ type: "set_world_space", enabled: true });
      expect(seg).toBeNull();
    });

    it("zoom scale is clamped at extreme high zoom (very small zoomScale)", () => {
      // 162676x zoom → zoomScale = 1/162676 ≈ 6e-6, clamped to 1e-3
      state.zoomScale = 1 / 162676;
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      // Clamped to 1e-3: 100 * 0.001 = 0.1 (not 100 * 6e-6 = 0.0006)
      expect(state.y).toBeCloseTo(-0.1);
      expect(seg!.toY).toBeCloseTo(-0.1);
    });

    it("zoom scale is clamped at extreme low zoom (very large zoomScale)", () => {
      // 0.0001x zoom → zoomScale = 10000, clamped to 1000
      state.zoomScale = 10000;
      const seg = state.applyCommand({ type: "forward", distance: 100 });
      // Clamped to 1e3: 100 * 1000 = 100000
      expect(state.y).toBeCloseTo(-100000);
      expect(seg!.toY).toBeCloseTo(-100000);
    });
  });

  describe("complex scenarios", () => {
    it("draws a square (4 forward + 4 right 90)", () => {
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const seg = state.applyCommand({ type: "forward", distance: 100 });
        segments.push(seg);
        state.applyCommand({ type: "right", angle: 90 });
      }
      // Should return to origin after a square
      expect(state.x).toBeCloseTo(0, 5);
      expect(state.y).toBeCloseTo(0, 5);
      expect(state.angle).toBe(0);
      expect(segments.every((s) => s !== null)).toBe(true);
    });

    it("draws a triangle", () => {
      for (let i = 0; i < 3; i++) {
        state.applyCommand({ type: "forward", distance: 100 });
        state.applyCommand({ type: "right", angle: 120 });
      }
      expect(state.x).toBeCloseTo(0, 5);
      expect(state.y).toBeCloseTo(0, 5);
    });
  });
});
