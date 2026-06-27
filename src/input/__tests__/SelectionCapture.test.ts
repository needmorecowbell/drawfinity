import { describe, it, expect, vi, beforeEach } from "vitest";
import { Camera, CameraController } from "../../camera";
import { SelectionCapture, SelectionRegion } from "../SelectionCapture";

function createMockCanvas() {
  const listeners: Record<string, Function[]> = {};
  return {
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    __fire(event: string, data: Partial<PointerEvent>) {
      for (const fn of listeners[event] || []) {
        fn(data);
      }
    },
  } as unknown as HTMLCanvasElement & { __fire: (event: string, data: Partial<PointerEvent>) => void };
}

describe("SelectionCapture", () => {
  let camera: Camera;
  let cameraController: { panning: boolean };
  let canvas: ReturnType<typeof createMockCanvas>;
  let capture: SelectionCapture;
  let completed: SelectionRegion[];

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    cameraController = { panning: false };
    canvas = createMockCanvas();
    capture = new SelectionCapture(camera, cameraController as CameraController, canvas);
    completed = [];
    capture.onSelectionComplete = (region) => completed.push(region);
  });

  it("registers pointer event listeners", () => {
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });

  it("does not capture while disabled", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, pointerId: 1 });

    expect(completed).toHaveLength(0);
    expect(capture.getPreviewRegion()).toBeNull();
  });

  it("captures a rectangular selection from a drag", () => {
    capture.setEnabled(true);
    capture.setMode("rectangle");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, pointerId: 1 });

    expect(capture.getPreviewRegion()).toEqual({
      type: "rect",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    });

    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, pointerId: 1 });

    expect(completed).toEqual([
      { type: "rect", bounds: { x: 0, y: 0, width: 100, height: 100 } },
    ]);
    expect(capture.getPreviewRegion()).toBeNull();
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("captures an elliptical selection from a drag", () => {
    capture.setEnabled(true);
    capture.setMode("ellipse");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 520, clientY: 360, shiftKey: false, pointerId: 1 });

    expect(completed).toEqual([
      { type: "ellipse", bounds: { x: 0, y: 0, width: 120, height: 60 } },
    ]);
  });

  it("constrains rectangle drag to a square with Shift held", () => {
    capture.setEnabled(true);
    capture.setMode("rectangle");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: true, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 350, shiftKey: true, pointerId: 1 });

    expect(completed).toEqual([
      { type: "rect", bounds: { x: 0, y: 0, width: 100, height: 100 } },
    ]);
  });

  it("normalizes negative drag direction", () => {
    capture.setEnabled(true);
    capture.setMode("ellipse");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 500, clientY: 400, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 400, clientY: 300, shiftKey: false, pointerId: 1 });

    expect(completed).toEqual([
      { type: "ellipse", bounds: { x: 0, y: 0, width: 100, height: 100 } },
    ]);
  });

  it("does not finalize zero-size drag selections", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 400, clientY: 300, shiftKey: false, pointerId: 1 });

    expect(completed).toHaveLength(0);
  });

  it("converts screen coordinates to world coordinates using camera", () => {
    capture.setEnabled(true);
    camera.x = 100;
    camera.y = 50;
    camera.zoom = 2;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, pointerId: 1 });

    expect(completed).toEqual([
      { type: "rect", bounds: { x: 100, y: 50, width: 50, height: 50 } },
    ]);
  });

  it("adds lasso vertices and finalizes on double-click", () => {
    capture.setEnabled(true);
    capture.setMode("lasso");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1, detail: 1 });
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 500, clientY: 300, pointerId: 1, detail: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, pointerId: 1 });

    expect(capture.getPreviewRegion()).toEqual({
      type: "lasso",
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
    });

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 500, clientY: 400, pointerId: 1, detail: 2 });

    expect(completed).toEqual([
      {
        type: "lasso",
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      },
    ]);
    expect(capture.getPreviewRegion()).toBeNull();
  });

  it("finalizes lasso when clicking near the first vertex", () => {
    capture.setEnabled(true);
    capture.setMode("lasso");

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1, detail: 1 });
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 500, clientY: 300, pointerId: 1, detail: 1 });
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 500, clientY: 400, pointerId: 1, detail: 1 });
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 405, clientY: 305, pointerId: 1, detail: 1 });

    expect(completed).toEqual([
      {
        type: "lasso",
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      },
    ]);
  });

  it("ignores ctrl-click, non-left click, and panning", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: true, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, pointerId: 1 });

    canvas.__fire("pointerdown", { button: 1, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, pointerId: 1 });

    cameraController.panning = true;
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, pointerId: 1 });

    expect(completed).toHaveLength(0);
  });

  it("moves the active selection instead of starting a new region when dragging inside it", () => {
    capture.setEnabled(true);
    capture.setActiveRegion({ type: "rect", bounds: { x: 0, y: 0, width: 100, height: 100 } });
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onMoveEnd = vi.fn();
    capture.onSelectionMoveStart = onMoveStart;
    capture.onSelectionMove = onMove;
    capture.onSelectionMoveEnd = onMoveEnd;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 450, clientY: 350, pointerId: 1, preventDefault: vi.fn() });
    canvas.__fire("pointermove", { clientX: 470, clientY: 380, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 470, clientY: 380, pointerId: 1 });

    expect(completed).toHaveLength(0);
    expect(onMoveStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(20, 30);
    expect(onMoveEnd).toHaveBeenCalledTimes(1);
    expect(capture.getPreviewRegion()).toBeNull();
  });

  it("prevents the default gesture when starting a selection move so the camera does not pan", () => {
    capture.setEnabled(true);
    capture.setActiveRegion({ type: "rect", bounds: { x: 0, y: 0, width: 100, height: 100 } });

    const preventDefault = vi.fn();
    canvas.__fire("pointerdown", {
      button: 0,
      ctrlKey: false,
      clientX: 450,
      clientY: 350,
      pointerId: 1,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("does not prevent the default gesture for a normal marquee drag", () => {
    capture.setEnabled(true);

    const preventDefault = vi.fn();
    canvas.__fire("pointerdown", {
      button: 0,
      ctrlKey: false,
      shiftKey: false,
      clientX: 400,
      clientY: 300,
      pointerId: 1,
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("clears active selection input when disabled or mode changes", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    expect(capture.getPreviewRegion()).not.toBeNull();

    capture.setEnabled(false);
    expect(capture.getPreviewRegion()).toBeNull();

    capture.setEnabled(true);
    capture.setMode("lasso");
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pointerId: 1, detail: 1 });
    expect(capture.getPreviewRegion()).not.toBeNull();

    capture.setMode("rectangle");
    expect(capture.getPreviewRegion()).toBeNull();
  });

  it("removes listeners on destroy", () => {
    capture.destroy();
    expect(canvas.removeEventListener).toHaveBeenCalledTimes(4);
  });
});
