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
 * Renders remote user cursors as CSS-positioned HTML overlays on the canvas.
 * Each cursor shows a colored arrow and name label.
 * Cursors fade after 5s of inactivity and are removed when users disconnect.
 */
export class RemoteCursors {
  private cursors: Map<string, CursorEntry> = new Map();
  private root: HTMLElement;
  private camera: Camera;
  private unsubscribe: (() => void) | null = null;
  private animFrameId: number | null = null;
  private lastUsers: RemoteUser[] = [];

  constructor(root: HTMLElement, camera: Camera) {
    this.root = root;
    this.camera = camera;
  }

  attach(syncManager: SyncManager): void {
    this.detach();
    this.unsubscribe = syncManager.onRemoteUsersChange((users) => {
      this.updateUsers(users);
    });
    this.startAnimationLoop();
  }

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

  /** Called on camera change to reposition all cursors */
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
