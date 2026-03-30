import { test } from "@playwright/test";
import {
  navigateToCanvas,
  addStroke,
  addShape,
  setCamera,
  setTool,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Hero canvas screenshot", async ({ page }) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // Toggle dot grid on via Ctrl+'
  await page.keyboard.press("Control+Quote");
  await waitForRender(page);

  // --- Freehand brush strokes ---

  // Blue flowing curve (upper area)
  await addStroke(page, {
    color: "#2563EB",
    width: 6,
    points: [
      { x: -200, y: -120, pressure: 0.4 },
      { x: -170, y: -135, pressure: 0.5 },
      { x: -135, y: -140, pressure: 0.6 },
      { x: -100, y: -130, pressure: 0.7 },
      { x: -65, y: -110, pressure: 0.7 },
      { x: -35, y: -95, pressure: 0.65 },
      { x: 0, y: -85, pressure: 0.6 },
      { x: 40, y: -80, pressure: 0.55 },
      { x: 80, y: -90, pressure: 0.5 },
      { x: 115, y: -105, pressure: 0.45 },
    ],
  });

  // Red diagonal stroke (center-left)
  await addStroke(page, {
    color: "#DC2626",
    width: 10,
    points: [
      { x: -180, y: -20, pressure: 0.35 },
      { x: -150, y: 10, pressure: 0.5 },
      { x: -115, y: 35, pressure: 0.6 },
      { x: -80, y: 55, pressure: 0.7 },
      { x: -50, y: 70, pressure: 0.75 },
      { x: -15, y: 80, pressure: 0.7 },
      { x: 20, y: 85, pressure: 0.6 },
      { x: 55, y: 82, pressure: 0.5 },
      { x: 90, y: 70, pressure: 0.4 },
      { x: 120, y: 55, pressure: 0.35 },
      { x: 145, y: 35, pressure: 0.3 },
    ],
  });

  // Green S-curve (lower area)
  await addStroke(page, {
    color: "#16A34A",
    width: 4,
    points: [
      { x: -100, y: 80, pressure: 0.5 },
      { x: -70, y: 95, pressure: 0.55 },
      { x: -40, y: 110, pressure: 0.6 },
      { x: -10, y: 115, pressure: 0.65 },
      { x: 25, y: 110, pressure: 0.7 },
      { x: 55, y: 95, pressure: 0.65 },
      { x: 85, y: 80, pressure: 0.6 },
      { x: 110, y: 70, pressure: 0.55 },
      { x: 140, y: 65, pressure: 0.5 },
      { x: 170, y: 68, pressure: 0.45 },
      { x: 200, y: 80, pressure: 0.4 },
      { x: 225, y: 95, pressure: 0.35 },
    ],
  });

  // Amber loose spiral (right area)
  await addStroke(page, {
    color: "#F59E0B",
    width: 8,
    points: [
      { x: 120, y: -60, pressure: 0.4 },
      { x: 140, y: -40, pressure: 0.5 },
      { x: 155, y: -15, pressure: 0.6 },
      { x: 150, y: 10, pressure: 0.65 },
      { x: 130, y: 25, pressure: 0.7 },
      { x: 110, y: 15, pressure: 0.65 },
      { x: 105, y: -10, pressure: 0.6 },
      { x: 115, y: -30, pressure: 0.55 },
      { x: 135, y: -40, pressure: 0.5 },
    ],
  });

  // Short blue accent stroke (bottom-left)
  await addStroke(page, {
    color: "#2563EB",
    width: 16,
    points: [
      { x: -220, y: 100, pressure: 0.45 },
      { x: -195, y: 110, pressure: 0.55 },
      { x: -170, y: 115, pressure: 0.65 },
      { x: -145, y: 112, pressure: 0.7 },
      { x: -120, y: 105, pressure: 0.6 },
      { x: -100, y: 95, pressure: 0.5 },
      { x: -85, y: 85, pressure: 0.4 },
      { x: -75, y: 75, pressure: 0.35 },
    ],
  });

  // --- Shapes ---

  // Golden star (upper-left)
  await addShape(page, {
    type: "star",
    x: -180,
    y: -160,
    width: 120,
    height: 120,
    strokeColor: "#F59E0B",
    fillColor: "#F59E0B",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Large pink ellipse (center-top)
  await addShape(page, {
    type: "ellipse",
    x: 0,
    y: -170,
    width: 180,
    height: 100,
    strokeColor: "#EC4899",
    fillColor: "#FBCFE8",
    strokeWidth: 3,
  });

  // Blue rectangle (lower-right)
  await addShape(page, {
    type: "rectangle",
    x: 180,
    y: 110,
    width: 140,
    height: 90,
    strokeColor: "#2563EB",
    fillColor: "#DBEAFE",
    strokeWidth: 3,
  });

  // --- Highlighter stroke crossing through the middle ---
  await addStroke(page, {
    color: "#F59E0B",
    width: 40,
    opacity: 0.3,
    points: [
      { x: -250, y: 0, pressure: 0.5 },
      { x: -180, y: -10, pressure: 0.5 },
      { x: -100, y: -5, pressure: 0.5 },
      { x: -20, y: 5, pressure: 0.5 },
      { x: 60, y: 10, pressure: 0.5 },
      { x: 140, y: 5, pressure: 0.5 },
      { x: 220, y: -5, pressure: 0.5 },
      { x: 280, y: -10, pressure: 0.5 },
    ],
  });

  // Frame everything with some margin
  await setCamera(page, { x: 0, y: -20, zoom: 1.4 });

  // Set active tool to brush
  await setTool(page, "brush");
  await waitForRender(page);

  // Capture the hero screenshot
  await captureScreenshot(page, "canvas");
});
