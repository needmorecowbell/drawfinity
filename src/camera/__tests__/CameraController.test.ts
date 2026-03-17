import { describe, it, expect, beforeEach, vi } from "vitest";
import { Camera } from "../Camera";
import { CameraController } from "../CameraController";

function makeCanvas(): HTMLCanvasElement {
  const canvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    clientWidth: 800,
    clientHeight: 600,
  } as unknown as HTMLCanvasElement;
  return canvas;
}

function getHandler(canvas: HTMLCanvasElement, eventName: string): (...args: unknown[]) => void {
  const calls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find((c: unknown[]) => c[0] === eventName);
  if (!match) throw new Error(`No handler for ${eventName}`);
  return match[1] as (...args: unknown[]) => void;
}

describe("CameraController", () => {
  let camera: Camera;
  let canvas: HTMLCanvasElement;
  let _controller: CameraController;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    canvas = makeCanvas();
    _controller = new CameraController(camera, canvas);
  });

  it("registers event listeners on construction", () => {
    const calls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const events = calls.map((c: unknown[]) => c[0]);
    expect(events).toContain("pointerdown");
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    expect(events).toContain("wheel");
    expect(events).toContain("touchstart");
    expect(events).toContain("touchmove");
    expect(events).toContain("touchend");
  });

  it("pans on middle mouse button drag", () => {
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");
    const up = getHandler(canvas, "pointerup");

    down({ button: 1, ctrlKey: false, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() });
    expect(_controller.panning).toBe(true);

    move({ clientX: 150, clientY: 120, pointerId: 1 });
    // Moved 50px right, 20px down → camera moves -50/zoom, -20/zoom
    expect(camera.x).toBeCloseTo(-50);
    expect(camera.y).toBeCloseTo(-20);

    up({ pointerId: 1 });
    expect(_controller.panning).toBe(false);
  });

  it("pans on Ctrl+left click drag", () => {
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");

    down({ button: 0, ctrlKey: true, clientX: 200, clientY: 200, pointerId: 1, preventDefault: vi.fn() });
    expect(_controller.panning).toBe(true);

    move({ clientX: 210, clientY: 205, pointerId: 1 });
    expect(camera.x).toBeCloseTo(-10);
    expect(camera.y).toBeCloseTo(-5);
  });

  it("does not pan on regular left click", () => {
    const down = getHandler(canvas, "pointerdown");
    down({ button: 0, ctrlKey: false, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() });
    expect(_controller.panning).toBe(false);
  });

  it("zooms in on scroll up", () => {
    const wheel = getHandler(canvas, "wheel");
    wheel({ deltaY: -100, clientX: 400, clientY: 300, preventDefault: vi.fn() });
    expect(camera.zoom).toBeGreaterThan(1);
  });

  it("zooms out on scroll down", () => {
    const wheel = getHandler(canvas, "wheel");
    wheel({ deltaY: 100, clientX: 400, clientY: 300, preventDefault: vi.fn() });
    expect(camera.zoom).toBeLessThan(1);
  });

  it("removes event listeners on destroy", () => {
    _controller.destroy();
    const calls = (canvas.removeEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const events = calls.map((c: unknown[]) => c[0]);
    expect(events).toContain("pointerdown");
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    expect(events).toContain("pointercancel");
    expect(events).toContain("wheel");
    expect(events).toContain("touchstart");
    expect(events).toContain("touchmove");
    expect(events).toContain("touchend");
  });
});
