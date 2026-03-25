/**
 * Simple toast notification system for storage warnings and errors.
 * Notifications appear at the bottom-left of the screen and auto-dismiss.
 */

const CONTAINER_ID = "storage-notifications";
const DEFAULT_DURATION_MS = 8000;

type NotificationType = "warning" | "error" | "info";

function ensureContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification to the user.
 * @param message - The message to display
 * @param type - "warning" | "error" | "info"
 * @param durationMs - Auto-dismiss after this many ms (0 = sticky, requires manual dismiss)
 */
export function showStorageNotification(
  message: string,
  type: NotificationType = "info",
  durationMs: number = DEFAULT_DURATION_MS,
): void {
  const container = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `storage-toast storage-toast--${type}`;

  const icon = type === "error" ? "\u26A0" : type === "warning" ? "\u26A0" : "\u2139";
  toast.innerHTML = `<span class="storage-toast__icon">${icon}</span><span class="storage-toast__message">${escapeHtml(message)}</span>`;

  const dismiss = document.createElement("button");
  dismiss.className = "storage-toast__dismiss";
  dismiss.textContent = "\u00D7";
  dismiss.addEventListener("click", () => removeToast(toast));
  toast.appendChild(dismiss);

  container.appendChild(toast);

  // Trigger reflow then add visible class for animation
  toast.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
  toast.classList.add("storage-toast--visible");

  if (durationMs > 0) {
    setTimeout(() => removeToast(toast), durationMs);
  }
}

function removeToast(toast: HTMLElement): void {
  toast.classList.remove("storage-toast--visible");
  toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  // Fallback removal if transitionend doesn't fire
  setTimeout(() => toast.remove(), 400);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
