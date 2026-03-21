import type { Camera } from "../camera/Camera";
import type { SyncManager, RemoteUser } from "../sync/SyncManager";

const IDLE_TIMEOUT_MS = 5000;
const FADE_DURATION_MS = 300;

interface CursorEntry {
  container: HTMLElement;
  arrow: HTMLElement;
  label: HTMLElement;
  lastUpdate: number;
  fading: boolean;
}

/**
 * Renders remote collaborators' cursor positions as CSS-positioned HTML overlays
 * on top of the drawing canvas.
 *
 * Each cursor is displayed as a colored SVG arrow with a name label, matching the
 * user's assigned collaboration color. Cursors automatically fade out after
 * {@link IDLE_TIMEOUT_MS | 5 seconds} of inactivity and are removed when users
 * disconnect from the session.
 *
 * Lifecycle: construct with a root element and camera, then call {@link attach} to
 * begin listening for remote user updates from a {@link SyncManager}. Call
 * {@link detach} or let the owner clean up to stop rendering and remove DOM elements.
 *
 * @example
 * ```ts
 * const cursors = new RemoteCursors(canvasContainer, camera);
 * cursors.attach(syncManager);
 *
 * // On camera pan/zoom, reproject cursor positions:
 * cursors.updatePositions();
 *
 * // When leaving the collaborative session:
 * cursors.detach();
 * ```
 */
export class RemoteCursors {
  private cursors: Map<string, CursorEntry> = new Map();
  private root: HTMLElement;
  private camera: Camera;
  private unsubscribe: (() => void) | null = null;
  private animFrameId: number | null = null;
  private lastUsers: RemoteUser[] = [];

  /**
   * Creates a new RemoteCursors overlay manager.
   *
   * @param root - The DOM element to append cursor overlays into (typically the canvas container).
   * @param camera - The camera used to convert world-space cursor positions to screen coordinates.
   */
  constructor(root: HTMLElement, camera: Camera) {
    this.root = root;
    this.camera = camera;
  }

  /**
   * Begins listening for remote user updates from the given sync manager.
   *
   * Subscribes to {@link SyncManager.onRemoteUsersChange} to create, update, and
   * remove cursor overlays as collaborators join, move, or leave. Also starts an
   * animation loop that handles idle fade-out transitions.
   *
   * Calling this while already attached will first {@link detach} the previous subscription.
   *
   * @param syncManager - The sync manager providing remote user presence data.
   */
  attach(syncManager: SyncManager): void {
    this.detach();
    this.unsubscribe = syncManager.onRemoteUsersChange((users) => {
      this.updateUsers(users);
    });
    this.startAnimationLoop();
  }

  /**
   * Stops listening for remote user updates and removes all cursor overlays from the DOM.
   *
   * Cancels the animation loop, unsubscribes from the sync manager, and cleans up
   * all cursor DOM elements. Safe to call multiple times or when not attached.
   */
  detach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    for (const [, entry] of this.cursors) {
      entry.container.remove();
    }
    this.cursors.clear();
    this.lastUsers = [];
  }

  /**
   * Reprojects all visible cursors from world space to screen space.
   *
   * Should be called whenever the camera pans or zooms so that cursor overlays
   * remain aligned with their world-space positions. Also updates fade state
   * for idle cursors.
   */
  updatePositions(): void {
    const now = Date.now();
    for (const user of this.lastUsers) {
      const entry = this.cursors.get(user.id);
      if (!entry || !user.cursor) continue;
      this.positionCursor(entry, user.cursor.x, user.cursor.y);
      this.updateFadeState(entry, now);
    }
  }

  private updateUsers(users: RemoteUser[]): void {
    this.lastUsers = users;
    const now = Date.now();
    const activeIds = new Set<string>();

    for (const user of users) {
      activeIds.add(user.id);
      let entry = this.cursors.get(user.id);

      if (!entry) {
        entry = this.createCursorElement(user);
        this.cursors.set(user.id, entry);
      }

      // Update color and name
      entry.arrow.style.color = user.color;
      entry.label.textContent = user.name;
      entry.label.style.background = user.color;

      if (user.cursor) {
        entry.lastUpdate = now;
        entry.fading = false;
        entry.container.style.display = "";
        this.positionCursor(entry, user.cursor.x, user.cursor.y);
        entry.container.style.opacity = "1";
      } else {
        entry.container.style.display = "none";
      }
    }

    // Remove cursors for disconnected users
    for (const [id, entry] of this.cursors) {
      if (!activeIds.has(id)) {
        entry.container.remove();
        this.cursors.delete(id);
      }
    }
  }

  private positionCursor(entry: CursorEntry, worldX: number, worldY: number): void {
    const [vw, vh] = this.camera.getViewportSize();
    const screenX = (worldX - this.camera.x) * this.camera.zoom + vw / 2;
    const screenY = (worldY - this.camera.y) * this.camera.zoom + vh / 2;
    entry.container.style.transform = `translate(${screenX}px, ${screenY}px)`;
  }

  private createCursorElement(user: RemoteUser): CursorEntry {
    const container = document.createElement("div");
    container.className = "remote-cursor";
    container.style.display = "none";

    // SVG cursor arrow
    const arrow = document.createElement("div");
    arrow.className = "remote-cursor-arrow";
    arrow.style.color = user.color;
    arrow.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L16 12L8 12L6 20L0 0Z"/></svg>`;
    container.appendChild(arrow);

    // Name label
    const label = document.createElement("div");
    label.className = "remote-cursor-label";
    label.textContent = user.name;
    label.style.background = user.color;
    container.appendChild(label);

    this.root.appendChild(container);

    return {
      container,
      arrow,
      label,
      lastUpdate: Date.now(),
      fading: false,
    };
  }

  private updateFadeState(entry: CursorEntry, now: number): void {
    const elapsed = now - entry.lastUpdate;
    if (elapsed >= IDLE_TIMEOUT_MS) {
      if (!entry.fading) {
        entry.fading = true;
        entry.container.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
        entry.container.style.opacity = "0";
      }
    } else {
      if (entry.fading) {
        entry.fading = false;
        entry.container.style.transition = "";
        entry.container.style.opacity = "1";
      }
    }
  }

  private startAnimationLoop(): void {
    const tick = () => {
      const now = Date.now();
      for (const [, entry] of this.cursors) {
        this.updateFadeState(entry, now);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }
}
