/**
 * Describes a registerable action with keyboard shortcut binding.
 *
 * @property id - Unique identifier for the action, also used for direct lookup and execution
 * @property label - Human-readable display name shown in the command cheat sheet
 * @property shortcut - Keyboard shortcut string (e.g. "Ctrl+Z"), if any
 * @property category - Grouping category for organizing actions in the UI
 * @property execute - Callback invoked when the action is triggered
 */
export interface Action {
  id: string;
  label: string;
  shortcut?: string;
  category: ActionCategory;
  execute: () => void;
}

/**
 * Categories used to group actions in the command cheat sheet and search results.
 */
export type ActionCategory = "Tools" | "Navigation" | "Drawing" | "Panels" | "File";

/**
 * Ordered list of all action categories, used to determine display order
 * in the command cheat sheet panel.
 */
export const ACTION_CATEGORIES: readonly ActionCategory[] = [
  "Tools",
  "Drawing",
  "Navigation",
  "Panels",
  "File",
];

/**
 * Central registry for keyboard-bound actions and command dispatch.
 *
 * Manages a collection of {@link Action} objects that can be registered,
 * looked up by ID, grouped by category, and searched by query string.
 * Serves as the backbone of the command cheat sheet UI and keyboard
 * shortcut system.
 *
 * Action IDs can also serve as slash-command names (e.g., /export, /turtle),
 * providing the foundation for a future command-line interface.
 *
 * @example
 * ```ts
 * const registry = new ActionRegistry();
 * registry.register({
 *   id: "undo",
 *   label: "Undo",
 *   shortcut: "Ctrl+Z",
 *   category: "Drawing",
 *   execute: () => doc.undo(),
 * });
 *
 * registry.execute("undo"); // returns true, invokes the callback
 * registry.search("undo");  // returns matching actions
 * ```
 */
// Future: action IDs can serve as slash-command names (e.g., /export, /turtle).
// The search() method already matches against action.id, and get()/execute()
// support direct ID lookup, providing the foundation for a command-line interface.
export class ActionRegistry {
  private actions: Map<string, Action> = new Map();

  /**
   * Registers an action, making it available for lookup, search, and execution.
   * If an action with the same ID already exists, it is replaced.
   *
   * @param action - The action to register
   */
  register(action: Action): void {
    this.actions.set(action.id, action);
  }

  /**
   * Returns all registered actions.
   *
   * @returns Array of all registered {@link Action} objects
   */
  getAll(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Looks up a single action by its unique ID.
   *
   * @param id - The action identifier to look up
   * @returns The matching action, or `undefined` if no action with that ID exists
   */
  get(id: string): Action | undefined {
    return this.actions.get(id);
  }

  /**
   * Groups all registered actions by their {@link ActionCategory}.
   *
   * Categories are ordered according to {@link ACTION_CATEGORIES}. Empty
   * categories (those with no registered actions) are omitted from the result.
   *
   * @returns Map from category name to array of actions in that category
   */
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

  /**
   * Searches registered actions by matching a query against each action's
   * label, shortcut, category, and ID. All space-separated query terms must
   * appear somewhere in the combined search text (case-insensitive).
   *
   * Returns all actions if the query is empty or whitespace-only.
   *
   * @param query - Search string, may contain multiple space-separated terms
   * @returns Array of actions matching all query terms
   */
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

  /**
   * Executes the action with the given ID, if it exists.
   *
   * @param id - The action identifier to execute
   * @returns `true` if the action was found and executed, `false` if no action
   *          with the given ID is registered
   */
  execute(id: string): boolean {
    const action = this.actions.get(id);
    if (action) {
      action.execute();
      return true;
    }
    return false;
  }
}
