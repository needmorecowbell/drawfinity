import type { SyncManager } from "../sync/SyncManager";
import type { TurtleRegistry } from "./TurtleRegistry";

/**
 * Turtle state broadcast via Yjs awareness protocol.
 * Each entry represents one turtle visible to remote clients.
 */
export interface AwarenessTurtle {
  id: string;
  x: number;
  y: number;
  heading: number;
  color: string;
  visible: boolean;
}

/**
 * Broadcasts local turtle states to remote collaborators via the Yjs awareness protocol.
 *
 * Integrates with SyncManager to publish ephemeral turtle indicator data (position,
 * heading, color, visibility) at a throttled rate (60fps max). Remote clients use
 * this data to render indicators for other users' turtles.
 *
 * Lifecycle:
 * 1. Call {@link update} after each replay step that changes turtle state
 * 2. Call {@link clear} when a script completes or is stopped
 */
export class TurtleAwareness {
  private syncManager: SyncManager | null;
  private registry: TurtleRegistry;
  private scriptId: string;
  private lastUpdateTime = 0;
  private readonly minIntervalMs: number;

  /**
   * @param syncManager - SyncManager for awareness broadcasting, or null if offline.
   * @param registry - TurtleRegistry to read current turtle states from.
   * @param scriptId - Script ID to scope turtle queries.
   * @param maxFps - Maximum update rate in frames per second (default 60).
   */
  constructor(
    syncManager: SyncManager | null,
    registry: TurtleRegistry,
    scriptId: string,
    maxFps = 60,
  ) {
    this.syncManager = syncManager;
    this.registry = registry;
    this.scriptId = scriptId;
    this.minIntervalMs = 1000 / maxFps;
  }

  /**
   * Broadcast current turtle states if enough time has elapsed since the last update.
   * Returns true if an update was actually sent, false if throttled.
   */
  update(): boolean {
    if (!this.syncManager) return false;

    const now = performance.now();
    if (now - this.lastUpdateTime < this.minIntervalMs) {
      return false;
    }

    this.lastUpdateTime = now;
    const turtles = this.collectTurtleStates();
    this.broadcast(turtles);
    return true;
  }

  /**
   * Force-broadcast current turtle states, ignoring the throttle.
   * Use for final updates before clearing.
   */
  forceUpdate(): void {
    if (!this.syncManager) return;
    this.lastUpdateTime = performance.now();
    const turtles = this.collectTurtleStates();
    this.broadcast(turtles);
  }

  /**
   * Send a final update with empty turtles array to clear remote indicators.
   * Called when a script completes or is stopped.
   */
  clear(): void {
    if (!this.syncManager) return;
    this.broadcast([]);
    this.lastUpdateTime = 0;
  }

  /** Collect current turtle states from the registry. */
  private collectTurtleStates(): AwarenessTurtle[] {
    const owned = this.registry.getOwned(this.scriptId);
    const turtles: AwarenessTurtle[] = [];

    for (const [fullId, entry] of owned) {
      const localId = fullId.replace(`${this.scriptId}:`, "");
      const worldPos = entry.state.getWorldPosition();
      turtles.push({
        id: localId,
        x: worldPos.x,
        y: worldPos.y,
        heading: entry.state.angle,
        color: entry.state.pen.color,
        visible: entry.state.visible,
      });
    }

    return turtles;
  }

  /** Broadcast turtle states via SyncManager awareness. */
  private broadcast(turtles: AwarenessTurtle[]): void {
    if (!this.syncManager) return;
    this.syncManager.updateTurtleStates(turtles);
  }
}
