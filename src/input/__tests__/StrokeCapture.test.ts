import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrokeCapture } from "../StrokeCapture";
import { Camera } from "../../camera";
import { CameraController } from "../../camera";
import { DrawDocument } from "../../model/Document";

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

describe("StrokeCapture", () => {
  let camera: Camera;
  let cameraController: { panning: boolean };
  let doc: DrawDocument;
  let canvas: ReturnType<typeof createMockCanvas>;
  let capture: StrokeCapture;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    cameraController = { panning: false };
    doc = new DrawDocument();
    canvas = createMockCanvas();
    capture = new StrokeCapture(
      camera,
      cameraController as CameraController,
      doc,
      canvas,
    );
  });

  it("registers pointer event listeners", () => {
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });

  it("captures a stroke from pointer events", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.7, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 420, clientY: 320, pressure: 0.6, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    const strokes = doc.getStrokes();
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points).toHaveLength(3);
    expect(strokes[0].color).toBe("#000000");
    expect(strokes[0].width).toBe(2);
  });

  it("does not capture stroke when Ctrl is held (pan mode)", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: true, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.7, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    expect(doc.getStrokes()).toHaveLength(0);
  });

  it("does not capture stroke on middle mouse button", () => {
    canvas.__fire("pointerdown", { button: 1, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.7, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    expect(doc.getStrokes()).toHaveLength(0);
  });

  it("does not finalize strokes with fewer than 2 points", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    expect(doc.getStrokes()).toHaveLength(0);
  });

  it("converts screen coordinates to world coordinates", () => {
    camera.x = 100;
    camera.y = 50;
    camera.zoom = 2;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    const strokes = doc.getStrokes();
    expect(strokes).toHaveLength(1);
    // screenToWorld: (400 - 400) / 2 + 100 = 100, (300 - 300) / 2 + 50 = 50
    expect(strokes[0].points[0].x).toBe(100);
    expect(strokes[0].points[0].y).toBe(50);
  });

  it("provides active stroke for live rendering", () => {
    expect(capture.getActiveStroke()).toBeNull();

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    // Still null with only 1 point
    expect(capture.getActiveStroke()).toBeNull();

    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.5, pointerId: 1 });
    const active = capture.getActiveStroke();
    expect(active).not.toBeNull();
    expect(active!.points).toHaveLength(2);

    canvas.__fire("pointerup", { pointerId: 1 });
    expect(capture.getActiveStroke()).toBeNull();
  });

  it("uses default pressure of 0.5 when pressure is 0", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    const strokes = doc.getStrokes();
    expect(strokes[0].points[0].pressure).toBe(0.5);
  });

  it("removes listeners on destroy", () => {
    capture.destroy();
    expect(canvas.removeEventListener).toHaveBeenCalledTimes(4);
  });

  it("allows setting color and width", () => {
    capture.setColor("#ff0000");
    capture.setWidth(5);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 400, clientY: 300, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 410, clientY: 310, pressure: 0.5, pointerId: 1 });
    canvas.__fire("pointerup", { pointerId: 1 });

    const strokes = doc.getStrokes();
    expect(strokes[0].color).toBe("#ff0000");
    expect(strokes[0].width).toBe(5);
  });
});
