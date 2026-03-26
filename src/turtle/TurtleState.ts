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
  /** World-space X coordinate. */
  x = 0;
  /** World-space Y coordinate. */
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

  /** Origin coordinates used for `home()`. Defaults to (0, 0). */
  private originX = 0;
  private originY = 0;

  /** Set the origin that `home()` returns to (e.g. camera center). */
  setOrigin(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  /** Reset state to initial values. */
  reset(): void {
    this.x = this.originX;
    this.y = this.originY;
    this.angle = 0;
    this.pen = { down: true, color: "#000000", width: 3, opacity: 1.0 };
    this.speed = 5;
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
      case "home":
        return this.moveTo(this.originX, this.originY);
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
      case "clear":
      case "sleep":
      case "print":
        return null;
    }
  }

  // -- TurtleStateQuery interface --

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
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

  private moveForward(distance: number): MovementSegment | null {
    const fromX = this.x;
    const fromY = this.y;
    // Heading 0 = up (negative Y in screen coords), clockwise positive
    const rad = (this.angle * Math.PI) / 180;
    this.x += distance * Math.sin(rad);
    this.y -= distance * Math.cos(rad);
    if (this.pen.down) {
      return {
        fromX,
        fromY,
        toX: this.x,
        toY: this.y,
        pen: { ...this.pen },
      };
    }
    return null;
  }

  private moveTo(x: number, y: number): MovementSegment | null {
    const fromX = this.x;
    const fromY = this.y;
    this.x = x;
    this.y = y;
    if (this.pen.down) {
      return {
        fromX,
        fromY,
        toX: this.x,
        toY: this.y,
        pen: { ...this.pen },
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
