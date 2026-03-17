import { Renderer } from "./renderer";

const canvas = document.getElementById("drawfinity-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new Renderer(canvas);
renderer.clear();

// Confirm WebGL is working — the off-white background should be visible
console.log("Drawfinity: WebGL2 renderer initialized");

// Expose for debugging
(window as unknown as Record<string, unknown>).__drawfinity = { renderer };
