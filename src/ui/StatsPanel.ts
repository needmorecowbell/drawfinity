import type { UserStats } from "../user/UserStats";
import type { BadgeState } from "../user/badges/BadgeState";
import type { BadgeDefinition, BadgeTier } from "../user/badges/BadgeCatalog";
import { BADGE_CATALOG } from "../user/badges/BadgeCatalog";
import type { CanvasRecords, CanvasRecord } from "../user/CanvasRecords";

export type StatsTabName = "stats" | "badges" | "records";

export interface StatsPanelCallbacks {
  onRefresh: () => { stats: UserStats; badgeState: BadgeState; records: CanvasRecords };
}

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

const BADGE_CATEGORIES = ["all", "drawing", "turtle", "canvas", "collaboration", "dedication"] as const;

const RECORD_META: Record<keyof CanvasRecords, { name: string; category: string; format: (v: number) => string }> = {
  longestSingleStroke: { name: "Longest Single Stroke", category: "Stroke", format: (v) => `${v} points` },
  widestBrushUsed: { name: "Widest Brush Used", category: "Stroke", format: (v) => `${v.toFixed(1)}px` },
  mostTurtlesInOneRun: { name: "Most Turtles in One Run", category: "Turtle", format: (v) => String(v) },
  longestTurtleDistance: { name: "Longest Turtle Distance", category: "Turtle", format: formatDistance },
  mostTurtleTurns: { name: "Most Turtle Turns", category: "Turtle", format: (v) => String(v) },
  fastestTurtleCompletion: { name: "Fastest Turtle Completion", category: "Turtle", format: formatDurationMs },
  longestTurtleRuntime: { name: "Longest Turtle Runtime", category: "Turtle", format: formatDurationMs },
  deepestZoom: { name: "Deepest Zoom", category: "Canvas", format: formatZoom },
  widestZoom: { name: "Widest Zoom", category: "Canvas", format: formatZoom },
  longestPanInOneSession: { name: "Longest Pan in One Session", category: "Canvas", format: formatDistance },
  mostConcurrentCollaborators: { name: "Most Concurrent Collaborators", category: "Collaboration", format: (v) => String(v) },
  longestSession: { name: "Longest Session", category: "Session", format: formatDurationMs },
  mostStrokesInOneSession: { name: "Most Strokes in One Session", category: "Session", format: (v) => String(v) },
};

function formatDistance(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}km`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}m`;
  return `${v.toFixed(1)}u`;
}

function formatZoom(v: number): string {
  if (v === 0) return "\u2014";
  if (v >= 1000 || v < 0.01) {
    const exp = Math.floor(Math.log10(v));
    const mantissa = v / Math.pow(10, exp);
    return `${mantissa.toFixed(1)}\u00d710${superscript(exp)}`;
  }
  return `${v.toFixed(2)}x`;
}

function superscript(n: number): string {
  const map: Record<string, string> = {
    "-": "\u207B", "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3",
    "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079",
  };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

function formatDurationMs(ms: number): string {
  if (ms === 0) return "\u2014";
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function formatCumulativeTime(ms: number): string {
  if (ms === 0) return "\u2014";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours}h ${mins}m`;
}

function formatDate(ts: number): string {
  if (ts === 0) return "\u2014";
  return new Date(ts).toLocaleDateString();
}

/**
 * Modal panel for viewing gamification stats, badges, and personal records.
 *
 * Tabbed interface with three views: Stats overview, Badge grid, and Records table.
 * Toggled with `Ctrl+Shift+S`. Clicking the overlay backdrop dismisses the panel.
 */
export class StatsPanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private visible = false;
  private activeTab: StatsTabName = "stats";
  private badgeFilter: string = "all";

  private stats: UserStats;
  private badgeState: BadgeState;
  private records: CanvasRecords;
  private callbacks: StatsPanelCallbacks;

  private tabContent!: HTMLElement;
  private tabButtons: HTMLButtonElement[] = [];

  constructor(
    stats: UserStats,
    badgeState: BadgeState,
    records: CanvasRecords,
    callbacks: StatsPanelCallbacks,
  ) {
    this.stats = stats;
    this.badgeState = badgeState;
    this.records = records;
    this.callbacks = callbacks;

    this.overlay = document.createElement("div");
    this.overlay.id = "stats-overlay";
    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.panel = document.createElement("div");
    this.panel.id = "stats-panel";
    this.build();
    this.overlay.appendChild(this.panel);
  }

  private build(): void {
    // Title
    const title = document.createElement("div");
    title.className = "stats-title";
    title.textContent = "Stats & Achievements";
    this.panel.appendChild(title);

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "stats-tab-bar";
    const tabs: { id: StatsTabName; label: string }[] = [
      { id: "stats", label: "Stats" },
      { id: "badges", label: "Badges" },
      { id: "records", label: "Records" },
    ];
    for (const tab of tabs) {
      const btn = document.createElement("button");
      btn.className = "stats-tab-btn";
      btn.textContent = tab.label;
      btn.dataset.tab = tab.id;
      if (tab.id === this.activeTab) btn.classList.add("active");
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.switchTab(tab.id);
      });
      tabBar.appendChild(btn);
      this.tabButtons.push(btn);
    }
    this.panel.appendChild(tabBar);

    // Tab content container
    this.tabContent = document.createElement("div");
    this.tabContent.className = "stats-tab-content";
    this.panel.appendChild(this.tabContent);

    this.renderActiveTab();

    // Close button
    const btnRow = document.createElement("div");
    btnRow.className = "stats-btn-row";
    const closeBtn = document.createElement("button");
    closeBtn.className = "stats-btn stats-btn-secondary";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.hide();
    });
    btnRow.appendChild(closeBtn);
    this.panel.appendChild(btnRow);
  }

  private switchTab(tab: StatsTabName): void {
    this.activeTab = tab;
    for (const btn of this.tabButtons) {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    }
    this.renderActiveTab();
  }

  /** Switch to a specific tab programmatically. */
  showTab(tab: StatsTabName): void {
    this.switchTab(tab);
  }

  private renderActiveTab(): void {
    this.tabContent.innerHTML = "";
    switch (this.activeTab) {
      case "stats":
        this.renderStatsTab();
        break;
      case "badges":
        this.renderBadgesTab();
        break;
      case "records":
        this.renderRecordsTab();
        break;
    }
  }

  // --- Stats Tab ---
  private renderStatsTab(): void {
    const s = this.stats;

    this.renderSection("Drawing", [
      ["Total Strokes", String(s.totalStrokes)],
      ["Total Shapes", String(s.totalShapes)],
      ["Erases", String(s.totalEraseActions)],
      ["Undos", String(s.totalUndos)],
      ["Redos", String(s.totalRedos)],
      ["Exports", String(s.totalExports)],
    ]);

    this.renderSection("Turtle Graphics", [
      ["Total Runs", String(s.totalTurtleRuns)],
      ["Turtles Spawned", String(s.totalTurtlesSpawned)],
      ["Forward Distance", formatDistance(s.totalTurtleForwardDistance)],
      ["Total Turns", String(s.totalTurtleTurns)],
      ["Scripts Imported", String(s.exchangeScriptsImported)],
      ["Errors", String(s.totalTurtleErrors)],
    ]);

    this.renderSection("Canvas", [
      ["Max Zoom", formatZoom(s.maxZoomLevel)],
      ["Min Zoom", formatZoom(s.minZoomLevel)],
      ["Pan Distance", formatDistance(s.totalPanDistance)],
      ["Bookmarks", String(s.bookmarksCreated)],
    ]);

    this.renderSection("Collaboration", [
      ["Sessions", String(s.totalCollabSessions)],
      ["Rooms Created", String(s.totalCollabRoomsCreated)],
      ["Scripts Shared", String(s.scriptsSharedToRoom)],
    ]);

    this.renderSection("Time", [
      ["First Session", formatDate(s.firstSessionAt)],
      ["Total Sessions", String(s.totalDrawingSessions)],
      ["Cumulative Time", formatCumulativeTime(s.totalSessionDurationMs)],
    ]);
  }

  private renderSection(title: string, items: [string, string][]): void {
    const section = document.createElement("div");
    section.className = "stats-section";

    const header = document.createElement("div");
    header.className = "stats-section-header";
    header.textContent = title;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    for (const [label, value] of items) {
      const labelEl = document.createElement("span");
      labelEl.className = "stats-grid-label";
      labelEl.textContent = label;
      grid.appendChild(labelEl);

      const valueEl = document.createElement("span");
      valueEl.className = "stats-grid-value";
      valueEl.textContent = value;
      grid.appendChild(valueEl);
    }
    section.appendChild(grid);
    this.tabContent.appendChild(section);
  }

  // --- Badges Tab ---
  private renderBadgesTab(): void {
    // Filter buttons
    const filterRow = document.createElement("div");
    filterRow.className = "stats-badge-filters";
    for (const cat of BADGE_CATEGORIES) {
      const btn = document.createElement("button");
      btn.className = "stats-badge-filter-btn";
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.dataset.category = cat;
      if (cat === this.badgeFilter) btn.classList.add("active");
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.badgeFilter = cat;
        for (const b of filterRow.querySelectorAll(".stats-badge-filter-btn")) {
          (b as HTMLElement).classList.toggle("active", (b as HTMLElement).dataset.category === cat);
        }
        this.renderBadgeGrid(gridContainer);
      });
      filterRow.appendChild(btn);
    }
    this.tabContent.appendChild(filterRow);

    // Badge grid
    const gridContainer = document.createElement("div");
    gridContainer.className = "stats-badge-grid";
    this.tabContent.appendChild(gridContainer);
    this.renderBadgeGrid(gridContainer);
  }

  private renderBadgeGrid(container: HTMLElement): void {
    container.innerHTML = "";
    const earnedIds = new Set(this.badgeState.earned.map((e) => e.id));
    const earnedMap = new Map(this.badgeState.earned.map((e) => [e.id, e.earnedAt]));

    const badges = this.badgeFilter === "all"
      ? BADGE_CATALOG
      : BADGE_CATALOG.filter((b) => b.category === this.badgeFilter);

    for (const badge of badges) {
      const earned = earnedIds.has(badge.id);
      const card = document.createElement("div");
      card.className = "stats-badge-card" + (earned ? " earned" : " locked");

      const icon = document.createElement("div");
      icon.className = "stats-badge-icon";
      icon.textContent = badge.icon;
      card.appendChild(icon);

      const name = document.createElement("div");
      name.className = "stats-badge-name";
      name.textContent = badge.name;
      card.appendChild(name);

      const tier = document.createElement("span");
      tier.className = "stats-badge-tier";
      tier.textContent = badge.tier;
      tier.style.color = TIER_COLORS[badge.tier];
      card.appendChild(tier);

      const desc = document.createElement("div");
      desc.className = "stats-badge-desc";
      desc.textContent = badge.description;
      card.appendChild(desc);

      if (earned) {
        const date = document.createElement("div");
        date.className = "stats-badge-date";
        date.textContent = formatDate(earnedMap.get(badge.id) ?? 0);
        card.appendChild(date);
      } else {
        const progress = this.getBadgeProgress(badge);
        if (progress) {
          const bar = document.createElement("div");
          bar.className = "stats-badge-progress";
          const fill = document.createElement("div");
          fill.className = "stats-badge-progress-fill";
          fill.style.width = `${Math.min(100, progress.pct)}%`;
          bar.appendChild(fill);
          card.appendChild(bar);

          const progressLabel = document.createElement("div");
          progressLabel.className = "stats-badge-progress-label";
          progressLabel.textContent = progress.label;
          card.appendChild(progressLabel);
        }
      }

      container.appendChild(card);
    }
  }

  private getBadgeProgress(badge: BadgeDefinition): { pct: number; label: string } | null {
    const s = this.stats;
    const thresholds: Record<string, { current: number; target: number }> = {
      "first-stroke": { current: s.totalStrokes, target: 1 },
      "centurion": { current: s.totalStrokes, target: 100 },
      "thousand-strokes": { current: s.totalStrokes, target: 1000 },
      "ten-thousand-strokes": { current: s.totalStrokes, target: 10000 },
      "shape-maker": { current: s.totalShapes, target: 1 },
      "geometry-buff": { current: s.totalShapes, target: 50 },
      "clean-slate": { current: s.totalEraseActions, target: 1 },
      "serial-eraser": { current: s.totalEraseActions, target: 100 },
      "time-traveler": { current: s.totalUndos, target: 10 },
      "undo-addict": { current: s.totalUndos, target: 500 },
      "first-turtle": { current: s.totalTurtleRuns, target: 1 },
      "turtle-veteran": { current: s.totalTurtleRuns, target: 50 },
      "turtle-master": { current: s.totalTurtleRuns, target: 200 },
      "herd-leader": { current: s.totalTurtlesSpawned, target: 1 },
      "turtle-rancher": { current: s.totalTurtlesSpawned, target: 50 },
      "mega-herd": { current: s.totalTurtlesSpawned, target: 500 },
      "marathon-turtle": { current: s.totalTurtleForwardDistance, target: 100000 },
      "script-collector": { current: s.exchangeScriptsImported, target: 3 },
      "exchange-connoisseur": { current: s.exchangeScriptsImported, target: 10 },
      "debug-warrior": { current: s.totalTurtleErrors, target: 10 },
      "explorer": { current: s.totalPanDistance, target: 10000 },
      "cartographer": { current: s.bookmarksCreated, target: 5 },
      "exporter": { current: s.totalExports, target: 1 },
      "portfolio": { current: s.totalExports, target: 10 },
      "social-butterfly": { current: s.totalCollabSessions, target: 1 },
      "regular-collaborator": { current: s.totalCollabSessions, target: 10 },
      "script-sharer": { current: s.scriptsSharedToRoom, target: 1 },
      "getting-started": { current: s.totalDrawingSessions, target: 1 },
      "regular": { current: s.totalDrawingSessions, target: 10 },
      "dedicated": { current: s.totalDrawingSessions, target: 50 },
      "marathon-session": { current: s.totalSessionDurationMs, target: 3600000 },
      "power-user": { current: s.totalSessionDurationMs, target: 36000000 },
    };

    const entry = thresholds[badge.id];
    if (!entry) return null;

    const pct = (entry.current / entry.target) * 100;
    return { pct, label: `${Math.min(entry.current, entry.target)}/${entry.target}` };
  }

  // --- Records Tab ---
  private renderRecordsTab(): void {
    const table = document.createElement("table");
    table.className = "stats-records-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const h of ["Record", "Value", "Date"]) {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // Group by category
    const categories = ["Stroke", "Turtle", "Canvas", "Collaboration", "Session"];
    for (const cat of categories) {
      const keys = (Object.keys(RECORD_META) as (keyof CanvasRecords)[]).filter(
        (k) => RECORD_META[k].category === cat,
      );
      if (keys.length === 0) continue;

      // Category header row
      const catRow = document.createElement("tr");
      catRow.className = "stats-records-category";
      const catCell = document.createElement("td");
      catCell.colSpan = 3;
      catCell.textContent = cat;
      catRow.appendChild(catCell);
      tbody.appendChild(catRow);

      for (const key of keys) {
        const meta = RECORD_META[key];
        const record: CanvasRecord = this.records[key];
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = meta.name;
        row.appendChild(nameCell);

        const valueCell = document.createElement("td");
        valueCell.textContent = record.value === 0 ? "\u2014" : meta.format(record.value);
        row.appendChild(valueCell);

        const dateCell = document.createElement("td");
        dateCell.textContent = record.value === 0 ? "\u2014" : formatDate(record.achievedAt);
        row.appendChild(dateCell);

        tbody.appendChild(row);
      }
    }

    table.appendChild(tbody);
    this.tabContent.appendChild(table);
  }

  // --- Public API ---

  show(): void {
    if (this.visible) return;
    // Refresh data each time the panel is opened
    const data = this.callbacks.onRefresh();
    this.stats = data.stats;
    this.badgeState = data.badgeState;
    this.records = data.records;
    this.renderActiveTab();
    this.visible = true;
    document.body.appendChild(this.overlay);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.remove();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.hide();
  }
}
