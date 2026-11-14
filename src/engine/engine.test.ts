import { describe, expect, it } from "vitest";
import { defaultConditions } from "@/domain/objectives";
import type { CampaignConditions, CampaignObjective, SimulationRequest } from "@/domain/types";
import { OBJECTIVES } from "@/domain/types";
import { audiencesForObjective } from "@/data/audiences";
import { simulate, budgetScale } from "./simulate";
import { expectedReward, rewardForSpend, validateReward } from "./rewards";
import { personalTarget } from "./targets";
import { lnExceed, lnPartialExpectation, normalCdf, poissonAtLeast } from "./math";
import { hashInputs } from "./hash";
import { validateConditions } from "./conditions";
import { rankScenarios } from "./insights";

function request<O extends CampaignObjective>(objective: O, patch: Partial<CampaignConditions> = {}): SimulationRequest {
  const audienceId = audiencesForObjective(objective)[0].id;
  return {
    objective,
    audience: { mode: "existing", audienceId },
    conditions: { ...defaultConditions(objective), budget: 1e12, ...patch } as CampaignConditions,
  };
}

describe("math helpers", () => {
  it("normal CDF is accurate at reference points", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("lognormal exceedance decreases as the threshold rises", () => {
    const d = { mean: 10000, sigma: 0.4 };
    expect(lnExceed(d, 8000)).toBeGreaterThan(lnExceed(d, 10000));
    expect(lnExceed(d, 10000)).toBeGreaterThan(lnExceed(d, 14000));
    expect(lnPartialExpectation(d, 0)).toBe(10000);
  });

  it("poisson tail matches closed form", () => {
    // P(N >= 1) = 1 - e^-λ
    expect(poissonAtLeast(1, 2)).toBeCloseTo(1 - Math.exp(-2), 10);
    expect(poissonAtLeast(5, 2)).toBeLessThan(poissonAtLeast(3, 2));
  });
});

describe("target calculation", () => {
  it("dynamic target = historical average × (1 + increase) for a 30-day campaign", () => {
    expect(personalTarget(10000, { targetType: "dynamic", increasePct: 0.2, fixedTarget: 0, durationDays: 30 })).toBe(12000);
  });

  it("dynamic target scales with campaign duration", () => {
    expect(personalTarget(10000, { targetType: "dynamic", increasePct: 0.2, fixedTarget: 0, durationDays: 60 })).toBe(24000);
  });

  it("fixed target ignores the customer's history", () => {
    expect(personalTarget(3000, { targetType: "fixed", increasePct: 0.2, fixedTarget: 9000, durationDays: 30 })).toBe(9000);
  });
});

describe("reward cost rules", () => {
  it("fixed reward cost per qualifier equals the amount", () => {
    expect(rewardForSpend({ type: "fixed", amount: 200 }, 15000)).toBe(200);
  });

  it("percentage reward is rate × spend", () => {
    expect(rewardForSpend({ type: "percentage", rate: 0.05 }, 4000)).toBeCloseTo(200);
  });

  it("capped reward never exceeds the cap", () => {
    expect(rewardForSpend({ type: "capped", rate: 0.1, cap: 250 }, 10000)).toBe(250);
    const dist = { mean: 20000, sigma: 0.6 };
    const e = expectedReward({ type: "capped", rate: 0.1, cap: 250 }, { kind: "conditional", dist, threshold: 1000 });
    expect(e).toBeLessThanOrEqual(250 + 1e-9);
    expect(e).toBeGreaterThan(200);
  });

  it("tiered reward pays the highest tier reached", () => {
    const tiered = {
      type: "tiered" as const,
      tiers: [
        { minSpend: 3000, reward: 75 },
        { minSpend: 6000, reward: 175 },
      ],
    };
    expect(rewardForSpend(tiered, 2000)).toBe(0);
    expect(rewardForSpend(tiered, 4000)).toBe(75);
    expect(rewardForSpend(tiered, 9000)).toBe(175);
    const e = expectedReward(tiered, { kind: "conditional", dist: { mean: 5000, sigma: 0.5 }, threshold: 3000 });
    expect(e).toBeGreaterThan(75);
    expect(e).toBeLessThan(175);
  });

  it("validates malformed tiers", () => {
    expect(validateReward({ type: "tiered", tiers: [{ minSpend: 5000, reward: 100 }, { minSpend: 3000, reward: 50 }] }).length).toBeGreaterThan(0);
  });
});

describe("simulation engine", () => {
  it("is deterministic for identical inputs", () => {
    for (const o of OBJECTIVES) {
      const a = simulate(request(o));
      const b = simulate(request(o));
      expect(a).toEqual(b);
      expect(a.inputHash).toBe(b.inputHash);
    }
  });

  it("input hash ignores key order", () => {
    expect(hashInputs({ a: 1, b: { c: 2, d: 3 } })).toBe(hashInputs({ b: { d: 3, c: 2 }, a: 1 }));
  });

  it("fixed reward: total cost = qualified customers × reward", () => {
    for (const o of OBJECTIVES) {
      const r = simulate(request(o, { reward: { type: "fixed", amount: 175 } } as Partial<CampaignConditions>));
      expect(r.totalCost).toBeCloseTo(r.qualifiedCustomers * 175, 4);
    }
  });

  it("segment totals reconcile with headline KPIs", () => {
    for (const o of OBJECTIVES) {
      const r = simulate(request(o));
      const sum = (k: "qualifiedCustomers" | "totalCost" | "incrementalSpending" | "eligibleCustomers") =>
        r.segments.reduce((a, s) => a + s[k], 0);
      expect(sum("qualifiedCustomers")).toBeCloseTo(r.qualifiedCustomers, 6);
      expect(sum("totalCost")).toBeCloseTo(r.totalCost, 4);
      expect(sum("incrementalSpending")).toBeCloseTo(r.incrementalSpending, 4);
      expect(sum("eligibleCustomers")).toBe(r.eligibleCustomers);
      expect(r.qualifiedCustomers).toBeGreaterThanOrEqual(r.naturalQualifiers);
    }
  });

  it("harder spending requirements lower qualification", () => {
    const easy = simulate(request("spending_growth", { increasePct: 0.1 } as Partial<CampaignConditions>));
    const hard = simulate(request("spending_growth", { increasePct: 0.4 } as Partial<CampaignConditions>));
    expect(hard.qualificationRate).toBeLessThan(easy.qualificationRate);

    const few = simulate(request("transaction_frequency", { requiredTxCount: 3 } as Partial<CampaignConditions>));
    const many = simulate(request("transaction_frequency", { requiredTxCount: 10 } as Partial<CampaignConditions>));
    expect(many.qualificationRate).toBeLessThan(few.qualificationRate);
  });

  it("a larger reward never lowers qualification (monotone assumption)", () => {
    const low = simulate(request("reactivation", { reward: { type: "fixed", amount: 50 } } as Partial<CampaignConditions>));
    const high = simulate(request("reactivation", { reward: { type: "fixed", amount: 300 } } as Partial<CampaignConditions>));
    expect(high.qualifiedCustomers).toBeGreaterThanOrEqual(low.qualifiedCustomers);
  });

  it("budget constraint caps cost at the budget and scales outcomes", () => {
    const unlimited = simulate(request("spending_growth"));
    const budget = unlimited.totalCost / 2;
    const capped = simulate(request("spending_growth", { budget } as Partial<CampaignConditions>));
    expect(capped.budgetCapped).toBe(true);
    expect(capped.totalCost).toBeCloseTo(budget, 2);
    expect(capped.budgetUtilization).toBeCloseTo(1, 6);
    expect(capped.qualifiedCustomers).toBeCloseTo(unlimited.qualifiedCustomers / 2, 4);
    expect(capped.unconstrainedQualified).toBeCloseTo(unlimited.qualifiedCustomers, 4);
  });

  it("budget scale is 1 when the budget is sufficient", () => {
    expect(budgetScale(100, 200)).toBe(1);
    expect(budgetScale(200, 100)).toBe(0.5);
    expect(budgetScale(100, 0)).toBe(0);
  });

  it("produces eligible customers for every predefined audience", () => {
    for (const o of OBJECTIVES) {
      for (const a of audiencesForObjective(o)) {
        const r = simulate({ objective: o, audience: { mode: "existing", audienceId: a.id }, conditions: defaultConditions(o) });
        expect(r.eligibleCustomers, `${a.id}`).toBeGreaterThan(0);
        expect(r.qualificationRate).toBeGreaterThanOrEqual(0);
        expect(r.qualificationRate).toBeLessThanOrEqual(1);
      }
    }
  });

  it("assumption sensitivity brackets the point estimate", () => {
    const r = simulate(request("category_growth"));
    expect(r.reliability.sensitivity.low).toBeLessThanOrEqual(r.qualifiedCustomers);
    expect(r.reliability.sensitivity.high).toBeGreaterThanOrEqual(r.qualifiedCustomers);
  });
});

describe("validation & ranking", () => {
  it("flags invalid conditions", () => {
    const k = { ...defaultConditions("transaction_frequency"), requiredTxCount: 40, durationDays: 30, differentDays: true };
    expect(validateConditions(k).requiredTxCount).toBeDefined();
    expect(validateConditions({ ...defaultConditions("spending_growth"), budget: 0 }).budget).toBeDefined();
  });

  it("does not rank scenarios without an explicit optimisation goal", () => {
    const r = simulate(request("spending_growth"));
    const s = { id: "a", name: "A", objective: "spending_growth" as const, audience: request("spending_growth").audience, conditions: request("spending_growth").conditions, result: r, createdAt: "", updatedAt: "", source: "seed" as const };
    expect(rankScenarios([s], "none", {})[0].rank).toBeNull();
    expect(rankScenarios([s], "min_cost", {})[0].rank).toBe(1);
    expect(rankScenarios([s], "min_cost", { maxBudget: 1 })[0].feasible).toBe(false);
  });
});

describe("sweep", () => {
  it("includes the current value and respects bounds", async () => {
    const { buildSweep } = await import("./sweep");
    const req = request("spending_growth");
    const s = buildSweep(req, "reward", 9);
    expect(s.values).toContain(s.spec.value);
    expect(Math.min(...s.values)).toBeGreaterThanOrEqual(s.spec.min);
    expect(s.requests).toHaveLength(s.values.length);
  });
});
