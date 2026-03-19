// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpacitySlider } from "../OpacitySlider";

describe("OpacitySlider", () => {
  let slider: OpacitySlider;
  let onChange: ReturnType<typeof vi.fn<(opacity: number) => void>>;
  let button: HTMLButtonElement;

  beforeEach(() => {
    onChange = vi.fn();
    button = document.createElement("button");
    document.body.appendChild(button);
  });

  afterEach(() => {
    slider?.destroy();
    button.remove();
  });

  function createSlider(opts: { initialOpacity?: number } = {}) {
    slider = new OpacitySlider({
      onChange,
      ...opts,
    });
    slider.attach(button);
    return slider;
  }

  describe("initialization", () => {
    it("displays default opacity (100%) on the button", () => {
      createSlider();
      expect(button.textContent).toBe("100%");
    });

    it("displays custom initial opacity", () => {
      createSlider({ initialOpacity: 0.5 });
      expect(button.textContent).toBe("50%");
    });

    it("sets tooltip with opacity value", () => {
      createSlider({ initialOpacity: 0.75 });
      expect(button.title).toContain("75%");
    });
  });

  describe("popover toggle", () => {
    it("opens popover on button click", () => {
      createSlider();
      expect(slider.isOpen()).toBe(false);
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(true);
    });

    it("closes popover on second button click", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(true);
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(false);
    });

    it("creates popover DOM elements", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const popover = document.querySelector(".opacity-popover");
      expect(popover).not.toBeNull();
      expect(popover?.querySelector(".opacity-slider")).not.toBeNull();
      expect(popover?.querySelector(".opacity-value-label")).not.toBeNull();
      expect(popover?.querySelectorAll(".opacity-preset")).toHaveLength(4);
    });

    it("positions popover below the button", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const popover = document.querySelector(".opacity-popover") as HTMLElement;
      expect(popover.style.position).toBe("fixed");
    });

    it("removes popover from DOM when hidden", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(document.querySelector(".opacity-popover")).not.toBeNull();
      slider.hidePopover();
      expect(document.querySelector(".opacity-popover")).toBeNull();
    });
  });

  describe("slider interaction", () => {
    it("calls onChange when slider value changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".opacity-slider") as HTMLInputElement;
      rangeInput.value = "50";
      rangeInput.dispatchEvent(new Event("input"));
      expect(onChange).toHaveBeenCalledWith(0.5);
    });

    it("updates button text when slider changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".opacity-slider") as HTMLInputElement;
      rangeInput.value = "75";
      rangeInput.dispatchEvent(new Event("input"));
      expect(button.textContent).toBe("75%");
    });

    it("updates value label when slider changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".opacity-slider") as HTMLInputElement;
      rangeInput.value = "30";
      rangeInput.dispatchEvent(new Event("input"));
      const label = document.querySelector(".opacity-value-label");
      expect(label?.textContent).toBe("30%");
    });
  });

  describe("preset buttons", () => {
    it("calls onChange with preset value on click", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".opacity-preset");
      // Click 50% preset (index 1: 25%, 50%, 75%, 100%)
      (presets[1] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(onChange).toHaveBeenCalledWith(0.5);
    });

    it("updates active state on preset selection", () => {
      createSlider({ initialOpacity: 1 });
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".opacity-preset");
      // Initially, 100% (index 3) should be active
      expect(presets[3].classList.contains("active")).toBe(true);
      // Click 25% (index 0)
      (presets[0] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(presets[3].classList.contains("active")).toBe(false);
      expect(presets[0].classList.contains("active")).toBe(true);
    });

    it("updates slider on preset click", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".opacity-preset");
      (presets[0] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      const rangeInput = document.querySelector(".opacity-slider") as HTMLInputElement;
      expect(rangeInput.value).toBe("25");
    });
  });

  describe("clamping", () => {
    it("clamps to minimum value (0)", () => {
      createSlider();
      slider.setOpacity(-0.5);
      expect(slider.getOpacity()).toBe(0);
    });

    it("clamps to maximum value (1)", () => {
      createSlider();
      slider.setOpacity(1.5);
      expect(slider.getOpacity()).toBe(1);
    });
  });

  describe("external updates", () => {
    it("setOpacity updates button text", () => {
      createSlider();
      slider.setOpacity(0.3);
      expect(button.textContent).toBe("30%");
    });

    it("setOpacity updates slider when popover is open", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      slider.setOpacity(0.6);
      const rangeInput = document.querySelector(".opacity-slider") as HTMLInputElement;
      expect(rangeInput.value).toBe("60");
    });

    it("getOpacity returns current opacity", () => {
      createSlider({ initialOpacity: 0.8 });
      expect(slider.getOpacity()).toBe(0.8);
    });
  });

  describe("dismiss", () => {
    it("closes on click outside after next frame", async () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(true);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      document.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(slider.isOpen()).toBe(false);
    });

    it("does not close when clicking inside popover", async () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const popover = document.querySelector(".opacity-popover") as HTMLElement;
      popover.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(slider.isOpen()).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("cleans up popover on destroy", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(document.querySelector(".opacity-popover")).not.toBeNull();
      slider.destroy();
      expect(document.querySelector(".opacity-popover")).toBeNull();
    });

    it("detaches event listeners on destroy", () => {
      createSlider();
      slider.destroy();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(false);
    });
  });
});
