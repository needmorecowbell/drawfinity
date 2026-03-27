import type { BadgeDefinition } from "../user/badges/BadgeCatalog";
import type { BadgeUnlockEvent } from "../user/badges/BadgeEngine";
import type { RecordBrokenEvent } from "./RecordToast";
import type { UserStats } from "../user/UserStats";

const TIER_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

/** Stats captured at session start, used to diff against session end. */
export interface SessionSnapshot {
  totalStrokes: number;
  totalShapes: number;
  totalTurtleRuns: number;
  totalTurtlesSpawned: number;
}

/** Data passed to the session summary overlay. */
export interface SessionSummaryData {
  durationMs: number;
  strokesDrawn: number;
  shapesCreated: number;
  turtleScriptsRun: number;
  turtlesSpawned: number;
  badgesEarned: BadgeDefinition[];
  recordsBroken: RecordBrokenEvent[];
}

/**
 * Collects session-scoped badge and record events for display in the summary.
 *
 * Attach at session start, call {@link destroy} at session end to stop listening
 * and retrieve the collected data via {@link getBadges} and {@link getRecords}.
 */
export class SessionEventCollector {
  private badges: BadgeDefinition[] = [];
  private records: RecordBrokenEvent[] = [];
  private badgeHandler: (e: Event) => void;
  private recordHandler: (e: Event) => void;

  constructor() {
    this.badgeHandler = (e: Event) => {
      const detail = (e as CustomEvent<BadgeUnlockEvent[]>).detail;
      for (const unlock of detail) {
        this.badges.push(unlock.badge);
      }
    };
    this.recordHandler = (e: Event) => {
      const detail = (e as CustomEvent<RecordBrokenEvent>).detail;
      this.records.push(detail);
    };
    window.addEventListener("drawfinity:badge-unlocked", this.badgeHandler);
    window.addEventListener("drawfinity:record-broken", this.recordHandler);
  }

  getBadges(): BadgeDefinition[] {
    return this.badges;
  }

  getRecords(): RecordBrokenEvent[] {
    return this.records;
  }

  destroy(): void {
    window.removeEventListener("drawfinity:badge-unlocked", this.badgeHandler);
    window.removeEventListener("drawfinity:record-broken", this.recordHandler);
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} seconds`;
  const mins = Math.floor(totalSeconds / 60);
  if (mins === 1) return "1 minute";
  if (mins < 60) return `${mins} minutes`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours === 1 && remMins === 0) return "1 hour";
  if (remMins === 0) return `${hours} hours`;
  return `${hours}h ${remMins}m`;
}

const RECORD_LABELS: Record<string, string> = {
  longestSingleStroke: "Longest Stroke",
  widestBrushUsed: "Widest Brush",
  mostTurtlesInOneRun: "Most Turtles",
  longestTurtleDistance: "Turtle Distance",
  mostTurtleTurns: "Turtle Turns",
  fastestTurtleCompletion: "Fastest Turtle",
  longestTurtleRuntime: "Longest Turtle Run",
  deepestZoom: "Deepest Zoom",
  widestZoom: "Widest Zoom",
  longestPanInOneSession: "Pan Distance",
  mostConcurrentCollaborators: "Most Collaborators",
  longestSession: "Longest Session",
  mostStrokesInOneSession: "Most Strokes (Session)",
};

function formatRecordValue(key: string, value: number): string {
  if (key === "deepestZoom" || key === "widestZoom") {
    return value.toExponential(1) + "x";
  }
  if (key === "longestSession" || key === "longestTurtleRuntime" || key === "fastestTurtleCompletion") {
    const secs = Math.floor(value / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  }
  if (key === "longestTurtleDistance" || key === "longestPanInOneSession" || key === "longestSingleStroke") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
  }
  return String(Math.round(value));
}

/**
 * Determines whether the session had meaningful activity worth summarizing.
 */
export function hasSessionActivity(data: SessionSummaryData): boolean {
  return (
    data.strokesDrawn > 0 ||
    data.shapesCreated > 0 ||
    data.turtleScriptsRun > 0
  );
}

/**
 * Builds session summary data by diffing a snapshot against current stats.
 */
export function buildSessionData(
  snapshot: SessionSnapshot,
  currentStats: UserStats,
  durationMs: number,
  badges: BadgeDefinition[],
  records: RecordBrokenEvent[],
): SessionSummaryData {
  return {
    durationMs,
    strokesDrawn: currentStats.totalStrokes - snapshot.totalStrokes,
    shapesCreated: currentStats.totalShapes - snapshot.totalShapes,
    turtleScriptsRun: currentStats.totalTurtleRuns - snapshot.totalTurtleRuns,
    turtlesSpawned: currentStats.totalTurtlesSpawned - snapshot.totalTurtlesSpawned,
    badgesEarned: badges,
    recordsBroken: records,
  };
}

/**
 * Show the session summary overlay and wait for the user to dismiss it.
 *
 * Returns a promise that resolves when the user clicks "Continue" or presses
 * Escape/Enter. A 200ms delay is applied before the overlay appears.
 */
export function showSessionSummary(data: SessionSummaryData): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "session-summary-overlay";

    const dialog = document.createElement("div");
    dialog.className = "session-summary";

    // --- Header ---
    const header = document.createElement("div");
    header.className = "session-summary__header";

    const title = document.createElement("h2");
    title.className = "session-summary__title";
    title.textContent = "Session Summary";

    const duration = document.createElement("div");
    duration.className = "session-summary__duration";
    duration.textContent = formatDuration(data.durationMs);

    header.appendChild(title);
    header.appendChild(duration);
    dialog.appendChild(header);

    // --- Activity Stats (two-column grid, only non-zero) ---
    const activityItems: [string, number][] = [];
    if (data.strokesDrawn > 0) activityItems.push(["Strokes drawn", data.strokesDrawn]);
    if (data.shapesCreated > 0) activityItems.push(["Shapes created", data.shapesCreated]);
    if (data.turtleScriptsRun > 0) activityItems.push(["Turtle scripts run", data.turtleScriptsRun]);
    if (data.turtlesSpawned > 0) activityItems.push(["Turtles spawned", data.turtlesSpawned]);

    if (activityItems.length > 0) {
      const grid = document.createElement("div");
      grid.className = "session-summary__stats-grid";
      for (const [label, count] of activityItems) {
        const item = document.createElement("div");
        item.className = "session-summary__stat-item";

        const valEl = document.createElement("span");
        valEl.className = "session-summary__stat-value";
        valEl.textContent = String(count);

        const labelEl = document.createElement("span");
        labelEl.className = "session-summary__stat-label";
        labelEl.textContent = label;

        item.appendChild(valEl);
        item.appendChild(labelEl);
        grid.appendChild(item);
      }
      dialog.appendChild(grid);
    }

    // --- Badges Earned ---
    const badgeSection = document.createElement("div");
    badgeSection.className = "session-summary__section";

    const badgeTitle = document.createElement("h3");
    badgeTitle.className = "session-summary__section-title";
    badgeTitle.textContent = "Badges Earned";
    badgeSection.appendChild(badgeTitle);

    if (data.badgesEarned.length > 0) {
      const badgeRow = document.createElement("div");
      badgeRow.className = "session-summary__badge-row";
      for (const badge of data.badgesEarned) {
        const card = document.createElement("div");
        card.className = "session-summary__badge-card";
        card.style.borderColor = TIER_COLORS[badge.tier] ?? "#888";

        const icon = document.createElement("span");
        icon.className = "session-summary__badge-icon";
        icon.textContent = badge.icon;

        const name = document.createElement("span");
        name.className = "session-summary__badge-name";
        name.textContent = badge.name;

        card.appendChild(icon);
        card.appendChild(name);
        badgeRow.appendChild(card);
      }
      badgeSection.appendChild(badgeRow);
    } else {
      const noBadges = document.createElement("div");
      noBadges.className = "session-summary__empty";
      noBadges.textContent = "No new badges this session.";
      badgeSection.appendChild(noBadges);
    }
    dialog.appendChild(badgeSection);

    // --- Records Broken ---
    if (data.recordsBroken.length > 0) {
      const recordSection = document.createElement("div");
      recordSection.className = "session-summary__section";

      const recordTitle = document.createElement("h3");
      recordTitle.className = "session-summary__section-title";
      recordTitle.textContent = "Records Broken";
      recordSection.appendChild(recordTitle);

      const recordList = document.createElement("div");
      recordList.className = "session-summary__record-list";
      for (const rec of data.recordsBroken) {
        const row = document.createElement("div");
        row.className = "session-summary__record-item";

        const label = document.createElement("span");
        label.className = "session-summary__record-label";
        label.textContent = RECORD_LABELS[rec.key] ?? rec.key;

        const arrow = document.createElement("span");
        arrow.className = "session-summary__record-arrow";
        arrow.textContent = `${formatRecordValue(rec.key, rec.oldValue)} \u2192 ${formatRecordValue(rec.key, rec.newValue)}`;

        row.appendChild(label);
        row.appendChild(arrow);
        recordList.appendChild(row);
      }
      recordSection.appendChild(recordList);
      dialog.appendChild(recordSection);
    }

    // --- Continue button ---
    const actions = document.createElement("div");
    actions.className = "session-summary__actions";

    const continueBtn = document.createElement("button");
    continueBtn.className = "session-summary__continue-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      overlay.remove();
      resolve();
    });
    actions.appendChild(continueBtn);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);

    // Keyboard handler: Escape or Enter dismiss
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("keydown", keyHandler, true);
        overlay.remove();
        resolve();
      }
    };

    // Slight delay before appearing (200ms) to avoid flash on accidental presses
    overlay.style.opacity = "0";
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = "1";
      document.addEventListener("keydown", keyHandler, true);
      continueBtn.focus();
    }, 200);
  });
}
