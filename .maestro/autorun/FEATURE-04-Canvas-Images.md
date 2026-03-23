# Feature 04: Image Upload to Canvas

Allow users to upload images (PNG, JPG, WebP) and place them on the infinite canvas as first-class canvas items that participate in rendering, persistence, and collaboration.

## Context

Drawfinity is an infinite canvas drawing app with a **WebGL2** rendering pipeline and **Yjs CRDT** data layer. Currently, the canvas supports two item types: **strokes** (`src/model/Stroke.ts`) and **shapes** (`src/model/Shape.ts`). Both are vector data — there is no raster/bitmap support yet.

The rendering pipeline (`src/renderer/Renderer.ts`) uses a single shader program with vertex format `[x, y, r, g, b, a]`. Images will require **texture sampling**, which means a second shader program (or extending the existing one) and WebGL texture management.

Canvas items are stored in a Yjs `Y.Array<Y.Map>` in `src/crdt/DrawfinityDoc.ts`. Each item is serialized via adapters (`StrokeAdapter.ts`, `ShapeAdapter.ts`). Images will need a new adapter and a strategy for storing binary image data in the CRDT document.

The spatial index (`src/renderer/SpatialIndex.ts`) and export system (`src/ui/ExportRenderer.ts`) will both need to handle the new item type.

**Run tests with:** `npx vitest run`
**Type-check with:** `npx tsc --noEmit`

## Design Considerations

This feature has several architectural decisions that need careful thought. The tasks below represent a recommended approach, but alternative designs are welcome if well-justified.

### Image Data Storage

**Option A (recommended): Inline base64 in CRDT.** Store image data as a base64 string inside the Yjs map. Simple, works for collaboration out of the box (Yjs syncs it automatically). Downside: large images bloat the CRDT state and sync traffic. Mitigate with a **max image size limit** (e.g., 2MB after encoding) and optional client-side resize before storage.

**Option B: External blob store.** Store images in IndexedDB (or Tauri filesystem) and only put a reference (hash or ID) in the CRDT. More efficient but requires a separate sync mechanism for image blobs — the collaboration server would need a blob upload/download endpoint. Significantly more complex.

### Rendering Approach

Images are textured quads — two triangles forming a rectangle. This requires:
- A **texture shader** with a `sampler2D` uniform (separate from the color-only stroke shader)
- A `WebGLTexture` per image, uploaded once and cached
- Rendering in document timestamp order (interleaved with strokes/shapes)

## Tasks

- [ ] Define the Image data model in `src/model/Image.ts`:
  ```ts
  interface CanvasImage {
    id: string;              // "image-{timestamp}-{counter}"
    src: string;             // base64 data URI ("data:image/png;base64,...")
    x: number; y: number;    // Center position in world coordinates
    width: number;           // World-space width
    height: number;          // World-space height (maintains aspect ratio)
    rotation: number;        // Radians
    opacity: number;         // 0–1
    timestamp: number;       // For z-ordering
  }
  ```
  - Add `CanvasImage` to the `CanvasItem` union type
  - Enforce a max source size (e.g., 2MB) — reject or resize larger images

- [ ] Create `src/crdt/ImageAdapter.ts`:
  - `imageToYMap(image: CanvasImage): Y.Map<any>` — serialize to Yjs map
  - `yMapToImage(map: Y.Map<any>): CanvasImage` — deserialize from Yjs map
  - Store `src` as a string field in the Y.Map (base64 data URI)

- [ ] Add image CRUD to `DrawfinityDoc.ts`:
  - `addImage(image: CanvasImage): void`
  - `getImages(): CanvasImage[]`
  - `removeImage(id: string): boolean`
  - `updateImage(id: string, updates: Partial<CanvasImage>): void` (for move/resize)
  - Include images in `getAllItems()` with correct timestamp ordering

- [ ] Create upload UI:
  - Add an "Insert Image" button to the toolbar (or a menu option)
  - On click: open a file picker (`<input type="file" accept="image/*">`)
  - Read the file as a data URI via `FileReader.readAsDataURL()`
  - If the file exceeds the size limit, resize it client-side using an offscreen canvas
  - Place the image centered at the current viewport center
  - Set initial world-space width to fill ~50% of the viewport width, preserving aspect ratio
  - Also support **paste** (`Ctrl+V`) and **drag-and-drop** onto the canvas

- [ ] Create the texture shader in `src/renderer/`:
  - Vertex shader: transform position by camera matrix, pass through UV coordinates
  - Fragment shader: `texture(sampler, uv) * vec4(1, 1, 1, opacity)`
  - Vertex format: `[x, y, u, v]` (position + texture coordinates)
  - Create `ImageRenderer.ts` that manages textures and draws image quads

- [ ] Implement texture management:
  - `TextureCache`: map from `image.id` → `WebGLTexture`
  - Upload texture on first render, cache for reuse
  - Delete texture when image is removed from document
  - Handle context loss gracefully (re-upload on restore)
  - Use `gl.texImage2D()` with the image element decoded from the data URI

- [ ] Integrate with spatial index and rendering:
  - Add image bounding boxes to `SpatialIndex.ts`
  - In the render loop, draw images interleaved with strokes/shapes by timestamp
  - Switch shader programs between image quads and stroke/shape geometry

- [ ] Integrate with export:
  - **PNG export** (`ExportRenderer.ts`): render image quads in the offscreen canvas using the texture shader
  - **SVG export** (if FEATURE-03 is implemented): emit `<image>` elements with embedded base64 data URIs

- [ ] Tests:
  - Test: `CanvasImage` model creation with valid fields
  - Test: ImageAdapter round-trip (serialize → deserialize)
  - Test: image added to doc appears in `getAllItems()` at correct timestamp position
  - Test: image removal cleans up from document
  - Test: oversized image source is rejected or resized
  - Test: spatial index includes image bounding boxes
  - All existing tests must still pass: `npx vitest run`
