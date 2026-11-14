import { useMemo, useState } from "react";
import { AlertCircle, Calculator, FileText } from "lucide-react";
import type { CampaignConditions, SpendingGrowthConditions } from "@/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/common/Field";
import { InlineLoader } from "@/components/common/States";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { useWizardStore, useWizardCurrent } from "@/store/wizardStore";
import { useAudienceStats, useSimulation } from "@/hooks/useSimulation";
import { describeConditions, keyConditionChips, validateConditions } from "@/engine/conditions";
import { personalTarget } from "@/engine/targets";
import { selectionLabel } from "@/data/audiences";
import { getObjective } from "@/domain/objectives";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { ConditionsForm } from "./ConditionForms";

function TargetPreview({ conditions, suggestedAverage }: { conditions: SpendingGrowthConditions; suggestedAverage: number | null }) {
  const [avg, setAvg] = useState<number | null>(null);
  const historical = avg ?? (suggestedAverage ? Math.round(suggestedAverage / 500) * 500 : 10000);
  const target = personalTarget(historical, conditions);
  return (
    <Card className="border-brand-200 bg-gradient-to-br from-white to-brand-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-600" /> Kişiselleştirilmiş hedef önizlemesi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-soft">Örnek müşterinin geçmiş aylık ortalaması</span>
          <NumberInput value={historical} min={0} suffix="TL" onChange={setAvg} className="w-36" ariaLabel="Örnek geçmiş ortalama" />
        </div>
        {conditions.targetType === "dynamic" ? (
          <>
            <div className="flex justify-between">
              <span className="text-ink-soft">Dönem ({conditions.durationDays} gün) için geçmiş baz</span>
              <span className="tabular font-medium">{formatCurrency((historical * conditions.durationDays) / 30)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Hedef artış</span>
              <span className="tabular font-medium">{formatPercent(conditions.increasePct, conditions.increasePct * 100 % 1 ? 1 : 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span className="text-ink-soft">Hedef tipi</span>
            <span className="font-medium">Sabit tutar (geçmişten bağımsız)</span>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
          <span className="font-medium">Müşteri hedefi</span>
          <span className="tabular text-lg font-semibold text-brand-700">{formatCurrency(target)}</span>
        </div>
        {suggestedAverage !== null && avg === null && <p className="text-[11px] text-ink-soft">Varsayılan değer, seçili kitlenin ortalama aylık harcamasına yuvarlanmıştır.</p>}
      </CardContent>
    </Card>
  );
}

function LiveEstimate({ conditions }: { conditions: CampaignConditions }) {
  const { objective, audience } = useWizardCurrent();
  const valid = Object.keys(validateConditions(conditions)).length === 0;
  const req = useMemo(() => (objective && audience && valid ? { objective, audience, conditions } : null), [objective, audience, conditions, valid]);
  const sim = useSimulation(req, 250);
  const def = getObjective(conditions.objective);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Anlık ön tahmin</CardTitle>
        {sim.loading ? <InlineLoader /> : <DataSourceBadge source="demo" short />}
      </CardHeader>
      <CardContent>
        {!valid ? (
          <p className="text-xs text-ink-soft">Ön tahmin için hatalı alanları düzeltin.</p>
        ) : sim.error ? (
          <p className="text-xs text-danger">{sim.error}</p>
        ) : sim.data ? (
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-[11px] text-ink-soft">{def.qualifiedLabel}</dt>
              <dd className="tabular font-semibold">{formatNumber(sim.data.qualifiedCustomers)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-soft">Oran</dt>
              <dd className="tabular font-semibold">{formatPercent(sim.data.qualificationRate, 1)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-soft">Beklenen maliyet</dt>
              <dd className="tabular font-semibold">{formatCurrency(sim.data.totalCost, { compact: true })}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-soft">Bütçe kullanımı</dt>
              <dd className={`tabular font-semibold ${sim.data.budgetCapped ? "text-warning" : ""}`}>{formatPercent(sim.data.budgetUtilization)}</dd>
            </div>
          </dl>
        ) : (
          <div className="h-16" />
        )}
      </CardContent>
    </Card>
  );
}

export function StepConditions({ showErrors }: { showErrors: boolean }) {
  const { audience, conditions } = useWizardCurrent();
  const setConditions = useWizardStore((s) => s.setConditions);
  const stats = useAudienceStats(audience, conditions);
  if (!conditions) return null;
  const errors = validateConditions(conditions);
  const visibleErrors = showErrors ? errors : Object.fromEntries(Object.entries(errors).filter(([k]) => k !== "reward"));
  const errorCount = Object.keys(errors).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <ConditionsForm value={conditions} onChange={setConditions} errors={visibleErrors} />
      </div>
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#2A2458] to-[#1E1B38] p-5 text-white">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
              <FileText className="h-3.5 w-3.5" /> Kampanya özeti
            </div>
            <p className="mt-2 text-[14px] font-medium leading-relaxed">“{describeConditions(conditions)}”</p>
          </div>
          <CardContent className="space-y-3 pt-4">
            <div className="text-xs text-ink-soft">
              Hedef kitle: <span className="font-medium text-ink">{selectionLabel(audience, conditions)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keyConditionChips(conditions).map((c) => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
            {errorCount > 0 && (
              <div role="alert" className="flex gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-danger ring-1 ring-rose-100">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{errorCount} alan düzeltilmeli: {Object.values(errors)[0]}</span>
              </div>
            )}
          </CardContent>
        </Card>
        {conditions.objective === "spending_growth" && (
          <TargetPreview conditions={conditions} suggestedAverage={stats.data && stats.data.avgMonthlySpend > 0 ? stats.data.avgMonthlySpend : null} />
        )}
        <LiveEstimate conditions={conditions} />
      </aside>
    </div>
  );
}
