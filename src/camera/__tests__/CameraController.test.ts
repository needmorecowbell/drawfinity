import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Camera } from "../Camera";
import { CameraAnimator } from "../CameraAnimator";
import { CameraController } from "../CameraController";

// Mock document globally since CameraController registers keyboard handlers
const mockDocAddEventListener = vi.fn();
const mockDocRemoveEventListener = vi.fn();
const originalDocument = globalThis.document;

function makeCanvas(): HTMLCanvasElement {
  const canvas = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    clientWidth: 800,
    clientHeight: 600,
    style: {} as CSSStyleDeclaration,
  } as unknown as HTMLCanvasElement;
  return canvas;
}

function getHandler(
  canvas: HTMLCanvasElement,
  eventName: string,
): (...args: unknown[]) => void {
  const calls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock
    .calls;
  const match = calls.find((c: unknown[]) => c[0] === eventName);
  if (!match) throw new Error(`No handler for ${eventName}`);
  return match[1] as (...args: unknown[]) => void;
}

function getDocHandler(eventName: string): (...args: unknown[]) => void {
  const calls = mockDocAddEventListener.mock.calls;
  const match = calls.find((c: unknown[]) => c[0] === eventName);
  if (!match) throw new Error(`No document handler for ${eventName}`);
  return match[1] as (...args: unknown[]) => void;
}

describe("CameraController", () => {
  let camera: Camera;
  let canvas: HTMLCanvasElement;
  let animator: CameraAnimator;
  let controller: CameraController;

  beforeEach(() => {
    mockDocAddEventListener.mockClear();
    mockDocRemoveEventListener.mockClear();

    // Provide a minimal document mock for keyboard event registration
    globalThis.document = {
      addEventListener: mockDocAddEventListener,
      removeEventListener: mockDocRemoveEventListener,
    } as unknown as Document;

    camera = new Camera();
    camera.setViewportSize(800, 600);
    canvas = makeCanvas();
    animator = new CameraAnimator(camera);
    controller = new CameraController(camera, canvas, animator);
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("registers pointer and wheel listeners (no touch events)", () => {
    const calls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock
      .calls;
    const events = calls.map((c: unknown[]) => c[0]);
    expect(events).toContain("pointerdown");
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerup");
    expect(events).toContain("pointercancel");
    expect(events).toContain("wheel");
    // Should NOT use TouchEvent API
    expect(events).not.toContain("touchstart");
    expect(events).not.toContain("touchmove");
    expect(events).not.toContain("touchend");
  });

  it("registers keyboard listeners on document", () => {
    const calls = (document.addEventListener as ReturnType<typeof vi.fn>).mock
      .calls;
    const events = calls.map((c: unknown[]) => c[0]);
    expect(events).toContain("keydown");
    expect(events).toContain("keyup");
  });

  it("pans on middle mouse button drag", () => {
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");
    const up = getHandler(canvas, "pointerup");

    down({
      button: 1,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });
    expect(controller.panning).toBe(true);

    move({ clientX: 150, clientY: 120, pointerId: 1 });
    expect(camera.x).toBeCloseTo(-50);
    expect(camera.y).toBeCloseTo(-20);

    up({ pointerId: 1 });
    expect(controller.panning).toBe(false);
  });

  it("pans on Ctrl+left click drag", () => {
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");

    down({
      button: 0,
      ctrlKey: true,
      clientX: 200,
      clientY: 200,
      pointerId: 1,
      preventDefault: vi.fn(),
    });
    expect(controller.panning).toBe(true);

    move({ clientX: 210, clientY: 205, pointerId: 1 });
    expect(camera.x).toBeCloseTo(-10);
    expect(camera.y).toBeCloseTo(-5);
  });

  it("does not pan on regular left click", () => {
    const down = getHandler(canvas, "pointerdown");
    down({
      button: 0,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });
    expect(controller.panning).toBe(false);
  });

  it("zooms in on scroll up via animated zoom", () => {
    const animateSpy = vi.spyOn(animator, "animateZoomTo");
    const wheel = getHandler(canvas, "wheel");
    wheel({
      deltaY: -100,
      clientX: 400,
      clientY: 300,
      ctrlKey: false,
      preventDefault: vi.fn(),
    });
    expect(animateSpy).toHaveBeenCalledWith(
      expect.closeTo(1.1, 1),
      400,
      300,
    );
  });

  it("zooms out on scroll down via animated zoom", () => {
    const animateSpy = vi.spyOn(animator, "animateZoomTo");
    const wheel = getHandler(canvas, "wheel");
    wheel({
      deltaY: 100,
      clientX: 400,
      clientY: 300,
      ctrlKey: false,
      preventDefault: vi.fn(),
    });
    expect(animateSpy).toHaveBeenCalledWith(
      expect.closeTo(1 / 1.1, 1),
      400,
      300,
    );
  });

  it("handles trackpad pinch (ctrlKey + wheel) with continuous zoom", () => {
    const wheel = getHandler(canvas, "wheel");
    const zoomBefore = camera.zoom;
    // Trackpad pinch sends ctrlKey=true with small deltaY
    wheel({
      deltaY: -2,
      clientX: 400,
      clientY: 300,
      ctrlKey: true,
      preventDefault: vi.fn(),
    });
    expect(camera.zoom).toBeGreaterThan(zoomBefore);
    // Continuous zoom should be a small increment, not a full 1.1x step
    expect(camera.zoom).toBeLessThan(zoomBefore * 1.1);
  });

  it("activates space-to-pan mode on Space key", () => {
    const keyDown = getDocHandler("keydown");
    const keyUp = getDocHandler("keyup");

    keyDown({
      code: "Space",
      key: " ",
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
    });
    // Space held → panning mode active (prevents drawing)
    expect(controller.panning).toBe(true);

    keyUp({ code: "Space" });
    expect(controller.panning).toBe(false);
  });

  it("pans on space+left drag", () => {
    const keyDown = getDocHandler("keydown");
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");

    keyDown({
      code: "Space",
      key: " ",
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
    });

    down({
      button: 0,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    move({ clientX: 130, clientY: 110, pointerId: 1 });
    expect(camera.x).toBeCloseTo(-30);
    expect(camera.y).toBeCloseTo(-10);
  });

  it("hands off momentum to animator on pan release", () => {
    const setMomentumSpy = vi.spyOn(animator, "setMomentum");
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");
    const up = getHandler(canvas, "pointerup");

    down({
      button: 1,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    // Simulate several fast move events to build velocity
    for (let i = 1; i <= 5; i++) {
      move({ clientX: 100 + i * 20, clientY: 100 + i * 10, pointerId: 1 });
    }

    up({ pointerId: 1 });
    expect(setMomentumSpy).toHaveBeenCalled();
  });

  it("handles two-pointer pinch zoom via PointerEvent", () => {
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");
    const up = getHandler(canvas, "pointerup");

    // First pointer down
    down({
      button: 0,
      ctrlKey: false,
      clientX: 300,
      clientY: 300,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    // Second pointer down → starts pinch
    down({
      button: 0,
      ctrlKey: false,
      clientX: 500,
      clientY: 300,
      pointerId: 2,
      preventDefault: vi.fn(),
    });

    const zoomBefore = camera.zoom;

    // Spread fingers apart → zoom in
    move({ clientX: 250, clientY: 300, pointerId: 1 });
    move({ clientX: 550, clientY: 300, pointerId: 2 });

    expect(camera.zoom).toBeGreaterThan(zoomBefore);

    // Release pointers
    up({ pointerId: 1 });
    up({ pointerId: 2 });
  });

  it("invokes onPanStateChange when Space key toggles pan mode", () => {
    const panCallback = vi.fn();
    controller.onPanStateChange = panCallback;

    const keyDown = getDocHandler("keydown");
    const keyUp = getDocHandler("keyup");

    keyDown({
      code: "Space",
      key: " ",
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
    });
    expect(panCallback).toHaveBeenCalledWith(true);

    keyUp({ code: "Space" });
    expect(panCallback).toHaveBeenCalledWith(false);
  });

  // Pan tool mode tests
  it("panToolActive enables panning state", () => {
    expect(controller.panToolActive).toBe(false);
    controller.panToolActive = true;
    expect(controller.panToolActive).toBe(true);
    expect(controller.panning).toBe(true);
  });

  it("panToolActive sets grab cursor", () => {
    controller.panToolActive = true;
    expect(canvas.style.cursor).toBe("grab");
    controller.panToolActive = false;
    expect(canvas.style.cursor).toBe("");
  });

  it("panToolActive fires onPanStateChange callback", () => {
    const panCallback = vi.fn();
    controller.onPanStateChange = panCallback;
    controller.panToolActive = true;
    expect(panCallback).toHaveBeenCalledWith(true);
    controller.panToolActive = false;
    expect(panCallback).toHaveBeenCalledWith(false);
  });

  it("pans on left-click drag when panToolActive", () => {
    controller.panToolActive = true;
    const down = getHandler(canvas, "pointerdown");
    const move = getHandler(canvas, "pointermove");
    const up = getHandler(canvas, "pointerup");

    down({
      button: 0,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    // Cursor should switch to grabbing during drag
    expect(canvas.style.cursor).toBe("grabbing");

    move({ clientX: 150, clientY: 120, pointerId: 1 });
    expect(camera.x).toBeCloseTo(-50);
    expect(camera.y).toBeCloseTo(-20);

    up({ pointerId: 1 });
    // Cursor should return to grab after release
    expect(canvas.style.cursor).toBe("grab");
  });

  it("does not pan on left-click when panToolActive is false", () => {
    const down = getHandler(canvas, "pointerdown");
    down({
      button: 0,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      preventDefault: vi.fn(),
    });
    expect(controller.panning).toBe(false);
  });

  it("removes all listeners on destroy", () => {
    controller.destroy();

    const canvasCalls = (
      canvas.removeEventListener as ReturnType<typeof vi.fn>
    ).mock.calls;
    const canvasEvents = canvasCalls.map((c: unknown[]) => c[0]);
    expect(canvasEvents).toContain("pointerdown");
    expect(canvasEvents).toContain("pointermove");
    expect(canvasEvents).toContain("pointerup");
    expect(canvasEvents).toContain("pointercancel");
    expect(canvasEvents).toContain("wheel");

    const docCalls = (
      document.removeEventListener as ReturnType<typeof vi.fn>
    ).mock.calls;
    const docEvents = docCalls.map((c: unknown[]) => c[0]);
    expect(docEvents).toContain("keydown");
    expect(docEvents).toContain("keyup");
  });
});
