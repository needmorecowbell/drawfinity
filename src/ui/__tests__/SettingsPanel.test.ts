// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SettingsPanel, SettingsPanelCallbacks } from "../SettingsPanel";
import { UserProfile } from "../../user/UserProfile";
import { UserPreferences } from "../../user/UserPreferences";
import { USER_COLORS } from "../../user/UserStore";

// Mock localStorage
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

function makeProfile(): UserProfile {
  return { id: "test-uuid", name: "TestUser", color: USER_COLORS[0] };
}

function makePreferences(): UserPreferences {
  return { defaultBrush: 0, defaultColor: "#000000", serverUrl: "ws://localhost:8080" };
}

describe("SettingsPanel", () => {
  let panel: SettingsPanel;
  let callbacks: SettingsPanelCallbacks;
  let onSaveSpy: (profile: UserProfile, preferences: UserPreferences) => void;

  beforeEach(() => {
    onSaveSpy = vi.fn();
    callbacks = { onSave: onSaveSpy };
    panel = new SettingsPanel(makeProfile(), makePreferences(), callbacks);
  });

  afterEach(() => {
    panel.destroy();
  });

  it("is not visible by default", () => {
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("settings-overlay")).toBeNull();
  });

  it("show() adds overlay to DOM", () => {
    panel.show();
    expect(panel.isVisible()).toBe(true);
    expect(document.getElementById("settings-overlay")).not.toBeNull();
    expect(document.getElementById("settings-panel")).not.toBeNull();
  });

  it("hide() removes overlay from DOM", () => {
    panel.show();
    panel.hide();
    expect(panel.isVisible()).toBe(false);
    expect(document.getElementById("settings-overlay")).toBeNull();
  });

  it("toggle() toggles visibility", () => {
    panel.toggle();
    expect(panel.isVisible()).toBe(true);
    panel.toggle();
    expect(panel.isVisible()).toBe(false);
  });

  it("renders name input with profile name", () => {
    panel.show();
    const input = document.querySelector(".settings-input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("TestUser");
  });

  it("renders user color swatches", () => {
    panel.show();
    const swatches = document.querySelectorAll(".settings-color-swatch");
    expect(swatches.length).toBe(USER_COLORS.length);
  });

  it("highlights the active user color", () => {
    panel.show();
    const active = document.querySelector(".settings-color-swatch.active") as HTMLElement;
    expect(active).not.toBeNull();
    expect(active.dataset.color).toBe(USER_COLORS[0]);
  });

  it("clicking a color swatch selects it", () => {
    panel.show();
    const swatches = document.querySelectorAll(".settings-color-swatch");
    const second = swatches[1] as HTMLButtonElement;
    second.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(second.classList.contains("active")).toBe(true);
    // Previous should be deselected
    const first = swatches[0] as HTMLButtonElement;
    expect(first.classList.contains("active")).toBe(false);
  });

  it("renders brush preset buttons", () => {
    panel.show();
    const buttons = document.querySelectorAll(".settings-brush-btn");
    expect(buttons.length).toBe(4); // Pen, Pencil, Marker, Highlighter
  });

  it("highlights the active brush preset", () => {
    panel.show();
    const active = document.querySelector(".settings-brush-btn.active") as HTMLElement;
    expect(active).not.toBeNull();
    expect(active.textContent).toBe("Pen");
  });

  it("clicking a brush preset selects it", () => {
    panel.show();
    const buttons = document.querySelectorAll(".settings-brush-btn");
    const marker = buttons[2] as HTMLButtonElement;
    marker.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(marker.classList.contains("active")).toBe(true);
    expect((buttons[0] as HTMLButtonElement).classList.contains("active")).toBe(false);
  });

  it("renders server URL input", () => {
    panel.show();
    const inputs = document.querySelectorAll(".settings-input");
    const serverInput = inputs[1] as HTMLInputElement;
    expect(serverInput.value).toBe("ws://localhost:8080");
  });

  it("Save button persists profile and preferences", () => {
    panel.show();
    // Change name
    const nameInput = document.querySelector(".settings-input") as HTMLInputElement;
    nameInput.value = "NewName";

    // Change color
    const swatches = document.querySelectorAll(".settings-color-swatch");
    (swatches[2] as HTMLButtonElement).dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Change brush
    const brushBtns = document.querySelectorAll(".settings-brush-btn");
    (brushBtns[1] as HTMLButtonElement).dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );

    // Click Save
    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(onSaveSpy).toHaveBeenCalledOnce();
    const [savedProfile, savedPrefs] = (vi.mocked(onSaveSpy)).mock.calls[0];
    expect(savedProfile.name).toBe("NewName");
    expect(savedProfile.color).toBe(USER_COLORS[2]);
    expect(savedPrefs.defaultBrush).toBe(1);
  });

  it("Save persists to localStorage", () => {
    panel.show();
    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(storageMap.has("drawfinity:user-profile")).toBe(true);
    expect(storageMap.has("drawfinity:user-preferences")).toBe(true);
  });

  it("Save hides the panel", () => {
    panel.show();
    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(panel.isVisible()).toBe(false);
  });

  it("Close button hides without saving", () => {
    panel.show();
    const closeBtn = document.querySelector(".settings-btn-secondary") as HTMLButtonElement;
    closeBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(panel.isVisible()).toBe(false);
    expect(onSaveSpy).not.toHaveBeenCalled();
  });

  it("clicking overlay background hides panel", () => {
    panel.show();
    const overlay = document.getElementById("settings-overlay")!;
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: false }));
    expect(panel.isVisible()).toBe(false);
  });

  it("empty name defaults to Anonymous on save", () => {
    panel.show();
    const nameInput = document.querySelector(".settings-input") as HTMLInputElement;
    nameInput.value = "   ";

    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const [savedProfile] = (vi.mocked(onSaveSpy)).mock.calls[0];
    expect(savedProfile.name).toBe("Anonymous");
  });

  it("updateProfile updates the UI state", () => {
    panel.show();
    panel.updateProfile({ id: "test-uuid", name: "Updated", color: USER_COLORS[3] });

    const input = document.querySelector(".settings-input") as HTMLInputElement;
    expect(input.value).toBe("Updated");

    const active = document.querySelector(".settings-color-swatch.active") as HTMLElement;
    expect(active.dataset.color).toBe(USER_COLORS[3]);
  });

  it("updatePreferences updates the UI state", () => {
    panel.show();
    panel.updatePreferences({ defaultBrush: 2, defaultColor: "#000000", serverUrl: "ws://other:9090" });

    const inputs = document.querySelectorAll(".settings-input");
    const serverInput = inputs[1] as HTMLInputElement;
    expect(serverInput.value).toBe("ws://other:9090");

    const active = document.querySelector(".settings-brush-btn.active") as HTMLElement;
    expect(active.textContent).toBe("Marker");
  });

  it("save directory is hidden when not set", () => {
    panel.show();
    const dirContainer = document.querySelector(".settings-save-dir") as HTMLElement;
    expect(dirContainer.style.display).toBe("none");
  });

  it("save directory is shown when set in preferences", () => {
    panel.destroy();
    const prefs = makePreferences();
    prefs.saveDirectory = "/home/user/drawings";
    panel = new SettingsPanel(makeProfile(), prefs, callbacks);
    panel.show();

    const dirContainer = document.querySelector(".settings-save-dir") as HTMLElement;
    expect(dirContainer.style.display).toBe("");
    const path = document.querySelector(".settings-dir-path") as HTMLElement;
    expect(path.textContent).toBe("/home/user/drawings");
  });

  it("destroy removes overlay", () => {
    panel.show();
    panel.destroy();
    expect(document.getElementById("settings-overlay")).toBeNull();
    // Re-create for afterEach
    panel = new SettingsPanel(makeProfile(), makePreferences(), callbacks);
  });

  it("keydown events in name input do not propagate", () => {
    panel.show();
    const input = document.querySelector(".settings-input") as HTMLInputElement;
    const event = new KeyboardEvent("keydown", { key: "b", bubbles: true });
    const stopSpy = vi.spyOn(event, "stopPropagation");
    input.dispatchEvent(event);
    expect(stopSpy).toHaveBeenCalled();
  });

  it("renders grid style dropdown with default 'dots'", () => {
    panel.show();
    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("dots");
    expect(select.options.length).toBe(3);
  });

  it("grid style dropdown has correct options", () => {
    panel.show();
    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["dots", "lines", "none"]);
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(["Dot Grid", "Line Grid", "None"]);
  });

  it("saving with grid style includes it in preferences", () => {
    panel.show();
    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    select.value = "lines";
    select.dispatchEvent(new Event("change"));

    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const [, savedPrefs] = (vi.mocked(onSaveSpy)).mock.calls[0];
    expect(savedPrefs.gridStyle).toBe("lines");
  });

  it("saving with grid style 'none' persists correctly", () => {
    panel.show();
    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    select.value = "none";
    select.dispatchEvent(new Event("change"));

    const saveBtn = document.querySelector(".settings-btn-primary") as HTMLButtonElement;
    saveBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    const [, savedPrefs] = (vi.mocked(onSaveSpy)).mock.calls[0];
    expect(savedPrefs.gridStyle).toBe("none");
  });

  it("updatePreferences updates grid style select", () => {
    panel.show();
    panel.updatePreferences({ defaultBrush: 0, defaultColor: "#000000", gridStyle: "lines" });

    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    expect(select.value).toBe("lines");
  });

  it("grid style initialized from preferences", () => {
    panel.destroy();
    const prefs = makePreferences();
    prefs.gridStyle = "none";
    panel = new SettingsPanel(makeProfile(), prefs, callbacks);
    panel.show();

    const select = document.querySelector(".settings-select") as HTMLSelectElement;
    expect(select.value).toBe("none");
  });
});
