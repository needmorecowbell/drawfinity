import type { UserStats } from "./UserStats";
import { saveStats } from "./UserStats";
import type { DrawfinityDoc } from "../crdt/DrawfinityDoc";
import type { Camera } from "../camera/Camera";
import type { UndoManager } from "../crdt/UndoManager";
import type { SyncManager } from "../sync/SyncManager";
import type { TurtleCommand } from "../turtle/LuaRuntime";
import type { ExecutionResult } from "../turtle/LuaRuntime";
import { BadgeEngine } from "./badges/BadgeEngine";
import type { BadgeState } from "./badges/BadgeState";
import { loadBadgeState, saveBadgeState } from "./badges/BadgeState";
import { BADGE_CATALOG } from "./badges/BadgeCatalog";
import type { CanvasRecords } from "./CanvasRecords";
import { loadRecords, saveRecords, updateRecord } from "./CanvasRecords";

/**
 * Singleton that listens to app events and accumulates UserStats passively.
 *
 * Stats are saved on a debounced 30-second timer (not on every change) and
 * on `beforeunload` for safety. Call {@link destroy} during app teardown
 * to flush final state and unsubscribe all listeners.
 */
export class StatsTracker {
  private stats: UserStats;
  private dirty = false;
  private saveTimerId: ReturnType<typeof setInterval> | null = null;
  private sessionTimerId: ReturnType<typeof setInterval> | null = null;
  private sessionStartMs: number;
  private lastCameraX: number;
  private lastCameraY: number;
  private panAccumulator = 0;
  private panFlushTimerId: ReturnType<typeof setInterval> | null = null;
  private beforeUnloadHandler: () => void;
  private cleanupFns: (() => void)[] = [];
  private strokeCountAtStart: number;
  private shapeCountAtStart: number;
  private badgeEngine: BadgeEngine;
  private badgeState: BadgeState;
  private records: CanvasRecords;
  private recordsDirty = false;
  private sessionStrokeCount = 0;
  private sessionPanDistance = 0;

  constructor(
    stats: UserStats,
    doc: DrawfinityDoc,
    camera: Camera,
    undoManager: UndoManager,
    syncManager: SyncManager | null,
  ) {
    this.stats = stats;
    this.sessionStartMs = Date.now();
    this.lastCameraX = camera.x;
    this.lastCameraY = camera.y;

    // Snapshot initial counts so we can detect additions
    this.strokeCountAtStart = doc.getStrokes().length;
    this.shapeCountAtStart = doc.getShapes().length;

    // --- Session tracking ---
    this.stats.totalDrawingSessions++;
    this.stats.lastSessionAt = Date.now();
    if (this.stats.firstSessionAt === 0) {
      this.stats.firstSessionAt = Date.now();
    }
    this.dirty = true;

    // Session duration: add elapsed time every 60s
    this.sessionTimerId = setInterval(() => {
      const now = Date.now();
      this.stats.totalSessionDurationMs += now - this.sessionStartMs;
      this.sessionStartMs = now;
      this.dirty = true;
    }, 60_000);

    // --- Drawing stats: observe strokes/shapes ---
    let prevStrokeCount = this.strokeCountAtStart;
    let prevShapeCount = this.shapeCountAtStart;

    const onStrokesChanged = () => {
      const strokes = doc.getStrokes();
      const shapes = doc.getShapes();

      // Detect new strokes
      if (strokes.length > prevStrokeCount) {
        const added = strokes.length - prevStrokeCount;
        this.stats.totalStrokes += added;
        this.sessionStrokeCount += added;
        // Check for longest stroke among new ones
        for (let i = strokes.length - added; i < strokes.length; i++) {
          const stroke = strokes[i];
          const pts = stroke.points.length;
          if (pts > this.stats.longestStrokePoints) {
            this.stats.longestStrokePoints = pts;
          }
          // Record: longest single stroke
          this.checkRecord("longestSingleStroke", pts);
          // Record: widest brush used
          this.checkRecord("widestBrushUsed", stroke.width);
        }
        // Record: most strokes in one session
        this.checkRecord("mostStrokesInOneSession", this.sessionStrokeCount);
        this.dirty = true;
      }
      prevStrokeCount = strokes.length;

      // Detect new shapes
      if (shapes.length > prevShapeCount) {
        this.stats.totalShapes += shapes.length - prevShapeCount;
        this.dirty = true;
      }
      prevShapeCount = shapes.length;
    };
    doc.onStrokesChanged(onStrokesChanged);
    // Note: Yjs observeDeep doesn't return an unsubscribe — we rely on doc lifecycle

    // --- Undo/Redo tracking ---
    // Wrap the raw Y.UndoManager events to distinguish undo vs redo
    const rawUndoMgr = undoManager.getRawUndoManager();
    const onStackItemAdded = (event: { type: string }) => {
      if (event.type === "undo") {
        this.stats.totalUndos++;
      } else if (event.type === "redo") {
        this.stats.totalRedos++;
      }
      this.dirty = true;
    };
    rawUndoMgr.on("stack-item-added", onStackItemAdded);
    this.cleanupFns.push(() => rawUndoMgr.off("stack-item-added", onStackItemAdded));

    // --- Camera stats: zoom and pan ---
    // Initialize zoom records from current state
    if (camera.zoom > this.stats.maxZoomLevel) {
      this.stats.maxZoomLevel = camera.zoom;
    }
    if (this.stats.minZoomLevel === 0 || camera.zoom < this.stats.minZoomLevel) {
      this.stats.minZoomLevel = camera.zoom;
    }

    // Pan distance accumulator — flushed every 5 seconds
    this.panFlushTimerId = setInterval(() => {
      if (this.panAccumulator > 0) {
        this.stats.totalPanDistance += this.panAccumulator;
        this.panAccumulator = 0;
        this.dirty = true;
      }
    }, 5_000);

    // --- Collaboration stats ---
    if (syncManager) {
      const unsubConnection = syncManager.onConnectionStateChange((state) => {
        if (state === "connected") {
          this.stats.totalCollabSessions++;
          this.dirty = true;
        }
      });
      this.cleanupFns.push(unsubConnection);
    }

    // --- Badge engine ---
    this.badgeEngine = new BadgeEngine(BADGE_CATALOG);
    this.badgeState = loadBadgeState();
    // Evaluate immediately to catch badges earned in previous sessions
    this.evaluateBadges();

    // --- Canvas records ---
    this.records = loadRecords();

    // --- Debounced persistence: save every 30s while dirty ---
    this.saveTimerId = setInterval(() => {
      if (this.dirty) {
        saveStats(this.stats);
        this.dirty = false;
        this.evaluateBadges();
      }
      if (this.recordsDirty) {
        // Check session-scoped records before saving
        const elapsed = Date.now() - this.sessionStartMs;
        this.checkRecord("longestSession", this.stats.totalSessionDurationMs + elapsed);
        this.checkRecord("longestPanInOneSession", this.sessionPanDistance);
        saveRecords(this.records);
        this.recordsDirty = false;
      }
    }, 30_000);

    // --- beforeunload: flush final state ---
    this.beforeUnloadHandler = () => {
      this.flushSessionDuration();
      saveStats(this.stats);
      this.checkRecord("longestPanInOneSession", this.sessionPanDistance);
      saveRecords(this.records);
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  /** Call from the render loop to sample camera state for zoom/pan tracking. */
  updateCamera(camera: Camera): void {
    // Zoom records
    if (camera.zoom > this.stats.maxZoomLevel) {
      this.stats.maxZoomLevel = camera.zoom;
      this.dirty = true;
    }
    if (this.stats.minZoomLevel === 0 || camera.zoom < this.stats.minZoomLevel) {
      this.stats.minZoomLevel = camera.zoom;
      this.dirty = true;
    }

    // Canvas records: deepest and widest zoom
    this.checkRecord("deepestZoom", camera.zoom);
    this.checkRecord("widestZoom", 1 / camera.zoom);

    // Pan distance (world-space delta)
    const dx = camera.x - this.lastCameraX;
    const dy = camera.y - this.lastCameraY;
    if (dx !== 0 || dy !== 0) {
      const delta = Math.sqrt(dx * dx + dy * dy);
      this.panAccumulator += delta;
      this.sessionPanDistance += delta;
      this.lastCameraX = camera.x;
      this.lastCameraY = camera.y;
    }
  }

  /** Increment erase action count. Call when eraser completes an action. */
  recordEraseAction(): void {
    this.stats.totalEraseActions++;
    this.dirty = true;
  }

  /** Record a PNG export. */
  recordExport(): void {
    this.stats.totalExports++;
    this.dirty = true;
  }

  /** Record a bookmark creation. */
  recordBookmarkCreated(): void {
    this.stats.bookmarksCreated++;
    this.dirty = true;
  }

  /** Record tool usage (e.g. "pen", "marker", "eraser", "rectangle"). */
  recordToolUsage(tool: string): void {
    this.stats.toolUsage[tool] = (this.stats.toolUsage[tool] ?? 0) + 1;
    this.dirty = true;
  }

  /**
   * Record turtle execution results. Call after TurtleExecutor.run() completes.
   * @param result - The execution result
   * @param script - The script source code
   * @param commands - The collected turtle commands from the run
   * @param spawnedCount - Number of turtles spawned during the run
   */
  recordTurtleRun(
    result: ExecutionResult,
    script: string,
    commands: TurtleCommand[],
    spawnedCount: number,
    executionTimeMs?: number,
    maxSpawnDepth?: number,
  ): void {
    if (result.success) {
      this.stats.totalTurtleRuns++;
      this.stats.consecutiveCleanRuns++;
    } else {
      this.stats.totalTurtleErrors++;
      this.stats.consecutiveCleanRuns = 0;
    }

    // Track longest script
    if (script.length > this.stats.longestTurtleScript) {
      this.stats.longestTurtleScript = script.length;
    }

    // Track spawned turtles
    this.stats.totalTurtlesSpawned += spawnedCount;

    // Track max turtles in single run
    if (spawnedCount > this.stats.mostTurtlesInSingleRun) {
      this.stats.mostTurtlesInSingleRun = spawnedCount;
    }

    // Track max spawn depth
    if (maxSpawnDepth !== undefined && maxSpawnDepth > this.stats.maxSpawnDepth) {
      this.stats.maxSpawnDepth = maxSpawnDepth;
    }

    // Accumulate forward distance and turns from commands
    let runForwardDistance = 0;
    let runTurns = 0;
    const uniqueColors = new Set<string>();
    const apiCategories = new Set<string>();

    for (const cmd of commands) {
      if (cmd.type === "forward" || cmd.type === "backward") {
        const dist = Math.abs(cmd.distance);
        this.stats.totalTurtleForwardDistance += dist;
        runForwardDistance += dist;
        apiCategories.add("movement");
      } else if (cmd.type === "right" || cmd.type === "left") {
        this.stats.totalTurtleTurns++;
        runTurns++;
        apiCategories.add("movement");
      } else if (cmd.type === "pencolor") {
        uniqueColors.add(cmd.color);
        apiCategories.add("pen");
      } else if (cmd.type === "spawn") {
        apiCategories.add("spawn");
      } else if (cmd.type === "penwidth" || cmd.type === "penopacity" || cmd.type === "penup" || cmd.type === "pendown" || cmd.type === "penmode" || cmd.type === "penpreset") {
        apiCategories.add("pen");
      } else if (cmd.type === "rectangle" || cmd.type === "ellipse" || cmd.type === "polygon" || cmd.type === "star") {
        apiCategories.add("shapes");
      } else if (cmd.type === "goto" || cmd.type === "home") {
        apiCategories.add("movement");
      } else if (cmd.type === "fillcolor") {
        apiCategories.add("pen");
      }
    }

    // Track unique pen colors (cumulative max)
    if (uniqueColors.size > this.stats.uniquePenColors) {
      this.stats.uniquePenColors = uniqueColors.size;
    }

    // Track turtle API breadth (max distinct categories in a single run)
    if (apiCategories.size > this.stats.turtleApiBreadth) {
      this.stats.turtleApiBreadth = apiCategories.size;
    }

    // Track execution time stats
    if (executionTimeMs !== undefined) {
      if (executionTimeMs > this.stats.longestTurtleRuntimeMs) {
        this.stats.longestTurtleRuntimeMs = executionTimeMs;
      }
      if (result.success && commands.length > 100) {
        if (this.stats.fastestTurtleCompletionMs === 0 || executionTimeMs < this.stats.fastestTurtleCompletionMs) {
          this.stats.fastestTurtleCompletionMs = executionTimeMs;
        }
      }
    }

    // Canvas records for turtle runs
    const ctx = script.slice(0, 50);
    this.checkRecord("mostTurtlesInOneRun", spawnedCount, ctx);
    this.checkRecord("longestTurtleDistance", runForwardDistance, ctx);
    this.checkRecord("mostTurtleTurns", runTurns, ctx);
    if (executionTimeMs !== undefined) {
      this.checkRecord("longestTurtleRuntime", executionTimeMs, ctx);
      if (result.success && commands.length > 100) {
        this.checkRecord("fastestTurtleCompletion", executionTimeMs, ctx);
      }
    }

    this.dirty = true;
  }

  /** Record an exchange script import. */
  recordExchangeScriptImported(): void {
    this.stats.exchangeScriptsImported++;
    this.dirty = true;
  }

  /** Record a collaboration room creation. */
  recordCollabRoomCreated(): void {
    this.stats.totalCollabRoomsCreated++;
    this.dirty = true;
  }

  /** Record a script shared to a collaboration room. */
  recordScriptSharedToRoom(): void {
    this.stats.scriptsSharedToRoom++;
    this.dirty = true;
  }

  /** Record concurrent collaborator count (call when awareness updates). */
  recordCollaboratorCount(count: number): void {
    this.checkRecord("mostConcurrentCollaborators", count);
  }

  /** Get the current stats snapshot (read-only intent). */
  getStats(): UserStats {
    return this.stats;
  }

  /** Get the current records snapshot (read-only intent). */
  getRecords(): CanvasRecords {
    return this.records;
  }

  /**
   * Check a record and fire a custom event if a new personal best is set.
   */
  private checkRecord(key: keyof CanvasRecords, value: number, context?: string): void {
    const oldValue = this.records[key].value;
    if (updateRecord(this.records, key, value, context)) {
      this.recordsDirty = true;
      window.dispatchEvent(
        new CustomEvent("drawfinity:record-broken", {
          detail: { key, newValue: value, oldValue },
        }),
      );
    }
  }

  /** Run badge evaluation and fire events for newly earned badges. */
  private evaluateBadges(): void {
    const unlocked = this.badgeEngine.evaluate(this.stats, this.badgeState);
    if (unlocked.length > 0) {
      for (const event of unlocked) {
        this.badgeState.earned.push({
          id: event.badge.id,
          earnedAt: event.earnedAt,
        });
      }
      this.badgeState.lastCheckedAt = Date.now();
      saveBadgeState(this.badgeState);
      window.dispatchEvent(
        new CustomEvent("drawfinity:badge-unlocked", { detail: unlocked }),
      );
    }
  }

  /** Flush accumulated session duration to stats. */
  private flushSessionDuration(): void {
    const now = Date.now();
    this.stats.totalSessionDurationMs += now - this.sessionStartMs;
    this.sessionStartMs = now;
    // Flush any remaining pan distance
    if (this.panAccumulator > 0) {
      this.stats.totalPanDistance += this.panAccumulator;
      this.panAccumulator = 0;
    }
    this.dirty = true;
  }

  /** Unsubscribe all listeners, save final state, and release timers. */
  destroy(): void {
    // Flush timers
    if (this.saveTimerId !== null) {
      clearInterval(this.saveTimerId);
      this.saveTimerId = null;
    }
    if (this.sessionTimerId !== null) {
      clearInterval(this.sessionTimerId);
      this.sessionTimerId = null;
    }
    if (this.panFlushTimerId !== null) {
      clearInterval(this.panFlushTimerId);
      this.panFlushTimerId = null;
    }

    // Unsubscribe listeners
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];

    window.removeEventListener("beforeunload", this.beforeUnloadHandler);

    // Final save
    this.flushSessionDuration();
    saveStats(this.stats);
    this.checkRecord("longestPanInOneSession", this.sessionPanDistance);
    saveRecords(this.records);
    this.dirty = false;
    this.recordsDirty = false;
  }
}
