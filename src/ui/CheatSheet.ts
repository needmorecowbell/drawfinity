import { ActionRegistry, ACTION_CATEGORIES } from "./ActionRegistry";
import type { Action } from "./ActionRegistry";

export class CheatSheet {
  private overlay: HTMLElement;
  private content: HTMLElement;
  private searchInput: HTMLInputElement;
  private listContainer: HTMLElement;
  private visible = false;
  private registry: ActionRegistry;

  constructor(registry: ActionRegistry) {
    this.registry = registry;

    this.overlay = document.createElement("div");
    this.overlay.id = "cheatsheet-overlay";
    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.content = document.createElement("div");
    this.content.id = "cheatsheet-content";
    this.content.addEventListener("pointerdown", (e) => e.stopPropagation());

    // Search input
    this.searchInput = document.createElement("input");
    this.searchInput.id = "cheatsheet-search";
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Search actions\u2026";
    this.searchInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        this.hide();
      }
    });
    this.searchInput.addEventListener("input", () => this.renderActions());
    this.content.appendChild(this.searchInput);

    // Action list container
    this.listContainer = document.createElement("div");
    this.listContainer.id = "cheatsheet-list";
    this.content.appendChild(this.listContainer);

    this.overlay.appendChild(this.content);
  }

  private renderActions(): void {
    this.listContainer.innerHTML = "";

    const query = this.searchInput.value;
    const results = this.registry.search(query);

    if (results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cheatsheet-empty";
      empty.textContent = "No matching actions";
      this.listContainer.appendChild(empty);
      return;
    }

    // Group results by category in canonical order
    const grouped = new Map<string, Action[]>();
    for (const action of results) {
      let list = grouped.get(action.category);
      if (!list) {
        list = [];
        grouped.set(action.category, list);
      }
      list.push(action);
    }

    for (const category of ACTION_CATEGORIES) {
      const actions = grouped.get(category);
      if (!actions || actions.length === 0) continue;

      const header = document.createElement("div");
      header.className = "cheatsheet-category";
      header.textContent = category;
      this.listContainer.appendChild(header);

      for (const action of actions) {
        const row = document.createElement("div");
        row.className = "cheatsheet-row";
        row.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.hide();
          action.execute();
        });

        const label = document.createElement("span");
        label.className = "cheatsheet-label";
        label.textContent = action.label;
        row.appendChild(label);

        if (action.shortcut) {
          const badge = document.createElement("kbd");
          badge.className = "cheatsheet-kbd";
          badge.textContent = action.shortcut;
          row.appendChild(badge);
        }

        this.listContainer.appendChild(row);
      }
    }
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.searchInput.value = "";
    this.renderActions();
    document.body.appendChild(this.overlay);
    this.searchInput.focus();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.hide();
  }
}
