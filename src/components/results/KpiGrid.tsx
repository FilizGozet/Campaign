import type { SimulationResult } from "@/domain/types";
import { getObjective } from "@/domain/objectives";
import { KpiCard } from "@/components/common/KpiCard";
import { formatMetric, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { displayMetric, UNVALIDATED_LABEL } from "./metricDisplay";

export function KpiGrid({ result, compact = true, className }: { result: SimulationResult; compact?: boolean; className?: string }) {
  const kpis = getObjective(result.objective).primaryKpis;
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", kpis.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4", className)}>
      {kpis.map((k, i) => {
        const m = displayMetric(result, k, compact);
        let sub: string | undefined;
        if (k.key === "qualifiedCustomers")
          sub = `${formatNumber(result.eligibleCustomers)} uygun müşteri içinden`;
        else if (k.key === "qualificationRate") sub = `${formatNumber(result.qualifiedCustomers)} müşteri`;
        else if (k.key === "totalCost") sub = `Bütçe: ${formatMetric(result.budget, "currency", true)}`;
        else if (k.key === "costPerQualified") sub = `Toplam maliyet: ${formatMetric(result.totalCost, "currency", true)}`;
        else if (k.key === "budgetUtilization") sub = result.budgetCapped ? "Bütçe sınırına ulaşıldı" : `${formatMetric(result.totalCost, "currency", true)} / ${formatMetric(result.budget, "currency", true)}`;
        return (
          <KpiCard
            key={k.key}
            label={k.label}
            tooltip={k.tooltip}
            highlight={i === 0}
            value={m.unvalidated ? <span className="text-ink-soft/70">~{m.text}</span> : m.text}
            sub={m.unvalidated ? "Karşı-olgusal varsayıma dayalı kaba değer" : sub}
            warning={m.unvalidated ? UNVALIDATED_LABEL : undefined}
          />
        );
      })}
    </div>
  );
}
