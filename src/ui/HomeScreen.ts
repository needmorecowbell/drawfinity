import { DrawingMetadata } from "../persistence/DrawingManifest";
import type { RoomInfo } from "../sync/ServerApi";
import { fetchRooms, createRoom, ServerApiError } from "../sync/ServerApi";
import { loadPreferences, savePreferences } from "../user/UserPreferences";
import { loadProfile } from "../user/UserStore";

export interface HomeScreenCallbacks {
  onOpenDrawing: (id: string) => void;
  onCreateDrawing: () => Promise<DrawingMetadata>;
  onDeleteDrawing: (id: string) => Promise<void>;
  onRenameDrawing: (id: string, name: string) => Promise<void>;
  onDuplicateDrawing: (id: string, newName: string) => Promise<DrawingMetadata>;
  onChangeSaveDirectory?: () => Promise<string | null>;
  onJoinRoom?: (roomId: string, serverUrl: string, roomName?: string) => void;
}

export type TabName = "my-drawings" | "shared";

export type SharedConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

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

  // Tab bar
  private tabBar: HTMLElement;
  private myDrawingsTab: HTMLButtonElement;
  private sharedTab: HTMLButtonElement;
  private activeTab: TabName = "my-drawings";

  // My drawings content wrapper
  private myDrawingsContent: HTMLElement;

  // Shared tab elements
  private sharedContent: HTMLElement;
  private serverUrlInput: HTMLInputElement;
  private connectBtn: HTMLButtonElement;
  private statusDot: HTMLElement;
  private statusText: HTMLElement;
  private sharedGrid: HTMLElement;
  private sharedEmptyState: HTMLElement;
  private refreshBtn: HTMLButtonElement;
  private createSharedBtn: HTMLButtonElement;

  private drawings: DrawingMetadata[] = [];
  private sortMode: SortMode = "date";
  private searchQuery = "";
  private callbacks: HomeScreenCallbacks;
  private visible = false;

  private rooms: RoomInfo[] = [];
  private sharedStatus: SharedConnectionStatus = "disconnected";
  private lastServerUrl = "";

  private boundCloseContextMenu = this.closeContextMenu.bind(this);

  constructor(callbacks: HomeScreenCallbacks) {
    this.callbacks = callbacks;

    // Use existing DOM container if available, otherwise create one (for tests)
    this.container =
      document.getElementById("home-screen") ??
      document.createElement("div");
    this.container.id = "home-screen";
    this.container.innerHTML = "";

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

    // Tab bar
    this.tabBar = document.createElement("div");
    this.tabBar.className = "home-tab-bar";

    this.myDrawingsTab = document.createElement("button");
    this.myDrawingsTab.className = "home-tab active";
    this.myDrawingsTab.textContent = "My Drawings";
    this.myDrawingsTab.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.switchTab("my-drawings");
    });
    this.tabBar.appendChild(this.myDrawingsTab);

    this.sharedTab = document.createElement("button");
    this.sharedTab.className = "home-tab";
    this.sharedTab.textContent = "Shared";
    this.sharedTab.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.switchTab("shared");
    });
    this.tabBar.appendChild(this.sharedTab);

    header.appendChild(this.tabBar);

    // Controls row: search + sort (for My Drawings tab)
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

    // === My Drawings content ===
    this.myDrawingsContent = document.createElement("div");
    this.myDrawingsContent.className = "home-my-drawings-content";

    // Drawing grid
    this.grid = document.createElement("div");
    this.grid.className = "home-grid";
    this.myDrawingsContent.appendChild(this.grid);

    // Empty state
    this.emptyState = document.createElement("div");
    this.emptyState.className = "home-empty-state";
    this.emptyState.textContent = "Create your first drawing!";
    this.myDrawingsContent.appendChild(this.emptyState);

    this.container.appendChild(this.myDrawingsContent);

    // === Shared tab content ===
    this.sharedContent = document.createElement("div");
    this.sharedContent.className = "home-shared-content";
    this.sharedContent.style.display = "none";

    // Server URL row
    const serverRow = document.createElement("div");
    serverRow.className = "home-shared-server-row";

    this.serverUrlInput = document.createElement("input");
    this.serverUrlInput.type = "text";
    this.serverUrlInput.className = "home-shared-server-input";
    this.serverUrlInput.placeholder = "ws://localhost:8080";
    this.serverUrlInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") this.handleConnect();
    });

    // Pre-fill from UserPreferences
    const prefs = loadPreferences();
    if (prefs.serverUrl) {
      this.serverUrlInput.value = prefs.serverUrl;
    }

    serverRow.appendChild(this.serverUrlInput);

    this.connectBtn = document.createElement("button");
    this.connectBtn.className = "home-btn home-btn-primary";
    this.connectBtn.textContent = "Connect";
    this.connectBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleConnect();
    });
    serverRow.appendChild(this.connectBtn);

    this.sharedContent.appendChild(serverRow);

    // Status row
    const statusRow = document.createElement("div");
    statusRow.className = "home-shared-status-row";

    this.statusDot = document.createElement("span");
    this.statusDot.className = "home-shared-status-dot";
    this.statusDot.dataset.state = "disconnected";
    statusRow.appendChild(this.statusDot);

    this.statusText = document.createElement("span");
    this.statusText.className = "home-shared-status-text";
    this.statusText.textContent = "Not connected";
    statusRow.appendChild(this.statusText);

    // Spacer
    const spacer = document.createElement("span");
    spacer.style.flex = "1";
    statusRow.appendChild(spacer);

    this.refreshBtn = document.createElement("button");
    this.refreshBtn.className = "home-btn home-btn-secondary home-btn-small";
    this.refreshBtn.textContent = "Refresh";
    this.refreshBtn.style.display = "none";
    this.refreshBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleRefresh();
    });
    statusRow.appendChild(this.refreshBtn);

    this.createSharedBtn = document.createElement("button");
    this.createSharedBtn.className = "home-btn home-btn-primary home-btn-small";
    this.createSharedBtn.textContent = "Create Shared Drawing";
    this.createSharedBtn.style.display = "none";
    this.createSharedBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.handleCreateShared();
    });
    statusRow.appendChild(this.createSharedBtn);

    this.sharedContent.appendChild(statusRow);

    // Shared room grid
    this.sharedGrid = document.createElement("div");
    this.sharedGrid.className = "home-grid";
    this.sharedContent.appendChild(this.sharedGrid);

    // Shared empty state
    this.sharedEmptyState = document.createElement("div");
    this.sharedEmptyState.className = "home-empty-state";
    this.sharedEmptyState.textContent =
      "No shared drawings yet \u2014 create one!";
    this.sharedEmptyState.style.display = "none";
    this.sharedContent.appendChild(this.sharedEmptyState);

    this.container.appendChild(this.sharedContent);

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
    this.saveDirectoryPath.textContent = path;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    if (!this.container.parentNode) {
      document.body.appendChild(this.container);
    }
    this.container.style.display = "";
    document.addEventListener("pointerdown", this.boundCloseContextMenu);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.style.display = "none";
    this.closeContextMenu();
    document.removeEventListener("pointerdown", this.boundCloseContextMenu);
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.hide();
    this.container.innerHTML = "";
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  getActiveTab(): TabName {
    return this.activeTab;
  }

  getSharedConnectionStatus(): SharedConnectionStatus {
    return this.sharedStatus;
  }

  getRooms(): RoomInfo[] {
    return this.rooms;
  }

  switchTab(tab: TabName): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    if (tab === "my-drawings") {
      this.myDrawingsTab.classList.add("active");
      this.sharedTab.classList.remove("active");
      this.myDrawingsContent.style.display = "";
      this.sharedContent.style.display = "none";
      this.saveDirectoryRow.style.display = "";
      // Show search/sort controls
      const controlsRow = this.container.querySelector(
        ".home-controls-row",
      ) as HTMLElement;
      if (controlsRow) controlsRow.style.display = "";
    } else {
      this.myDrawingsTab.classList.remove("active");
      this.sharedTab.classList.add("active");
      this.myDrawingsContent.style.display = "none";
      this.sharedContent.style.display = "";
      this.saveDirectoryRow.style.display = "none";
      // Hide search/sort controls for shared tab
      const controlsRow = this.container.querySelector(
        ".home-controls-row",
      ) as HTMLElement;
      if (controlsRow) controlsRow.style.display = "none";
    }
  }

  private setSharedStatus(
    status: SharedConnectionStatus,
    message?: string,
  ): void {
    this.sharedStatus = status;
    this.statusDot.dataset.state = status;

    if (message) {
      this.statusText.textContent = message;
    } else {
      switch (status) {
        case "disconnected":
          this.statusText.textContent = "Not connected";
          break;
        case "connecting":
          this.statusText.textContent = "Connecting...";
          break;
        case "connected":
          this.statusText.textContent = `Connected to ${this.lastServerUrl}`;
          break;
        case "error":
          this.statusText.textContent = "Connection failed";
          break;
      }
    }

    const showActions = status === "connected";
    this.refreshBtn.style.display = showActions ? "" : "none";
    this.createSharedBtn.style.display = showActions ? "" : "none";
    this.connectBtn.textContent =
      status === "connecting" ? "Connecting..." : "Connect";
    this.connectBtn.disabled = status === "connecting";
  }

  private async handleConnect(): Promise<void> {
    const url = this.serverUrlInput.value.trim();
    if (!url) return;

    this.lastServerUrl = url;
    this.setSharedStatus("connecting");

    try {
      const rooms = await fetchRooms(url);
      this.rooms = rooms;

      // Save server URL to preferences on successful connection
      const prefs = loadPreferences();
      prefs.serverUrl = url;
      savePreferences(prefs);

      this.setSharedStatus("connected");
      this.renderSharedGrid();
    } catch (err) {
      this.rooms = [];
      const message =
        err instanceof ServerApiError
          ? err.message
          : "Failed to connect to server";
      this.setSharedStatus("error", message);
      this.renderSharedGrid();
    }
  }

  private async handleRefresh(): Promise<void> {
    if (!this.lastServerUrl) return;
    this.setSharedStatus("connecting");

    try {
      const rooms = await fetchRooms(this.lastServerUrl);
      this.rooms = rooms;
      this.setSharedStatus("connected");
      this.renderSharedGrid();
    } catch (err) {
      const message =
        err instanceof ServerApiError
          ? err.message
          : "Failed to refresh room list";
      this.setSharedStatus("error", message);
    }
  }

  private async handleCreateShared(): Promise<void> {
    const name = prompt("Name for shared drawing:");
    if (name === null || name.trim() === "") return;

    try {
      const profile = loadProfile();
      const room = await createRoom(this.lastServerUrl, name.trim(), profile.name);
      this.rooms.push(room);
      this.renderSharedGrid();

      // Immediately join the new room
      if (this.callbacks.onJoinRoom) {
        this.callbacks.onJoinRoom(room.id, this.lastServerUrl, room.name ?? undefined);
      }
    } catch (err) {
      const message =
        err instanceof ServerApiError
          ? err.message
          : "Failed to create shared drawing";
      console.error("Create shared drawing failed:", message);
    }
  }

  private renderSharedGrid(): void {
    this.sharedGrid.innerHTML = "";

    if (this.sharedStatus !== "connected" || this.rooms.length === 0) {
      this.sharedGrid.style.display = "none";
      if (this.sharedStatus === "connected" && this.rooms.length === 0) {
        this.sharedEmptyState.style.display = "";
      } else {
        this.sharedEmptyState.style.display = "none";
      }
      return;
    }

    this.sharedEmptyState.style.display = "none";
    this.sharedGrid.style.display = "";

    for (const room of this.rooms) {
      this.sharedGrid.appendChild(this.createRoomCard(room));
    }
  }

  private createRoomCard(room: RoomInfo): HTMLElement {
    const card = document.createElement("div");
    card.className = "home-card home-room-card";
    card.dataset.roomId = room.id;

    // Icon area (shared indicator)
    const thumb = document.createElement("div");
    thumb.className = "home-card-thumbnail home-room-thumbnail";
    const icon = document.createElement("div");
    icon.className = "home-room-icon";
    icon.textContent = "\uD83C\uDF10"; // Globe emoji
    thumb.appendChild(icon);
    card.appendChild(thumb);

    // Info row
    const info = document.createElement("div");
    info.className = "home-card-info";

    const name = document.createElement("div");
    name.className = "home-card-name";
    name.textContent = room.name || room.id;
    name.title = room.name || room.id;
    info.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "home-card-date home-room-meta";
    const participants =
      room.clientCount === 1
        ? "1 participant"
        : `${room.clientCount} participants`;
    const lastActive = this.formatTimestamp(room.lastActiveAt);
    meta.textContent = `${participants} \u00B7 ${lastActive}`;
    info.appendChild(meta);

    card.appendChild(info);

    // Join button
    const joinBtn = document.createElement("button");
    joinBtn.className = "home-btn home-btn-primary home-btn-small home-room-join-btn";
    joinBtn.textContent = "Join";
    joinBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (this.callbacks.onJoinRoom) {
        this.callbacks.onJoinRoom(room.id, this.lastServerUrl, room.name ?? undefined);
      }
    });
    card.appendChild(joinBtn);

    // Click card to join
    card.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".home-room-join-btn")) return;
      e.stopPropagation();
      if (this.callbacks.onJoinRoom) {
        this.callbacks.onJoinRoom(room.id, this.lastServerUrl, room.name ?? undefined);
      }
    });

    return card;
  }

  private formatTimestamp(epochSecs: number): string {
    if (epochSecs === 0) return "Never";
    const date = new Date(epochSecs * 1000);
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
