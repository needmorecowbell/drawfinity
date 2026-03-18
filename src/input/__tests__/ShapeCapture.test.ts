import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShapeCapture, ShapeDocumentModel } from "../ShapeCapture";
import { Camera } from "../../camera";
import { CameraController } from "../../camera";
import { Shape } from "../../model/Shape";

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

function createMockDocument(): ShapeDocumentModel & { shapes: Shape[] } {
  const shapes: Shape[] = [];
  return {
    shapes,
    addShape(shape: Shape) {
      shapes.push(shape);
    },
  };
}

describe("ShapeCapture", () => {
  let camera: Camera;
  let cameraController: { panning: boolean };
  let doc: ReturnType<typeof createMockDocument>;
  let canvas: ReturnType<typeof createMockCanvas>;
  let capture: ShapeCapture;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    cameraController = { panning: false };
    doc = createMockDocument();
    canvas = createMockCanvas();
    capture = new ShapeCapture(
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

  it("does not capture shapes when disabled", () => {
    // disabled by default
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 100, clientY: 100, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 200, clientY: 200, shiftKey: false, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 200, clientY: 200, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(0);
  });

  it("captures a rectangle shape from drag", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "rectangle", strokeColor: "#ff0000", strokeWidth: 3 });

    // Drag from screen center (400,300) to (500,400)
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    const shape = doc.shapes[0];
    expect(shape.type).toBe("rectangle");
    expect(shape.strokeColor).toBe("#ff0000");
    expect(shape.strokeWidth).toBe(3);
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(100);
    // Center should be midpoint of drag
    expect(shape.x).toBe(50);
    expect(shape.y).toBe(50);
  });

  it("does not finalize shape with zero dimensions (click without drag)", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 400, clientY: 300, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(0);
  });

  it("constrains proportions with Shift held (square)", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "rectangle" });

    // Drag 100px wide, 50px tall — shift should force square (100x100)
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: true, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 350, shiftKey: true, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 350, shiftKey: true, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].width).toBe(doc.shapes[0].height);
  });

  it("uses center-out mode with Alt held", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "ellipse" });

    // Start at screen center (400,300) which is world (0,0)
    // Drag to (500,400) which is world (100,100)
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: true, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: true, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: true, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    const shape = doc.shapes[0];
    expect(shape.type).toBe("ellipse");
    // Center should be at start point (world 0,0)
    expect(shape.x).toBe(0);
    expect(shape.y).toBe(0);
    // Width/height should be 2x the drag distance
    expect(shape.width).toBe(200);
    expect(shape.height).toBe(200);
  });

  it("constrains proportions with Shift + Alt (circle from center)", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "ellipse" });

    // Start at center, drag 100 wide, 60 tall — should constrain and center
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: true, altKey: true, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 360, shiftKey: true, altKey: true, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 360, shiftKey: true, altKey: true, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    const shape = doc.shapes[0];
    expect(shape.x).toBe(0); // centered at start
    expect(shape.y).toBe(0);
    expect(shape.width).toBe(shape.height); // constrained
  });

  it("does not capture when Ctrl is held", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: true, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(0);
  });

  it("does not capture on middle mouse button", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 1, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(0);
  });

  it("does not capture while camera is panning", () => {
    capture.setEnabled(true);
    cameraController.panning = true;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(0);
  });

  it("provides preview shape during drag", () => {
    capture.setEnabled(true);

    expect(capture.getPreviewShape()).toBeNull();

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    // Single point — still have preview since active
    const preview1 = capture.getPreviewShape();
    expect(preview1).not.toBeNull();

    canvas.__fire("pointermove", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    const preview2 = capture.getPreviewShape();
    expect(preview2).not.toBeNull();
    expect(preview2!.width).toBe(100);
    expect(preview2!.height).toBe(100);

    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    expect(capture.getPreviewShape()).toBeNull();
  });

  it("converts screen coordinates to world coordinates with camera offset", () => {
    capture.setEnabled(true);
    camera.x = 100;
    camera.y = 50;
    camera.zoom = 2;

    // screenToWorld: (clientX - viewportWidth/2) / zoom + cameraX
    // (400 - 400) / 2 + 100 = 100
    // (300 - 300) / 2 + 50 = 50
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    // (500 - 400) / 2 + 100 = 150
    // (400 - 300) / 2 + 50 = 100
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    const shape = doc.shapes[0];
    expect(shape.x).toBe(125); // midpoint of 100 and 150
    expect(shape.y).toBe(75);  // midpoint of 50 and 100
    expect(shape.width).toBe(50);  // 150 - 100
    expect(shape.height).toBe(50); // 100 - 50
  });

  it("sets shape type from config", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "polygon", sides: 6 });

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 350, clientY: 250, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 450, clientY: 350, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].type).toBe("polygon");
    expect(doc.shapes[0].sides).toBe(6);
  });

  it("sets star shape with inner radius", () => {
    capture.setEnabled(true);
    capture.setConfig({ shapeType: "star", sides: 5, starInnerRadius: 0.5 });

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 350, clientY: 250, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 450, clientY: 350, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].type).toBe("star");
    expect(doc.shapes[0].starInnerRadius).toBe(0.5);
  });

  it("carries fill color and opacity from config", () => {
    capture.setEnabled(true);
    capture.setConfig({ fillColor: "#00ff00", opacity: 0.7 });

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 350, clientY: 250, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 450, clientY: 350, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].fillColor).toBe("#00ff00");
    expect(doc.shapes[0].opacity).toBe(0.7);
  });

  it("cancels active drag when disabled", () => {
    capture.setEnabled(true);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 400, clientY: 300, pointerId: 1 });
    expect(capture.getPreviewShape()).not.toBeNull();

    capture.setEnabled(false);
    expect(capture.getPreviewShape()).toBeNull();

    // The pointerup should not create a shape
    canvas.__fire("pointerup", { clientX: 500, clientY: 400, shiftKey: false, altKey: false, pointerId: 1 });
    expect(doc.shapes).toHaveLength(0);
  });

  it("removes listeners on destroy", () => {
    capture.destroy();
    expect(canvas.removeEventListener).toHaveBeenCalledTimes(4);
  });

  it("handles negative drag direction (drag up-left)", () => {
    capture.setEnabled(true);

    // Start at (500,400), drag to (400,300) — going up-left
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, shiftKey: false, altKey: false, clientX: 500, clientY: 400, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 400, clientY: 300, shiftKey: false, altKey: false, pointerId: 1 });

    expect(doc.shapes).toHaveLength(1);
    const shape = doc.shapes[0];
    // Width/height should still be positive
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(100);
    // Center should be midpoint
    expect(shape.x).toBe(50);
    expect(shape.y).toBe(50);
  });
});
