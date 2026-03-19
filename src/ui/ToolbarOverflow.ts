import type { ToolbarGroup } from "./Toolbar";

/** Priority order for collapsing groups (last = collapsed first). */
const COLLAPSE_ORDER: ToolbarGroup[] = ["navigation", "actions", "panels"];

export interface ToolbarOverflowConfig {
  /** The toolbar container element. */
  container: HTMLElement;
  /** Map of group name to its DOM element. */
  groups: Map<ToolbarGroup, HTMLDivElement>;
}

/**
 * Manages responsive overflow for the toolbar.
 * When the toolbar would exceed viewport width, it collapses less-used
 * groups into an overflow dropdown menu, accessed via a "..." button.
 */
export class ToolbarOverflow {
  private container: HTMLElement;
  private groups: Map<ToolbarGroup, HTMLDivElement>;
  private overflowBtn: HTMLButtonElement;
  private overflowMenu: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private collapsedGroups: Set<ToolbarGroup> = new Set();
  private isMenuOpen = false;
  private dismissHandler: (e: PointerEvent) => void;

  constructor(config: ToolbarOverflowConfig) {
    this.container = config.container;
    this.groups = config.groups;

    // Create overflow button
    this.overflowBtn = document.createElement("button");
    this.overflowBtn.className = "toolbar-overflow-btn";
    this.overflowBtn.textContent = "\u22EF"; // midline horizontal ellipsis
    this.overflowBtn.setAttribute("aria-label", "More tools");
    this.overflowBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    this.container.appendChild(this.overflowBtn);

    // Create overflow menu (hidden by default)
    this.overflowMenu = document.createElement("div");
    this.overflowMenu.className = "toolbar-overflow-menu";
    this.overflowMenu.style.display = "none";

    // Dismiss handler
    this.dismissHandler = (e: PointerEvent) => {
      if (this.isMenuOpen &&
          !this.overflowMenu.contains(e.target as Node) &&
          !this.overflowBtn.contains(e.target as Node)) {
        this.closeMenu();
      }
    };

    // ResizeObserver to detect when toolbar overflows
    this.resizeObserver = new ResizeObserver(() => {
      this.checkOverflow();
    });
    this.resizeObserver.observe(this.container);

    // Also check on window resize for viewport changes
    window.addEventListener("resize", this.onWindowResize);

    // Initial check
    requestAnimationFrame(() => this.checkOverflow());
  }

  private onWindowResize = (): void => {
    this.checkOverflow();
  };

  /** Check if toolbar overflows and collapse groups as needed. */
  checkOverflow(): void {
    const viewportWidth = window.innerWidth;
    const maxWidth = viewportWidth - 24; // 12px margin on each side

    // First, try restoring all collapsed groups to see if they fit now
    this.restoreAll();

    // Measure with all groups visible
    let toolbarWidth = this.container.scrollWidth;

    if (toolbarWidth <= maxWidth) {
      // Everything fits, no overflow needed
      this.overflowBtn.classList.remove("visible");
      this.closeMenu();
      return;
    }

    // Collapse groups in priority order until toolbar fits
    for (const groupName of COLLAPSE_ORDER) {
      if (toolbarWidth <= maxWidth) break;

      this.collapseGroup(groupName);
      toolbarWidth = this.container.scrollWidth;
    }

    if (this.collapsedGroups.size > 0) {
      this.overflowBtn.classList.add("visible");
    } else {
      this.overflowBtn.classList.remove("visible");
    }
  }

  private collapseGroup(name: ToolbarGroup): void {
    const group = this.groups.get(name);
    if (!group) return;

    this.collapsedGroups.add(name);
    group.classList.add("toolbar-collapsed");

    // Also hide the divider before this group
    const prev = group.previousElementSibling;
    if (prev?.classList.contains("toolbar-divider")) {
      prev.classList.add("toolbar-collapsed");
    }
  }

  private restoreAll(): void {
    for (const name of this.collapsedGroups) {
      const group = this.groups.get(name);
      if (!group) continue;
      group.classList.remove("toolbar-collapsed");

      const prev = group.previousElementSibling;
      if (prev?.classList.contains("toolbar-divider")) {
        prev.classList.remove("toolbar-collapsed");
      }
    }
    this.collapsedGroups.clear();
  }

  private toggleMenu(): void {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private openMenu(): void {
    if (this.collapsedGroups.size === 0) return;

    this.isMenuOpen = true;

    // Clone collapsed group contents into the overflow menu
    this.overflowMenu.innerHTML = "";
    for (const name of COLLAPSE_ORDER) {
      if (!this.collapsedGroups.has(name)) continue;
      const group = this.groups.get(name);
      if (!group) continue;

      // Clone the group and make it visible in the overflow menu
      const clone = group.cloneNode(true) as HTMLDivElement;
      clone.classList.remove("toolbar-collapsed");
      clone.dataset.overflowGroup = name;
      this.overflowMenu.appendChild(clone);
    }

    // Position below the overflow button
    document.body.appendChild(this.overflowMenu);
    const btnRect = this.overflowBtn.getBoundingClientRect();
    this.overflowMenu.style.display = "";
    this.overflowMenu.style.top = `${btnRect.bottom + 4}px`;

    // Center under the button, but clamp to viewport
    const menuWidth = this.overflowMenu.offsetWidth;
    let left = btnRect.left + btnRect.width / 2 - menuWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));
    this.overflowMenu.style.left = `${left}px`;

    // Mirror event listeners from original groups to clones
    this.mirrorEvents();

    document.addEventListener("pointerdown", this.dismissHandler);
  }

  /**
   * Mirror pointer events from cloned overflow menu items back to
   * the original (hidden) toolbar buttons so callbacks fire correctly.
   */
  private mirrorEvents(): void {
    for (const name of COLLAPSE_ORDER) {
      if (!this.collapsedGroups.has(name)) continue;
      const original = this.groups.get(name);
      if (!original) continue;

      const cloneGroup = this.overflowMenu.querySelector(
        `[data-overflow-group="${name}"]`
      );
      if (!cloneGroup) continue;

      const originalBtns = original.querySelectorAll("button, .toolbar-zoom, input, span[class]");
      const cloneBtns = cloneGroup.querySelectorAll("button, .toolbar-zoom, input, span[class]");

      for (let i = 0; i < Math.min(originalBtns.length, cloneBtns.length); i++) {
        const origEl = originalBtns[i] as HTMLElement;
        const cloneEl = cloneBtns[i] as HTMLElement;

        cloneEl.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          origEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          this.closeMenu();
        });
        cloneEl.addEventListener("click", (e) => {
          e.stopPropagation();
          origEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          this.closeMenu();
        });
      }
    }
  }

  closeMenu(): void {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this.overflowMenu.style.display = "none";
    if (this.overflowMenu.parentNode) {
      this.overflowMenu.remove();
    }
    document.removeEventListener("pointerdown", this.dismissHandler);
  }

  /** Get collapsed group names (for testing). */
  getCollapsedGroups(): Set<ToolbarGroup> {
    return new Set(this.collapsedGroups);
  }

  /** Whether the overflow menu is currently open (for testing). */
  isOpen(): boolean {
    return this.isMenuOpen;
  }

  /** Get the overflow button element (for testing). */
  getOverflowButton(): HTMLButtonElement {
    return this.overflowBtn;
  }

  /** Get the overflow menu element (for testing). */
  getOverflowMenu(): HTMLDivElement {
    return this.overflowMenu;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.onWindowResize);
    document.removeEventListener("pointerdown", this.dismissHandler);
    this.closeMenu();
    this.overflowBtn.remove();
  }
}
