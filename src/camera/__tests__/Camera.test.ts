import { describe, it, expect, beforeEach } from "vitest";
import { Camera } from "../Camera";

describe("Camera", () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera();
    camera.setViewportSize(800, 600);
  });

  it("initializes with default position and zoom", () => {
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.zoom).toBe(1);
  });

  it("returns a 9-element Float32Array from getTransformMatrix", () => {
    const mat = camera.getTransformMatrix();
    expect(mat).toBeInstanceOf(Float32Array);
    expect(mat.length).toBe(9);
  });

  it("produces an identity-like matrix at default state", () => {
    // At zoom=1, viewport 800x600, camera at origin:
    // sx = 2*1/800 = 0.0025, sy = -2*1/600 ≈ -0.00333
    // tx = 0, ty = 0
    const mat = camera.getTransformMatrix();
    expect(mat[0]).toBeCloseTo(2 / 800);  // sx
    expect(mat[4]).toBeCloseTo(-2 / 600); // sy
    expect(mat[6]).toBeCloseTo(0);        // tx
    expect(mat[7]).toBeCloseTo(0);        // ty
    expect(mat[8]).toBe(1);               // w
  });

  it("translates when camera position changes", () => {
    camera.x = 100;
    camera.y = 50;
    const mat = camera.getTransformMatrix();
    // tx = -100 * (2/800) = -0.25
    // ty = -50 * (-2/600) = 0.1667
    expect(mat[6]).toBeCloseTo(-0.25);
    expect(mat[7]).toBeCloseTo(0.16667, 3);
  });

  it("scales when zoom changes", () => {
    camera.zoom = 2;
    const mat = camera.getTransformMatrix();
    expect(mat[0]).toBeCloseTo(4 / 800);
    expect(mat[4]).toBeCloseTo(-4 / 600);
  });

  describe("screenToWorld", () => {
    it("maps screen center to camera position", () => {
      camera.x = 50;
      camera.y = 30;
      const world = camera.screenToWorld(400, 300);
      expect(world.x).toBeCloseTo(50);
      expect(world.y).toBeCloseTo(30);
    });

    it("maps top-left corner correctly at default state", () => {
      const world = camera.screenToWorld(0, 0);
      expect(world.x).toBeCloseTo(-400);
      expect(world.y).toBeCloseTo(-300);
    });

    it("accounts for zoom in screen-to-world conversion", () => {
      camera.zoom = 2;
      const world = camera.screenToWorld(0, 0);
      // offset from center = -400, -300 pixels, divided by zoom 2
      expect(world.x).toBeCloseTo(-200);
      expect(world.y).toBeCloseTo(-150);
    });
  });

  describe("zoomAt", () => {
    it("zooms in centered on cursor and clamps within range", () => {
      const beforeWorld = camera.screenToWorld(200, 150);
      camera.zoomAt(200, 150, 2);
      const afterWorld = camera.screenToWorld(200, 150);
      // World point under cursor should remain the same
      expect(afterWorld.x).toBeCloseTo(beforeWorld.x, 3);
      expect(afterWorld.y).toBeCloseTo(beforeWorld.y, 3);
      expect(camera.zoom).toBe(2);
    });

    it("clamps zoom to maximum", () => {
      camera.zoom = 90;
      camera.zoomAt(400, 300, 2);
      expect(camera.zoom).toBe(Camera.MAX_ZOOM);
    });

    it("clamps zoom to minimum", () => {
      camera.zoom = 0.02;
      camera.zoomAt(400, 300, 0.1);
      expect(camera.zoom).toBe(Camera.MIN_ZOOM);
    });
  });
});
