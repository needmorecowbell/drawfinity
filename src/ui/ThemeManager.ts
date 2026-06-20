import { getTheme, setTheme as saveTheme } from "../user/UserStore";
import type { ThemePreference } from "../user/UserPreferences";

const THEME_CHANGE_EVENT = "drawfinity:themechange";
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export class ThemeManager {
  private mediaQuery?: MediaQueryList;
  private theme: ThemePreference;
  private readonly handleSystemThemeChange = (): void => {
    if (this.theme === "auto") {
      this.applyTheme();
      this.dispatchThemeChange();
    }
  };

  constructor(initialTheme: ThemePreference = getTheme()) {
    this.theme = initialTheme;
    this.mediaQuery = window.matchMedia?.(DARK_SCHEME_QUERY);
    this.mediaQuery?.addEventListener?.("change", this.handleSystemThemeChange);
    this.applyTheme();
  }

  getTheme(): ThemePreference {
    return this.theme;
  }

  setTheme(theme: ThemePreference): void {
    this.theme = theme;
    saveTheme(theme);
    this.applyTheme();
    this.dispatchThemeChange();
  }

  destroy(): void {
    this.mediaQuery?.removeEventListener?.("change", this.handleSystemThemeChange);
  }

  private applyTheme(): void {
    document.documentElement.dataset.theme = this.theme;
  }

  private dispatchThemeChange(): void {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: {
        theme: this.theme,
        systemPrefersDark: this.mediaQuery?.matches ?? false,
      },
    }));
  }
}

let themeManager: ThemeManager | undefined;

export function initializeThemeManager(): ThemeManager {
  themeManager?.destroy();
  themeManager = new ThemeManager();
  return themeManager;
}

export function getThemeManager(): ThemeManager {
  themeManager ??= new ThemeManager();
  return themeManager;
}

export type { ThemePreference };
export { THEME_CHANGE_EVENT };
