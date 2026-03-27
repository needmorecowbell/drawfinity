import type { Camera } from "../camera/Camera";
import type { SyncManager, RemoteTurtles, AwarenessTurtleState } from "../sync/SyncManager";

/** SVG size for remote turtle indicators. */
const REMOTE_SIZE = 18;

/** Opacity for remote turtle indicators (visually distinct from local). */
const REMOTE_OPACITY = 0.5;

/** Internal state for a single remote turtle indicator element. */
interface RemoteIndicatorEntry {
  container: HTMLElement;
  clientId: string;
}

/**
 * Derives a unique hue (0–360) from a client identifier string.
 * Uses a simple hash to spread hues evenly across the color wheel.
 */
export function hueFromClientId(clientId: string): number {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) | 0;
  }
  return ((hash % 360) + 360) % 360;
}

/**
 * Renders turtle indicators for remote clients' turtles.
 *
 * Listens for awareness updates from SyncManager and creates/updates/removes
 * indicator DOM elements. Remote indicators are visually distinct from local
 * turtles: they use a dashed stroke outline, reduced opacity (0.5), and a
 * unique hue derived from the client ID. Each indicator is labeled with the
 * remote client's display name.
 *
 * Remote indicators are strictly read-only — they cannot be controlled locally.
 */
export class RemoteTurtleRenderer {
  private root: HTMLElement;
  private camera: Camera;
  private indicators = new Map<string, RemoteIndicatorEntry>();
  private unsubscribe: (() => void) | null = null;
  private globalVisible = false;
  private lastSnapshot: RemoteTurtles[] = [];

  constructor(root: HTMLElement, camera: Camera) {
    this.root = root;
    this.camera = camera;
  }

  /**
   * Attach to a SyncManager to begin receiving remote turtle updates.
   * Replaces any previously attached SyncManager.
   */
  setSyncManager(syncManager: SyncManager | null): void {
    // Unsubscribe from previous
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (syncManager) {
      this.unsubscribe = syncManager.onRemoteTurtlesChange(
        (remoteTurtles: RemoteTurtles[]) => {
          this.syncFromAwareness(remoteTurtles);
        },
      );
    } else {
      // No sync manager — clear all remote indicators
      this.clear();
    }
  }

  /** Show all remote turtle indicators (global visibility). */
  show(): void {
    this.globalVisible = true;
    for (const [, entry] of this.indicators) {
      entry.container.style.display = "";
    }
  }

  /** Hide all remote turtle indicators (global visibility). */
  hide(): void {
    this.globalVisible = false;
    for (const [, entry] of this.indicators) {
      entry.container.style.display = "none";
    }
  }

  /** Whether remote indicators are globally visible. */
  isVisible(): boolean {
    return this.globalVisible;
  }

  /** Number of tracked remote turtle indicators. */
  count(): number {
    return this.indicators.size;
  }

  /** Remove all remote turtle indicators from the DOM. */
  clear(): void {
    for (const [, entry] of this.indicators) {
      entry.container.remove();
    }
    this.indicators.clear();
  }

  /**
   * Remove all indicators belonging to a specific client (e.g., on disconnect).
   */
  removeClient(clientId: string): void {
    const toRemove: string[] = [];
    for (const [key, entry] of this.indicators) {
      if (entry.clientId === clientId) {
        entry.container.remove();
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this.indicators.delete(key);
    }
  }

  /** Clean up: unsubscribe from SyncManager, remove all indicators. */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.hide();
    this.clear();
  }

  /**
   * Process a full awareness snapshot from SyncManager.
   * Creates new indicators, updates existing ones, and removes stale ones.
   */
  syncFromAwareness(remoteTurtles: RemoteTurtles[]): void {
    this.lastSnapshot = remoteTurtles;
    // Collect all keys that should exist after this sync
    const activeKeys = new Set<string>();

    for (const client of remoteTurtles) {
      for (const turtle of client.turtles) {
        const key = `${client.userId}:${turtle.id}`;
        activeKeys.add(key);

        if (!this.indicators.has(key)) {
          this.createIndicator(key, client.userId, client.userName, client.userColor);
        }

        this.updateIndicator(key, turtle, client.userName, client.userColor);
      }
    }

    // Remove indicators for turtles no longer present
    const toRemove: string[] = [];
    for (const [key] of this.indicators) {
      if (!activeKeys.has(key)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      const entry = this.indicators.get(key)!;
      entry.container.remove();
      this.indicators.delete(key);
    }
  }

  private createIndicator(
    key: string,
    clientId: string,
    clientName: string,
    _clientColor: string,
  ): void {
    const container = document.createElement("div");
    container.className = "turtle-indicator turtle-indicator--remote";
    container.setAttribute("data-turtle-id", key);
    container.setAttribute("data-remote-client", clientId);
    container.style.display = this.globalVisible ? "" : "none";
    container.style.opacity = String(REMOTE_OPACITY);

    // SVG with dashed outline to distinguish from local turtles
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(REMOTE_SIZE));
    svg.setAttribute("height", String(REMOTE_SIZE));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.overflow = "visible";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2L4 22L12 17L20 22Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-dasharray", "3 2");

    svg.appendChild(path);
    container.appendChild(svg);

    // Client name label
    const label = document.createElement("span");
    label.className = "turtle-indicator__label";
    label.textContent = clientName;
    label.style.position = "absolute";
    label.style.top = `${REMOTE_SIZE + 2}px`;
    label.style.left = "50%";
    label.style.transform = "translateX(-50%)";
    label.style.fontSize = "10px";
    label.style.whiteSpace = "nowrap";
    label.style.pointerEvents = "none";
    container.appendChild(label);

    // Apply hue-based color from client ID
    const hue = hueFromClientId(clientId);
    container.style.color = `hsl(${hue}, 80%, 55%)`;

    this.root.appendChild(container);
    this.indicators.set(key, { container, clientId });
  }

  private updateIndicator(
    key: string,
    turtle: AwarenessTurtleState,
    clientName: string,
    _clientColor: string,
  ): void {
    const entry = this.indicators.get(key);
    if (!entry) return;

    // Update visibility
    if (!turtle.visible) {
      entry.container.style.display = "none";
      return;
    }
    if (this.globalVisible) {
      entry.container.style.display = "";
    }

    // Update label text if name changed
    const label = entry.container.querySelector(".turtle-indicator__label") as HTMLElement | null;
    if (label && label.textContent !== clientName) {
      label.textContent = clientName;
    }

    // Position in screen coordinates
    const [vw, vh] = this.camera.getViewportSize();
    const screenX = (turtle.x - this.camera.x) * this.camera.zoom + vw / 2;
    const screenY = (turtle.y - this.camera.y) * this.camera.zoom + vh / 2;
    const halfSize = REMOTE_SIZE / 2;

    entry.container.style.transform =
      `translate(${screenX - halfSize}px, ${screenY - halfSize}px) rotate(${turtle.heading}deg)`;
  }

  /**
   * Re-render all indicator positions from the last awareness snapshot.
   * Call this on camera pan/zoom so indicators stay at correct screen positions.
   */
  redrawAll(): void {
    for (const client of this.lastSnapshot) {
      for (const turtle of client.turtles) {
        const key = `${client.userId}:${turtle.id}`;
        this.updateIndicator(key, turtle, client.userName, client.userColor);
      }
    }
  }
}
