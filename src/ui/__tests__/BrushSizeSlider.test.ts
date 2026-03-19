// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BrushSizeSlider } from "../BrushSizeSlider";

describe("BrushSizeSlider", () => {
  let slider: BrushSizeSlider;
  let onChange: ReturnType<typeof vi.fn<(size: number) => void>>;
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

  function createSlider(opts: { min?: number; max?: number; initialSize?: number } = {}) {
    slider = new BrushSizeSlider({
      onChange,
      ...opts,
    });
    slider.attach(button);
    return slider;
  }

  describe("initialization", () => {
    it("displays default size on the button", () => {
      createSlider();
      expect(button.textContent).toBe("2");
    });

    it("displays custom initial size", () => {
      createSlider({ initialSize: 8 });
      expect(button.textContent).toBe("8");
    });

    it("formats fractional sizes with one decimal", () => {
      createSlider({ initialSize: 0.5 });
      expect(button.textContent).toBe("0.5");
    });

    it("sets tooltip with shortcut hint", () => {
      createSlider({ initialSize: 4 });
      expect(button.title).toContain("4px");
      expect(button.title).toContain("[/]");
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
      const popover = document.querySelector(".brush-size-popover");
      expect(popover).not.toBeNull();
      expect(popover?.querySelector(".brush-size-slider")).not.toBeNull();
      expect(popover?.querySelector(".brush-size-numeric")).not.toBeNull();
      expect(popover?.querySelectorAll(".brush-size-preset")).toHaveLength(6);
    });

    it("positions popover below the button", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const popover = document.querySelector(".brush-size-popover") as HTMLElement;
      expect(popover.style.position).toBe("fixed");
    });

    it("removes popover from DOM when hidden", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(document.querySelector(".brush-size-popover")).not.toBeNull();
      slider.hidePopover();
      expect(document.querySelector(".brush-size-popover")).toBeNull();
    });
  });

  describe("slider interaction", () => {
    it("calls onChange when slider value changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      rangeInput.value = "16";
      rangeInput.dispatchEvent(new Event("input"));
      expect(onChange).toHaveBeenCalledWith(16);
    });

    it("updates button text when slider changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      rangeInput.value = "8";
      rangeInput.dispatchEvent(new Event("input"));
      expect(button.textContent).toBe("8");
    });

    it("syncs numeric input when slider changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      rangeInput.value = "12";
      rangeInput.dispatchEvent(new Event("input"));
      expect(numInput.value).toBe("12");
    });
  });

  describe("numeric input", () => {
    it("calls onChange when numeric value changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      numInput.value = "32";
      numInput.dispatchEvent(new Event("input"));
      expect(onChange).toHaveBeenCalledWith(32);
    });

    it("syncs slider when numeric value changes", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      numInput.value = "24";
      numInput.dispatchEvent(new Event("input"));
      expect(rangeInput.value).toBe("24");
    });

    it("ignores NaN input", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      numInput.value = "abc";
      numInput.dispatchEvent(new Event("input"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("stops keyboard event propagation", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      const event = new KeyboardEvent("keydown", { key: "b", bubbles: true });
      const stopSpy = vi.spyOn(event, "stopPropagation");
      numInput.dispatchEvent(event);
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe("preset buttons", () => {
    it("calls onChange with preset value on click", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".brush-size-preset");
      // Click the "8" preset (index 3: 1,2,4,8,16,32)
      (presets[3] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(onChange).toHaveBeenCalledWith(8);
    });

    it("updates active state on preset selection", () => {
      createSlider({ initialSize: 2 });
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".brush-size-preset");
      // Initially, "2" (index 1) should be active
      expect(presets[1].classList.contains("active")).toBe(true);
      // Click "16" (index 4)
      (presets[4] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(presets[1].classList.contains("active")).toBe(false);
      expect(presets[4].classList.contains("active")).toBe(true);
    });

    it("updates both slider and numeric input on preset click", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const presets = document.querySelectorAll(".brush-size-preset");
      (presets[5] as HTMLButtonElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      expect(rangeInput.value).toBe("32");
      expect(numInput.value).toBe("32");
    });
  });

  describe("clamping", () => {
    it("clamps to minimum value", () => {
      createSlider({ min: 0.5 });
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      numInput.value = "0.1";
      numInput.dispatchEvent(new Event("input"));
      expect(onChange).toHaveBeenCalledWith(0.5);
    });

    it("clamps to maximum value", () => {
      createSlider({ max: 64 });
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      numInput.value = "100";
      numInput.dispatchEvent(new Event("input"));
      expect(onChange).toHaveBeenCalledWith(64);
    });
  });

  describe("external updates", () => {
    it("setSize updates button text", () => {
      createSlider();
      slider.setSize(16);
      expect(button.textContent).toBe("16");
    });

    it("setSize updates slider and numeric input when popover is open", () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      slider.setSize(32);
      const rangeInput = document.querySelector(".brush-size-slider") as HTMLInputElement;
      const numInput = document.querySelector(".brush-size-numeric") as HTMLInputElement;
      expect(rangeInput.value).toBe("32");
      expect(numInput.value).toBe("32");
    });

    it("setSize clamps value", () => {
      createSlider({ max: 64 });
      slider.setSize(100);
      expect(slider.getSize()).toBe(64);
    });

    it("getSize returns current size", () => {
      createSlider({ initialSize: 12 });
      expect(slider.getSize()).toBe(12);
    });
  });

  describe("dismiss", () => {
    it("closes on click outside after next frame", async () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(true);

      // Wait for requestAnimationFrame to register dismiss handler
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Click outside
      document.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      expect(slider.isOpen()).toBe(false);
    });

    it("does not close when clicking inside popover", async () => {
      createSlider();
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const popover = document.querySelector(".brush-size-popover") as HTMLElement;
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
      expect(document.querySelector(".brush-size-popover")).not.toBeNull();
      slider.destroy();
      expect(document.querySelector(".brush-size-popover")).toBeNull();
    });

    it("detaches event listeners on destroy", () => {
      createSlider();
      slider.destroy();
      // Should not open popover after destroy
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(slider.isOpen()).toBe(false);
    });
  });
});
