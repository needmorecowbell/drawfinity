// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TurtleIndicator } from "../TurtleIndicator";
import { Camera } from "../../camera/Camera";

describe("TurtleIndicator", () => {
  let root: HTMLElement;
  let camera: Camera;
  let indicator: TurtleIndicator;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    camera = new Camera();
    camera.setViewportSize(800, 600);
    indicator = new TurtleIndicator(root, camera);
  });

  afterEach(() => {
    indicator.destroy();
    root.remove();
  });

  describe("initial state", () => {
    it("is hidden by default", () => {
      expect(indicator.isVisible()).toBe(false);
    });

    it("has no indicators initially", () => {
      expect(indicator.count()).toBe(0);
    });
  });

  describe("addTurtle / removeTurtle", () => {
    it("adds a turtle indicator to the DOM", () => {
      indicator.addTurtle("main", true);
      expect(indicator.hasTurtle("main")).toBe(true);
      expect(indicator.count()).toBe(1);
      const el = root.querySelector('[data-turtle-id="main"]');
      expect(el).toBeTruthy();
      expect(el!.querySelector("svg")).toBeTruthy();
    });

    it("is idempotent — adding same ID twice does not duplicate", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("main", true);
      expect(indicator.count()).toBe(1);
      expect(root.querySelectorAll('[data-turtle-id="main"]').length).toBe(1);
    });

    it("can add multiple turtles", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.addTurtle("child2");
      expect(indicator.count()).toBe(3);
    });

    it("removes a turtle indicator from the DOM", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.removeTurtle("child1");
      expect(indicator.hasTurtle("child1")).toBe(false);
      expect(indicator.count()).toBe(1);
      expect(root.querySelector('[data-turtle-id="child1"]')).toBeNull();
    });

    it("removing non-existent turtle is a no-op", () => {
      indicator.removeTurtle("nope");
      expect(indicator.count()).toBe(0);
    });
  });

  describe("SVG sizing", () => {
    it("main turtle uses 24x24 SVG", () => {
      indicator.addTurtle("main", true);
      const svg = root.querySelector('[data-turtle-id="main"] svg')!;
      expect(svg.getAttribute("width")).toBe("24");
      expect(svg.getAttribute("height")).toBe("24");
    });

    it("spawned turtle uses 18x18 SVG", () => {
      indicator.addTurtle("child1");
      const svg = root.querySelector('[data-turtle-id="child1"] svg')!;
      expect(svg.getAttribute("width")).toBe("18");
      expect(svg.getAttribute("height")).toBe("18");
    });
  });

  describe("show / hide (global)", () => {
    it("show() makes all turtle indicators visible", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.show();
      expect(indicator.isVisible()).toBe(true);
      const mainEl = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      const childEl = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      expect(mainEl.style.display).toBe("");
      expect(childEl.style.display).toBe("");
    });

    it("hide() hides all turtle indicators", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.hide();
      expect(indicator.isVisible()).toBe(false);
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });

    it("turtles added while hidden start hidden", () => {
      indicator.addTurtle("main", true);
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });

    it("turtles added while shown start visible", () => {
      indicator.show();
      indicator.addTurtle("main", true);
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.display).toBe("");
    });
  });

  describe("showTurtle / hideTurtle (per-turtle)", () => {
    it("hideTurtle hides a specific turtle", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.show();
      indicator.hideTurtle("child1");
      const mainEl = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      const childEl = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      expect(mainEl.style.display).toBe("");
      expect(childEl.style.display).toBe("none");
    });

    it("showTurtle restores a hidden turtle", () => {
      indicator.addTurtle("child1");
      indicator.show();
      indicator.hideTurtle("child1");
      indicator.showTurtle("child1");
      const el = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      expect(el.style.display).toBe("");
    });

    it("isTurtleVisible reflects per-turtle visibility", () => {
      indicator.addTurtle("main", true);
      expect(indicator.isTurtleVisible("main")).toBe(true);
      indicator.hideTurtle("main");
      expect(indicator.isTurtleVisible("main")).toBe(false);
    });

    it("per-turtle hidden turtle stays hidden even after global show", () => {
      indicator.addTurtle("child1");
      indicator.hideTurtle("child1");
      indicator.show();
      const el = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      expect(el.style.display).toBe("none");
    });
  });

  describe("updateTurtle positioning", () => {
    it("positions at screen center when turtle is at camera center", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 0, "#000000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      // screenX = (0-0)*1 + 400 = 400, screenY = (0-0)*1 + 300 = 300
      // offset by -12 (half of 24) for centering
      expect(el.style.transform).toBe("translate(388px, 288px) rotate(0deg)");
    });

    it("accounts for camera offset", () => {
      camera.x = 100;
      camera.y = 50;
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 0, "#000000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      // screenX = (0-100)*1 + 400 = 300, screenY = (0-50)*1 + 300 = 250
      expect(el.style.transform).toBe("translate(288px, 238px) rotate(0deg)");
    });

    it("accounts for zoom level", () => {
      camera.zoom = 2;
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 50, 25, 0, "#000000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      // screenX = (50-0)*2 + 400 = 500, screenY = (25-0)*2 + 300 = 350
      expect(el.style.transform).toBe("translate(488px, 338px) rotate(0deg)");
    });

    it("applies heading rotation", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 90, "#000000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.transform).toBe("translate(388px, 288px) rotate(90deg)");
    });

    it("spawned turtle offset uses half of smaller size (9px)", () => {
      indicator.addTurtle("child1");
      indicator.show();
      indicator.updateTurtle("child1", 0, 0, 0, "#000000");
      const el = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      // offset by -9 (half of 18) for centering
      expect(el.style.transform).toBe("translate(391px, 291px) rotate(0deg)");
    });
  });

  describe("color", () => {
    it("sets the indicator color", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 0, "#ff0000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.color).toBe("rgb(255, 0, 0)");
    });

    it("updates color on subsequent calls", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 0, "#ff0000");
      indicator.updateTurtle("main", 0, 0, 0, "#00ff00");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      expect(el.style.color).toBe("rgb(0, 255, 0)");
    });

    it("each turtle has independent color", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.show();
      indicator.updateTurtle("main", 0, 0, 0, "#ff0000");
      indicator.updateTurtle("child1", 10, 10, 0, "#0000ff");
      const mainEl = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      const childEl = root.querySelector('[data-turtle-id="child1"]') as HTMLElement;
      expect(mainEl.style.color).toBe("rgb(255, 0, 0)");
      expect(childEl.style.color).toBe("rgb(0, 0, 255)");
    });
  });

  describe("updateTurtle visibility guards", () => {
    it("does not update when globally hidden", () => {
      indicator.addTurtle("main", true);
      // globally hidden by default
      indicator.updateTurtle("main", 100, 100, 45, "#ff0000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      // transform should not be set since globally hidden
      expect(el.style.transform).toBe("");
    });

    it("does not update per-turtle hidden indicator", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.hideTurtle("main");
      indicator.updateTurtle("main", 100, 100, 45, "#ff0000");
      const el = root.querySelector('[data-turtle-id="main"]') as HTMLElement;
      // transform should not be set since per-turtle hidden
      expect(el.style.transform).toBe("");
    });

    it("updating non-existent turtle is a no-op", () => {
      indicator.show();
      // Should not throw
      indicator.updateTurtle("nope", 0, 0, 0);
    });
  });

  describe("clear", () => {
    it("removes all turtle indicators", () => {
      indicator.addTurtle("main", true);
      indicator.addTurtle("child1");
      indicator.addTurtle("child2");
      indicator.clear();
      expect(indicator.count()).toBe(0);
      expect(root.querySelectorAll(".turtle-indicator").length).toBe(0);
    });
  });

  describe("destroy", () => {
    it("removes all elements from the DOM and hides", () => {
      indicator.addTurtle("main", true);
      indicator.show();
      indicator.destroy();
      expect(indicator.isVisible()).toBe(false);
      expect(indicator.count()).toBe(0);
      expect(root.querySelectorAll(".turtle-indicator").length).toBe(0);
    });
  });
});
