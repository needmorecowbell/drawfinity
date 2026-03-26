// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TurtlePanel } from "../TurtlePanel";

const storageMap = new Map<string, string>();
beforeEach(() => {
  storageMap.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    length: 0,
    key: () => null,
  });
});

describe("TurtlePanel", () => {
  let panel: TurtlePanel;

  beforeEach(() => {
    panel = new TurtlePanel("test-drawing");
  });

  afterEach(() => {
    panel.destroy();
  });

  it("is not visible by default", () => {
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("turtle-overlay")).toBeNull();
  });

  it("show() adds overlay to DOM", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    expect(document.getElementById("turtle-overlay")).not.toBeNull();
    expect(document.getElementById("turtle-panel")).not.toBeNull();
  });

  it("hide() removes overlay from DOM", () => {
    panel.show();
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("turtle-overlay")).toBeNull();
  });

  it("toggle() toggles visibility", () => {
    panel.toggle();
    expect(panel.isVisible()).toBe(true);
    panel.toggle();
    expect(panel.isVisible()).toBe(false);
  });

  it("renders editor textarea", () => {
    panel.show();
    const editor = document.querySelector(".turtle-editor") as HTMLTextAreaElement;
    expect(editor).not.toBeNull();
    expect(editor.tagName).toBe("TEXTAREA");
  });

  it("renders console log area", () => {
    panel.show();
    const consoleEl = document.querySelector(".turtle-console");
    expect(consoleEl).not.toBeNull();
  });

  it("renders Run and Stop buttons", () => {
    panel.show();
    const runBtn = document.querySelector(".turtle-btn-run") as HTMLButtonElement;
    const stopBtn = document.querySelector(".turtle-btn-stop") as HTMLButtonElement;
    expect(runBtn).not.toBeNull();
    expect(stopBtn).not.toBeNull();
    expect(runBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(true);
  });

  it("renders speed slider with default value 5", () => {
    panel.show();
    const slider = document.querySelector(".turtle-speed-slider") as HTMLInputElement;
    expect(slider).not.toBeNull();
    expect(slider.value).toBe("5");
  });

  it("appendConsole adds output lines", () => {
    panel.show();
    panel.appendConsole("Hello turtle!");
    const lines = document.querySelectorAll(".turtle-console-line");
    expect(lines.length).toBe(1);
    expect(lines[0].textContent).toBe("Hello turtle!");
    expect(lines[0].classList.contains("turtle-console-output")).toBe(true);
  });

  it("appendConsole adds error lines with error styling", () => {
    panel.show();
    panel.appendConsole("Syntax error", "error");
    const line = document.querySelector(".turtle-console-error");
    expect(line).not.toBeNull();
    expect(line!.textContent).toBe("Syntax error");
  });

  it("appendConsole adds info lines", () => {
    panel.show();
    panel.appendConsole("Script completed", "info");
    const line = document.querySelector(".turtle-console-info");
    expect(line).not.toBeNull();
  });

  it("clearConsole removes all console lines", () => {
    panel.show();
    panel.appendConsole("Line 1");
    panel.appendConsole("Line 2");
    expect(document.querySelectorAll(".turtle-console-line").length).toBe(2);
    panel.clearConsole();
    expect(document.querySelectorAll(".turtle-console-line").length).toBe(0);
  });

  it("setRunning updates button states", () => {
    panel.show();
    const runBtn = document.querySelector(".turtle-btn-run") as HTMLButtonElement;
    const stopBtn = document.querySelector(".turtle-btn-stop") as HTMLButtonElement;

    panel.setRunning(true);
    expect(runBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(false);
    expect(runBtn.textContent).toContain("Running");

    panel.setRunning(false);
    expect(runBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(true);
    expect(runBtn.textContent).toContain("Run");
  });

  it("getScript returns editor content", () => {
    panel.setScript("forward(100)");
    expect(panel.getScript()).toBe("forward(100)");
  });

  it("setScript updates editor and saves to localStorage", () => {
    panel.setScript("right(90)");
    expect(panel.getScript()).toBe("right(90)");
    expect(storageMap.get("drawfinity:turtle-script:test-drawing")).toBe("right(90)");
  });

  it("getSpeed and setSpeed work correctly", () => {
    expect(panel.getSpeed()).toBe(5);
    panel.setSpeed(0);
    expect(panel.getSpeed()).toBe(0);
    panel.setSpeed(10);
    expect(panel.getSpeed()).toBe(10);
  });

  it("onRun callback fires when Run is clicked with script content", () => {
    const onRun = vi.fn();
    panel = new TurtlePanel("test-drawing", { onRun });
    panel.show();
    panel.setScript("forward(50)");

    const runBtn = document.querySelector(".turtle-btn-run") as HTMLButtonElement;
    runBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onRun).toHaveBeenCalledWith("forward(50)");
  });

  it("onRun callback does NOT fire when script is empty", () => {
    const onRun = vi.fn();
    panel = new TurtlePanel("test-drawing", { onRun });
    panel.show();
    panel.setScript("");

    const runBtn = document.querySelector(".turtle-btn-run") as HTMLButtonElement;
    runBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it("onStop callback fires when Stop is clicked", () => {
    const onStop = vi.fn();
    panel = new TurtlePanel("test-drawing", { onStop });
    panel.show();

    const stopBtn = document.querySelector(".turtle-btn-stop") as HTMLButtonElement;
    stopBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onStop).toHaveBeenCalled();
  });

  it("onSpeedChange callback fires when slider changes", () => {
    const onSpeedChange = vi.fn();
    panel = new TurtlePanel("test-drawing", { onSpeedChange });
    panel.show();

    const slider = document.querySelector(".turtle-speed-slider") as HTMLInputElement;
    slider.value = "8";
    slider.dispatchEvent(new Event("input"));
    expect(onSpeedChange).toHaveBeenCalledWith(8);
  });

  it("loads saved script from localStorage on construction", () => {
    storageMap.set("drawfinity:turtle-script:my-drawing", "pencolor('#ff0000')\nforward(200)");
    const p = new TurtlePanel("my-drawing");
    expect(p.getScript()).toBe("pencolor('#ff0000')\nforward(200)");
    p.destroy();
  });

  it("clicking overlay background hides the panel", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    const overlay = document.getElementById("turtle-overlay")!;
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: false }));
    expect(panel.isVisible()).toBe(false);
  });

  it("clicking close button hides the panel", () => {
    panel.show();
    const closeBtn = document.querySelector(".turtle-close-btn") as HTMLButtonElement;
    closeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(panel.isVisible()).toBe(false);
  });

  it("Clear Console button clears console output", () => {
    panel.show();
    panel.appendConsole("test");
    expect(document.querySelectorAll(".turtle-console-line").length).toBe(1);

    // Find the Clear Console button specifically (last .turtle-btn-secondary)
    const secondaryBtns = document.querySelectorAll(".turtle-btn-secondary");
    const clearBtn = Array.from(secondaryBtns).find(
      (btn) => btn.textContent === "Clear Console",
    ) as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(document.querySelectorAll(".turtle-console-line").length).toBe(0);
  });

  it("panel has resize handle", () => {
    panel.show();
    const handle = document.querySelector(".turtle-resize-handle");
    expect(handle).not.toBeNull();
  });

  describe("Scripts button (unified browser)", () => {
    it("renders a Scripts button", () => {
      panel.show();
      const btns = Array.from(document.querySelectorAll(".turtle-btn-secondary"));
      const scriptsBtn = btns.find((b) => b.textContent?.startsWith("Scripts"));
      expect(scriptsBtn).toBeTruthy();
    });

    it("does not render Examples or Community buttons", () => {
      panel.show();
      const btns = Array.from(document.querySelectorAll(".turtle-btn-secondary"));
      const exBtn = btns.find((b) => b.textContent?.includes("Examples"));
      const communityBtn = btns.find((b) => b.textContent === "Community");
      expect(exBtn).toBeUndefined();
      expect(communityBtn).toBeUndefined();
    });

    it("clicking Scripts button opens the exchange overlay", () => {
      panel.show();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("offline")),
      );

      const btns = Array.from(document.querySelectorAll(".turtle-btn-secondary"));
      const scriptsBtn = btns.find((b) =>
        b.textContent?.startsWith("Scripts"),
      ) as HTMLButtonElement;
      scriptsBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const overlay = document.querySelector(".turtle-exchange-overlay");
      expect(overlay).not.toBeNull();
    });

    it("exchange overlay shows scripts from bundled snapshot", () => {
      panel.show();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("offline")),
      );

      const btns = Array.from(document.querySelectorAll(".turtle-btn-secondary"));
      const scriptsBtn = btns.find((b) =>
        b.textContent?.startsWith("Scripts"),
      ) as HTMLButtonElement;
      scriptsBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const items = document.querySelectorAll(".turtle-exchange-item");
      // Snapshot has 7 scripts
      expect(items.length).toBe(7);
    });
  });
});
