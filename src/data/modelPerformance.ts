import type { CustomerSegmentId } from "@/domain/types";
import { forecastError, HISTORICAL_CAMPAIGNS } from "./historical";

/**
 * Model-performance aggregates derived from the synthetic historical campaigns,
 * so the Model Performance page always agrees with the Actuals page.
 */

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function absErr(c: (typeof HISTORICAL_CAMPAIGNS)[number], key: string): number | null {
  const m = c.metrics.find((x) => x.key === key);
  if (!m) return null;
  const e = forecastError(m.predicted, m.actual);
  return e === null ? null : Math.abs(e);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function errorTrend() {
  const byMonth = new Map<string, typeof HISTORICAL_CAMPAIGNS>();
  for (const c of [...HISTORICAL_CAMPAIGNS].sort((a, b) => a.endDate.localeCompare(b.endDate))) {
    const d = new Date(c.endDate);
    const label = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    byMonth.set(label, [...(byMonth.get(label) ?? []), c]);
  }
  return [...byMonth.entries()].map(([month, cs]) => ({
    month,
    campaigns: cs.length,
    version: cs[0].modelVersion,
    qualification: mean(cs.map((c) => absErr(c, "qualificationRate")).filter((x): x is number => x !== null)),
    cost: mean(cs.map((c) => absErr(c, "totalCost")).filter((x): x is number => x !== null)),
    spending: mean(cs.map((c) => absErr(c, "observedSpending")).filter((x): x is number => x !== null)),
  }));
}

export function segmentErrors() {
  const acc = new Map<CustomerSegmentId, { w: number; signed: number; abs: number; n: number }>();
  for (const c of HISTORICAL_CAMPAIGNS)
    for (const s of c.segments) {
      const e = (s.actualRate - s.predictedRate) / s.predictedRate;
      const a = acc.get(s.segmentId) ?? { w: 0, signed: 0, abs: 0, n: 0 };
      a.w += s.customers;
      a.signed += e * s.customers;
      a.abs += Math.abs(e) * s.customers;
      a.n += 1;
      acc.set(s.segmentId, a);
    }
  return [...acc.entries()]
    .map(([segmentId, a]) => ({ segmentId, bias: a.signed / a.w, mape: a.abs / a.w, campaigns: a.n, customers: a.w }))
    .sort((x, y) => y.mape - x.mape);
}

export function overallErrors() {
  const pick = (key: string) => mean(HISTORICAL_CAMPAIGNS.map((c) => absErr(c, key)).filter((x): x is number => x !== null)) ?? 0;
  return {
    qualification: pick("qualificationRate"),
    cost: pick("totalCost"),
    spending: pick("observedSpending"),
    incremental: pick("incrementalSpending"),
    withControl: HISTORICAL_CAMPAIGNS.filter((c) => c.hadControlGroup).length,
    total: HISTORICAL_CAMPAIGNS.length,
  };
}
