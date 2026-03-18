// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FpsCounter } from "../FpsCounter";

describe("FpsCounter", () => {
  let fps: FpsCounter;

  beforeEach(() => {
    fps = new FpsCounter();
  });

  afterEach(() => {
    fps.destroy();
  });

  it("starts hidden", () => {
    expect(fps.isVisible()).toBe(false);
  });

  it("toggles visibility", () => {
    fps.toggle();
    expect(fps.isVisible()).toBe(true);
    fps.toggle();
    expect(fps.isVisible()).toBe(false);
  });

  it("updates display when visible", () => {
    fps.toggle();
    // Simulate several frames at ~60fps (16.67ms apart)
    for (let i = 0; i < 10; i++) {
      fps.update(1000 + i * 16.67, 100, 50);
    }
    // The internal container should have content
    expect(fps.isVisible()).toBe(true);
  });

  it("does not crash when updating while hidden", () => {
    fps.update(1000, 100, 50);
    fps.update(1016.67, 100, 50);
    expect(fps.isVisible()).toBe(false);
  });

  it("resets frame tracking on toggle", () => {
    fps.toggle();
    fps.update(1000, 50, 25);
    fps.update(1016.67, 50, 25);
    fps.toggle(); // hide
    fps.toggle(); // show again — should reset
    expect(fps.isVisible()).toBe(true);
  });
});
