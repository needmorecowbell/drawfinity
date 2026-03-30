import type { Page } from "@playwright/test";
import * as path from "path";

/**
 * Returns a handle to window.__drawfinity.viewManager inside the page.
 */
export async function getViewManager(page: Page) {
  return page.evaluateHandle(() => (window as any).__drawfinity.viewManager);
}

/**
 * Navigate to a canvas view. Creates a new drawing if no drawingId is provided.
 */
export async function navigateToCanvas(page: Page, drawingId?: string) {
  await page.evaluate(async (id) => {
    const vm = (window as any).__drawfinity.viewManager;
    if (id) {
      await vm.showCanvas(id);
    } else {
      // Create a new drawing with a unique ID and open it
      const newId = `screenshot-${Date.now()}`;
      await vm.showCanvas(newId);
    }
  }, drawingId ?? null);
  await waitForRender(page);
}

/**
 * Navigate to the home screen.
 */
export async function navigateToHome(page: Page) {
  await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showHome();
  });
  await waitForRender(page);
}

/**
 * Add a stroke to the current drawing via the CRDT document.
 */
export async function addStroke(
  page: Page,
  opts: {
    points: Array<{ x: number; y: number; pressure?: number }>;
    color: string;
    width: number;
    opacity?: number;
  }
) {
  await page.evaluate((o) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const doc = app.getInternals().doc;
    const id = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    doc.addStroke({
      id,
      points: o.points.map((p: any) => ({
        x: p.x,
        y: p.y,
        pressure: p.pressure ?? 0.5,
      })),
      color: o.color,
      width: o.width,
      opacity: o.opacity,
      timestamp: Date.now(),
    });
  }, opts);
  await waitForRender(page);
}

/**
 * Add a shape to the current drawing via the CRDT document.
 */
export async function addShape(
  page: Page,
  opts: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    fillColor?: string;
    sides?: number;
    opacity?: number;
  }
) {
  await page.evaluate((o) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const doc = app.getInternals().doc;
    const id = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    doc.addShape({
      id,
      type: o.type,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      strokeColor: o.strokeColor,
      fillColor: o.fillColor,
      sides: o.sides,
      opacity: o.opacity,
      strokeWidth: 2,
      timestamp: Date.now(),
    });
  }, opts);
  await waitForRender(page);
}

/**
 * Set the camera position and zoom level.
 */
export async function setCamera(
  page: Page,
  opts: { x: number; y: number; zoom: number }
) {
  await page.evaluate((o) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { camera } = app.getInternals();
    camera.x = o.x;
    camera.y = o.y;
    camera.zoom = o.zoom;
  }, opts);
  await waitForRender(page);
}

/**
 * Set the active tool by name.
 */
export async function setTool(page: Page, toolName: string) {
  await page.evaluate((name) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { toolManager } = app.getInternals();
    toolManager.setTool(name);
  }, toolName);
}

/**
 * Set the current brush color (hex string like "#ff0000").
 */
export async function setColor(page: Page, hex: string) {
  await page.evaluate((color) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { toolManager } = app.getInternals();
    const brush = toolManager.getBrush();
    brush.color = color;
  }, hex);
}

/**
 * Open the turtle panel, set a script, and execute it.
 */
export async function runTurtleScript(page: Page, script: string) {
  await page.evaluate(async (s) => {
    const vm = (window as any).__drawfinity.viewManager;
    const app = vm.getCanvasApp();
    const { turtleExecutor, turtlePanel } = app.getInternals();
    turtlePanel.show();
    await turtleExecutor.run(s);
  }, script);
  await waitForRender(page);
}

/**
 * Toggle a panel using its keyboard shortcut.
 */
export async function togglePanel(
  page: Page,
  panel: "turtle" | "connection" | "settings" | "stats"
) {
  const shortcuts: Record<string, string> = {
    turtle: "Backquote",
    connection: "KeyK",
    settings: "Comma",
    stats: "KeyS",
  };

  const modifiers: Record<string, { ctrl: boolean; shift: boolean }> = {
    turtle: { ctrl: true, shift: false },
    connection: { ctrl: true, shift: false },
    settings: { ctrl: true, shift: false },
    stats: { ctrl: true, shift: true },
  };

  const key = shortcuts[panel];
  const mod = modifiers[panel];

  const modifierKeys: string[] = [];
  if (mod.ctrl) modifierKeys.push("Control");
  if (mod.shift) modifierKeys.push("Shift");

  // Use keyboard dispatch for panel toggling
  await page.keyboard.press(
    [...modifierKeys, key].join("+")
  );
  await waitForRender(page);
}

/**
 * Wait for the next animation frame plus a small delay for WebGL to flush.
 */
export async function waitForRender(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      })
  );
}

/**
 * Take a screenshot and save it to docs/assets/screenshot-{name}.png.
 */
export async function captureScreenshot(page: Page, name: string) {
  const outputPath = path.join(
    process.cwd(),
    "docs",
    "assets",
    `screenshot-${name}.png`
  );
  await page.screenshot({ path: outputPath, fullPage: false });
  return outputPath;
}
