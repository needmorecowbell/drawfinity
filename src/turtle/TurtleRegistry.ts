import { TurtleState } from "./TurtleState";
import { TurtleDrawing } from "./TurtleDrawing";
import type { DocumentModel } from "../model/Stroke";
import { computeStrokeBounds } from "../renderer/SpatialIndex";

/** Entry for a single turtle in the registry. */
export interface TurtleEntry {
  state: TurtleState;
  drawing: TurtleDrawing;
  scriptId: string;
  parentId: string | null;
}

/** Result of a nearby-turtle spatial query. */
export interface NearbyTurtle {
  id: string;
  x: number;
  y: number;
  heading: number;
  distance: number;
  /** True when the turtle belongs to a remote client (multiplayer awareness). */
  remote?: boolean;
}

/** Options for spawning a new turtle. */
export interface SpawnOptions {
  x?: number;
  y?: number;
  heading?: number;
  color?: string;
  width?: number;
}

/**
 * Global registry managing all turtles across all script executions.
 * Tracks parent-child relationships and enforces spawn limits.
 */
export class TurtleRegistry {
  private turtles = new Map<string, TurtleEntry>();
  private children = new Map<string, Set<string>>();
  private maxTurtles = 1000;
  private maxDepth = 10;

  /** Create the main turtle for a script, returning its full ID. */
  createMain(scriptId: string, doc: DocumentModel): string {
    const id = `${scriptId}:main`;
    if (this.turtles.has(id)) {
      throw new Error(`Turtle "${id}" already exists`);
    }
    const state = new TurtleState();
    const drawing = new TurtleDrawing(doc);
    this.turtles.set(id, { state, drawing, scriptId, parentId: null });
    return id;
  }

  /**
   * Spawn a new turtle. The full ID is `{scriptId}:{localId}`.
   * Errors if the ID already exists, max turtles exceeded, or max depth exceeded.
   */
  spawn(
    localId: string,
    scriptId: string,
    doc: DocumentModel,
    parentId?: string,
    options?: SpawnOptions,
  ): string {
    const id = `${scriptId}:${localId}`;
    if (this.turtles.has(id)) {
      throw new Error(`Turtle "${id}" already exists`);
    }
    if (this.turtles.size >= this.maxTurtles) {
      throw new Error(
        `Maximum turtle limit reached (${this.maxTurtles})`,
      );
    }

    const resolvedParentId = parentId ?? `${scriptId}:main`;
    const depth = this.getDepth(resolvedParentId);
    if (depth + 1 > this.maxDepth) {
      throw new Error(
        `Maximum spawn depth reached (${this.maxDepth})`,
      );
    }

    const state = new TurtleState();
    if (options?.x !== undefined) state.x = options.x;
    if (options?.y !== undefined) state.y = options.y;
    if (options?.heading !== undefined) state.angle = options.heading;
    if (options?.color !== undefined) state.pen.color = options.color;
    if (options?.width !== undefined) state.pen.width = options.width;

    const drawing = new TurtleDrawing(doc);
    this.turtles.set(id, {
      state,
      drawing,
      scriptId,
      parentId: resolvedParentId,
    });

    // Track parent-child relationship
    if (!this.children.has(resolvedParentId)) {
      this.children.set(resolvedParentId, new Set());
    }
    this.children.get(resolvedParentId)!.add(id);

    return id;
  }

  /** Get a turtle entry by full ID. */
  get(id: string): TurtleEntry | undefined {
    return this.turtles.get(id);
  }

  /** Check if a turtle exists. */
  has(id: string): boolean {
    return this.turtles.has(id);
  }

  /**
   * Remove a turtle by full ID. Only succeeds if the turtle
   * is owned by the given scriptId. Also removes all descendants.
   */
  remove(id: string, scriptId: string): boolean {
    const entry = this.turtles.get(id);
    if (!entry) return false;
    if (entry.scriptId !== scriptId) return false;
    this.removeWithDescendants(id);
    return true;
  }

  /** Get all turtles belonging to a specific script. */
  getOwned(scriptId: string): Map<string, TurtleEntry> {
    const result = new Map<string, TurtleEntry>();
    for (const [id, entry] of this.turtles) {
      if (entry.scriptId === scriptId) {
        result.set(id, entry);
      }
    }
    return result;
  }

  /** Get all turtles across all scripts. */
  getAll(): Map<string, TurtleEntry> {
    return new Map(this.turtles);
  }

  /** Remove all turtles belonging to a specific script. */
  clearScript(scriptId: string): void {
    const toRemove: string[] = [];
    for (const [id, entry] of this.turtles) {
      if (entry.scriptId === scriptId) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.turtles.delete(id);
      this.children.delete(id);
    }
    // Clean up parent references to removed turtles
    for (const childSet of this.children.values()) {
      for (const id of toRemove) {
        childSet.delete(id);
      }
    }
  }

  /** Remove all turtles from the registry. */
  clear(): void {
    this.turtles.clear();
    this.children.clear();
  }

  /** Total number of turtles across all scripts. */
  count(): number {
    return this.turtles.size;
  }

  /** Set the maximum total number of turtles allowed. */
  setMaxTurtles(max: number): void {
    this.maxTurtles = max;
  }

  /** Set the maximum spawn depth allowed. */
  setMaxDepth(max: number): void {
    this.maxDepth = max;
  }

  /** Get the current maximum turtle limit. */
  getMaxTurtles(): number {
    return this.maxTurtles;
  }

  /** Get the current maximum depth limit. */
  getMaxDepth(): number {
    return this.maxDepth;
  }

  /**
   * Returns all turtles within `radius` of the given turtle's position.
   * Results are sorted by distance (ascending).
   */
  nearbyTurtles(turtleId: string, radius: number): NearbyTurtle[] {
    const origin = this.turtles.get(turtleId);
    if (!origin) {
      throw new Error(`Unknown turtle "${turtleId}"`);
    }
    const ox = origin.state.x;
    const oy = origin.state.y;
    const r2 = radius * radius;
    const results: NearbyTurtle[] = [];

    for (const [id, entry] of this.turtles) {
      if (id === turtleId) continue;
      if (entry.scriptId !== origin.scriptId) continue;
      const dx = entry.state.x - ox;
      const dy = entry.state.y - oy;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        results.push({
          id,
          x: entry.state.x,
          y: entry.state.y,
          heading: entry.state.angle,
          distance: Math.sqrt(dist2),
        });
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  /**
   * Returns stroke IDs whose bounding boxes intersect a circle at (x, y)
   * with the given radius. Uses brute-force AABB-circle intersection over
   * the document's strokes.
   */
  nearbyStrokes(
    x: number,
    y: number,
    radius: number,
    document: DocumentModel,
  ): string[] {
    const strokes = document.getStrokes();
    const results: string[] = [];

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      const bounds = computeStrokeBounds(stroke);
      // Find closest point on AABB to circle center
      const closestX = Math.max(bounds.minX, Math.min(x, bounds.maxX));
      const closestY = Math.max(bounds.minY, Math.min(y, bounds.maxY));
      const dx = closestX - x;
      const dy = closestY - y;
      if (dx * dx + dy * dy <= radius * radius) {
        results.push(stroke.id);
      }
    }

    return results;
  }

  /**
   * Returns true if two turtles are within collision range of each other.
   * The collision radius for each turtle is either its custom `collisionRadius`
   * or `pen.width / 2` by default. Collision occurs when distance <= sum of radii.
   */
  collidesWith(id1: string, id2: string): boolean {
    const t1 = this.turtles.get(id1);
    const t2 = this.turtles.get(id2);
    if (!t1) throw new Error(`Unknown turtle "${id1}"`);
    if (!t2) throw new Error(`Unknown turtle "${id2}"`);
    const r1 = t1.state.collisionRadius ?? t1.state.pen.width / 2;
    const r2 = t2.state.collisionRadius ?? t2.state.pen.width / 2;
    const dx = t2.state.x - t1.state.x;
    const dy = t2.state.y - t1.state.y;
    const dist2 = dx * dx + dy * dy;
    const threshold = r1 + r2;
    return dist2 <= threshold * threshold;
  }

  /** Euclidean distance between two turtles. */
  distanceTo(id1: string, id2: string): number {
    const t1 = this.turtles.get(id1);
    const t2 = this.turtles.get(id2);
    if (!t1) throw new Error(`Unknown turtle "${id1}"`);
    if (!t2) throw new Error(`Unknown turtle "${id2}"`);
    const dx = t2.state.x - t1.state.x;
    const dy = t2.state.y - t1.state.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Calculate the depth of a turtle in the parent-child tree. */
  private getDepth(id: string): number {
    let depth = 0;
    let current = id;
    const visited = new Set<string>();
    while (true) {
      const entry = this.turtles.get(current);
      if (!entry || !entry.parentId) break;
      if (visited.has(current)) break; // cycle protection
      visited.add(current);
      current = entry.parentId;
      depth++;
    }
    return depth;
  }

  /** Remove a turtle and all its descendants recursively. */
  private removeWithDescendants(id: string): void {
    // Read entry BEFORE deleting so we can clean up the parent's child set
    const entry = this.turtles.get(id);
    const childSet = this.children.get(id);
    if (childSet) {
      for (const childId of childSet) {
        this.removeWithDescendants(childId);
      }
    }
    this.turtles.delete(id);
    this.children.delete(id);
    // Remove from parent's child set
    if (entry?.parentId) {
      this.children.get(entry.parentId)?.delete(id);
    }
  }
}

/** Global singleton instance. */
let globalRegistry: TurtleRegistry | null = null;

/** Get the global TurtleRegistry singleton. */
export function getTurtleRegistry(): TurtleRegistry {
  if (!globalRegistry) {
    globalRegistry = new TurtleRegistry();
  }
  return globalRegistry;
}

/** Reset the global registry (for testing). */
export function resetTurtleRegistry(): void {
  globalRegistry?.clear();
  globalRegistry = null;
}
