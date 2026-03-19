export interface Action {
  id: string;
  label: string;
  shortcut?: string;
  category: ActionCategory;
  execute: () => void;
}

export type ActionCategory = "Tools" | "Navigation" | "Drawing" | "Panels" | "File";

export const ACTION_CATEGORIES: readonly ActionCategory[] = [
  "Tools",
  "Drawing",
  "Navigation",
  "Panels",
  "File",
];

// Future: action IDs can serve as slash-command names (e.g., /export, /turtle).
// The search() method already matches against action.id, and get()/execute()
// support direct ID lookup, providing the foundation for a command-line interface.
export class ActionRegistry {
  private actions: Map<string, Action> = new Map();

  register(action: Action): void {
    this.actions.set(action.id, action);
  }

  getAll(): Action[] {
    return Array.from(this.actions.values());
  }

  get(id: string): Action | undefined {
    return this.actions.get(id);
  }

  getByCategory(): Map<string, Action[]> {
    const grouped = new Map<string, Action[]>();
    for (const category of ACTION_CATEGORIES) {
      grouped.set(category, []);
    }
    for (const action of this.actions.values()) {
      const list = grouped.get(action.category);
      if (list) {
        list.push(action);
      }
    }
    // Remove empty categories
    for (const [key, value] of grouped) {
      if (value.length === 0) grouped.delete(key);
    }
    return grouped;
  }

  search(query: string): Action[] {
    if (!query.trim()) return this.getAll();
    const lower = query.toLowerCase();
    const terms = lower.split(/\s+/).filter(Boolean);
    return this.getAll().filter((action) => {
      const searchText =
        `${action.label} ${action.shortcut ?? ""} ${action.category} ${action.id}`.toLowerCase();
      return terms.every((term) => searchText.includes(term));
    });
  }

  execute(id: string): boolean {
    const action = this.actions.get(id);
    if (action) {
      action.execute();
      return true;
    }
    return false;
  }
}
