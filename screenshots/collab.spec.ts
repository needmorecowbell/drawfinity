import { test } from "@playwright/test";
import {
  navigateToCanvas,
  addStroke,
  addShape,
  setCamera,
  togglePanel,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Collaboration screenshot", async ({ page }) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // --- "User 1" strokes (blue) — flowing curves upper area ---
  await addStroke(page, {
    color: "#2563EB",
    width: 6,
    points: [
      { x: -200, y: -100, pressure: 0.5 },
      { x: -160, y: -120, pressure: 0.6 },
      { x: -120, y: -125, pressure: 0.7 },
      { x: -80, y: -115, pressure: 0.65 },
      { x: -40, y: -95, pressure: 0.6 },
      { x: 0, y: -80, pressure: 0.55 },
      { x: 40, y: -75, pressure: 0.5 },
      { x: 80, y: -80, pressure: 0.45 },
    ],
  });

  await addStroke(page, {
    color: "#2563EB",
    width: 4,
    points: [
      { x: -180, y: -50, pressure: 0.4 },
      { x: -140, y: -60, pressure: 0.5 },
      { x: -100, y: -55, pressure: 0.6 },
      { x: -60, y: -40, pressure: 0.55 },
      { x: -20, y: -30, pressure: 0.5 },
      { x: 20, y: -35, pressure: 0.45 },
      { x: 60, y: -45, pressure: 0.4 },
    ],
  });

  // --- "User 2" strokes (green) — center area ---
  await addStroke(page, {
    color: "#16A34A",
    width: 8,
    points: [
      { x: -60, y: 20, pressure: 0.45 },
      { x: -20, y: 10, pressure: 0.55 },
      { x: 20, y: 5, pressure: 0.65 },
      { x: 60, y: 15, pressure: 0.7 },
      { x: 100, y: 30, pressure: 0.65 },
      { x: 140, y: 40, pressure: 0.6 },
      { x: 180, y: 35, pressure: 0.5 },
      { x: 220, y: 25, pressure: 0.4 },
    ],
  });

  await addStroke(page, {
    color: "#16A34A",
    width: 5,
    points: [
      { x: 40, y: -60, pressure: 0.5 },
      { x: 70, y: -40, pressure: 0.6 },
      { x: 95, y: -15, pressure: 0.7 },
      { x: 110, y: 10, pressure: 0.65 },
      { x: 120, y: 40, pressure: 0.6 },
      { x: 125, y: 70, pressure: 0.5 },
      { x: 120, y: 95, pressure: 0.45 },
    ],
  });

  // --- "User 3" strokes (red) — lower area + crossing strokes ---
  await addStroke(page, {
    color: "#DC2626",
    width: 7,
    points: [
      { x: -150, y: 60, pressure: 0.5 },
      { x: -110, y: 80, pressure: 0.6 },
      { x: -70, y: 95, pressure: 0.7 },
      { x: -30, y: 100, pressure: 0.75 },
      { x: 10, y: 95, pressure: 0.7 },
      { x: 50, y: 80, pressure: 0.65 },
      { x: 90, y: 65, pressure: 0.55 },
      { x: 130, y: 55, pressure: 0.45 },
    ],
  });

  // Red crossing stroke that overlaps the green and blue strokes
  await addStroke(page, {
    color: "#DC2626",
    width: 5,
    points: [
      { x: -40, y: -110, pressure: 0.4 },
      { x: -20, y: -70, pressure: 0.5 },
      { x: 0, y: -30, pressure: 0.6 },
      { x: 15, y: 10, pressure: 0.7 },
      { x: 25, y: 50, pressure: 0.65 },
      { x: 30, y: 90, pressure: 0.55 },
      { x: 30, y: 120, pressure: 0.45 },
    ],
  });

  // --- Shapes from different "users" ---

  // Blue rectangle from "User 1"
  await addShape(page, {
    type: "rectangle",
    x: -200,
    y: -180,
    width: 120,
    height: 80,
    strokeColor: "#2563EB",
    fillColor: "#DBEAFE",
    strokeWidth: 2,
  });

  // Green ellipse from "User 2"
  await addShape(page, {
    type: "ellipse",
    x: 180,
    y: -100,
    width: 140,
    height: 100,
    strokeColor: "#16A34A",
    fillColor: "#DCFCE7",
    strokeWidth: 2,
  });

  // Red star from "User 3"
  await addShape(page, {
    type: "star",
    x: -100,
    y: 130,
    width: 100,
    height: 100,
    strokeColor: "#DC2626",
    fillColor: "#FEE2E2",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Frame everything with margin
  await setCamera(page, { x: 0, y: -10, zoom: 1.1 });
  await waitForRender(page);

  // Open connection panel via Ctrl+K
  await togglePanel(page, "connection");

  // Fill the server URL field with a plausible address
  const urlInput = page.locator(".conn-input").first();
  await urlInput.fill("ws://drawfinity-collab.example.com:8080");

  await waitForRender(page);

  // Capture the collaboration screenshot
  await captureScreenshot(page, "collab");
});
