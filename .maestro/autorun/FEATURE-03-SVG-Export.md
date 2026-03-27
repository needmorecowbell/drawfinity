# Feature 03: Full-Resolution SVG Export

Add SVG export alongside the existing PNG export, producing resolution-independent vector output that preserves all strokes and shapes at any zoom level.

## Context

Drawfinity is an infinite canvas drawing app with a **WebGL2** rendering pipeline. Canvas items are **strokes** (polylines with pressure-varying width) and **shapes** (rectangle, ellipse, polygon, star with optional fill).

The existing export system lives in `src/ui/ExportRenderer.ts`. It creates an offscreen WebGL2 canvas, re-renders all visible geometry, and downloads the result as a PNG via `src/ui/ExportDialog.ts`. Export options include scope (`"viewport"` or `"fitAll"`), scale (1x/2x/4x), and background toggle. The export dialog is triggered by `Ctrl+Shift+E`.

Strokes are defined in `src/model/Stroke.ts` — each has an array of `StrokePoint` (`x, y, pressure`), a `color`, `width`, and optional `opacity`. The triangle strip geometry in `StrokeMesh.ts` offsets points along segment normals by `width * pressure / 2` to create filled quads — this is the visual width the user sees.

Shapes are defined in `src/model/Shape.ts` — each has a `type`, center position, dimensions, rotation, stroke/fill colors, and type-specific params (sides, starInnerRadius).

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

## Feature Description

SVG export traverses the document model and emits standard SVG elements rather than rasterizing through WebGL. The output is a single `.svg` file that can be opened in any vector editor (Inkscape, Illustrator, Figma) or browser at any resolution.

### Stroke → SVG Path

Each stroke becomes an SVG `<path>` element. Since strokes have **pressure-varying width**, there are two approaches:

**Option A (recommended): Outline path.** Use the same normal-offset logic from `StrokeMesh.ts` to compute the left and right edges of the stroke, then emit them as a single closed `<path>` with `fill` set to the stroke color. This exactly matches the WebGL rendering.

**Option B: Averaged width.** Emit a simple `<path d="M x y L x y ...">` with `stroke-width` set to the average width. Simpler but loses pressure variation.

### Shape → SVG Element

- **Rectangle** → `<rect>` with `transform="rotate(...)"`
- **Ellipse** → `<ellipse>` with `transform="rotate(...)"`
- **Polygon/Star** → `<polygon points="...">` with computed vertices and `transform="rotate(...)"`

All shapes carry `stroke`, `stroke-width`, `fill`, and `opacity` attributes.

### Export Options

The SVG export should use the same `ExportDialog.ts` UI, adding a format toggle (PNG / SVG). Scope (`viewport` / `fitAll`) and background options apply to SVG as well. Scale is not applicable (vector output).

## Tasks

- [x] Create `src/ui/SVGExporter.ts`:
  - `exportSVG(doc: DrawfinityDoc, options: ExportOptions): string` — returns SVG markup as a string
  - Compute the content bounding box (reuse `computeContentBounds()` from `ExportRenderer.ts`)
  - Set SVG `viewBox` to the content bounds (for `fitAll`) or camera viewport (for `viewport`)
  - Set SVG dimensions to match the viewBox aspect ratio at a reasonable default (e.g., 1920px wide)
  - Optionally include a background `<rect>` filling the viewBox

- [x] Implement stroke-to-SVG conversion:
  - Port the normal-offset logic from `generateTriangleStrip()` in `StrokeMesh.ts` to compute left/right edge polylines
  - For each stroke: compute left edge points and right edge points, then emit a closed `<path>`:
    `M left[0] L left[1] ... L left[n] L right[n] L right[n-1] ... L right[0] Z`
  - Set `fill` to stroke color with alpha from `opacity`
  - Apply the same pressure-based width scaling: `width * pressure` per point
  - Handle single-point strokes: emit a small `<circle>` at the point

- [x] Implement shape-to-SVG conversion:
  - Rectangle: `<rect x y width height>` with `transform="rotate(deg, cx, cy)"`
  - Ellipse: `<ellipse cx cy rx ry>` with rotation transform
  - Polygon: compute perimeter points (same logic as `ShapeMesh.ts`), emit `<polygon>`
  - Star: compute inner/outer vertex ring, emit `<polygon>`
  - Apply `stroke`, `stroke-width`, `fill`, `opacity` attributes

- [ ] Integrate with ExportDialog:
  - Add a format selector (PNG / SVG) to `ExportDialog.ts`
  - When SVG is selected, hide the scale option (not applicable)
  - On export: call `exportSVG()`, create a Blob, trigger download as `.svg`
  - Reuse the same `Ctrl+Shift+E` shortcut — the dialog now offers format choice

- [ ] Ensure correct draw ordering:
  - Emit SVG elements in document timestamp order (same order as rendering)
  - Later items appear later in the SVG DOM → render on top (SVG painter's model)

- [ ] Tests:
  - Test: SVG output for a single straight stroke (2 points) produces a valid closed path
  - Test: SVG output for a pressure-varying stroke has varying width in the outline
  - Test: each shape type produces the correct SVG element with rotation
  - Test: viewBox matches content bounds for `fitAll` mode
  - Test: document order is preserved in SVG element order
  - Test: single-point stroke produces a circle element
  - All existing tests must still pass: `npx vitest run`
