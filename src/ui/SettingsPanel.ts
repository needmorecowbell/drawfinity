import { UserProfile } from "../user/UserProfile";
import { UserPreferences } from "../user/UserPreferences";
import type { GridStyle } from "../user/UserPreferences";
import { USER_COLORS, saveProfile } from "../user/UserStore";
import { savePreferences } from "../user/UserPreferences";
import { BRUSH_PRESETS } from "../tools/BrushPresets";

/**
 * Callbacks for SettingsPanel user interactions.
 *
 * @property onSave - Called when the user saves settings, receiving the updated profile and preferences.
 */
export interface SettingsPanelCallbacks {
  onSave: (profile: UserProfile, preferences: UserPreferences) => void;
  onClearData?: () => Promise<void>;
}

/**
 * Modal panel for editing user profile and application preferences.
 *
 * Provides controls for display name, user color, default brush preset,
 * grid style, collaboration server URL, and save directory (Tauri only).
 * Changes are persisted to localStorage on save and propagated via the
 * {@link SettingsPanelCallbacks.onSave} callback.
 *
 * Toggled with `Ctrl+,`. Clicking the overlay backdrop dismisses the panel
 * without saving.
 *
 * @param profile - Current user profile (name, color). Shallow-copied on construction.
 * @param preferences - Current application preferences. Shallow-copied on construction.
 * @param callbacks - Callback handlers for panel events.
 *
 * @example
 * ```ts
 * const settings = new SettingsPanel(profile, preferences, {
 *   onSave: (updatedProfile, updatedPrefs) => {
 *     syncManager.setUser(updatedProfile);
 *   },
 * });
 * settings.show();
 * ```
 */
export class SettingsPanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private visible = false;

  private nameInput!: HTMLInputElement;
  private colorSwatches: HTMLButtonElement[] = [];
  private brushPresetButtons: HTMLButtonElement[] = [];
  private serverUrlInput!: HTMLInputElement;
  private gridStyleSelect!: HTMLSelectElement;
  private saveDirectoryDisplay!: HTMLSpanElement;
  private saveDirectoryContainer!: HTMLDivElement;

  private profile: UserProfile;
  private preferences: UserPreferences;
  private callbacks: SettingsPanelCallbacks;

  private selectedColor: string;
  private selectedBrushIndex: number;
  private selectedGridStyle: GridStyle;

  constructor(
    profile: UserProfile,
    preferences: UserPreferences,
    callbacks: SettingsPanelCallbacks,
  ) {
    this.profile = { ...profile };
    this.preferences = { ...preferences };
    this.callbacks = callbacks;
    this.selectedColor = profile.color;
    this.selectedBrushIndex = preferences.defaultBrush;
    this.selectedGridStyle = preferences.gridStyle ?? "dots";

    this.overlay = document.createElement("div");
    this.overlay.id = "settings-overlay";
    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement("div");
    this.panel.id = "settings-panel";
    this.build();
    this.overlay.appendChild(this.panel);
  }

  private build(): void {
    // Title
    const title = document.createElement("div");
    title.className = "settings-title";
    title.textContent = "Settings";
    this.panel.appendChild(title);

    // Name input
    const nameLabel = document.createElement("label");
    nameLabel.className = "settings-label";
    nameLabel.textContent = "Display Name";
    this.panel.appendChild(nameLabel);

    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.className = "settings-input";
    this.nameInput.value = this.profile.name;
    this.nameInput.placeholder = "Enter your name";
    this.nameInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.panel.appendChild(this.nameInput);

    // User color picker
    const colorLabel = document.createElement("label");
    colorLabel.className = "settings-label";
    colorLabel.textContent = "User Color";
    this.panel.appendChild(colorLabel);

    const colorRow = document.createElement("div");
    colorRow.className = "settings-color-row";
    for (const color of USER_COLORS) {
      const swatch = document.createElement("button");
      swatch.className = "settings-color-swatch";
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      if (color === this.selectedColor) swatch.classList.add("active");
      swatch.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.selectColor(color);
      });
      colorRow.appendChild(swatch);
      this.colorSwatches.push(swatch);
    }
    this.panel.appendChild(colorRow);

    // Default brush preset selector
    const brushLabel = document.createElement("label");
    brushLabel.className = "settings-label";
    brushLabel.textContent = "Default Brush";
    this.panel.appendChild(brushLabel);

    const brushRow = document.createElement("div");
    brushRow.className = "settings-brush-row";
    for (let i = 0; i < BRUSH_PRESETS.length; i++) {
      const preset = BRUSH_PRESETS[i];
      const btn = document.createElement("button");
      btn.className = "settings-brush-btn";
      btn.textContent = preset.name;
      btn.dataset.index = String(i);
      if (i === this.selectedBrushIndex) btn.classList.add("active");
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.selectBrush(i);
      });
      brushRow.appendChild(btn);
      this.brushPresetButtons.push(btn);
    }
    this.panel.appendChild(brushRow);

    // Grid style dropdown
    const gridLabel = document.createElement("label");
    gridLabel.className = "settings-label";
    gridLabel.textContent = "Grid Style";
    this.panel.appendChild(gridLabel);

    this.gridStyleSelect = document.createElement("select");
    this.gridStyleSelect.className = "settings-select";
    const gridOptions: { value: GridStyle; label: string }[] = [
      { value: "dots", label: "Dot Grid" },
      { value: "lines", label: "Line Grid" },
      { value: "none", label: "None" },
    ];
    for (const opt of gridOptions) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      this.gridStyleSelect.appendChild(option);
    }
    this.gridStyleSelect.value = this.selectedGridStyle;
    this.gridStyleSelect.addEventListener("change", () => {
      this.selectedGridStyle = this.gridStyleSelect.value as GridStyle;
    });
    this.gridStyleSelect.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.panel.appendChild(this.gridStyleSelect);

    // Server URL
    const serverLabel = document.createElement("label");
    serverLabel.className = "settings-label";
    serverLabel.textContent = "Server URL";
    this.panel.appendChild(serverLabel);

    this.serverUrlInput = document.createElement("input");
    this.serverUrlInput.type = "text";
    this.serverUrlInput.className = "settings-input";
    this.serverUrlInput.value = this.preferences.serverUrl ?? "";
    this.serverUrlInput.placeholder = "ws://localhost:8080";
    this.serverUrlInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.panel.appendChild(this.serverUrlInput);

    // Save directory (Tauri only — hidden in browser)
    this.saveDirectoryContainer = document.createElement("div");
    this.saveDirectoryContainer.className = "settings-save-dir";
    this.saveDirectoryContainer.style.display =
      this.preferences.saveDirectory !== undefined ? "" : "none";

    const dirLabel = document.createElement("label");
    dirLabel.className = "settings-label";
    dirLabel.textContent = "Save Directory";
    this.saveDirectoryContainer.appendChild(dirLabel);

    const dirRow = document.createElement("div");
    dirRow.className = "settings-dir-row";

    this.saveDirectoryDisplay = document.createElement("span");
    this.saveDirectoryDisplay.className = "settings-dir-path";
    this.saveDirectoryDisplay.textContent =
      this.preferences.saveDirectory ?? "Not set";
    dirRow.appendChild(this.saveDirectoryDisplay);

    this.saveDirectoryContainer.appendChild(dirRow);
    this.panel.appendChild(this.saveDirectoryContainer);

    // Danger zone — Clear all data
    const dangerSection = document.createElement("div");
    dangerSection.className = "settings-danger-zone";

    const dangerLabel = document.createElement("label");
    dangerLabel.className = "settings-label settings-danger-label";
    dangerLabel.textContent = "Danger Zone";
    dangerSection.appendChild(dangerLabel);

    const clearBtn = document.createElement("button");
    clearBtn.className = "settings-btn settings-btn-danger";
    clearBtn.textContent = "Clear All Data";
    clearBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.showClearConfirmation();
    });
    dangerSection.appendChild(clearBtn);

    this.panel.appendChild(dangerSection);

    // Button row
    const btnRow = document.createElement("div");
    btnRow.className = "settings-btn-row";

    const closeBtn = document.createElement("button");
    closeBtn.className = "settings-btn settings-btn-secondary";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.hide();
    });
    btnRow.appendChild(closeBtn);

    const saveBtn = document.createElement("button");
    saveBtn.className = "settings-btn settings-btn-primary";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleSave();
    });
    btnRow.appendChild(saveBtn);

    this.panel.appendChild(btnRow);
  }

  private selectColor(color: string): void {
    this.selectedColor = color;
    for (const swatch of this.colorSwatches) {
      swatch.classList.toggle("active", swatch.dataset.color === color);
    }
  }

  private selectBrush(index: number): void {
    this.selectedBrushIndex = index;
    for (const btn of this.brushPresetButtons) {
      btn.classList.toggle("active", btn.dataset.index === String(index));
    }
  }

  private handleSave(): void {
    const name = this.nameInput.value.trim() || "Anonymous";
    const updatedProfile: UserProfile = {
      ...this.profile,
      name,
      color: this.selectedColor,
    };

    const serverUrl = this.serverUrlInput.value.trim() || undefined;
    const updatedPreferences: UserPreferences = {
      ...this.preferences,
      defaultBrush: this.selectedBrushIndex,
      gridStyle: this.selectedGridStyle,
      serverUrl,
    };

    saveProfile(updatedProfile);
    savePreferences(updatedPreferences);

    this.profile = updatedProfile;
    this.preferences = updatedPreferences;

    this.callbacks.onSave(updatedProfile, updatedPreferences);
    this.hide();
  }

  /**
   * Updates the panel's profile state and refreshes the name and color UI.
   *
   * Call this when the profile changes externally (e.g., from collaboration sync)
   * to keep the panel in sync without reopening it.
   *
   * @param profile - The updated user profile to reflect in the panel.
   */
  updateProfile(profile: UserProfile): void {
    this.profile = { ...profile };
    this.selectedColor = profile.color;
    if (this.nameInput) {
      this.nameInput.value = profile.name;
    }
    this.selectColor(profile.color);
  }

  /**
   * Updates the panel's preferences state and refreshes all preference controls.
   *
   * Synchronizes the brush preset selection, grid style dropdown, server URL input,
   * and save directory display with the provided preferences.
   *
   * @param preferences - The updated application preferences to reflect in the panel.
   */
  updatePreferences(preferences: UserPreferences): void {
    this.preferences = { ...preferences };
    this.selectedBrushIndex = preferences.defaultBrush;
    this.selectedGridStyle = preferences.gridStyle ?? "dots";
    if (this.gridStyleSelect) {
      this.gridStyleSelect.value = this.selectedGridStyle;
    }
    if (this.serverUrlInput) {
      this.serverUrlInput.value = preferences.serverUrl ?? "";
    }
    if (this.saveDirectoryDisplay) {
      this.saveDirectoryDisplay.textContent =
        preferences.saveDirectory ?? "Not set";
      this.saveDirectoryContainer.style.display =
        preferences.saveDirectory !== undefined ? "" : "none";
    }
    this.selectBrush(preferences.defaultBrush);
  }

  private showClearConfirmation(): void {
    const dialog = document.createElement("div");
    dialog.className = "settings-clear-confirm";

    const msg = document.createElement("p");
    msg.textContent = "This will delete all drawings. Are you sure?";
    dialog.appendChild(msg);

    const btnRow = document.createElement("div");
    btnRow.className = "settings-btn-row";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "settings-btn settings-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      dialog.remove();
    });
    btnRow.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "settings-btn settings-btn-danger";
    confirmBtn.textContent = "Delete Everything";
    confirmBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      dialog.remove();
      this.callbacks.onClearData?.()?.then(() => {
        this.hide();
      });
    });
    btnRow.appendChild(confirmBtn);

    dialog.appendChild(btnRow);
    this.panel.appendChild(dialog);
  }

  /** Displays the settings panel by appending its overlay to the document body. No-op if already visible. */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    document.body.appendChild(this.overlay);
  }

  /** Hides the settings panel by removing its overlay from the DOM. No-op if already hidden. */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  /** Toggles the settings panel visibility — shows it if hidden, hides it if visible. */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Returns whether the settings panel is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }

  /** Cleans up the settings panel by hiding it and removing it from the DOM. */
  destroy(): void {
    this.hide();
  }
}
