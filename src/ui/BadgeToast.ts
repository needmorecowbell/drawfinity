import type { BadgeDefinition, BadgeTier } from "../user/badges/BadgeCatalog";
import type { BadgeUnlockEvent } from "../user/badges/BadgeEngine";

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

const AUTO_DISMISS_MS = 5000;
const STAGGER_MS = 300;
const FADE_OUT_MS = 400;

export interface BadgeToastCallbacks {
  onOpenBadges?: () => void;
}

/**
 * Toast notification system for newly earned badges.
 *
 * Listens to `drawfinity:badge-unlocked` custom events on `window` and
 * displays slide-in toast notifications from the bottom-right corner.
 * Multiple badges stack vertically with staggered timing.
 */
export class BadgeToast {
  private callbacks: BadgeToastCallbacks;
  private container: HTMLElement;
  private handler: (e: Event) => void;
  private staggerTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(callbacks: BadgeToastCallbacks = {}) {
    this.callbacks = callbacks;

    this.container = document.createElement("div");
    this.container.className = "badge-toast-container";
    document.body.appendChild(this.container);

    this.handler = (e: Event) => {
      const detail = (e as CustomEvent<BadgeUnlockEvent[]>).detail;
      this.showBadges(detail);
    };
    window.addEventListener("drawfinity:badge-unlocked", this.handler);
  }

  private showBadges(unlocked: BadgeUnlockEvent[]): void {
    for (let i = 0; i < unlocked.length; i++) {
      const delay = i * STAGGER_MS;
      if (delay === 0) {
        this.createToast(unlocked[i].badge);
      } else {
        const t = setTimeout(() => this.createToast(unlocked[i].badge), delay);
        this.staggerTimers.push(t);
      }
    }
  }

  private createToast(badge: BadgeDefinition): void {
    const toast = document.createElement("div");
    toast.className = "badge-toast";
    toast.style.borderColor = TIER_COLORS[badge.tier];
    toast.dataset.tier = badge.tier;

    const icon = document.createElement("span");
    icon.className = "badge-toast-icon";
    icon.textContent = badge.icon;

    const info = document.createElement("div");
    info.className = "badge-toast-info";

    const header = document.createElement("div");
    header.className = "badge-toast-header";
    header.textContent = "Badge Unlocked!";

    const name = document.createElement("div");
    name.className = "badge-toast-name";
    name.textContent = badge.name;

    const tier = document.createElement("span");
    tier.className = "badge-toast-tier";
    tier.textContent = badge.tier;
    tier.style.color = TIER_COLORS[badge.tier];

    name.appendChild(document.createTextNode(" "));
    name.appendChild(tier);

    info.appendChild(header);
    info.appendChild(name);

    toast.appendChild(icon);
    toast.appendChild(info);

    toast.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      toast.remove();
      this.callbacks.onOpenBadges?.();
    });

    this.container.appendChild(toast);

    // Force reflow so the slide-in animation triggers
    toast.offsetHeight;

    toast.classList.add("badge-toast-visible");

    const dismissTimer = setTimeout(() => {
      this.dismissToast(toast);
    }, AUTO_DISMISS_MS);

    // Store timer for cleanup
    (toast as unknown as { _timer: ReturnType<typeof setTimeout> })._timer = dismissTimer;
  }

  private dismissToast(toast: HTMLElement): void {
    if (!toast.parentNode) return;
    toast.classList.add("badge-toast-exit");
    setTimeout(() => toast.remove(), FADE_OUT_MS);
  }

  destroy(): void {
    window.removeEventListener("drawfinity:badge-unlocked", this.handler);
    // Clear stagger timers
    for (const t of this.staggerTimers) clearTimeout(t);
    this.staggerTimers = [];
    // Clear all pending per-toast auto-dismiss timers
    for (const child of Array.from(this.container.children)) {
      const timer = (child as unknown as { _timer: ReturnType<typeof setTimeout> })._timer;
      if (timer) clearTimeout(timer);
    }
    this.container.remove();
  }
}
