import type { BadgeDefinition } from "./BadgeCatalog";
import type { BadgeState } from "./BadgeState";
import type { UserStats } from "../UserStats";

/**
 * Event payload emitted when a badge is newly unlocked during evaluation.
 *
 * Returned by {@link BadgeEngine.evaluate} for each badge whose criteria are
 * met for the first time in a given evaluation pass.
 */
export interface BadgeUnlockEvent {
  /** The full badge definition that was just unlocked. */
  badge: BadgeDefinition;
  /** Unix-millisecond timestamp of when the badge was earned. */
  earnedAt: number;
}

/**
 * Central engine for the gamification badge system.
 *
 * Evaluates a catalog of {@link BadgeDefinition} entries against the user's
 * current {@link UserStats} and {@link BadgeState} to determine which badges
 * have been newly unlocked, which are already earned, and per-category progress.
 *
 * @example
 * ```ts
 * import { BadgeEngine } from "./badges";
 * import { BADGE_CATALOG } from "./badges/BadgeCatalog";
 *
 * const engine = new BadgeEngine(BADGE_CATALOG);
 * const newlyUnlocked = engine.evaluate(stats, badgeState);
 * for (const event of newlyUnlocked) {
 *   console.log(`Unlocked: ${event.badge.name}`);
 * }
 * ```
 *
 * @see {@link BADGE_CATALOG} — the default set of 44 badge definitions
 * @see {@link BadgeState} — persistence model consumed by this engine
 */
export class BadgeEngine {
  private catalog: BadgeDefinition[];

  /**
   * @param catalog - Array of {@link BadgeDefinition} entries to evaluate against.
   */
  constructor(catalog: BadgeDefinition[]) {
    this.catalog = catalog;
  }

  /**
   * Checks all badges in the catalog and returns events for any that are
   * newly unlocked (i.e., criteria met but not yet in {@link BadgeState.earned}).
   *
   * @param stats - Current user statistics to test badge criteria against.
   * @param state - Current badge state containing previously earned badges.
   * @returns Array of {@link BadgeUnlockEvent} for each newly earned badge, or an empty array if none qualify.
   */
  evaluate(stats: UserStats, state: BadgeState): BadgeUnlockEvent[] {
    const earnedIds = new Set(state.earned.map((e) => e.id));
    const now = Date.now();
    const unlocked: BadgeUnlockEvent[] = [];

    for (const badge of this.catalog) {
      if (earnedIds.has(badge.id)) continue;
      if (badge.criteria(stats)) {
        unlocked.push({ badge, earnedAt: now });
      }
    }

    return unlocked;
  }

  /**
   * Returns the full {@link BadgeDefinition} objects for all badges the user
   * has already earned, filtered from the catalog.
   *
   * @param state - Current badge state containing previously earned badges.
   * @returns Array of earned badge definitions, preserving catalog order.
   */
  getEarnedBadges(state: BadgeState): BadgeDefinition[] {
    const earnedIds = new Set(state.earned.map((e) => e.id));
    return this.catalog.filter((b) => earnedIds.has(b.id));
  }

  /**
   * Returns a progress summary for a specific badge category, including the
   * count of earned and total badges and a pointer to the next unearned badge.
   *
   * @param category - Badge category to summarize (e.g. `"drawing"`, `"turtle"`).
   * @param _stats - User statistics (reserved for future criteria-based progress).
   * @param state - Current badge state containing previously earned badges.
   * @returns Object with `earned` count, `total` count, and `nextUnearned` (the first
   *          unearned badge in catalog order, or `null` if all are earned).
   */
  getCategoryProgress(
    category: string,
    _stats: UserStats,
    state: BadgeState,
  ): { earned: number; total: number; nextUnearned: BadgeDefinition | null } {
    const categoryBadges = this.catalog.filter((b) => b.category === category);
    const earnedIds = new Set(state.earned.map((e) => e.id));

    let earnedCount = 0;
    let nextUnearned: BadgeDefinition | null = null;

    for (const badge of categoryBadges) {
      if (earnedIds.has(badge.id)) {
        earnedCount++;
      } else if (!nextUnearned) {
        nextUnearned = badge;
      }
    }

    return { earned: earnedCount, total: categoryBadges.length, nextUnearned };
  }
}
