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

describe("TurtlePanel REPL", () => {
  let panel: TurtlePanel;

  afterEach(() => {
    panel.destroy();
  });

  describe("tab switching", () => {
    beforeEach(() => {
      panel = new TurtlePanel("test-drawing");
      panel.show();
    });

    it("renders Script and REPL tabs", () => {
      const tabs = document.querySelectorAll(".turtle-tab");
      expect(tabs.length).toBe(2);
      expect(tabs[0].textContent).toBe("Script");
      expect(tabs[1].textContent).toBe("REPL");
    });

    it("Script tab is active by default", () => {
      expect(panel.getActiveTab()).toBe("script");
      const scriptTab = document.querySelector(".turtle-tab.active");
      expect(scriptTab?.textContent).toBe("Script");
    });

    it("clicking REPL tab switches to REPL mode", () => {
      const replTab = document.querySelectorAll(".turtle-tab")[1] as HTMLButtonElement;
      replTab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(panel.getActiveTab()).toBe("repl");
      expect(replTab.classList.contains("active")).toBe(true);

      // REPL content visible, script content hidden
      const replContent = document.querySelector(".repl-content") as HTMLElement;
      expect(replContent.style.display).toBe("");

      // REPL history and input visible
      expect(document.querySelector(".repl-history")).not.toBeNull();
      expect(document.querySelector(".repl-input")).not.toBeNull();
    });

    it("clicking Script tab switches back to Script mode", () => {
      panel.switchTab("repl");
      const scriptTab = document.querySelectorAll(".turtle-tab")[0] as HTMLButtonElement;
      scriptTab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(panel.getActiveTab()).toBe("script");
    });

    it("persists active tab to localStorage", () => {
      panel.switchTab("repl");
      expect(storageMap.get("drawfinity:turtle-tab")).toBe("repl");
      panel.switchTab("script");
      expect(storageMap.get("drawfinity:turtle-tab")).toBe("script");
    });

    it("restores active tab from localStorage", () => {
      panel.destroy();
      storageMap.set("drawfinity:turtle-tab", "repl");
      panel = new TurtlePanel("test-drawing");
      expect(panel.getActiveTab()).toBe("repl");
    });

    it("REPL bottom bar visible when REPL tab is active", () => {
      panel.switchTab("repl");
      const bars = document.querySelectorAll(".turtle-bottom-bar");
      // Script bar hidden, REPL bar visible
      const scriptBar = bars[0] as HTMLElement;
      const replBar = bars[1] as HTMLElement;
      expect(scriptBar.style.display).toBe("none");
      expect(replBar.style.display).toBe("");
    });

    it("REPL tab has Reset button", () => {
      panel.switchTab("repl");
      const resetBtn = document.querySelector(".repl-reset-btn");
      expect(resetBtn).not.toBeNull();
      expect(resetBtn?.textContent).toBe("Reset");
    });

    it("REPL tab has Clear Drawing button", () => {
      panel.switchTab("repl");
      const clearBtn = document.querySelector(".repl-clear-btn");
      expect(clearBtn).not.toBeNull();
      expect(clearBtn?.textContent).toBe("Clear Drawing");
    });
  });

  describe("REPL command execution", () => {
    let onReplCommand: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onReplCommand = vi.fn().mockResolvedValue({ output: "100", error: null });
      panel = new TurtlePanel("test-drawing", { onReplCommand });
      panel.show();
      panel.switchTab("repl");
    });

    it("Enter key executes command and shows result in history", async () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      // Wait for async execution
      await vi.waitFor(() => {
        expect(onReplCommand).toHaveBeenCalledWith("forward(100)");
      });

      const entries = document.querySelectorAll(".repl-entry");
      expect(entries.length).toBe(1);

      const cmd = entries[0].querySelector(".repl-command");
      expect(cmd?.textContent).toContain(">>>");
      expect(cmd?.textContent).toContain("forward(100)");

      const output = entries[0].querySelector(".repl-output");
      expect(output?.textContent).toBe("100");
    });

    it("shows error in red when command fails", async () => {
      onReplCommand.mockResolvedValue({ output: null, error: "syntax error" });

      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "bad syntax";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      await vi.waitFor(() => {
        expect(onReplCommand).toHaveBeenCalled();
      });

      const errorEl = document.querySelector(".repl-error");
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toBe("syntax error");
    });

    it("clears input after execution", async () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      // Input should be cleared immediately
      expect(input.value).toBe("");
    });

    it("does not execute empty input", () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(onReplCommand).not.toHaveBeenCalled();
    });

    it("does not execute whitespace-only input", () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "   ";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(onReplCommand).not.toHaveBeenCalled();
    });

    it("shows 'REPL not connected' when no callback is set", async () => {
      panel.destroy();
      panel = new TurtlePanel("test-drawing");
      panel.show();
      panel.switchTab("repl");

      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      await vi.waitFor(() => {
        const error = document.querySelector(".repl-error");
        expect(error?.textContent).toBe("REPL not connected");
      });
    });
  });

  describe("REPL command history navigation", () => {
    beforeEach(() => {
      const onReplCommand = vi.fn().mockResolvedValue({ output: null, error: null });
      panel = new TurtlePanel("test-drawing", { onReplCommand });
      panel.show();
      panel.switchTab("repl");
    });

    it("ArrowUp navigates to previous command", async () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;

      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("forward(100)");
    });

    it("ArrowDown after ArrowUp clears input", async () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;

      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("forward(100)");

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(input.value).toBe("");
    });

    it("cycles through multiple commands with ArrowUp", async () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;

      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      input.value = "right(90)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(2);
      });

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("right(90)");

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("forward(100)");
    });

    it("ArrowUp does nothing when history is empty", () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("");
    });

    it("ArrowDown does nothing when not navigating history", () => {
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "something";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(input.value).toBe("something");
    });
  });

  describe("REPL reset and clear", () => {
    it("Reset button calls onReplReset and clears history", async () => {
      const onReplReset = vi.fn().mockResolvedValue(undefined);
      const onReplCommand = vi.fn().mockResolvedValue({ output: "ok", error: null });
      panel = new TurtlePanel("test-drawing", { onReplCommand, onReplReset });
      panel.show();
      panel.switchTab("repl");

      // Execute a command first
      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "forward(100)";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      // Click reset
      const resetBtn = document.querySelector(".repl-reset-btn") as HTMLButtonElement;
      resetBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      await vi.waitFor(() => {
        expect(onReplReset).toHaveBeenCalled();
      });

      // History cleared and replaced with reset message
      const entries = document.querySelectorAll(".repl-entry");
      expect(entries.length).toBe(1);
      expect(entries[0].querySelector(".repl-output")?.textContent).toBe("REPL reset.");
    });

    it("Clear Drawing button calls onReplClear", () => {
      const onReplClear = vi.fn();
      panel = new TurtlePanel("test-drawing", { onReplClear });
      panel.show();
      panel.switchTab("repl");

      const clearBtn = document.querySelector(".repl-clear-btn") as HTMLButtonElement;
      clearBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      expect(onReplClear).toHaveBeenCalled();
    });

    it("Clear History button empties the history display", async () => {
      const onReplCommand = vi.fn().mockResolvedValue({ output: null, error: null });
      panel = new TurtlePanel("test-drawing", { onReplCommand });
      panel.show();
      panel.switchTab("repl");

      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "test";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      const clearHistoryBtn = Array.from(
        document.querySelectorAll(".turtle-btn-secondary"),
      ).find((b) => b.textContent === "Clear History") as HTMLButtonElement;
      clearHistoryBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(document.querySelectorAll(".repl-entry").length).toBe(0);
    });
  });

  describe("tab state preservation", () => {
    it("REPL history survives tab switch", async () => {
      const onReplCommand = vi.fn().mockResolvedValue({ output: "42", error: null });
      panel = new TurtlePanel("test-drawing", { onReplCommand });
      panel.show();
      panel.switchTab("repl");

      const input = document.querySelector(".repl-input") as HTMLInputElement;
      input.value = "1+1";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      await vi.waitFor(() => {
        expect(document.querySelectorAll(".repl-entry").length).toBe(1);
      });

      // Switch to script and back
      panel.switchTab("script");
      panel.switchTab("repl");

      // History should still be there
      const entries = document.querySelectorAll(".repl-entry");
      expect(entries.length).toBe(1);
      expect(entries[0].querySelector(".repl-output")?.textContent).toBe("42");
    });

    it("script editor content survives tab switch to REPL and back", () => {
      panel = new TurtlePanel("test-drawing");
      panel.setScript("forward(200)");
      panel.show();

      panel.switchTab("repl");
      panel.switchTab("script");

      expect(panel.getScript()).toBe("forward(200)");
    });
  });
});
