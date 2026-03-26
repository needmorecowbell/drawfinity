import type { TurtleCommand, TurtleStateQuery } from "./LuaRuntime";

/** Pen state for the turtle. */
export interface PenState {
  down: boolean;
  color: string;
  width: number;
  opacity: number;
}

/** Snapshot of full turtle state. */
export interface TurtleSnapshot {
  x: number;
  y: number;
  angle: number;
  pen: PenState;
  speed: number;
}

/**
 * Manages the turtle's mutable state: position, heading, pen properties,
 * and speed. Processes TurtleCommands and tracks position changes so callers
 * can create strokes from the resulting movement segments.
 */
export class TurtleState implements TurtleStateQuery {
  /** Logical X coordinate (unscaled). */
  x = 0;
  /** Logical Y coordinate (unscaled). */
  y = 0;
  /** Heading in degrees. 0 = up, clockwise positive. */
  angle = 0;
  /** Pen state (down/color/width/opacity). */
  pen: PenState = {
    down: true,
    color: "#000000",
    width: 3,
    opacity: 1.0,
  };
  /** Animation speed: 0 = instant, 1 = slow, 10 = fast. */
  speed = 5;
  /**
   * Zoom scale factor applied to movement distances and pen width.
   * Set to `1 / cameraZoom` at execution time so turtle output matches
   * the user's visible scale. Forced to `1` when `worldSpace` is true.
   */
  zoomScale = 1;

  /**
   * When true, zoom scaling is disabled — all distances and pen widths
   * use raw world units. Set via `set_world_space(true)` in Lua.
   */
  worldSpace = false;

  /** Whether the turtle indicator is visible. Toggled by hide()/show(). */
  visible = true;

  /** Pen mode: "draw" creates strokes, "erase" removes strokes under the path. */
  penMode: "draw" | "erase" = "draw";

  /** When true and penMode is "erase", only turtle-drawn strokes are erased. */
  eraseTurtleOnly = false;

  /** Origin coordinates used for `home()`. Defaults to (0, 0). */
  private originX = 0;
  private originY = 0;

  /** Set the origin that `home()` returns to (e.g. camera center). */
  setOrigin(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  /** Get the origin coordinates. */
  getOrigin(): { x: number; y: number } {
    return { x: this.originX, y: this.originY };
  }

  /**
   * Enable or disable world-space mode.
   * When enabled, `zoomScale` is forced to `1` so all distances use raw world units.
   *
   * **Note:** changing this while the pen is down and the turtle is not at the
   * origin will cause a visual discontinuity, because the world-space rendering
   * of the current logical position changes. Call this before any drawing commands
   * or after a `penup()`.
   */
  setWorldSpace(enabled: boolean): void {
    this.worldSpace = enabled;
  }

  /**
   * Returns the effective zoom scale: 1 if worldSpace, otherwise zoomScale
   * clamped to [1e-3, 1e3] to avoid floating-point precision issues at
   * extreme zoom levels (WebGL uses 32-bit floats for vertex data).
   */
  private effectiveZoomScale(): number {
    if (this.worldSpace) return 1;
    return Math.max(1e-3, Math.min(1e3, this.zoomScale));
  }

  /** Reset state to initial values. */
  reset(): void {
    this.x = this.originX;
    this.y = this.originY;
    this.angle = 0;
    this.pen = { down: true, color: "#000000", width: 3, opacity: 1.0 };
    this.speed = 5;
    this.penMode = "draw";
    this.eraseTurtleOnly = false;
    this.worldSpace = false;
    this.zoomScale = 1;
    this.visible = true;
  }

  /**
   * Apply a single TurtleCommand, returning the movement segment if the
   * turtle moved with the pen down.
   *
   * @returns A segment `{fromX, fromY, toX, toY, pen}` if the turtle moved
   *          with the pen down, or `null` otherwise.
   */
  applyCommand(cmd: TurtleCommand): MovementSegment | null {
    switch (cmd.type) {
      case "forward":
        return this.moveForward(cmd.distance);
      case "backward":
        return this.moveForward(-cmd.distance);
      case "right":
        this.angle = (this.angle + cmd.angle) % 360;
        if (this.angle < 0) this.angle += 360;
        return null;
      case "left":
        this.angle = (this.angle - cmd.angle) % 360;
        if (this.angle < 0) this.angle += 360;
        return null;
      case "goto":
        return this.moveTo(cmd.x, cmd.y);
      case "home": {
        const seg = this.moveTo(this.originX, this.originY);
        this.penMode = "draw";
        this.eraseTurtleOnly = false;
        return seg;
      }
      case "penup":
        this.pen.down = false;
        return null;
      case "pendown":
        this.pen.down = true;
        return null;
      case "pencolor":
        this.pen.color = cmd.color;
        return null;
      case "penwidth":
        this.pen.width = cmd.width;
        return null;
      case "penopacity":
        this.pen.opacity = cmd.opacity;
        return null;
      case "speed":
        this.speed = cmd.value;
        return null;
      case "penmode":
        this.penMode = cmd.mode;
        this.eraseTurtleOnly = cmd.turtleOnly;
        return null;
      case "set_world_space":
        this.setWorldSpace(cmd.enabled);
        return null;
      case "clear":
      case "sleep":
      case "print":
      case "spawn":
      case "kill":
      case "killall":
      case "hide":
        this.visible = false;
        return null;
      case "show":
        this.visible = true;
        return null;
    }
  }

  // -- TurtleStateQuery interface --

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** Returns the turtle's position in world-space (scaled for rendering). */
  getWorldPosition(): { x: number; y: number } {
    return {
      x: this.toWorld(this.x, this.originX),
      y: this.toWorld(this.y, this.originY),
    };
  }

  getHeading(): number {
    return this.angle;
  }

  isDown(): boolean {
    return this.pen.down;
  }

  // -- Snapshot --

  snapshot(): TurtleSnapshot {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      pen: { ...this.pen },
      speed: this.speed,
    };
  }

  // -- Internal movement helpers --

  /**
   * Convert a logical coordinate to world-space by scaling the offset
   * from the origin. At zoomScale=1 this is a no-op.
   */
  private toWorld(logical: number, origin: number): number {
    return origin + (logical - origin) * this.effectiveZoomScale();
  }

  private moveForward(distance: number): MovementSegment | null {
    const fromX = this.x;
    const fromY = this.y;
    // Heading 0 = up (negative Y in screen coords), clockwise positive
    const rad = (this.angle * Math.PI) / 180;
    // Store logical (unscaled) position
    this.x += distance * Math.sin(rad);
    this.y -= distance * Math.cos(rad);
    if (this.pen.down) {
      const scale = this.effectiveZoomScale();
      return {
        fromX: this.toWorld(fromX, this.originX),
        fromY: this.toWorld(fromY, this.originY),
        toX: this.toWorld(this.x, this.originX),
        toY: this.toWorld(this.y, this.originY),
        pen: { ...this.pen, width: this.pen.width * scale },
      };
    }
    return null;
  }

  private moveTo(x: number, y: number): MovementSegment | null {
    const fromX = this.x;
    const fromY = this.y;
    // Store logical (unscaled) position
    this.x = x;
    this.y = y;
    if (this.pen.down) {
      const scale = this.effectiveZoomScale();
      return {
        fromX: this.toWorld(fromX, this.originX),
        fromY: this.toWorld(fromY, this.originY),
        toX: this.toWorld(this.x, this.originX),
        toY: this.toWorld(this.y, this.originY),
        pen: { ...this.pen, width: this.pen.width * scale },
      };
    }
    return null;
  }
}

/** A line segment produced by turtle movement with pen down. */
export interface MovementSegment {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  pen: PenState;
}
