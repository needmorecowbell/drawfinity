import { test } from "@playwright/test";
import {
  navigateToCanvas,
  addShape,
  setCamera,
  setTool,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Shape tools screenshot", async ({ page }) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // Large blue rectangle (top-left area)
  await addShape(page, {
    type: "rectangle",
    x: -220,
    y: -180,
    width: 200,
    height: 140,
    strokeColor: "#2563EB",
    strokeWidth: 3,
  });

  // Orange rectangle (overlapping slightly with the blue one)
  await addShape(page, {
    type: "rectangle",
    x: -140,
    y: -120,
    width: 170,
    height: 120,
    strokeColor: "#EA580C",
    fillColor: "#FED7AA",
    strokeWidth: 2,
  });

  // Teal pentagon (center-left)
  await addShape(page, {
    type: "polygon",
    x: -180,
    y: 40,
    width: 130,
    height: 130,
    strokeColor: "#0D9488",
    fillColor: "#CCFBF1",
    strokeWidth: 2,
    sides: 5,
  });

  // Large orange star (center area)
  await addShape(page, {
    type: "star",
    x: 0,
    y: -20,
    width: 180,
    height: 180,
    strokeColor: "#EA580C",
    fillColor: "#EA580C",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Small pink star (upper-right)
  await addShape(page, {
    type: "star",
    x: 200,
    y: -180,
    width: 80,
    height: 80,
    strokeColor: "#EC4899",
    fillColor: "#EC4899",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Purple pentagon (bottom-left)
  await addShape(page, {
    type: "polygon",
    x: -200,
    y: 180,
    width: 110,
    height: 110,
    strokeColor: "#7C3AED",
    fillColor: "#EDE9FE",
    strokeWidth: 2,
    sides: 5,
  });

  // Large cyan ellipse (right side)
  await addShape(page, {
    type: "ellipse",
    x: 220,
    y: 20,
    width: 200,
    height: 140,
    strokeColor: "#06B6D4",
    fillColor: "#CFFAFE",
    strokeWidth: 3,
  });

  // Navy square (far right)
  await addShape(page, {
    type: "rectangle",
    x: 320,
    y: -120,
    width: 100,
    height: 100,
    strokeColor: "#1E3A5F",
    fillColor: "#1E3A5F",
    strokeWidth: 2,
  });

  // Small purple circle (center area)
  await addShape(page, {
    type: "ellipse",
    x: 50,
    y: 100,
    width: 60,
    height: 60,
    strokeColor: "#7C3AED",
    fillColor: "#7C3AED",
    strokeWidth: 2,
  });

  // Red star outline (top-right)
  await addShape(page, {
    type: "star",
    x: 280,
    y: -200,
    width: 100,
    height: 100,
    strokeColor: "#DC2626",
    strokeWidth: 3,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Set active tool to ellipse
  await setTool(page, "ellipse");
  await waitForRender(page);

  // Frame all shapes with margin
  await setCamera(page, { x: 40, y: -20, zoom: 1.0 });
  await waitForRender(page);

  // Capture
  await captureScreenshot(page, "shapes");
});
