import type { BadgeDefinition } from "./BadgeCatalog";
import type { BadgeState } from "./BadgeState";
import type { UserStats } from "../UserStats";

export interface BadgeUnlockEvent {
  badge: BadgeDefinition;
  earnedAt: number;
}

export class BadgeEngine {
  private catalog: BadgeDefinition[];

  constructor(catalog: BadgeDefinition[]) {
    this.catalog = catalog;
  }

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

  getEarnedBadges(state: BadgeState): BadgeDefinition[] {
    const earnedIds = new Set(state.earned.map((e) => e.id));
    return this.catalog.filter((b) => earnedIds.has(b.id));
  }

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
