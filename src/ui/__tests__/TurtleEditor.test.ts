// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TurtleEditor } from "../turtle-editor/TurtleEditor";

describe("TurtleEditor", () => {
  let container: HTMLElement;
  let editor: TurtleEditor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container.remove();
  });

  it("creates a CodeMirror editor in the parent element", () => {
    editor = new TurtleEditor({ parent: container });
    expect(container.querySelector(".cm-editor")).toBeTruthy();
  });

  it("initializes with the provided initial value", () => {
    editor = new TurtleEditor({ parent: container, initialValue: "forward(100)" });
    expect(editor.getValue()).toBe("forward(100)");
  });

  it("getValue returns empty string when no initial value", () => {
    editor = new TurtleEditor({ parent: container });
    expect(editor.getValue()).toBe("");
  });

  it("setValue replaces content", () => {
    editor = new TurtleEditor({ parent: container, initialValue: "old" });
    editor.setValue("forward(200)\nright(90)");
    expect(editor.getValue()).toBe("forward(200)\nright(90)");
  });

  it("setValue with empty string clears content", () => {
    editor = new TurtleEditor({ parent: container, initialValue: "forward(100)" });
    editor.setValue("");
    expect(editor.getValue()).toBe("");
  });

  it("calls onChange when content changes via setValue", () => {
    const onChange = vi.fn();
    editor = new TurtleEditor({ parent: container, onChange });
    editor.setValue("forward(50)");
    expect(onChange).toHaveBeenCalledWith("forward(50)");
  });

  it("does not call onChange when initialValue is set (no change event on init)", () => {
    const onChange = vi.fn();
    editor = new TurtleEditor({ parent: container, initialValue: "test", onChange });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("focus does not throw", () => {
    editor = new TurtleEditor({ parent: container });
    expect(() => editor.focus()).not.toThrow();
  });

  it("requestMeasure does not throw", () => {
    editor = new TurtleEditor({ parent: container });
    expect(() => editor.requestMeasure()).not.toThrow();
  });

  it("destroy removes the editor view", () => {
    editor = new TurtleEditor({ parent: container });
    expect(container.querySelector(".cm-editor")).toBeTruthy();
    editor.destroy();
    expect(container.querySelector(".cm-editor")).toBeFalsy();
  });

  it("creates editor without onChange callback", () => {
    editor = new TurtleEditor({ parent: container });
    // Should not throw when content changes and no onChange is set
    editor.setValue("test");
    expect(editor.getValue()).toBe("test");
  });

  it("creates editor without onRun callback", () => {
    editor = new TurtleEditor({ parent: container });
    expect(container.querySelector(".cm-editor")).toBeTruthy();
  });
});
