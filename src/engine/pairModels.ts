/**
 * Customer–campaign pair models (DEMO).
 *
 * For every (customer, campaign conditions) pair we estimate:
 *
 *   pNatural  – probability the customer meets the condition WITHOUT the campaign,
 *               assuming their recent behaviour continues (a counterfactual
 *               *assumption*, not a measured control group).
 *   pQualify  – pNatural + (1 − pNatural) × uplift
 *
 * where `uplift` is a bounded heuristic of:
 *   reach × responseScore × rewardAttractiveness × feasibility × durationFactor
 *
 * Coherence rules the formulas guarantee:
 *   • Harder requirements lower pNatural (via the lognormal / Poisson tails)
 *     and lower feasibility, so qualification generally decreases.
 *   • Reward attractiveness is monotone in reward value. This is a modelling
 *     assumption about association, NOT a proven causal effect.
 *   • Natural qualifiers contribute zero incremental spending; induced
 *     qualifiers contribute the gap between their requirement and baseline.
 *
 * These are illustrative formulas for a prototype — they are not trained or
 * validated predictive models.
 */
import type {
  AcquisitionConditions,
  CampaignConditions,
  CategoryGrowthConditions,
  Customer,
  ProductAdoptionConditions,
  ReactivationConditions,
  SpendingGrowthConditions,
  TransactionFrequencyConditions,
} from "@/domain/types";
import { avgTicket, getCustomerShare } from "@/data/population";
import { clamp, lnConditionalMean, lnExceed, periodProbability, poissonAtLeast, type Lognormal } from "./math";
import { headlineReward, minimumRewardSpend, type SpendShape } from "./rewards";
import { personalTarget } from "./targets";

export interface PairEstimate {
  eligible: boolean;
  pNatural: number;
  pQualify: number;
  /** Qualifying-spend shape for customers who would qualify anyway. */
  naturalShape: SpendShape;
  /** Qualifying-spend shape for customers induced to qualify. */
  inducedShape: SpendShape;
  incSpendPerInduced: number;
  incTxPerInduced: number;
  /** Expected transactions in the period without the campaign. */
  baselineTx: number;
  subsequentSpendPerQualifier: number;
  firstUseProb: number;
}

export interface EngineOptions {
  /** Scales the response assumption (sensitivity analysis). Default 1. */
  responseMultiplier: number;
}

export const DEFAULT_OPTIONS: EngineOptions = { responseMultiplier: 1 };

const NOT_ELIGIBLE: PairEstimate = {
  eligible: false,
  pNatural: 0,
  pQualify: 0,
  naturalShape: { kind: "point", value: 0 },
  inducedShape: { kind: "point", value: 0 },
  incSpendPerInduced: 0,
  incTxPerInduced: 0,
  baselineTx: 0,
  subsequentSpendPerQualifier: 0,
  firstUseProb: 0,
};

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Feasibility of stretching to a requirement `ratio` × the expected baseline. */
export function feasibility(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return ratio <= 1 ? 1 : Math.exp(-1.6 * (ratio - 1));
}

/**
 * Reward attractiveness in [0, 1]: blends the reward rate relative to the
 * requirement with the absolute salience of the reward amount.
 */
export function attractiveness(rewardValue: number, requirementValue: number): number {
  if (rewardValue <= 0) return 0;
  const rate = rewardValue / Math.max(requirementValue, 100);
  const rateComponent = 1 - Math.exp(-rate / 0.08);
  const salience = 1 - Math.exp(-rewardValue / 150);
  return 0.5 * rateComponent + 0.5 * salience;
}

export function durationFactor(days: number): number {
  return clamp(Math.sqrt(days / 30), 0.5, 1.4);
}

export function uplift(args: {
  reach: number;
  response: number;
  rewardValue: number;
  requirementValue: number;
  feasibility: number;
  durationDays: number;
  options: EngineOptions;
}): number {
  const response = clamp(args.response * args.options.responseMultiplier, 0, 1);
  const u =
    args.reach *
    response *
    attractiveness(args.rewardValue, args.requirementValue) *
    args.feasibility *
    durationFactor(args.durationDays);
  return clamp(u, 0, 0.85);
}

const combine = (pNatural: number, u: number) => clamp(pNatural + (1 - pNatural) * u, 0, 1);

const isActiveCustomer = (c: Customer) => c.type === "customer" && c.monthlySpend > 0 && c.daysSinceLastTx < 30;

const CHANNEL_SHARE = { tum: 1, pos: 0.62, eticaret: 0.26, mobil: 0.12 } as const;
const MERCHANT_SCOPE = { tum_isyerleri: 1, anlasmali_isyerleri: 0.55, secili_markalar: 0.3 } as const;

// ---------------------------------------------------------------------------
// A — Spending growth
// ---------------------------------------------------------------------------

export function spendingGrowthPair(c: Customer, k: SpendingGrowthConditions, o: EngineOptions): PairEstimate {
  if (!isActiveCustomer(c)) return NOT_ELIGIBLE;
  const scope =
    (k.eligibleCategory === "tum" ? 1 : getCustomerShare(c, k.eligibleCategory)) * CHANNEL_SHARE[k.channel];
  const months = k.durationDays / 30;
  const historical = c.monthlySpend * scope; // monthly, in scope
  const baseline = Math.max(historical * c.spendTrend * months, 1); // counterfactual for the period
  const target = Math.max(personalTarget(historical, k), minimumRewardSpend(k.reward));
  const dist: Lognormal = { mean: baseline, sigma: 0.35 };

  const pNatural = lnExceed(dist, target);
  const u = uplift({
    reach: 0.6,
    response: c.responseScore,
    rewardValue: headlineReward(k.reward, target),
    requirementValue: target,
    feasibility: feasibility(target / baseline),
    durationDays: k.durationDays,
    options: o,
  });
  const inducedSpend = target * 1.04;
  const incSpend = Math.max(0, inducedSpend - baseline);
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape: { kind: "conditional", dist, threshold: target },
    inducedShape: { kind: "point", value: inducedSpend },
    incSpendPerInduced: incSpend,
    incTxPerInduced: incSpend / Math.max(avgTicket(c), 1),
    baselineTx: c.monthlyTx * c.spendTrend * months,
    subsequentSpendPerQualifier: 0,
    firstUseProb: 0,
  };
}

// ---------------------------------------------------------------------------
// B — Reactivation
// ---------------------------------------------------------------------------

export function naturalReactivationRate(c: Customer): number {
  if (c.neverUsedCard) return 0.012;
  if (c.daysSinceLastTx < 90) return 0.1;
  if (c.daysSinceLastTx < 180) return 0.05;
  return 0.022;
}

export function reactivationPair(c: Customer, k: ReactivationConditions, o: EngineOptions): PairEstimate {
  const eligible = c.type === "customer" && (c.neverUsedCard || c.daysSinceLastTx >= k.inactivityDays);
  if (!eligible) return NOT_ELIGIBLE;
  const months = k.durationDays / 30;
  const reference = c.historicalMonthlySpend || 1500;
  const pActive = periodProbability(naturalReactivationRate(c), k.durationDays);
  const activeSpend: Lognormal = { mean: reference * 0.55 * months, sigma: 0.8 };
  const ticket = avgTicket(c);
  const txIfActive = Math.max(1, 3 * months);

  let pCond: number;
  let requirement: number;
  let ratio: number;
  let naturalShape: SpendShape;
  let inducedValue: number;
  let incTx: number;

  switch (k.activationCondition) {
    case "first_transaction": {
      const pTicket = lnExceed({ mean: ticket, sigma: 0.9 }, k.minTxAmount);
      pCond = 1 - Math.pow(1 - pTicket, txIfActive);
      requirement = k.minTxAmount;
      ratio = k.minTxAmount / (ticket * 1.5);
      naturalShape = { kind: "point", value: lnConditionalMean({ mean: ticket, sigma: 0.9 }, k.minTxAmount) };
      inducedValue = k.minTxAmount * 1.1;
      incTx = 1;
      break;
    }
    case "min_total_spend": {
      pCond = lnExceed(activeSpend, k.minTotalSpend);
      requirement = k.minTotalSpend;
      ratio = k.minTotalSpend / activeSpend.mean;
      naturalShape = { kind: "conditional", dist: activeSpend, threshold: k.minTotalSpend };
      inducedValue = k.minTotalSpend * 1.05;
      incTx = inducedValue / ticket;
      break;
    }
    case "tx_count": {
      pCond = poissonAtLeast(k.requiredTxCount, txIfActive);
      requirement = k.requiredTxCount * Math.max(k.minTxAmount, ticket * 0.6);
      ratio = k.requiredTxCount / txIfActive;
      naturalShape = { kind: "point", value: activeSpend.mean };
      inducedValue = requirement;
      incTx = k.requiredTxCount;
      break;
    }
  }

  const pNatural = pActive * pCond;
  const u = uplift({
    reach: 0.55,
    response: c.responseScore,
    rewardValue: headlineReward(k.reward, requirement),
    requirementValue: requirement,
    feasibility: feasibility(ratio),
    durationDays: k.durationDays,
    options: o,
  });
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape,
    inducedShape: { kind: "point", value: inducedValue },
    // Baseline spend for an induced (otherwise inactive) customer is zero.
    incSpendPerInduced: inducedValue,
    incTxPerInduced: incTx,
    baselineTx: pActive * txIfActive,
    // Retention assumption: reactivated customers spend ~40% of their former level for 3 months.
    subsequentSpendPerQualifier: reference * 0.4 * 3,
    firstUseProb: 0,
  };
}

// ---------------------------------------------------------------------------
// C — Category growth
// ---------------------------------------------------------------------------

export function categoryGrowthPair(c: Customer, k: CategoryGrowthConditions, o: EngineOptions): PairEstimate {
  if (!isActiveCustomer(c)) return NOT_ELIGIBLE;
  const months = k.durationDays / 30;
  const scope = MERCHANT_SCOPE[k.merchantScope];
  const share = getCustomerShare(c, k.category);
  const baseline = Math.max(c.monthlySpend * c.spendTrend * share * months * scope, 1);
  const nCat = c.monthlyTx * share * months * scope;
  const ticket = nCat > 0.2 ? baseline / nCat : avgTicket(c);
  // Capacity: even category-passive customers can shift part of their wallet.
  const capacity = Math.max(baseline, 0.12 * c.monthlySpend * months * scope);

  let pNatural: number;
  let requirement: number;
  let ratio: number;
  let naturalShape: SpendShape;
  let inducedValue: number;
  let incSpend: number;
  let incTx: number;

  switch (k.spendCondition) {
    case "total_spend": {
      const dist: Lognormal = { mean: baseline, sigma: 0.55 };
      const threshold = Math.max(k.minCategorySpend, minimumRewardSpend(k.reward));
      pNatural = lnExceed(dist, threshold);
      requirement = threshold;
      ratio = threshold / capacity;
      naturalShape = { kind: "conditional", dist, threshold };
      inducedValue = threshold * 1.04;
      incSpend = Math.max(0, inducedValue - baseline);
      incTx = incSpend / ticket;
      break;
    }
    case "single_transaction": {
      const tDist: Lognormal = { mean: ticket, sigma: 0.7 };
      const q = lnExceed(tDist, k.minCategorySpend);
      pNatural = 1 - Math.pow(1 - q, Math.max(nCat, 0));
      requirement = k.minCategorySpend;
      ratio = k.minCategorySpend / (Math.max(ticket, capacity / 3) * 1.6);
      naturalShape = { kind: "point", value: lnConditionalMean(tDist, k.minCategorySpend) };
      inducedValue = k.minCategorySpend * 1.05;
      incSpend = Math.max(0, inducedValue - ticket);
      incTx = 1;
      break;
    }
    case "tx_count": {
      pNatural = poissonAtLeast(k.requiredTxCount, nCat);
      const minTicket = Math.max(ticket, 50);
      requirement = k.requiredTxCount * minTicket;
      ratio = k.requiredTxCount / Math.max(nCat, (capacity / minTicket) * 0.5, 0.3);
      naturalShape = { kind: "point", value: Math.max(baseline, requirement) };
      inducedValue = requirement;
      incTx = Math.max(0, k.requiredTxCount - nCat);
      incSpend = incTx * minTicket;
      break;
    }
  }

  const u = uplift({
    reach: 0.6,
    response: c.responseScore,
    rewardValue: headlineReward(k.reward, requirement),
    requirementValue: requirement,
    feasibility: feasibility(ratio),
    durationDays: k.durationDays,
    options: o,
  });
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape,
    inducedShape: { kind: "point", value: inducedValue },
    incSpendPerInduced: incSpend,
    incTxPerInduced: incTx,
    baselineTx: nCat,
    subsequentSpendPerQualifier: 0,
    firstUseProb: 0,
  };
}

// ---------------------------------------------------------------------------
// D — Product adoption
// ---------------------------------------------------------------------------

const ACTION_FACTOR_NEW = { application: 1, activation: 0.75, first_usage: 0.6, first_spend: 0.45 } as const;
const ACTION_FACTOR_DORMANT = { application: 1, activation: 1, first_usage: 0.85, first_spend: 0.7 } as const;
const FIRST_USE = { application: 0.5, activation: 0.65, first_usage: 1, first_spend: 1 } as const;

export function productAdoptionPair(c: Customer, k: ProductAdoptionConditions, o: EngineOptions): PairEstimate {
  if (c.type !== "customer") return NOT_ELIGIBLE;
  const owns = c.products.includes(k.product);
  const dormant = c.dormantProducts.includes(k.product);
  if (owns && !dormant) return NOT_ELIGIBLE; // already an active user
  const months = k.durationDays / 30;
  const action = (dormant ? ACTION_FACTOR_DORMANT : ACTION_FACTOR_NEW)[k.requiredAction];
  const monthlyBase =
    c.productPropensity * 0.05 * (dormant ? 1.8 : 1) * (c.offeredNotConverted.includes(k.product) ? 0.8 : 1);
  const shiftable = Math.max(c.monthlySpend || c.historicalMonthlySpend, 300) * months * 0.35;
  const spendDist: Lognormal = { mean: shiftable, sigma: 0.8 };
  const needsSpend = k.requiredAction === "first_spend";
  const pSpend = needsSpend ? lnExceed(spendDist, k.requiredSpend) : 1;

  const pNatural = periodProbability(monthlyBase, k.durationDays) * action * pSpend;
  const requirement = needsSpend ? k.requiredSpend : 1000;
  const u = uplift({
    reach: 0.6,
    response: c.responseScore * (0.5 + c.productPropensity),
    rewardValue: headlineReward(k.reward, requirement),
    requirementValue: requirement,
    feasibility: action * (needsSpend ? feasibility(k.requiredSpend / shiftable) : 1),
    durationDays: k.durationDays,
    options: o,
  });
  const firstUse = FIRST_USE[k.requiredAction];
  const inducedValue = needsSpend ? k.requiredSpend * 1.05 : shiftable * firstUse;
  // Assumption: half of new-product spending shifts from other instruments.
  const incSpend = inducedValue * 0.5;
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape: needsSpend
      ? { kind: "conditional", dist: spendDist, threshold: k.requiredSpend }
      : { kind: "point", value: shiftable * firstUse },
    inducedShape: { kind: "point", value: inducedValue },
    incSpendPerInduced: incSpend,
    incTxPerInduced: incSpend / Math.max(avgTicket(c), 1),
    baselineTx: c.monthlyTx * months,
    subsequentSpendPerQualifier: 0,
    firstUseProb: firstUse,
  };
}

// ---------------------------------------------------------------------------
// E — Acquisition
// ---------------------------------------------------------------------------

const ACQ_TYPE = { dijital_musteri: 1, kredi_karti_musterisi: 0.6, maas_musterisi: 0.35 } as const;
const ACQ_ACTION = { mobil_kayit: 1, basvuru_onayi: 0.7, kart_aktivasyonu: 0.55 } as const;
const FIRST_TICKET: Lognormal = { mean: 650, sigma: 0.9 };

export function acquisitionPair(c: Customer, k: AcquisitionConditions, o: EngineOptions): PairEstimate {
  if (c.type !== "prospect") return NOT_ELIGIBLE;
  const base = (c.incompleteApplication ? 0.06 : 0.01) * ACQ_TYPE[k.acquisitionType];
  const action = ACQ_ACTION[k.onboardingAction];
  const pTx = k.requireFirstTransaction ? 0.8 * lnExceed(FIRST_TICKET, k.minFirstTxAmount) : 1;
  const pNatural = periodProbability(base, k.durationDays) * action * pTx;
  const requirement = k.requireFirstTransaction ? Math.max(k.minFirstTxAmount, 100) : 500;
  const u = uplift({
    reach: 0.4,
    response: c.responseScore * ACQ_TYPE[k.acquisitionType],
    rewardValue: headlineReward(k.reward, requirement),
    requirementValue: requirement,
    feasibility: action * (k.requireFirstTransaction ? feasibility(k.minFirstTxAmount / FIRST_TICKET.mean) : 1),
    durationDays: k.durationDays,
    options: o,
  });
  // First-month spending potential of a new customer (estimated, external).
  const firstMonth = c.historicalMonthlySpend * 0.3;
  const shapeValue = k.requireFirstTransaction ? Math.max(k.minFirstTxAmount * 1.1, firstMonth) : firstMonth;
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape: { kind: "point", value: shapeValue },
    inducedShape: { kind: "point", value: shapeValue },
    incSpendPerInduced: firstMonth,
    incTxPerInduced: Math.max(1, firstMonth / FIRST_TICKET.mean),
    baselineTx: 0,
    subsequentSpendPerQualifier: 0,
    firstUseProb: k.requireFirstTransaction ? 1 : 0.6,
  };
}

// ---------------------------------------------------------------------------
// F — Transaction frequency
// ---------------------------------------------------------------------------

export function transactionFrequencyPair(
  c: Customer,
  k: TransactionFrequencyConditions,
  o: EngineOptions,
): PairEstimate {
  if (!isActiveCustomer(c)) return NOT_ELIGIBLE;
  const months = k.durationDays / 30;
  const ticket = avgTicket(c);
  const pAbove = lnExceed({ mean: ticket, sigma: 0.8 }, k.minTxAmount);
  const allTx = c.monthlyTx * c.spendTrend * months;
  const lambda = allTx * pAbove * (k.differentDays ? 0.85 : 1);
  const pNatural = poissonAtLeast(k.requiredTxCount, lambda);
  const unit = Math.max(k.minTxAmount, ticket * 0.6);
  const requirement = k.requiredTxCount * unit;
  const u = uplift({
    reach: 0.6,
    response: c.responseScore,
    rewardValue: headlineReward(k.reward, requirement),
    requirementValue: requirement,
    feasibility: feasibility(k.requiredTxCount / Math.max(lambda, 0.3)),
    durationDays: k.durationDays,
    options: o,
  });
  const incTx = Math.max(0, k.requiredTxCount - lambda);
  const periodSpend = c.monthlySpend * c.spendTrend * months;
  const incSpend = incTx * unit;
  return {
    eligible: true,
    pNatural,
    pQualify: combine(pNatural, u),
    naturalShape: { kind: "point", value: periodSpend },
    inducedShape: { kind: "point", value: periodSpend + incSpend },
    incSpendPerInduced: incSpend,
    incTxPerInduced: incTx,
    baselineTx: allTx,
    subsequentSpendPerQualifier: 0,
    firstUseProb: 0,
  };
}

// ---------------------------------------------------------------------------

export function estimatePair(c: Customer, k: CampaignConditions, o: EngineOptions = DEFAULT_OPTIONS): PairEstimate {
  switch (k.objective) {
    case "spending_growth":
      return spendingGrowthPair(c, k, o);
    case "reactivation":
      return reactivationPair(c, k, o);
    case "category_growth":
      return categoryGrowthPair(c, k, o);
    case "product_adoption":
      return productAdoptionPair(c, k, o);
    case "acquisition":
      return acquisitionPair(c, k, o);
    case "transaction_frequency":
      return transactionFrequencyPair(c, k, o);
  }
}

export function shapeMean(shape: SpendShape): number {
  return shape.kind === "point" ? shape.value : lnConditionalMean(shape.dist, shape.threshold);
}
