// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { showCorruptionDialog } from "../CorruptionDialog";

describe("CorruptionDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows dialog with recover button when backup is available", async () => {
    const choicePromise = showCorruptionDialog(true);

    const overlay = document.querySelector(".corruption-dialog-overlay");
    expect(overlay).not.toBeNull();

    const buttons = document.querySelectorAll(".corruption-dialog__btn");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("Try to recover");
    expect(buttons[1].textContent).toBe("Start fresh");

    // Click recover
    (buttons[0] as HTMLButtonElement).click();
    const choice = await choicePromise;
    expect(choice).toBe("recover");

    // Dialog should be removed
    expect(document.querySelector(".corruption-dialog-overlay")).toBeNull();
  });

  it("shows only fresh button when no backup available", async () => {
    const choicePromise = showCorruptionDialog(false);

    const buttons = document.querySelectorAll(".corruption-dialog__btn");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("Start fresh");

    (buttons[0] as HTMLButtonElement).click();
    const choice = await choicePromise;
    expect(choice).toBe("fresh");
  });

  it("resolves with fresh when fresh button is clicked", async () => {
    const choicePromise = showCorruptionDialog(true);

    const buttons = document.querySelectorAll(".corruption-dialog__btn");
    // Click "Start fresh" (second button when backup available)
    (buttons[1] as HTMLButtonElement).click();
    const choice = await choicePromise;
    expect(choice).toBe("fresh");
  });
});
