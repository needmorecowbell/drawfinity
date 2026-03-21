import { DrawfinityDoc } from "../crdt";
import { CameraBookmark, generateBookmarkId } from "../model/Bookmark";
import { Camera } from "../camera/Camera";
import { ICONS } from "./ToolbarIcons";

/**
 * Callbacks for responding to bookmark panel interactions and resolving user identity.
 *
 * All callbacks are optional — omit any that are not relevant to the current context
 * (e.g., user-identity callbacks are only needed during collaboration).
 */
export interface BookmarkPanelCallbacks {
  /** Called when the user clicks a bookmark to navigate the camera to its saved position. */
  onNavigate?: (bookmark: CameraBookmark) => void;
  /** Returns the local user's unique identifier, used to tag bookmark ownership. */
  getUserId?: () => string;
  /** Returns the local user's display name, stored on newly created bookmarks. */
  getUserName?: () => string;
  /** Resolves a remote user's ID to their display name, shown as the bookmark creator label. */
  resolveUserName?: (userId: string) => string | undefined;
  /** Returns whether the document is in a collaborative session, enabling creator-name display. */
  isCollaborating?: () => boolean;
}

/**
 * Side panel UI for managing camera bookmarks on the infinite canvas.
 *
 * Displays a list of saved {@link CameraBookmark} positions that users can navigate to,
 * rename, or delete. In collaborative sessions, each bookmark shows its creator's name.
 * New bookmarks capture the current camera position and zoom level.
 *
 * The panel listens for CRDT bookmark changes via {@link DrawfinityDoc.onBookmarksChanged}
 * and re-renders automatically when bookmarks are added, updated, or removed by any user.
 *
 * Toggle visibility with `Ctrl+B`; quick-add a bookmark with `Ctrl+D`.
 *
 * @param doc - The shared CRDT document that stores bookmarks
 * @param camera - The camera whose position is captured when adding bookmarks
 * @param callbacks - Optional callbacks for navigation, user identity, and collaboration state
 */
export class BookmarkPanel {
  private container: HTMLElement;
  private listEl: HTMLElement;
  private visible = false;
  private doc: DrawfinityDoc;
  private camera: Camera;
  private callbacks: BookmarkPanelCallbacks;
  private editingId: string | null = null;
  private pendingAdd = false;

  constructor(
    doc: DrawfinityDoc,
    camera: Camera,
    callbacks?: BookmarkPanelCallbacks,
  ) {
    this.doc = doc;
    this.camera = camera;
    this.callbacks = callbacks ?? {};

    this.container = document.createElement("div");
    this.container.id = "bookmark-panel";
    this.container.addEventListener("pointerdown", (e) => e.stopPropagation());

    this.listEl = document.createElement("div");
    this.listEl.className = "bm-list";

    this.build();

    this.doc.onBookmarksChanged(() => this.renderList());
  }

  private build(): void {
    // Header
    const header = document.createElement("div");
    header.className = "bm-header";

    const title = document.createElement("span");
    title.className = "bm-title";
    title.textContent = "Bookmarks";
    header.appendChild(title);

    const addBtn = document.createElement("button");
    addBtn.className = "bm-add-btn";
    addBtn.innerHTML = ICONS.bookmark;
    addBtn.title = "Add bookmark";
    addBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.addBookmark();
    });
    header.appendChild(addBtn);

    this.container.appendChild(header);
    this.container.appendChild(this.listEl);

    this.renderList();
  }

  private renderList(): void {
    this.listEl.innerHTML = "";
    const bookmarks = this.doc.getBookmarks();

    if (this.pendingAdd) {
      this.listEl.appendChild(this.createAddInput(bookmarks.length));
    }

    if (bookmarks.length === 0 && !this.pendingAdd) {
      const empty = document.createElement("div");
      empty.className = "bm-empty";
      empty.textContent = "No bookmarks yet \u2014 click + to save your current view";
      this.listEl.appendChild(empty);
      return;
    }

    for (const bm of bookmarks) {
      this.listEl.appendChild(this.createBookmarkItem(bm));
    }
  }

  private createBookmarkItem(bm: CameraBookmark): HTMLElement {
    const item = document.createElement("div");
    item.className = "bm-item";
    item.dataset.id = bm.id;

    if (this.editingId === bm.id) {
      const input = document.createElement("input");
      input.className = "bm-edit-input";
      input.type = "text";
      input.value = bm.label;
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          this.commitEdit(bm.id, input.value.trim());
        } else if (e.key === "Escape") {
          this.cancelEdit();
        }
      });
      input.addEventListener("blur", () => {
        this.commitEdit(bm.id, input.value.trim());
      });
      item.appendChild(input);
      // Focus after append
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    } else {
      const labelWrap = document.createElement("span");
      labelWrap.className = "bm-label-wrap";
      labelWrap.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.callbacks.onNavigate?.(bm);
      });

      const label = document.createElement("span");
      label.className = "bm-label";
      label.textContent = bm.label;
      label.title = `${bm.label} (${Math.round(bm.zoom * 100)}%)`;
      labelWrap.appendChild(label);

      if (this.callbacks.isCollaborating?.()) {
        const creatorName = this.getCreatorName(bm);
        if (creatorName) {
          const creator = document.createElement("span");
          creator.className = "bm-creator";
          creator.textContent = creatorName;
          labelWrap.appendChild(creator);
        }
      }

      item.appendChild(labelWrap);
    }

    const actions = document.createElement("span");
    actions.className = "bm-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "bm-action-btn";
    editBtn.innerHTML = ICONS.pencilSmall;
    editBtn.title = "Rename";
    editBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.startEdit(bm.id);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "bm-action-btn bm-action-delete";
    deleteBtn.innerHTML = ICONS.trashSmall;
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.deleteBookmark(bm.id);
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  }

  private createAddInput(existingCount: number): HTMLElement {
    const item = document.createElement("div");
    item.className = "bm-item bm-adding";

    const input = document.createElement("input");
    input.className = "bm-edit-input";
    input.type = "text";
    input.value = `Bookmark ${existingCount + 1}`;
    input.placeholder = "Bookmark name";
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        this.confirmAdd(input.value.trim());
      } else if (e.key === "Escape") {
        this.cancelAdd();
      }
    });
    input.addEventListener("blur", () => {
      // Only confirm on blur if we're still in pending state
      if (this.pendingAdd) {
        this.confirmAdd(input.value.trim());
      }
    });
    item.appendChild(input);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    return item;
  }

  private confirmAdd(label: string): void {
    if (!this.pendingAdd) return;
    this.pendingAdd = false;

    const finalLabel = label || `Bookmark ${this.doc.getBookmarks().length + 1}`;

    const bookmark: CameraBookmark = {
      id: generateBookmarkId(),
      label: finalLabel,
      x: this.camera.x,
      y: this.camera.y,
      zoom: this.camera.zoom,
      createdBy: this.callbacks.getUserId?.() ?? "local",
      createdByName: this.callbacks.getUserName?.(),
      createdAt: Date.now(),
    };

    this.doc.addBookmark(bookmark);
    // renderList will be triggered by onBookmarksChanged
  }

  private cancelAdd(): void {
    if (!this.pendingAdd) return;
    this.pendingAdd = false;
    this.renderList();
  }

  /**
   * Adds a new bookmark at the current camera position.
   *
   * If a label is provided, the bookmark is created immediately. Otherwise, the panel
   * opens (if hidden) and displays an inline text input for the user to enter a name.
   *
   * @param label - Optional bookmark name; when omitted, shows an inline input for naming
   */
  addBookmark(label?: string): void {
    if (!this.visible) {
      this.show();
    }

    if (label) {
      // Direct add with specified label (no input needed)
      const bookmark: CameraBookmark = {
        id: generateBookmarkId(),
        label,
        x: this.camera.x,
        y: this.camera.y,
        zoom: this.camera.zoom,
        createdBy: this.callbacks.getUserId?.() ?? "local",
        createdByName: this.callbacks.getUserName?.(),
        createdAt: Date.now(),
      };
      this.doc.addBookmark(bookmark);
    } else {
      // Show inline input for label entry
      this.pendingAdd = true;
      this.renderList();
    }
  }

  private getCreatorName(bm: CameraBookmark): string | undefined {
    if (bm.createdBy === "local") return undefined;
    const localId = this.callbacks.getUserId?.();
    if (bm.createdBy === localId) return undefined;
    const resolved = this.callbacks.resolveUserName?.(bm.createdBy);
    return resolved ?? bm.createdByName;
  }

  private startEdit(id: string): void {
    this.editingId = id;
    this.renderList();
  }

  private commitEdit(id: string, newLabel: string): void {
    if (this.editingId !== id) return;
    this.editingId = null;
    if (newLabel) {
      this.doc.updateBookmark(id, { label: newLabel });
    }
    this.renderList();
  }

  private cancelEdit(): void {
    this.editingId = null;
    this.renderList();
  }

  private deleteBookmark(id: string): void {
    this.doc.removeBookmark(id);
  }

  /** Forces a re-render of the bookmark list from the current CRDT state. */
  refreshList(): void {
    this.renderList();
  }

  /** Shows the bookmark panel by appending it to the document body. No-op if already visible. */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    document.body.appendChild(this.container);
    this.container.classList.add("bm-visible");
  }

  /** Hides the bookmark panel and removes it from the DOM. No-op if already hidden. */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.classList.remove("bm-visible");
    this.container.remove();
  }

  /** Toggles the bookmark panel between visible and hidden states. */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Returns whether the bookmark panel is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }

  /** Cleans up the panel by hiding it and removing it from the DOM. */
  destroy(): void {
    this.hide();
  }
}
