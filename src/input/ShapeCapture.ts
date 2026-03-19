import { Camera } from "../camera";
import { CameraController } from "../camera";
import { Shape, ShapeType, generateShapeId } from "../model/Shape";

/** Interface for shape document operations (subset of DrawfinityDoc). */
export interface ShapeDocumentModel {
  addShape(shape: Shape): void;
}

export interface ShapeToolConfig {
  shapeType: ShapeType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  opacity: number;
  sides: number;
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

  isEnabled(): boolean {
    return this.enabled;
  }

  setConfig(config: Partial<ShapeToolConfig>): void {
    Object.assign(this.config, config);
  }

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
      strokeWidth: this.config.strokeWidth / this.camera.zoom,
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

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }
}
