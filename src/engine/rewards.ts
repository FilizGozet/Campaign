import type { RewardMechanism, RewardTier } from "@/domain/types";
import { lnExceed, lnPartialExpectation, type Lognormal } from "./math";

/**
 * Reward cost rules.
 *
 * A qualifier's qualifying spending is described either as a single point
 * (e.g. an induced customer who stretches to just above the threshold) or as a
 * lognormal distribution conditioned on being at or above the threshold
 * (customers who would have qualified anyway). Each reward mechanism has its
 * own expected-cost rule:
 *
 *  - fixed:      cost = amount
 *  - percentage: cost = rate × E[spend]
 *  - capped:     cost = E[min(rate × spend, cap)]
 *  - tiered:     cost = Σ P(tier) × tier reward (highest tier reached)
 */

export type SpendShape =
  | { kind: "point"; value: number }
  | { kind: "conditional"; dist: Lognormal; threshold: number };

export function sortedTiers(tiers: RewardTier[]): RewardTier[] {
  return [...tiers].filter((t) => t.reward > 0).sort((a, b) => a.minSpend - b.minSpend);
}

/** Reward earned for an exact qualifying spend amount. */
export function rewardForSpend(reward: RewardMechanism, spend: number): number {
  switch (reward.type) {
    case "fixed":
      return reward.amount;
    case "percentage":
      return reward.rate * spend;
    case "capped":
      return Math.min(reward.rate * spend, reward.cap);
    case "tiered": {
      let r = 0;
      for (const t of sortedTiers(reward.tiers)) if (spend >= t.minSpend) r = t.reward;
      return r;
    }
  }
}

/** Expected reward per qualifier, given the shape of their qualifying spending. */
export function expectedReward(reward: RewardMechanism, shape: SpendShape): number {
  if (shape.kind === "point") return rewardForSpend(reward, shape.value);

  const { dist, threshold } = shape;
  const pQ = lnExceed(dist, threshold);
  if (pQ < 1e-9) return rewardForSpend(reward, Math.max(threshold, dist.mean));

  switch (reward.type) {
    case "fixed":
      return reward.amount;
    case "percentage":
      return (reward.rate * lnPartialExpectation(dist, threshold)) / pQ;
    case "capped": {
      if (reward.rate <= 0) return 0;
      const k = Math.max(threshold, reward.cap / reward.rate);
      const below = reward.rate * (lnPartialExpectation(dist, threshold) - lnPartialExpectation(dist, k));
      const above = reward.cap * lnExceed(dist, k);
      return (below + above) / pQ;
    }
    case "tiered": {
      const tiers = sortedTiers(reward.tiers);
      let total = 0;
      for (let i = 0; i < tiers.length; i++) {
        const lo = Math.max(threshold, tiers[i].minSpend);
        const hi = i + 1 < tiers.length ? Math.max(threshold, tiers[i + 1].minSpend) : Infinity;
        if (hi <= lo) continue;
        const pBand = lnExceed(dist, lo) - (hi === Infinity ? 0 : lnExceed(dist, hi));
        total += pBand * tiers[i].reward;
      }
      return total / pQ;
    }
  }
}

/** Reward value a customer would earn by just meeting the requirement (drives attractiveness). */
export function headlineReward(reward: RewardMechanism, requiredSpend: number): number {
  if (reward.type === "tiered") {
    const tiers = sortedTiers(reward.tiers);
    if (!tiers.length) return 0;
    const reachable = tiers.filter((t) => t.minSpend <= Math.max(requiredSpend, tiers[0].minSpend));
    return (reachable[reachable.length - 1] ?? tiers[0]).reward;
  }
  return rewardForSpend(reward, Math.max(requiredSpend, 1));
}

/** Lowest spending that earns any reward (relevant for tiered rewards). */
export function minimumRewardSpend(reward: RewardMechanism): number {
  if (reward.type !== "tiered") return 0;
  const tiers = sortedTiers(reward.tiers);
  return tiers.length ? tiers[0].minSpend : 0;
}

export function validateReward(reward: RewardMechanism): string[] {
  const errors: string[] = [];
  switch (reward.type) {
    case "fixed":
      if (!(reward.amount > 0)) errors.push("Bonus tutarı sıfırdan büyük olmalıdır.");
      break;
    case "percentage":
      if (!(reward.rate > 0 && reward.rate <= 0.5)) errors.push("İade oranı %0 ile %50 arasında olmalıdır.");
      break;
    case "capped":
      if (!(reward.rate > 0 && reward.rate <= 0.5)) errors.push("İade oranı %0 ile %50 arasında olmalıdır.");
      if (!(reward.cap > 0)) errors.push("Üst limit sıfırdan büyük olmalıdır.");
      break;
    case "tiered": {
      const tiers = reward.tiers;
      if (tiers.length < 2) errors.push("Kademeli ödül için en az 2 kademe tanımlayın.");
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].minSpend <= tiers[i - 1].minSpend) errors.push("Kademe eşikleri artan sırada olmalıdır.");
        if (tiers[i].reward < tiers[i - 1].reward) errors.push("Üst kademelerin ödülü alt kademelerden düşük olamaz.");
      }
      if (tiers.some((t) => !(t.reward > 0) || !(t.minSpend > 0))) errors.push("Tüm kademelerde eşik ve ödül pozitif olmalıdır.");
      break;
    }
  }
  return [...new Set(errors)];
}
