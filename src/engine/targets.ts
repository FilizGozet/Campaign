import type { SpendingGrowthConditions } from "@/domain/types";

/**
 * Personalised spending target for the spending-growth objective.
 *
 *  - fixed:   every customer must reach the same amount over the campaign period
 *  - dynamic: target = historical average × (1 + increase%) scaled to the period
 */
export function personalTarget(
  historicalMonthlyAverage: number,
  conditions: Pick<SpendingGrowthConditions, "targetType" | "fixedTarget" | "increasePct" | "durationDays">,
): number {
  if (conditions.targetType === "fixed") return conditions.fixedTarget;
  const periodBaseline = historicalMonthlyAverage * (conditions.durationDays / 30);
  return roundTo(periodBaseline * (1 + conditions.increasePct), 1);
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
