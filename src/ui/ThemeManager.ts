import type { ThemeMode } from "../user/UserPreferences";
import { loadPreferences, savePreferences } from "../user/UserPreferences";

const THEME_ATTR = "data-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Manages the application's visual theme by controlling the `data-theme` attribute
 * on `<html>` and listening for OS-level color scheme changes.
 *
 * Supports three modes:
 * - `"auto"` — Follows the OS `prefers-color-scheme` media query
 * - `"light"` — Forces light theme regardless of OS preference
 * - `"dark"` — Forces dark theme regardless of OS preference
 *
 * The preference is persisted via {@link savePreferences} and restored on startup.
 *
 * @example
 * ```ts
 * const themeManager = new ThemeManager();
 * themeManager.init(); // Apply saved theme and start listening for OS changes
 * themeManager.setTheme("dark"); // Switch to dark mode
 * ```
 */
export class ThemeManager {
  private currentTheme: ThemeMode = "auto";
  private mediaQuery: MediaQueryList | null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.mediaQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(MEDIA_QUERY)
      : null;
  }

  /**
   * Initializes the theme manager by reading the saved preference,
   * applying the correct `data-theme` attribute, and registering
   * a listener for OS color scheme changes (when in auto mode).
   */
  init(): void {
    const prefs = loadPreferences();
    this.currentTheme = prefs.theme ?? "auto";
    this.applyTheme();
    this.startMediaQueryListener();
  }

  /**
   * Returns the current theme mode.
   */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Sets the theme mode, updates the DOM attribute, persists the preference,
   * and manages the OS media query listener accordingly.
   *
   * @param theme - The desired theme mode: `"auto"`, `"light"`, or `"dark"`.
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.applyTheme();
    this.updateMediaQueryListener();

    const prefs = loadPreferences();
    prefs.theme = theme;
    savePreferences(prefs);
  }

  /**
   * Applies the correct `data-theme` attribute based on the current theme mode.
   * In auto mode, reads the OS preference via the media query.
   */
  private applyTheme(): void {
    const html = document.documentElement;
    if (!html) return;

    if (this.currentTheme === "auto") {
      const isDark = this.mediaQuery?.matches ?? false;
      html.setAttribute(THEME_ATTR, isDark ? "dark" : "auto");
    } else {
      html.setAttribute(THEME_ATTR, this.currentTheme);
    }
  }

  /**
   * Registers a listener for OS color scheme changes when in auto mode.
   */
  private startMediaQueryListener(): void {
    if (!this.mediaQuery || this.currentTheme !== "auto") return;

    this.mediaListener = (e: MediaQueryListEvent) => {
      if (this.currentTheme === "auto") {
        const html = document.documentElement;
        if (html) {
          html.setAttribute(THEME_ATTR, e.matches ? "dark" : "auto");
        }
      }
    };

    this.mediaQuery.addEventListener("change", this.mediaListener);
  }

  /**
   * Starts or stops the OS media query listener based on the current theme mode.
   */
  private updateMediaQueryListener(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener("change", this.mediaListener);
      this.mediaListener = null;
    }
    if (this.currentTheme === "auto") {
      this.startMediaQueryListener();
    }
  }

  /**
   * Cleans up event listeners and removes the `data-theme` attribute.
   */
  destroy(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener("change", this.mediaListener);
      this.mediaListener = null;
    }
    document.documentElement.removeAttribute(THEME_ATTR);
  }
}
