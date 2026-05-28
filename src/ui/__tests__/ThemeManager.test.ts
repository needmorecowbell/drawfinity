// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storageMap.set(key, value)),
  removeItem: vi.fn((key: string) => storageMap.delete(key)),
  clear: vi.fn(() => storageMap.clear()),
  get length() { return storageMap.size; },
  key: vi.fn((index: number) => [...storageMap.keys()][index] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

import { ThemeManager, THEME_CHANGE_EVENT } from "../ThemeManager";

describe("ThemeManager", () => {
  let listeners: Array<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
    listeners = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: (_type: string, callback: (event: MediaQueryListEvent) => void) => {
          listeners.push(callback);
        },
        removeEventListener: (_type: string, callback: (event: MediaQueryListEvent) => void) => {
          listeners = listeners.filter((listener) => listener !== callback);
        },
      })),
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies the saved theme to the document element", () => {
    storageMap.set("drawfinity:user-preferences", JSON.stringify({
      defaultBrush: 0,
      defaultColor: "#000000",
      theme: "dark",
    }));

    const manager = new ThemeManager();

    expect(manager.getTheme()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    manager.destroy();
  });

  it("persists and applies theme changes", () => {
    const manager = new ThemeManager();

    manager.setTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    const stored = JSON.parse(storageMap.get("drawfinity:user-preferences")!);
    expect(stored.theme).toBe("light");
    manager.destroy();
  });

  it("dispatches a theme event for auto system changes", () => {
    const manager = new ThemeManager("auto");
    const eventSpy = vi.fn();
    window.addEventListener(THEME_CHANGE_EVENT, eventSpy);

    listeners[0]?.({ matches: true } as MediaQueryListEvent);

    expect(document.documentElement.dataset.theme).toBe("auto");
    expect(eventSpy).toHaveBeenCalledOnce();
    window.removeEventListener(THEME_CHANGE_EVENT, eventSpy);
    manager.destroy();
  });
});
