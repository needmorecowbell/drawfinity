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

  // --- Row 1: Rectangles and ellipses (top area) ---

  // Large blue rectangle (top-left)
  await addShape(page, {
    type: "rectangle",
    x: -320,
    y: -220,
    width: 180,
    height: 120,
    strokeColor: "#2563EB",
    fillColor: "#DBEAFE",
    strokeWidth: 3,
  });

  // Orange rectangle (overlapping slightly)
  await addShape(page, {
    type: "rectangle",
    x: -200,
    y: -170,
    width: 140,
    height: 100,
    strokeColor: "#EA580C",
    fillColor: "#FED7AA",
    strokeWidth: 2,
  });

  // Large cyan ellipse (top-center-right)
  await addShape(page, {
    type: "ellipse",
    x: 60,
    y: -210,
    width: 180,
    height: 110,
    strokeColor: "#06B6D4",
    fillColor: "#CFFAFE",
    strokeWidth: 3,
  });

  // Small purple circle (top-right)
  await addShape(page, {
    type: "ellipse",
    x: 280,
    y: -220,
    width: 70,
    height: 70,
    strokeColor: "#7C3AED",
    fillColor: "#7C3AED",
    strokeWidth: 2,
  });

  // --- Row 2: Polygon progression from triangle (3) to dodecagon (12) ---
  // Spread across the middle band of the canvas

  const polygonRow = [
    { sides: 3, label: "triangle", color: "#DC2626", fill: "#FEE2E2", x: -380 },
    { sides: 4, label: "square", color: "#EA580C", fill: "#FFEDD5", x: -280 },
    { sides: 5, label: "pentagon", color: "#F59E0B", fill: "#FEF3C7", x: -180 },
    { sides: 6, label: "hexagon", color: "#16A34A", fill: "#DCFCE7", x: -80 },
    { sides: 7, label: "heptagon", color: "#0D9488", fill: "#CCFBF1", x: 20 },
    { sides: 8, label: "octagon", color: "#2563EB", fill: "#DBEAFE", x: 120 },
    { sides: 9, label: "nonagon", color: "#4F46E5", fill: "#E0E7FF", x: 220 },
    { sides: 10, label: "decagon", color: "#7C3AED", fill: "#EDE9FE", x: 320 },
    { sides: 11, label: "hendecagon", color: "#EC4899", fill: "#FCE7F3", x: -230 },
    { sides: 12, label: "dodecagon", color: "#F43F5E", fill: "#FFE4E6", x: -130 },
  ];

  for (const poly of polygonRow) {
    const y = poly.sides <= 10 ? -40 : 130;
    const size = 70 + (poly.sides <= 10 ? 0 : 10);
    await addShape(page, {
      type: "polygon",
      x: poly.x,
      y,
      width: size,
      height: size,
      strokeColor: poly.color,
      fillColor: poly.fill,
      strokeWidth: 2,
      sides: poly.sides,
    });
  }

  // --- Row 3: Stars and mixed shapes (bottom area) ---

  // Large orange 5-pointed star (bottom-center)
  await addShape(page, {
    type: "star",
    x: 0,
    y: 140,
    width: 160,
    height: 160,
    strokeColor: "#EA580C",
    fillColor: "#EA580C",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Small pink 5-pointed star (bottom-right)
  await addShape(page, {
    type: "star",
    x: 200,
    y: 120,
    width: 80,
    height: 80,
    strokeColor: "#EC4899",
    fillColor: "#EC4899",
    strokeWidth: 2,
    sides: 5,
    starInnerRadius: 0.4,
  });

  // Red star outline (far right)
  await addShape(page, {
    type: "star",
    x: 330,
    y: 130,
    width: 100,
    height: 100,
    strokeColor: "#DC2626",
    strokeWidth: 3,
    sides: 6,
    starInnerRadius: 0.45,
  });

  // Navy filled square (bottom far-right)
  await addShape(page, {
    type: "rectangle",
    x: 380,
    y: -40,
    width: 90,
    height: 90,
    strokeColor: "#1E3A5F",
    fillColor: "#1E3A5F",
    strokeWidth: 2,
  });

  // Set active tool to polygon to show the shape tool is selected
  await setTool(page, "polygon");
  await waitForRender(page);

  // Frame all shapes with margin
  await setCamera(page, { x: 0, y: -30, zoom: 0.85 });
  await waitForRender(page);

  // Capture
  await captureScreenshot(page, "shapes");
});
