import { Renderer } from "./renderer";
import { Camera, CameraController } from "./camera";

const canvas = document.getElementById("drawfinity-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const renderer = new Renderer(canvas);
const camera = new Camera();
const cameraController = new CameraController(camera, canvas);

// Set initial viewport size
camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);

// Update camera viewport on resize
const resizeObserver = new ResizeObserver(() => {
  camera.setViewportSize(canvas.clientWidth, canvas.clientHeight);
});
resizeObserver.observe(canvas);

// Render loop
function frame(): void {
  renderer.clear();
  renderer.setCameraMatrix(camera.getTransformMatrix());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Confirm WebGL is working — the off-white background should be visible
console.log("Drawfinity: WebGL2 renderer initialized with camera system");

// Expose for debugging
(window as unknown as Record<string, unknown>).__drawfinity = { renderer, camera, cameraController };
