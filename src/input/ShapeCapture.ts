import { Camera } from "../camera";
import { CameraController } from "../camera";
import { Shape, ShapeType, generateShapeId } from "../model/Shape";

/**
 * Minimal document interface for shape persistence.
 *
 * Implemented by {@link DrawfinityDoc} — this subset decouples
 * ShapeCapture from the full CRDT document so it can be tested
 * or used with any backing store that accepts shapes.
 */
export interface ShapeDocumentModel {
  /** Persist a finalized shape to the document. */
  addShape(shape: Shape): void;
}

/**
 * Configuration for the active shape drawing tool.
 *
 * Controls which shape type is drawn and the visual properties applied
 * to newly created shapes. Updated by the toolbar whenever the user
 * changes shape settings.
 */
export interface ShapeToolConfig {
  /** The geometric primitive to draw (e.g. `"rectangle"`, `"star"`). */
  shapeType: ShapeType;
  /** CSS color string for the shape outline. */
  strokeColor: string;
  /** Outline width in world-space units (scaled by zoom at creation time). */
  strokeWidth: number;
  /** CSS color string for the shape fill, or `null` for no fill. */
  fillColor: string | null;
  /** Shape opacity from 0 (transparent) to 1 (opaque). */
  opacity: number;
  /** Number of sides for polygon shapes, or number of points for star shapes. */
  sides: number;
  /** Inner-to-outer radius ratio for star shapes (0–1). Ignored for non-star types. */
  starInnerRadius: number;
}

const DEFAULT_CONFIG: ShapeToolConfig = {
  shapeType: "rectangle",
  strokeColor: "#000000",
  strokeWidth: 2,
  fillColor: null,
  opacity: 1.0,
  sides: 5,
  starInnerRadius: 0.4,
};

/**
 * Captures pointer-drag gestures on the canvas and converts them into
 * {@link Shape} objects that are committed to the document.
 *
 * Listens for `pointerdown` / `pointermove` / `pointerup` events on
 * the provided canvas element. While a drag is in progress, call
 * {@link getPreviewShape} each frame to render a live shape outline.
 * On pointer-up the finalized shape (if non-zero size) is added to
 * the document via {@link ShapeDocumentModel.addShape}.
 *
 * Modifier keys alter the drag behavior:
 * - **Shift** — constrains width and height to be equal (square / circle).
 * - **Alt** — draws from center-out instead of corner-to-corner.
 *
 * Enable or disable capture with {@link setEnabled}; when disabled,
 * pointer events are ignored so brush/eraser tools can operate.
 *
 * @param camera - Read-only camera used to convert screen → world coordinates.
 * @param cameraController - Checked to avoid capturing during a pan gesture.
 * @param document - Target document that receives finalized shapes.
 * @param canvas - The `<canvas>` element to attach pointer listeners to.
 */
export class ShapeCapture {
  private camera: Camera;
  private cameraController: CameraController;
  private document: ShapeDocumentModel;
  private canvas: HTMLCanvasElement;

  private config: ShapeToolConfig = { ...DEFAULT_CONFIG };
  private active = false;
  private enabled = false;

  /** Start point in world coordinates */
  private startX = 0;
  private startY = 0;
  /** Current drag point in world coordinates */
  private currentX = 0;
  private currentY = 0;
  /** Modifier keys held during drag */
  private shiftHeld = false;
  private altHeld = false;
  /** Zoom level captured at pointerdown — used for consistent strokeWidth scaling. */
  private capturedZoom = 1;

  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;

  constructor(
    camera: Camera,
    cameraController: CameraController,
    document: ShapeDocumentModel,
    canvas: HTMLCanvasElement,
  ) {
    this.camera = camera;
    this.cameraController = cameraController;
    this.document = document;
    this.canvas = canvas;

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  /** Enable/disable shape capture (controlled by active tool type). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.active) {
      this.active = false;
    }
  }

  /** Returns `true` if shape capture is currently accepting pointer events. */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Merges the given partial configuration into the active shape config.
   *
   * Only the supplied fields are overwritten; omitted fields retain their
   * current values. Call this when the user changes shape tool settings
   * (e.g. switching shape type, changing fill color).
   *
   * @param config - Partial config whose defined fields override the current settings.
   */
  setConfig(config: Partial<ShapeToolConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Returns a shallow copy of the current shape tool configuration.
   *
   * The returned object is a snapshot — mutating it does not affect
   * the internal state. Use {@link setConfig} to apply changes.
   */
  getConfig(): ShapeToolConfig {
    return { ...this.config };
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.button !== 0 || e.ctrlKey) return;
    if (this.cameraController.panning) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    this.startX = world.x;
    this.startY = world.y;
    this.currentX = world.x;
    this.currentY = world.y;
    this.shiftHeld = e.shiftKey;
    this.altHeld = e.altKey;
    this.capturedZoom = this.camera.zoom;
    this.active = true;
    this.canvas.setPointerCapture(e.pointerId);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.active) return;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    this.currentX = world.x;
    this.currentY = world.y;
    this.shiftHeld = e.shiftKey;
    this.altHeld = e.altKey;
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.active) return;
    this.active = false;

    const world = this.camera.screenToWorld(e.clientX, e.clientY);
    this.currentX = world.x;
    this.currentY = world.y;
    this.shiftHeld = e.shiftKey;
    this.altHeld = e.altKey;

    const preview = this.computeShape();
    // Only finalize if the shape has non-zero dimensions
    if (preview && preview.width > 0 && preview.height > 0) {
      this.document.addShape(preview);
    }

    this.canvas.releasePointerCapture(e.pointerId);
  }

  /**
   * Compute shape dimensions from the drag extent.
   * - Default mode: start point is one corner, current point is opposite corner.
   * - Alt held: start point is center, drag defines half-size.
   * - Shift held: constrain to equal width/height (square, circle).
   */
  private computeShape(): Shape | null {
    let dx = this.currentX - this.startX;
    let dy = this.currentY - this.startY;

    // Constrain proportions when Shift is held
    if (this.shiftHeld) {
      const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
      dx = maxDim * Math.sign(dx || 1);
      dy = maxDim * Math.sign(dy || 1);
    }

    let cx: number, cy: number, w: number, h: number;

    if (this.altHeld) {
      // Center-out mode: start point is center
      cx = this.startX;
      cy = this.startY;
      w = Math.abs(dx) * 2;
      h = Math.abs(dy) * 2;
    } else {
      // Corner mode: start and current are opposite corners
      cx = this.startX + dx / 2;
      cy = this.startY + dy / 2;
      w = Math.abs(dx);
      h = Math.abs(dy);
    }

    return {
      id: generateShapeId(),
      type: this.config.shapeType,
      x: cx,
      y: cy,
      width: w,
      height: h,
      rotation: 0,
      strokeColor: this.config.strokeColor,
      strokeWidth: this.config.strokeWidth / this.capturedZoom,
      fillColor: this.config.fillColor,
      opacity: this.config.opacity,
      sides: this.config.sides,
      starInnerRadius: this.config.starInnerRadius,
      timestamp: Date.now(),
    };
  }

  /**
   * Returns the in-progress shape preview for live rendering, or null if not dragging.
   */
  getPreviewShape(): Shape | null {
    if (!this.active) return null;
    return this.computeShape();
  }

  /**
   * Removes all pointer event listeners from the canvas.
   *
   * Call when the ShapeCapture instance is no longer needed (e.g. when
   * leaving the drawing canvas) to prevent memory leaks.
   */
  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
