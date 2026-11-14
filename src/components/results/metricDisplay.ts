import type { SimulationResult } from "@/domain/types";
import type { KpiDefinition } from "@/domain/objectives";
import { metricValue } from "@/engine/insights";
import { formatMetric } from "@/lib/format";

export const UNVALIDATED_LABEL = "Ek ciro tahmini doğrulanmadı";

/** Whether a metric depends on the (possibly unvalidated) incremental estimate. */
export function dependsOnIncremental(key: KpiDefinition["key"]): boolean {
  return key === "incrementalSpending" || key === "costToIncrementalRatio";
}

export function displayMetric(r: SimulationResult, kpi: KpiDefinition, compact = false): { text: string; unvalidated: boolean; raw: number } {
  const raw = metricValue(r, kpi.key);
  const unvalidated = dependsOnIncremental(kpi.key) && !r.incrementalValidated;
  return { text: formatMetric(raw, kpi.format, compact), unvalidated, raw };
}
