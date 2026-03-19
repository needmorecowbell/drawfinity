import { describe, it, expect, beforeEach } from "vitest";
import { Camera } from "../Camera";
import { CameraAnimator } from "../CameraAnimator";

describe("CameraAnimator", () => {
  let camera: Camera;
  let animator: CameraAnimator;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
    animator = new CameraAnimator(camera);
  });

  describe("tick", () => {
    it("returns false when no animation is active", () => {
      expect(animator.tick()).toBe(false);
    });

    it("returns true while momentum is active", () => {
      animator.setMomentum(5, 3);
      expect(animator.tick()).toBe(true);
    });

    it("returns true while zoom animation is active", () => {
      animator.animateZoomCentered(2);
      expect(animator.tick()).toBe(true);
    });
  });

  describe("momentum", () => {
    it("moves the camera according to velocity", () => {
      animator.setMomentum(10, 5);
      animator.tick();
      expect(camera.x).toBeCloseTo(10);
      expect(camera.y).toBeCloseTo(5);
    });

    it("decays velocity over multiple ticks (friction)", () => {
      animator.setMomentum(10, 0);
      animator.tick();
      const x1 = camera.x;
      animator.tick();
      const dx2 = camera.x - x1;
      // Second tick should move less than first (friction)
      expect(dx2).toBeLessThan(10);
      expect(dx2).toBeGreaterThan(0);
    });

    it("eventually stops (velocity below threshold)", () => {
      animator.setMomentum(1, 1);
      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      expect(animator.isAnimating).toBe(false);
    });

    it("is interrupted by interruptMomentum()", () => {
      animator.setMomentum(10, 10);
      animator.interruptMomentum();
      expect(animator.tick()).toBe(false);
    });

    it("is interrupted by interrupt()", () => {
      animator.setMomentum(10, 10);
      animator.interrupt();
      expect(animator.tick()).toBe(false);
    });
  });

  describe("animateZoomCentered", () => {
    it("interpolates zoom toward the target over multiple ticks", () => {
      animator.animateZoomCentered(4);

      animator.tick();
      expect(camera.zoom).toBeGreaterThan(1);
      expect(camera.zoom).toBeLessThan(4);

      // Run until settled
      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      expect(camera.zoom).toBeCloseTo(4, 2);
    });

    it("keeps camera position centered when zooming centered", () => {
      camera.x = 50;
      camera.y = 30;
      animator.animateZoomCentered(2);

      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      // Position should remain at the same center
      expect(camera.x).toBeCloseTo(50, 1);
      expect(camera.y).toBeCloseTo(30, 1);
    });

    it("clamps to MAX_ZOOM", () => {
      animator.animateZoomCentered(Camera.MAX_ZOOM * 10);
      for (let i = 0; i < 500; i++) {
        if (!animator.tick()) break;
      }
      expect(camera.zoom).toBeCloseTo(Camera.MAX_ZOOM, 0);
    });

    it("clamps to MIN_ZOOM", () => {
      animator.animateZoomCentered(Camera.MIN_ZOOM / 10);
      for (let i = 0; i < 500; i++) {
        if (!animator.tick()) break;
      }
      expect(camera.zoom).toBeCloseTo(Camera.MIN_ZOOM, 15);
    });
  });

  describe("animateZoomTo", () => {
    it("zooms toward target while keeping anchor point stable", () => {
      // Anchor at screen center → should keep camera position unchanged
      animator.animateZoomTo(2, 400, 300);
      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      expect(camera.zoom).toBeCloseTo(2, 2);
      expect(camera.x).toBeCloseTo(0, 1);
      expect(camera.y).toBeCloseTo(0, 1);
    });

    it("shifts camera when anchoring off-center", () => {
      // Anchor at top-left corner of 800x600 viewport
      animator.animateZoomTo(2, 0, 0);
      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      expect(camera.zoom).toBeCloseTo(2, 2);
      // Camera should shift so the world point at (0,0) screen stays there
      // At zoom=2: worldX = (0 - 400)/2 + camX → camX = worldX + 200
      // Original worldX at screen (0,0) zoom=1: (0-400)/1 + 0 = -400
      // target camX = -400 - (0-400)/2 = -400 + 200 = -200
      expect(camera.x).toBeCloseTo(-200, 0);
      expect(camera.y).toBeCloseTo(-150, 0);
    });

    it("is cancelled by interrupt()", () => {
      animator.animateZoomTo(4, 400, 300);
      animator.tick(); // start
      animator.interrupt();
      const zoomAfterInterrupt = camera.zoom;
      animator.tick();
      expect(camera.zoom).toBe(zoomAfterInterrupt);
    });
  });

  describe("animateTo", () => {
    it("animates camera to exact position and zoom over the given duration", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);

      timedAnimator.animateTo(100, 200, 4, 500);

      // At t=0, should still be at start (easeInOut(0) = 0)
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.zoom).toBe(1);

      // Midway through
      time = 250;
      timedAnimator.tick();
      // easeInOut(0.5) = 0.5, so position should be halfway
      expect(camera.x).toBeCloseTo(50, 1);
      expect(camera.y).toBeCloseTo(100, 1);
      // Zoom in log-space: exp(log(1) + (log(4)-log(1))*0.5) = exp(0.693) = 2
      expect(camera.zoom).toBeCloseTo(2, 1);

      // At completion
      time = 500;
      timedAnimator.tick();
      expect(camera.x).toBeCloseTo(100);
      expect(camera.y).toBeCloseTo(200);
      expect(camera.zoom).toBeCloseTo(4);
      expect(timedAnimator.isAnimating).toBe(false);
    });

    it("uses ease-in-out timing (slow start and end)", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      timedAnimator.animateTo(100, 0, 1, 1000);

      // At 10% time, easeInOut(0.1) = 4*0.001 = 0.004 → very little movement
      time = 100;
      timedAnimator.tick();
      expect(camera.x).toBeLessThan(5);

      // At 50% time, easeInOut(0.5) = 0.5 → half
      time = 500;
      timedAnimator.tick();
      expect(camera.x).toBeCloseTo(50, 0);

      // At 90% time, easeInOut(0.9) ≈ 0.972 → nearly there
      time = 900;
      timedAnimator.tick();
      expect(camera.x).toBeGreaterThan(95);
    });

    it("is interruptible by interrupt()", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      timedAnimator.animateTo(100, 200, 4, 500);

      time = 250;
      timedAnimator.tick();
      timedAnimator.interrupt();

      const xAfter = camera.x;
      time = 500;
      timedAnimator.tick();
      // Should not have moved further
      expect(camera.x).toBe(xAfter);
      expect(timedAnimator.isAnimating).toBe(false);
    });

    it("clamps zoom to valid range", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      timedAnimator.animateTo(0, 0, Camera.MAX_ZOOM * 100, 100);

      time = 100;
      timedAnimator.tick();
      expect(camera.zoom).toBeCloseTo(Camera.MAX_ZOOM, 0);
    });

    it("defaults to 500ms duration", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      timedAnimator.animateTo(100, 0, 1);

      // At 500ms should be complete
      time = 500;
      timedAnimator.tick();
      expect(camera.x).toBeCloseTo(100);
      expect(timedAnimator.isAnimating).toBe(false);
    });

    it("snaps to exact final values on completion", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      timedAnimator.animateTo(123.456, 789.012, 3.14159, 200);

      time = 200;
      timedAnimator.tick();
      expect(camera.x).toBe(123.456);
      expect(camera.y).toBe(789.012);
      // zoom snaps to exp(log(clampedZoom))
      expect(camera.zoom).toBeCloseTo(3.14159, 10);
    });

    it("reports isAnimating during the animation", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      expect(timedAnimator.isAnimating).toBe(false);

      timedAnimator.animateTo(100, 200, 2, 500);
      expect(timedAnimator.isAnimating).toBe(true);

      time = 500;
      timedAnimator.tick();
      expect(timedAnimator.isAnimating).toBe(false);
    });

    it("cancels any existing lerp-based target animation", () => {
      let time = 0;
      const timedAnimator = new CameraAnimator(camera, () => time);
      // Start a lerp animation
      timedAnimator.animateZoomCentered(4);
      expect(timedAnimator.isAnimating).toBe(true);

      // animateTo should replace it
      timedAnimator.animateTo(50, 50, 2, 300);
      time = 300;
      timedAnimator.tick();
      expect(camera.x).toBeCloseTo(50);
      expect(camera.y).toBeCloseTo(50);
      expect(camera.zoom).toBeCloseTo(2);
    });
  });

  describe("animateToFit", () => {
    it("zooms and pans to fit a bounding box", () => {
      animator.animateToFit(-100, -50, 100, 50);
      for (let i = 0; i < 200; i++) {
        if (!animator.tick()) break;
      }
      // Camera should center on the bounding box center
      expect(camera.x).toBeCloseTo(0, 0);
      expect(camera.y).toBeCloseTo(0, 0);
      // Zoom should fit 200x100 world units into 800x600 viewport (with padding)
      // zoomX = (800-80)/200 = 3.6, zoomY = (600-80)/100 = 5.2 → min = 3.6
      expect(camera.zoom).toBeCloseTo(3.6, 1);
    });

    it("ignores degenerate bounds (zero size)", () => {
      animator.animateToFit(0, 0, 0, 0);
      expect(animator.isAnimating).toBe(false);
    });
  });

  describe("isAnimating", () => {
    it("is false initially", () => {
      expect(animator.isAnimating).toBe(false);
    });

    it("is true during momentum", () => {
      animator.setMomentum(5, 5);
      expect(animator.isAnimating).toBe(true);
    });

    it("is true during zoom animation", () => {
      animator.animateZoomCentered(3);
      expect(animator.isAnimating).toBe(true);
    });
  });
});
