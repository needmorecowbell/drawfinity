import { test } from "@playwright/test";
import {
  navigateToCanvas,
  addStroke,
  addShape,
  setCamera,
  waitForRender,
  captureScreenshot,
} from "./helpers";

test("Infinite zoom worlds-within-worlds screenshot", async ({ page }) => {
  await page.goto("/");
  await navigateToCanvas(page);

  // === OUTER WORLD (visible at 100% zoom) ===

  // Ground line — a long horizontal stroke
  await addStroke(page, {
    color: "#6B7280",
    width: 4,
    points: [
      { x: -400, y: 80, pressure: 0.6 },
      { x: -300, y: 80, pressure: 0.6 },
      { x: -200, y: 78, pressure: 0.6 },
      { x: -100, y: 80, pressure: 0.6 },
      { x: 0, y: 79, pressure: 0.6 },
      { x: 100, y: 80, pressure: 0.6 },
      { x: 200, y: 78, pressure: 0.6 },
      { x: 300, y: 80, pressure: 0.6 },
      { x: 400, y: 80, pressure: 0.6 },
    ],
  });

  // Mountain range (left peak)
  await addStroke(page, {
    color: "#374151",
    width: 3,
    points: [
      { x: -350, y: 80, pressure: 0.5 },
      { x: -300, y: 20, pressure: 0.6 },
      { x: -260, y: -40, pressure: 0.7 },
      { x: -220, y: -10, pressure: 0.6 },
      { x: -180, y: 30, pressure: 0.5 },
      { x: -140, y: 80, pressure: 0.5 },
    ],
  });

  // Mountain range (right peak, taller)
  await addStroke(page, {
    color: "#374151",
    width: 3,
    points: [
      { x: -180, y: 80, pressure: 0.5 },
      { x: -140, y: 30, pressure: 0.55 },
      { x: -100, y: -20, pressure: 0.6 },
      { x: -60, y: -70, pressure: 0.7 },
      { x: -20, y: -30, pressure: 0.6 },
      { x: 20, y: 20, pressure: 0.55 },
      { x: 60, y: 80, pressure: 0.5 },
    ],
  });

  // Sun (golden yellow ellipse, upper-right)
  await addShape(page, {
    type: "ellipse",
    x: 250,
    y: -120,
    width: 80,
    height: 80,
    strokeColor: "#F59E0B",
    fillColor: "#FDE68A",
    strokeWidth: 2,
  });

  // House — body (rectangle)
  await addShape(page, {
    type: "rectangle",
    x: 120,
    y: 30,
    width: 80,
    height: 60,
    strokeColor: "#92400E",
    fillColor: "#FEF3C7",
    strokeWidth: 2,
  });

  // House — roof (triangle / polygon with 3 sides)
  await addShape(page, {
    type: "polygon",
    x: 120,
    y: -20,
    width: 100,
    height: 50,
    strokeColor: "#92400E",
    fillColor: "#DC2626",
    strokeWidth: 2,
    sides: 3,
  });

  // Tiny "painting" on the house wall — this is the portal into the inner world
  // At outer zoom it's just a tiny rectangle; at extreme zoom it reveals a galaxy
  // The painting is centered at roughly (130, 45) and is 6x4 px at outer scale
  await addShape(page, {
    type: "rectangle",
    x: 130,
    y: 45,
    width: 6,
    height: 4,
    strokeColor: "#1E293B",
    fillColor: "#312E81",
    strokeWidth: 0.5,
  });

  // === INNER WORLD (drawn at micro-scale inside the "painting") ===
  // These elements are placed at coordinates within the painting rectangle
  // Painting spans roughly x: 127-133, y: 43-47 in outer world coords

  // Galaxy spiral arm 1 (purple curve)
  await addStroke(page, {
    color: "#7C3AED",
    width: 0.15,
    points: [
      { x: 130, y: 45, pressure: 0.7 },
      { x: 130.5, y: 44.6, pressure: 0.65 },
      { x: 131.2, y: 44.5, pressure: 0.6 },
      { x: 131.8, y: 44.8, pressure: 0.55 },
      { x: 132, y: 45.3, pressure: 0.5 },
      { x: 131.6, y: 45.8, pressure: 0.55 },
      { x: 130.8, y: 46, pressure: 0.6 },
      { x: 130, y: 45.7, pressure: 0.65 },
      { x: 129.5, y: 45.2, pressure: 0.6 },
      { x: 129.3, y: 44.7, pressure: 0.55 },
    ],
  });

  // Galaxy spiral arm 2 (blue curve)
  await addStroke(page, {
    color: "#3B82F6",
    width: 0.12,
    points: [
      { x: 130, y: 45, pressure: 0.6 },
      { x: 129.5, y: 45.4, pressure: 0.55 },
      { x: 128.8, y: 45.5, pressure: 0.5 },
      { x: 128.2, y: 45.2, pressure: 0.55 },
      { x: 128, y: 44.7, pressure: 0.6 },
      { x: 128.4, y: 44.2, pressure: 0.55 },
      { x: 129.2, y: 44, pressure: 0.5 },
      { x: 130, y: 44.3, pressure: 0.55 },
      { x: 130.5, y: 44.8, pressure: 0.6 },
    ],
  });

  // Galaxy spiral arm 3 (indigo)
  await addStroke(page, {
    color: "#6366F1",
    width: 0.1,
    points: [
      { x: 130, y: 45, pressure: 0.5 },
      { x: 130.8, y: 45.4, pressure: 0.5 },
      { x: 131.3, y: 45.9, pressure: 0.45 },
      { x: 131.5, y: 46.5, pressure: 0.4 },
      { x: 131.2, y: 46.9, pressure: 0.45 },
      { x: 130.5, y: 47, pressure: 0.4 },
    ],
  });

  // Galaxy core glow (small bright ellipse)
  await addShape(page, {
    type: "ellipse",
    x: 130,
    y: 45,
    width: 0.6,
    height: 0.6,
    strokeColor: "#E0E7FF",
    fillColor: "#E0E7FF",
    strokeWidth: 0.05,
  });

  // Planet (small circle, reddish)
  await addShape(page, {
    type: "ellipse",
    x: 131.5,
    y: 44,
    width: 0.4,
    height: 0.4,
    strokeColor: "#F97316",
    fillColor: "#F97316",
    strokeWidth: 0.03,
  });

  // Planet ring
  await addShape(page, {
    type: "ellipse",
    x: 131.5,
    y: 44,
    width: 0.7,
    height: 0.2,
    strokeColor: "#FDBA74",
    strokeWidth: 0.03,
    rotation: 0.3,
  });

  // Stars — tiny dots as very small strokes
  const starPositions = [
    { x: 128.5, y: 43.8 },
    { x: 129.2, y: 46.5 },
    { x: 131.8, y: 46.2 },
    { x: 132.5, y: 44.5 },
    { x: 128.8, y: 44.5 },
    { x: 131, y: 43.5 },
    { x: 129.8, y: 46.8 },
    { x: 132.2, y: 45.8 },
    { x: 128.2, y: 45.5 },
    { x: 130.5, y: 46.5 },
  ];

  for (const star of starPositions) {
    await addStroke(page, {
      color: "#FBBF24",
      width: 0.06,
      points: [
        { x: star.x, y: star.y, pressure: 0.8 },
        { x: star.x + 0.02, y: star.y + 0.02, pressure: 0.8 },
      ],
    });
  }

  // === CAPTURE: Zoomed-in view showing the inner galaxy world ===
  // Zoom deep into the painting — at 5000% (zoom=50) the tiny galaxy fills the viewport
  await setCamera(page, { x: 130, y: 45, zoom: 50 });
  await waitForRender(page);

  await captureScreenshot(page, "zoom");

  // === CAPTURE: Outer view for before/after comparison ===
  await setCamera(page, { x: 0, y: 0, zoom: 1.0 });
  await waitForRender(page);

  await captureScreenshot(page, "zoom-outer");
});
