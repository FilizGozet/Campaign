import { AlertTriangle } from "lucide-react";
import type { SimulationResult } from "@/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InfoTip } from "@/components/common/InfoTip";
import { GLOSSARY } from "@/domain/labels";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export function BudgetCard({ result }: { result: SimulationResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Bütçe kullanımı <InfoTip content={GLOSSARY.budgetUtilization} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="tabular text-2xl font-semibold">{formatPercent(result.budgetUtilization)}</span>
          <span className="tabular text-xs text-ink-soft">
            {formatCurrency(result.totalCost, { compact: true })} / {formatCurrency(result.budget, { compact: true })}
          </span>
        </div>
        <Progress value={result.budgetUtilization * 100} indicatorClassName={result.budgetCapped ? "from-amber-500 to-amber-400" : undefined} />
        {result.budgetCapped ? (
          <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Talep bütçeyi aşıyor. Sınırsız bütçede {formatNumber(result.unconstrainedQualified)} müşteri hak kazanırdı; bütçe dolduğunda kampanya kapanacağı varsayılmıştır.
            </span>
          </div>
        ) : (
          <p className="text-xs text-ink-soft">Kalan bütçe: {formatCurrency(result.budget - result.totalCost)}</p>
        )}
      </CardContent>
    </Card>
  );
}
