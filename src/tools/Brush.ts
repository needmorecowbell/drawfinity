/**
 * Configuration for a drawing brush, defining its visual behavior and
 * response to stylus pressure.
 *
 * Pressure and opacity curves are applied during stroke capture (not rendering),
 * mapping normalized pen pressure to width and opacity multipliers. The four
 * built-in presets (Pen, Pencil, Marker, Highlighter) demonstrate typical curve
 * configurations — see {@link BRUSH_PRESETS}.
 *
 * @example
 * ```ts
 * // A soft airbrush that fades with light pressure
 * const airbrush: BrushConfig = {
 *   name: "Airbrush",
 *   baseWidth: 12,
 *   pressureCurve: (p) => 0.3 + 0.7 * p,   // min 30% width
 *   opacityCurve: (p) => p * p,              // quadratic fade-in
 *   color: "#4488FF",
 *   smoothing: 8,
 * };
 * ```
 */
export interface BrushConfig {
  /** Human-readable name shown in the toolbar (e.g. "Pen", "Pencil"). */
  name: string;

  /**
   * Base stroke width in world-space pixels before pressure scaling.
   * The final rendered width is `baseWidth * pressureCurve(pressure)`.
   */
  baseWidth: number;

  /**
   * Maps normalized pen pressure (0–1) to a width multiplier (0–1).
   * Called per-point during stroke capture. A constant `() => 1` ignores
   * pressure; a linear `(p) => p` makes width directly proportional.
   *
   * @param p - Normalized pen pressure in the range [0, 1]
   * @returns Width multiplier applied to {@link baseWidth}
   */
  pressureCurve: (p: number) => number;

  /**
   * Maps normalized pen pressure (0–1) to a stroke opacity multiplier (0–1).
   * Called once when the stroke is finalized. Combined with any user-set
   * opacity slider value to produce the stored {@link Stroke.opacity}.
   *
   * @param p - Normalized pen pressure in the range [0, 1]
   * @returns Opacity multiplier in [0, 1]
   */
  opacityCurve: (p: number) => number;

  /** Default CSS color string (hex, rgb, or named) applied to new strokes. */
  color: string;

  /**
   * Moving-average window size for stroke smoothing. Higher values produce
   * smoother curves but add latency. Typical range: 3 (crisp) to 8+ (fluid).
   */
  smoothing: number;
}
