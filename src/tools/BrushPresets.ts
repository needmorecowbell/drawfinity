import { BrushConfig } from "./Brush";

/** Pen: firm, consistent width, full opacity, low smoothing (technical drawing) */
export const PEN: BrushConfig = {
  name: "Pen",
  baseWidth: 2,
  pressureCurve: (_p: number) => 1.0,
  opacityCurve: (_p: number) => 1.0,
  color: "#000000",
  smoothing: 3,
};

/** Pencil: responsive to pressure, slightly transparent, medium smoothing (sketching) */
export const PENCIL: BrushConfig = {
  name: "Pencil",
  baseWidth: 1.5,
  pressureCurve: (p: number) => p,
  opacityCurve: (p: number) => 0.4 + 0.6 * p,
  color: "#333333",
  smoothing: 5,
};

/** Marker: wide, high opacity, low pressure sensitivity (bold strokes) */
export const MARKER: BrushConfig = {
  name: "Marker",
  baseWidth: 8,
  pressureCurve: (p: number) => 0.7 + 0.3 * p,
  opacityCurve: (_p: number) => 1.0,
  color: "#000000",
  smoothing: 3,
};

/** Highlighter: wide, very transparent, no pressure sensitivity (overlay marking) */
export const HIGHLIGHTER: BrushConfig = {
  name: "Highlighter",
  baseWidth: 16,
  pressureCurve: (_p: number) => 1.0,
  opacityCurve: (_p: number) => 0.3,
  color: "#FFFF00",
  smoothing: 3,
};

/**
 * Built-in brush preset configurations available for selection via keyboard shortcuts `1`–`4`.
 *
 * The four presets cover common drawing use-cases:
 * - **Pen** (`1`) — Firm, uniform strokes for technical drawing
 * - **Pencil** (`2`) — Pressure-responsive sketching with slight transparency
 * - **Marker** (`3`) — Wide, bold strokes with high opacity
 * - **Highlighter** (`4`) — Wide, transparent overlay for marking and annotation
 *
 * Each preset defines a complete {@link BrushConfig} including base width,
 * pressure/opacity response curves, default color, and smoothing level.
 */
export const BRUSH_PRESETS: readonly BrushConfig[] = [PEN, PENCIL, MARKER, HIGHLIGHTER];
