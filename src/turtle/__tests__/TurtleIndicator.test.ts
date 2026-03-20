// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TurtleIndicator } from "../TurtleIndicator";
import { TurtleState } from "../TurtleState";
import { Camera } from "../../camera/Camera";

describe("TurtleIndicator", () => {
  let root: HTMLElement;
  let camera: Camera;
  let state: TurtleState;
  let indicator: TurtleIndicator;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    camera = new Camera();
    camera.setViewportSize(800, 600);
    state = new TurtleState();
    indicator = new TurtleIndicator(root, camera, state);
  });

  afterEach(() => {
    indicator.destroy();
    root.remove();
  });

  describe("initial state", () => {
    it("is hidden by default", () => {
      expect(indicator.isVisible()).toBe(false);
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.display).toBe("none");
    });

    it("appends a container element with SVG to the root", () => {
      const el = root.querySelector(".turtle-indicator");
      expect(el).toBeTruthy();
      const svg = el!.querySelector("svg");
      expect(svg).toBeTruthy();
      const path = svg!.querySelector("path");
      expect(path).toBeTruthy();
    });
  });

  describe("show/hide", () => {
    it("becomes visible on show()", () => {
      indicator.show();
      expect(indicator.isVisible()).toBe(true);
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el.style.display).toBe("");
    });

    it("becomes hidden on hide()", () => {
      indicator.show();
      indicator.hide();
      expect(indicator.isVisible()).toBe(false);
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el.style.display).toBe("none");
    });
  });

  describe("positioning", () => {
    it("positions at screen center when turtle is at camera center", () => {
      // Camera at (0,0), turtle at (0,0), viewport 800x600 → screen (400, 300)
      indicator.show();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      // screenX = (0 - 0) * 1 + 400 = 400, screenY = (0 - 0) * 1 + 300 = 300
      // offset by -12 for SVG centering
      expect(el.style.transform).toBe("translate(388px, 288px) rotate(0deg)");
    });

    it("accounts for camera offset", () => {
      camera.x = 100;
      camera.y = 50;
      indicator.show();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      // screenX = (0 - 100) * 1 + 400 = 300, screenY = (0 - 50) * 1 + 300 = 250
      expect(el.style.transform).toBe("translate(288px, 238px) rotate(0deg)");
    });

    it("accounts for zoom level", () => {
      camera.zoom = 2;
      state.x = 50;
      state.y = 25;
      indicator.show();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      // screenX = (50 - 0) * 2 + 400 = 500, screenY = (25 - 0) * 2 + 300 = 350
      expect(el.style.transform).toBe("translate(488px, 338px) rotate(0deg)");
    });

    it("applies heading rotation", () => {
      state.angle = 90;
      indicator.show();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el.style.transform).toBe("translate(388px, 288px) rotate(90deg)");
    });
  });

  describe("color", () => {
    it("uses pen color for the indicator", () => {
      state.pen.color = "#ff0000";
      indicator.show();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el.style.color).toBe("rgb(255, 0, 0)");
    });

    it("updates color when state changes and update() is called", () => {
      indicator.show();
      state.pen.color = "#00ff00";
      indicator.update();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      expect(el.style.color).toBe("rgb(0, 255, 0)");
    });
  });

  describe("update", () => {
    it("does nothing when not visible", () => {
      state.x = 100;
      indicator.update();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      // Should still have no transform set (display is none)
      expect(el.style.display).toBe("none");
    });

    it("updates position after state changes", () => {
      indicator.show();
      state.x = 200;
      state.y = 100;
      state.angle = 45;
      indicator.update();
      const el = root.querySelector(".turtle-indicator") as HTMLElement;
      // screenX = (200 - 0) * 1 + 400 = 600, screenY = (100 - 0) * 1 + 300 = 400
      expect(el.style.transform).toBe("translate(588px, 388px) rotate(45deg)");
    });
  });

  describe("destroy", () => {
    it("removes the element from the DOM", () => {
      expect(root.querySelector(".turtle-indicator")).toBeTruthy();
      indicator.destroy();
      expect(root.querySelector(".turtle-indicator")).toBeNull();
    });

    it("hides the indicator", () => {
      indicator.show();
      indicator.destroy();
      expect(indicator.isVisible()).toBe(false);
    });
  });
});
