import { Camera, CameraController } from "../camera";
import { pointInRegion, translateSelectionRegion } from "../model";
import type { SelectionBounds, SelectionPoint, SelectionRegion } from "../model";
import type { SelectionMode } from "../tools";

export type { SelectionBounds, SelectionPoint, SelectionRegion } from "../model";

/**
 * Captures pointer input for the selection tool and emits finalized selection regions.
 *
 * Rectangle and ellipse modes use click-drag-release gestures. Lasso mode adds a vertex
 * on each click, then finalizes when the user double-clicks or clicks near the first
 * vertex after at least three points.
 */
export class SelectionCapture {
  private camera: Camera;
  private cameraController: CameraController;
  private canvas: HTMLCanvasElement;

  private enabled = false;
  private mode: SelectionMode = "rectangle";
  private activeDrag = false;
  private start: SelectionPoint | null = null;
  private current: SelectionPoint | null = null;
  private shiftHeld = false;
  private lassoPoints: SelectionPoint[] = [];
  private lassoPreviewPoint: SelectionPoint | null = null;
  private activeRegion: SelectionRegion | null = null;
  private movingSelection = false;
  private lastMovePoint: SelectionPoint | null = null;

  private static readonly CLOSE_THRESHOLD_SCREEN_PX = 10;

  onSelectionComplete: ((region: SelectionRegion) => void) | null = null;
  onSelectionMoveStart: (() => void) | null = null;
  onSelectionMove: ((dx: number, dy: number) => void) | null = null;
  onSelectionMoveEnd: (() => void) | null = null;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  constructor(
    camera: Camera,
    cameraController: CameraController,
    canvas: HTMLCanvasElement,
  ) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.canvas = canvas;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.resetState();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setMode(mode: SelectionMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.resetState();
  }

  getMode(): SelectionMode {
    return this.mode;
  }

  getPreviewRegion(): SelectionRegion | null {
    if (this.mode === "lasso") {
      return this.computeLassoPreview();
    }
    if (!this.activeDrag) return null;
    return this.computeDragRegion();
  }

  setActiveRegion(region: SelectionRegion | null): void {
    this.activeRegion = region;
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.button !== 0 || e.ctrlKey) return;
    if (this.cameraController.panning) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);

    if (this.activeRegion && pointInRegion(world, this.activeRegion)) {
      this.movingSelection = true;
      this.lastMovePoint = world;
      this.onSelectionMoveStart?.();
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (this.mode === "lasso") {
      this.handleLassoPointerDown(world, e);
      return;
    }

    this.start = world;
    this.current = world;
    this.shiftHeld = e.shiftKey;
    this.activeDrag = true;
    this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.enabled) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);

    if (this.movingSelection && this.lastMovePoint) {
      const dx = world.x - this.lastMovePoint.x;
      const dy = world.y - this.lastMovePoint.y;
      this.lastMovePoint = world;
      if (dx !== 0 || dy !== 0) {
        this.activeRegion = this.activeRegion
          ? translateSelectionRegion(this.activeRegion, dx, dy)
          : null;
        this.onSelectionMove?.(dx, dy);
      }
      return;
    }

    if (this.mode === "lasso") {
      if (this.lassoPoints.length > 0) {
        this.lassoPreviewPoint = world;
      }
      return;
    }

    if (!this.activeDrag) return;
    this.current = world;
    this.shiftHeld = e.shiftKey;
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.movingSelection) {
      this.movingSelection = false;
      this.lastMovePoint = null;
      this.onSelectionMoveEnd?.();
      this.canvas.releasePointerCapture(e.pointerId);
      return;
    }

    if (!this.activeDrag) return;

    this.current = this.camera.screenToWorld(e.clientX, e.clientY);
    this.shiftHeld = e.shiftKey;
    this.activeDrag = false;

    const region = this.computeDragRegion();
    if (region && region.bounds.width > 0 && region.bounds.height > 0) {
      this.onSelectionComplete?.(region);
    }

    this.start = null;
    this.current = null;
    this.canvas.releasePointerCapture(e.pointerId);
  }

  private handleLassoPointerDown(point: SelectionPoint, e: PointerEvent): void {
    const closesPath = this.shouldCloseLasso(point);

    if (closesPath || e.detail >= 2) {
      const points = closesPath ? this.lassoPoints : [...this.lassoPoints, point];
      this.finalizeLasso(points);
      return;
    }

    this.lassoPoints.push(point);
    this.lassoPreviewPoint = point;
  }

  private shouldCloseLasso(point: SelectionPoint): boolean {
    if (this.lassoPoints.length < 3) return false;
    const first = this.lassoPoints[0];
    const dx = point.x - first.x;
    const dy = point.y - first.y;
    const threshold = SelectionCapture.CLOSE_THRESHOLD_SCREEN_PX / this.camera.zoom;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  private finalizeLasso(points: SelectionPoint[]): void {
    if (points.length >= 3) {
      this.onSelectionComplete?.({
        type: "lasso",
        bounds: computeBounds(points),
        points: points.map((p) => ({ ...p })),
      });
    }
    this.lassoPoints = [];
    this.lassoPreviewPoint = null;
  }

  private computeDragRegion(): SelectionRegion | null {
    if (!this.start || !this.current) return null;

    const bounds = computeDragBounds(this.start, this.current, this.shiftHeld);
    return {
      type: this.mode === "ellipse" ? "ellipse" : "rect",
      bounds,
    };
  }

  private computeLassoPreview(): SelectionRegion | null {
    if (this.lassoPoints.length === 0) return null;

    const points = this.lassoPreviewPoint
      ? [...this.lassoPoints, this.lassoPreviewPoint]
      : [...this.lassoPoints];

    return {
      type: "lasso",
      bounds: computeBounds(points),
      points: points.map((p) => ({ ...p })),
    };
  }

  private resetState(): void {
    this.activeDrag = false;
    this.movingSelection = false;
    this.start = null;
    this.current = null;
    this.lastMovePoint = null;
    this.lassoPoints = [];
    this.lassoPreviewPoint = null;
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}

function computeDragBounds(start: SelectionPoint, current: SelectionPoint, constrainSquare: boolean): SelectionBounds {
  let dx = current.x - start.x;
  let dy = current.y - start.y;

  if (constrainSquare) {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    dx = size * Math.sign(dx || 1);
    dy = size * Math.sign(dy || 1);
  }

  return {
    x: Math.min(start.x, start.x + dx),
    y: Math.min(start.y, start.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

function computeBounds(points: readonly SelectionPoint[]): SelectionBounds {
  let minX = points[0]?.x ?? 0;
  let minY = points[0]?.y ?? 0;
  let maxX = minX;
  let maxY = minY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
