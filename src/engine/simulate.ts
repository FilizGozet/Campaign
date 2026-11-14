/**
 * Demo simulation engine.
 *
 * simulate(request) is a pure, deterministic function: identical requests
 * always produce identical results (see `inputHash`). It:
 *
 *  1. resolves the audience from the synthetic population,
 *  2. applies campaign eligibility rules per customer–campaign pair,
 *  3. estimates pair-level qualification (pairModels.ts),
 *  4. computes reward cost per mechanism (rewards.ts),
 *  5. applies the budget constraint (campaign closes when budget is exhausted),
 *  6. aggregates to segment level, and derives every total FROM the segments
 *     so cards, charts and tables always agree.
 */
import type {
  CampaignConditions,
  CustomerSegmentId,
  SegmentPrediction,
  SimulationRequest,
  SimulationResult,
} from "@/domain/types";
import { contextFromConditions, resolveAudience } from "@/data/audiences";
import { hasControlGroupHistory } from "@/data/historical";
import { safeDiv } from "./math";
import { DEFAULT_OPTIONS, estimatePair, shapeMean, type EngineOptions } from "./pairModels";
import { expectedReward } from "./rewards";
import { buildReliability } from "./reliability";
import { hashInputs } from "./hash";

export const ENGINE_VERSION = "demo-sim 0.3";

interface SegmentAccumulator {
  eligible: number;
  natural: number;
  qualified: number;
  observed: number;
  incremental: number;
  incTx: number;
  cost: number;
  baselineTx: number;
  subsequent: number;
  firstUse: number;
  coverage: number;
}

const emptyAcc = (): SegmentAccumulator => ({
  eligible: 0,
  natural: 0,
  qualified: 0,
  observed: 0,
  incremental: 0,
  incTx: 0,
  cost: 0,
  baselineTx: 0,
  subsequent: 0,
  firstUse: 0,
  coverage: 0,
});

interface CoreResult {
  audienceSize: number;
  segments: Map<CustomerSegmentId, SegmentAccumulator>;
  uncappedCost: number;
}

/** Aggregates pair-level estimates without budget constraints. */
function runCore(request: SimulationRequest, options: EngineOptions): CoreResult {
  const k = request.conditions;
  const audience = resolveAudience(request.audience, contextFromConditions(k));
  const segments = new Map<CustomerSegmentId, SegmentAccumulator>();
  let uncappedCost = 0;
  let audienceSize = 0;

  for (const c of audience.customers) {
    audienceSize += c.weight;
    const est = estimatePair(c, k, options);
    if (!est.eligible) continue;
    const w = c.weight;
    const natural = w * est.pNatural;
    const qualified = w * est.pQualify;
    const induced = qualified - natural;
    const cost = natural * expectedReward(k.reward, est.naturalShape) + induced * expectedReward(k.reward, est.inducedShape);

    let acc = segments.get(c.segmentId);
    if (!acc) segments.set(c.segmentId, (acc = emptyAcc()));
    acc.eligible += w;
    acc.natural += natural;
    acc.qualified += qualified;
    acc.observed += natural * shapeMean(est.naturalShape) + induced * shapeMean(est.inducedShape);
    acc.incremental += induced * est.incSpendPerInduced;
    acc.incTx += induced * est.incTxPerInduced;
    acc.cost += cost;
    acc.baselineTx += w * est.baselineTx;
    acc.subsequent += qualified * est.subsequentSpendPerQualifier;
    acc.firstUse += qualified * est.firstUseProb;
    acc.coverage += w * c.dataCoverage;
    uncappedCost += cost;
  }
  return { audienceSize, segments, uncappedCost };
}

/**
 * Budget rule: rewards are paid first-come until the budget is exhausted, then
 * the campaign closes. We assume participation stops proportionally, so all
 * outcome quantities (qualifiers, spending, cost) scale by budget / uncappedCost.
 */
export function budgetScale(uncappedCost: number, budget: number): number {
  if (budget <= 0) return 0;
  return uncappedCost > budget ? budget / uncappedCost : 1;
}

function qualifiedOnly(request: SimulationRequest, options: EngineOptions): number {
  const core = runCore(request, options);
  const f = budgetScale(core.uncappedCost, request.conditions.budget);
  let q = 0;
  for (const a of core.segments.values()) q += a.qualified * f;
  return q;
}

export function simulate(request: SimulationRequest, options: EngineOptions = DEFAULT_OPTIONS): SimulationResult {
  const k: CampaignConditions = request.conditions;
  const core = runCore(request, options);
  const f = budgetScale(core.uncappedCost, k.budget);

  const segments: SegmentPrediction[] = [...core.segments.entries()]
    .map(([segmentId, a]) => ({
      segmentId,
      eligibleCustomers: a.eligible,
      naturalQualifiers: a.natural * f,
      qualifiedCustomers: a.qualified * f,
      qualificationRate: safeDiv(a.qualified * f, a.eligible),
      observedSpending: a.observed * f,
      incrementalSpending: a.incremental * f,
      incrementalTransactions: a.incTx * f,
      totalCost: a.cost * f,
      dataCoverage: safeDiv(a.coverage, a.eligible),
    }))
    .sort((x, y) => y.eligibleCustomers - x.eligibleCustomers);

  // Totals are derived from the segments so every view stays consistent.
  const sum = (key: keyof SegmentPrediction) => segments.reduce((acc, s) => acc + (s[key] as number), 0);
  const eligible = sum("eligibleCustomers");
  const qualified = sum("qualifiedCustomers");
  const unconstrained = [...core.segments.values()].reduce((a, s) => a + s.qualified, 0);
  const cost = sum("totalCost");
  const incremental = sum("incrementalSpending");
  const incTx = sum("incrementalTransactions");
  const baselineTx = [...core.segments.values()].reduce((a, s) => a + s.baselineTx, 0);
  const subsequent = [...core.segments.values()].reduce((a, s) => a + s.subsequent * f, 0);
  const firstUse = [...core.segments.values()].reduce((a, s) => a + s.firstUse * f, 0);
  const coverage = safeDiv([...core.segments.values()].reduce((a, s) => a + s.coverage, 0), eligible);

  const isSensitivityRun = options.responseMultiplier !== 1;
  const sensitivity = isSensitivityRun
    ? { low: qualified, high: qualified }
    : {
        low: qualifiedOnly(request, { responseMultiplier: 0.75 }),
        high: qualifiedOnly(request, { responseMultiplier: 1.25 }),
      };
  const reliability = buildReliability({ conditions: k, eligibleCustomers: eligible, dataCoverage: coverage, sensitivity });
  const incrementalValidated =
    (k.objective === "spending_growth" || k.objective === "category_growth" || k.objective === "transaction_frequency") &&
    hasControlGroupHistory(k.objective) &&
    coverage >= 0.8 &&
    reliability.withinSupportedRange;

  return {
    inputHash: hashInputs({ v: ENGINE_VERSION, objective: request.objective, audience: request.audience, conditions: k, options }),
    engineVersion: ENGINE_VERSION,
    source: "demo",
    objective: k.objective,
    audienceSize: core.audienceSize,
    eligibleCustomers: eligible,
    naturalQualifiers: sum("naturalQualifiers"),
    qualifiedCustomers: qualified,
    unconstrainedQualified: unconstrained,
    qualificationRate: safeDiv(qualified, eligible),
    observedSpending: sum("observedSpending"),
    incrementalSpending: incremental,
    incrementalValidated,
    incrementalTransactions: incTx,
    transactionVolume: baselineTx + incTx,
    subsequentSpending: subsequent,
    firstUseRate: safeDiv(firstUse, qualified),
    totalCost: cost,
    budget: k.budget,
    budgetUtilization: safeDiv(cost, k.budget),
    budgetCapped: f < 1,
    costPerQualified: safeDiv(cost, qualified),
    costToIncrementalRatio: safeDiv(cost, incremental),
    costPerIncrementalTransaction: safeDiv(cost, incTx),
    categorySpending: k.objective === "category_growth" ? sum("observedSpending") : 0,
    segments,
    reliability,
  };
}
