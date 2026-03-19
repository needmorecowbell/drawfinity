import { describe, it, expect, vi, beforeEach } from "vitest";
import { MagnifyCapture } from "../MagnifyCapture";
import { Camera } from "../../camera";

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
  } as unknown as HTMLCanvasElement & {
    __fire: (event: string, data: Partial<PointerEvent>) => void;
  };
}

function createMockCameraAnimator() {
  return {
    animateZoomTo: vi.fn(),
  };
}

function createMockCameraController() {
  return { panning: false };
}

describe("MagnifyCapture", () => {
  let camera: Camera;
  let animator: ReturnType<typeof createMockCameraAnimator>;
  let controller: ReturnType<typeof createMockCameraController>;
  let canvas: ReturnType<typeof createMockCanvas>;
  let capture: MagnifyCapture;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    vi.spyOn(camera, "zoomAt");
    animator = createMockCameraAnimator();
    controller = createMockCameraController();
    canvas = createMockCanvas();
    capture = new MagnifyCapture(
      camera,
      animator as any,
      controller as any,
      canvas,
    );
    capture.setEnabled(true);
  });

  it("registers pointer event listeners on canvas", () => {
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(canvas.addEventListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });

  it("click (pointerdown + pointerup without move) calls animateZoomTo with 2x zoom", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 1 });

    expect(animator.animateZoomTo).toHaveBeenCalledWith(camera.zoom * 2, 100, 200);
    expect(camera.zoomAt).not.toHaveBeenCalled();
  });

  it("drag up (negative deltaY > 5px) calls camera.zoomAt with factor > 1", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    // Move up by 10px (negative deltaY)
    canvas.__fire("pointermove", { clientX: 100, clientY: 190, pointerId: 1 });

    expect(camera.zoomAt).toHaveBeenCalled();
    const [, , factor] = (camera.zoomAt as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(factor).toBeGreaterThan(1);
  });

  it("drag down (positive deltaY > 5px) calls camera.zoomAt with factor < 1", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    // Move down by 10px (positive deltaY)
    canvas.__fire("pointermove", { clientX: 100, clientY: 210, pointerId: 1 });

    expect(camera.zoomAt).toHaveBeenCalled();
    const [, , factor] = (camera.zoomAt as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(factor).toBeLessThan(1);
  });

  it("small movement (<5px) is treated as click not drag", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    // Move only 3px (below threshold)
    canvas.__fire("pointermove", { clientX: 100, clientY: 203, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 203, pointerId: 1 });

    // Should be treated as a click
    expect(camera.zoomAt).not.toHaveBeenCalled();
    expect(animator.animateZoomTo).toHaveBeenCalledWith(camera.zoom * 2, 100, 200);
  });

  it("setEnabled(false) prevents all zoom interaction", () => {
    capture.setEnabled(false);

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 100, clientY: 150, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 150, pointerId: 1 });

    expect(camera.zoomAt).not.toHaveBeenCalled();
    expect(animator.animateZoomTo).not.toHaveBeenCalled();
  });

  it("right-click (button !== 0) is ignored", () => {
    canvas.__fire("pointerdown", { button: 2, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 1 });

    expect(animator.animateZoomTo).not.toHaveBeenCalled();
  });

  it("ctrl-click is ignored", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: true, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 1 });

    expect(animator.animateZoomTo).not.toHaveBeenCalled();
  });

  it("cameraController.panning = true causes pointerdown to be ignored", () => {
    controller.panning = true;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 1 });

    expect(animator.animateZoomTo).not.toHaveBeenCalled();
  });

  it("onCursorChange fires 'in' when dragging up", () => {
    const cursorChange = vi.fn();
    capture.onCursorChange = cursorChange;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 100, clientY: 190, pointerId: 1 });

    expect(cursorChange).toHaveBeenCalledWith("in");
  });

  it("onCursorChange fires 'out' when dragging down", () => {
    const cursorChange = vi.fn();
    capture.onCursorChange = cursorChange;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 100, clientY: 210, pointerId: 1 });

    expect(cursorChange).toHaveBeenCalledWith("out");
  });

  it("onCursorChange fires 'default' on pointerup", () => {
    const cursorChange = vi.fn();
    capture.onCursorChange = cursorChange;

    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 1 });

    expect(cursorChange).toHaveBeenCalledWith("default");
  });

  it("zoom anchors at the pointerdown position during drag", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 300, clientY: 400, pointerId: 1 });
    canvas.__fire("pointermove", { clientX: 300, clientY: 380, pointerId: 1 });

    expect(camera.zoomAt).toHaveBeenCalledWith(300, 400, expect.any(Number));
  });

  it("destroy removes event listeners from canvas", () => {
    capture.destroy();
    expect(canvas.removeEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });

  it("isEnabled reflects setEnabled state", () => {
    expect(capture.isEnabled()).toBe(true);
    capture.setEnabled(false);
    expect(capture.isEnabled()).toBe(false);
  });

  it("pointerup from different pointerId is ignored", () => {
    canvas.__fire("pointerdown", { button: 0, ctrlKey: false, clientX: 100, clientY: 200, pointerId: 1 });
    canvas.__fire("pointerup", { clientX: 100, clientY: 200, pointerId: 99 });

    // Should not trigger click zoom since pointerId doesn't match
    expect(animator.animateZoomTo).not.toHaveBeenCalled();
  });
});
