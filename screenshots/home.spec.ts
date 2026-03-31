import { test } from "@playwright/test";
import {
  addStroke,
  addShape,
  setCamera,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Home screen screenshot", async ({ page }) => {
  await page.goto("/");
  await waitForRender(page);

  // --- Create Drawing 1: "Sunset Landscape" ---
  const drawing1Id = await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    const drawing = await vm.deps.createDrawing("Sunset Landscape");
    return drawing.id;
  });

  // Navigate to canvas and add content
  await page.evaluate(async (id: string) => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showCanvas(id);
  }, drawing1Id);
  await waitForRender(page);

  // Orange-red horizon strokes
  await addStroke(page, {
    color: "#EA580C",
    width: 14,
    points: [
      { x: -200, y: 20, pressure: 0.6 },
      { x: -120, y: 15, pressure: 0.65 },
      { x: -40, y: 10, pressure: 0.7 },
      { x: 40, y: 12, pressure: 0.7 },
      { x: 120, y: 18, pressure: 0.65 },
      { x: 200, y: 25, pressure: 0.6 },
    ],
  });
  // Mountain silhouette
  await addStroke(page, {
    color: "#1E293B",
    width: 6,
    points: [
      { x: -200, y: -10, pressure: 0.5 },
      { x: -140, y: -60, pressure: 0.6 },
      { x: -80, y: -20, pressure: 0.55 },
      { x: -20, y: -90, pressure: 0.7 },
      { x: 40, y: -30, pressure: 0.55 },
      { x: 100, y: -50, pressure: 0.6 },
      { x: 200, y: -10, pressure: 0.5 },
    ],
  });
  // Sun ellipse
  await addShape(page, {
    type: "ellipse",
    x: 60,
    y: -120,
    width: 80,
    height: 80,
    strokeColor: "#F59E0B",
    fillColor: "#FDE68A",
    strokeWidth: 2,
  });

  await setCamera(page, { x: 0, y: -30, zoom: 1.2 });
  await waitForRender(page);

  // Go home to save drawing 1
  await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showHome();
  });
  await waitForRender(page);

  // --- Create Drawing 2: "Abstract Spirals" ---
  const drawing2Id = await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    const drawing = await vm.deps.createDrawing("Abstract Spirals");
    return drawing.id;
  });

  await page.evaluate(async (id: string) => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showCanvas(id);
  }, drawing2Id);
  await waitForRender(page);

  // Blue spiral
  await addStroke(page, {
    color: "#2563EB",
    width: 8,
    points: [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 30, y: -20, pressure: 0.55 },
      { x: 50, y: -50, pressure: 0.6 },
      { x: 40, y: -80, pressure: 0.65 },
      { x: 10, y: -90, pressure: 0.7 },
      { x: -20, y: -70, pressure: 0.65 },
      { x: -30, y: -40, pressure: 0.6 },
      { x: -10, y: -15, pressure: 0.55 },
      { x: 20, y: -5, pressure: 0.5 },
    ],
  });
  // Purple accent
  await addStroke(page, {
    color: "#7C3AED",
    width: 10,
    points: [
      { x: -80, y: 30, pressure: 0.4 },
      { x: -50, y: 50, pressure: 0.55 },
      { x: -20, y: 60, pressure: 0.65 },
      { x: 15, y: 55, pressure: 0.7 },
      { x: 45, y: 35, pressure: 0.6 },
      { x: 65, y: 10, pressure: 0.5 },
    ],
  });
  // Star shape
  await addShape(page, {
    type: "star",
    x: -60,
    y: -80,
    width: 60,
    height: 60,
    strokeColor: "#EC4899",
    fillColor: "#FBCFE8",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  await setCamera(page, { x: 0, y: -20, zoom: 1.0 });
  await waitForRender(page);

  // Go home to save drawing 2
  await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showHome();
  });
  await waitForRender(page);

  // --- Create Drawing 3: "Geometric Shapes" ---
  const drawing3Id = await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    const drawing = await vm.deps.createDrawing("Geometric Shapes");
    return drawing.id;
  });

  await page.evaluate(async (id: string) => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showCanvas(id);
  }, drawing3Id);
  await waitForRender(page);

  // Teal rectangle
  await addShape(page, {
    type: "rectangle",
    x: -60,
    y: -40,
    width: 120,
    height: 80,
    strokeColor: "#0D9488",
    fillColor: "#CCFBF1",
    strokeWidth: 3,
  });
  // Orange ellipse overlapping
  await addShape(page, {
    type: "ellipse",
    x: 20,
    y: -20,
    width: 100,
    height: 70,
    strokeColor: "#EA580C",
    fillColor: "#FED7AA",
    strokeWidth: 3,
  });
  // Blue pentagon
  await addShape(page, {
    type: "polygon",
    x: -40,
    y: 60,
    width: 70,
    height: 70,
    strokeColor: "#2563EB",
    fillColor: "#DBEAFE",
    strokeWidth: 2,
    sides: 5,
  });

  await setCamera(page, { x: 0, y: 0, zoom: 1.0 });
  await waitForRender(page);

  // Go home to save drawing 3 — this also navigates us to the home screen
  await page.evaluate(async () => {
    const vm = (window as any).__drawfinity.viewManager;
    await vm.showHome();
  });
  await waitForRender(page);

  // Ensure "My Drawings" tab is active (it's the default)
  // Wait a bit for the home screen to fully render with drawing cards
  await page.waitForTimeout(500);
  await waitForRender(page);

  // Capture the home screen
  await captureScreenshot(page, "home");
});
