import { DrawingMetadata } from "../persistence/DrawingManifest";

export interface HomeScreenCallbacks {
  onOpenDrawing: (id: string) => void;
  onCreateDrawing: () => Promise<DrawingMetadata>;
  onDeleteDrawing: (id: string) => Promise<void>;
  onRenameDrawing: (id: string, name: string) => Promise<void>;
  onDuplicateDrawing: (id: string, newName: string) => Promise<DrawingMetadata>;
  onChangeSaveDirectory?: () => Promise<string | null>;
}

type SortMode = "date" | "name";

export class HomeScreen {
  private container: HTMLElement;
  private grid: HTMLElement;
  private searchInput: HTMLInputElement;
  private sortSelect: HTMLSelectElement;
  private saveDirectoryRow: HTMLElement;
  private saveDirectoryPath: HTMLSpanElement;
  private emptyState: HTMLElement;
  private contextMenu: HTMLElement | null = null;

  private drawings: DrawingMetadata[] = [];
  private sortMode: SortMode = "date";
  private searchQuery = "";
  private callbacks: HomeScreenCallbacks;
  private saveDirectory = "";
  private visible = false;

  private boundCloseContextMenu = this.closeContextMenu.bind(this);

  constructor(callbacks: HomeScreenCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement("div");
    this.container.id = "home-screen";

    // Header
    const header = document.createElement("div");
    header.className = "home-header";

    const titleRow = document.createElement("div");
    titleRow.className = "home-title-row";

    const title = document.createElement("h1");
    title.className = "home-title";
    title.textContent = "Drawfinity";
    titleRow.appendChild(title);

    const newBtn = document.createElement("button");
    newBtn.className = "home-btn home-btn-primary";
    newBtn.textContent = "+ New Drawing";
    newBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleCreate();
    });
    titleRow.appendChild(newBtn);

    header.appendChild(titleRow);

    // Controls row: search + sort
    const controlsRow = document.createElement("div");
    controlsRow.className = "home-controls-row";

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "home-search-input";
    this.searchInput.placeholder = "Search drawings...";
    this.searchInput.addEventListener("input", () => {
      this.searchQuery = this.searchInput.value.trim().toLowerCase();
      this.renderGrid();
    });
    this.searchInput.addEventListener("keydown", (e) => e.stopPropagation());
    controlsRow.appendChild(this.searchInput);

    this.sortSelect = document.createElement("select");
    this.sortSelect.className = "home-sort-select";
    const optDate = document.createElement("option");
    optDate.value = "date";
    optDate.textContent = "Sort by date";
    const optName = document.createElement("option");
    optName.value = "name";
    optName.textContent = "Sort by name";
    this.sortSelect.appendChild(optDate);
    this.sortSelect.appendChild(optName);
    this.sortSelect.addEventListener("change", () => {
      this.sortMode = this.sortSelect.value as SortMode;
      this.renderGrid();
    });
    controlsRow.appendChild(this.sortSelect);

    header.appendChild(controlsRow);
    this.container.appendChild(header);

    // Drawing grid
    this.grid = document.createElement("div");
    this.grid.className = "home-grid";
    this.container.appendChild(this.grid);

    // Empty state
    this.emptyState = document.createElement("div");
    this.emptyState.className = "home-empty-state";
    this.emptyState.textContent = "Create your first drawing!";
    this.container.appendChild(this.emptyState);

    // Save directory footer
    this.saveDirectoryRow = document.createElement("div");
    this.saveDirectoryRow.className = "home-save-dir-row";

    const dirLabel = document.createElement("span");
    dirLabel.className = "home-save-dir-label";
    dirLabel.textContent = "Save directory:";
    this.saveDirectoryRow.appendChild(dirLabel);

    this.saveDirectoryPath = document.createElement("span");
    this.saveDirectoryPath.className = "home-save-dir-path";
    this.saveDirectoryRow.appendChild(this.saveDirectoryPath);

    if (callbacks.onChangeSaveDirectory) {
      const changeBtn = document.createElement("button");
      changeBtn.className = "home-btn home-btn-secondary home-btn-small";
      changeBtn.textContent = "Change";
      changeBtn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.handleChangeSaveDir();
      });
      this.saveDirectoryRow.appendChild(changeBtn);
    }

    this.container.appendChild(this.saveDirectoryRow);
  }

  setDrawings(drawings: DrawingMetadata[]): void {
    this.drawings = drawings;
    this.renderGrid();
  }

  setSaveDirectory(path: string): void {
    this.saveDirectory = path;
    this.saveDirectoryPath.textContent = path;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    document.body.appendChild(this.container);
    document.addEventListener("pointerdown", this.boundCloseContextMenu);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.remove();
    this.closeContextMenu();
    document.removeEventListener("pointerdown", this.boundCloseContextMenu);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.hide();
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  private getFilteredAndSorted(): DrawingMetadata[] {
    let filtered = this.drawings;
    if (this.searchQuery) {
      filtered = filtered.filter((d) =>
        d.name.toLowerCase().includes(this.searchQuery),
      );
    }
    const sorted = [...filtered];
    if (this.sortMode === "date") {
      sorted.sort(
        (a, b) =>
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      );
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }

  private renderGrid(): void {
    this.grid.innerHTML = "";
    const items = this.getFilteredAndSorted();

    if (items.length === 0 && this.drawings.length === 0) {
      this.emptyState.style.display = "";
      this.grid.style.display = "none";
      return;
    }

    this.emptyState.style.display = "none";
    this.grid.style.display = "";

    if (items.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "home-no-results";
      noResults.textContent = "No drawings match your search.";
      this.grid.appendChild(noResults);
      return;
    }

    for (const drawing of items) {
      this.grid.appendChild(this.createCard(drawing));
    }
  }

  private createCard(drawing: DrawingMetadata): HTMLElement {
    const card = document.createElement("div");
    card.className = "home-card";
    card.dataset.drawingId = drawing.id;

    // Thumbnail
    const thumb = document.createElement("div");
    thumb.className = "home-card-thumbnail";
    if (drawing.thumbnail) {
      const img = document.createElement("img");
      img.src = drawing.thumbnail;
      img.alt = drawing.name;
      thumb.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "home-card-placeholder";
      placeholder.textContent = "No preview";
      thumb.appendChild(placeholder);
    }
    card.appendChild(thumb);

    // Info row
    const info = document.createElement("div");
    info.className = "home-card-info";

    const name = document.createElement("div");
    name.className = "home-card-name";
    name.textContent = drawing.name;
    name.title = drawing.name;
    info.appendChild(name);

    const date = document.createElement("div");
    date.className = "home-card-date";
    date.textContent = this.formatDate(drawing.modifiedAt);
    info.appendChild(date);

    card.appendChild(info);

    // Menu button
    const menuBtn = document.createElement("button");
    menuBtn.className = "home-card-menu-btn";
    menuBtn.textContent = "\u22EF";
    menuBtn.title = "Options";
    menuBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.showContextMenu(drawing, menuBtn);
    });
    card.appendChild(menuBtn);

    // Click to open
    card.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".home-card-menu-btn")) return;
      e.stopPropagation();
      this.callbacks.onOpenDrawing(drawing.id);
    });

    // Right-click context menu
    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(drawing, menuBtn);
    });

    return card;
  }

  private showContextMenu(drawing: DrawingMetadata, anchor: HTMLElement): void {
    this.closeContextMenu();

    const menu = document.createElement("div");
    menu.className = "home-context-menu";

    const items: Array<{ label: string; action: () => void }> = [
      {
        label: "Rename",
        action: () => {
          this.closeContextMenu();
          this.handleRename(drawing);
        },
      },
      {
        label: "Duplicate",
        action: () => {
          this.closeContextMenu();
          this.handleDuplicate(drawing);
        },
      },
      {
        label: "Delete",
        action: () => {
          this.closeContextMenu();
          this.handleDelete(drawing);
        },
      },
    ];

    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "home-context-menu-item";
      if (item.label === "Delete") btn.classList.add("home-context-menu-danger");
      btn.textContent = item.label;
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        item.action();
      });
      menu.appendChild(btn);
    }

    // Position relative to anchor
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;

    document.body.appendChild(menu);
    this.contextMenu = menu;
  }

  private closeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  private async handleCreate(): Promise<void> {
    await this.callbacks.onCreateDrawing();
  }

  private handleRename(drawing: DrawingMetadata): void {
    const newName = prompt("Rename drawing:", drawing.name);
    if (newName !== null && newName.trim() !== "") {
      this.callbacks
        .onRenameDrawing(drawing.id, newName.trim())
        .then(() => {
          drawing.name = newName.trim();
          this.renderGrid();
        })
        .catch((err) => console.error("Rename failed:", err));
    }
  }

  private async handleDuplicate(drawing: DrawingMetadata): Promise<void> {
    try {
      const newDrawing = await this.callbacks.onDuplicateDrawing(
        drawing.id,
        `${drawing.name} (copy)`,
      );
      this.drawings.push(newDrawing);
      this.renderGrid();
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  }

  private handleDelete(drawing: DrawingMetadata): void {
    const confirmed = confirm(
      `Delete "${drawing.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    this.callbacks
      .onDeleteDrawing(drawing.id)
      .then(() => {
        this.drawings = this.drawings.filter((d) => d.id !== drawing.id);
        this.renderGrid();
      })
      .catch((err) => console.error("Delete failed:", err));
  }

  private async handleChangeSaveDir(): Promise<void> {
    if (!this.callbacks.onChangeSaveDirectory) return;
    const newDir = await this.callbacks.onChangeSaveDirectory();
    if (newDir) {
      this.setSaveDirectory(newDir);
    }
  }

  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}
