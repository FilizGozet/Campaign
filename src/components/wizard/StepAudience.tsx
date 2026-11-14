import { useMemo } from "react";
import { Check, LayoutGrid, SlidersHorizontal } from "lucide-react";
import type { AudienceSelection, CampaignConditions, ProductType, SpendingCategory } from "@/domain/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { CATEGORY_LABELS, PRODUCT_LABELS } from "@/domain/labels";
import { audienceDisplayName, audiencesForObjective, computeAudienceStats, contextFromConditions, resolveAudience, selectionLabel } from "@/data/audiences";
import { useWizardStore, useWizardCurrent } from "@/store/wizardStore";
import { useAudienceStats } from "@/hooks/useSimulation";
import { formatCompact, formatCurrency, formatPercent, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AudienceBuilder } from "./AudienceBuilder";
import { AudienceAnalytics } from "./AudienceAnalytics";

function ContextPicker({ conditions, onChange }: { conditions: CampaignConditions; onChange: (c: CampaignConditions) => void }) {
  if (conditions.objective === "category_growth" || conditions.objective === "spending_growth") {
    const value = conditions.objective === "category_growth" ? conditions.category : conditions.eligibleCategory === "tum" ? "market" : conditions.eligibleCategory;
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-soft">{conditions.objective === "category_growth" ? "Hedef sektör" : "Sektörel kitleler için sektör"}:</span>
        <Select
          value={value}
          onValueChange={(v) =>
            onChange(conditions.objective === "category_growth" ? { ...conditions, category: v as SpendingCategory } : { ...conditions, eligibleCategory: v as SpendingCategory })
          }
        >
          <SelectTrigger className="w-[200px]" aria-label="Sektör">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_LABELS) as SpendingCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (conditions.objective === "product_adoption") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-soft">Hedef ürün:</span>
        <Select value={conditions.product} onValueChange={(v) => onChange({ ...conditions, product: v as ProductType })}>
          <SelectTrigger className="w-[220px]" aria-label="Ürün">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRODUCT_LABELS) as ProductType[]).map((p) => (
              <SelectItem key={p} value={p}>{PRODUCT_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  return null;
}

export function StepAudience() {
  const { objective, audience, conditions } = useWizardCurrent();
  const setAudience = useWizardStore((s) => s.setAudience);
  const setConditions = useWizardStore((s) => s.setConditions);
  const ctx = contextFromConditions(conditions);
  const defs = objective ? audiencesForObjective(objective) : [];

  const cards = useMemo(
    () =>
      defs.map((d) => {
        const sel: AudienceSelection = { mode: "existing", audienceId: d.id };
        const stats = computeAudienceStats(resolveAudience(sel, ctx).customers);
        return { def: d, stats, name: audienceDisplayName(d, ctx) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objective, ctx.category, ctx.product],
  );

  const statsState = useAudienceStats(audience, conditions);
  if (!objective || !conditions) return null;
  const tab = audience?.mode === "custom" ? "custom" : "existing";

  return (
    <div className="space-y-6">
      <Tabs defaultValue={tab}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="existing">
              <LayoutGrid /> Mevcut kitlelerden seç
            </TabsTrigger>
            <TabsTrigger value="custom">
              <SlidersHorizontal /> Yeni kitle oluştur
            </TabsTrigger>
          </TabsList>
          <ContextPicker conditions={conditions} onChange={setConditions} />
        </div>
        <TabsContent value="existing">
          <div role="radiogroup" aria-label="Hazır kitleler" className="grid gap-4 md:grid-cols-2">
            {cards.map(({ def, stats, name }) => {
              const selected = audience?.mode === "existing" && audience.audienceId === def.id;
              const inactive = stats.avgMonthlySpend === 0;
              return (
                <button
                  key={def.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAudience({ mode: "existing", audienceId: def.id })}
                  className={cn(
                    "rounded-2xl border bg-white p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                    selected ? "border-brand-500 shadow-lift ring-4 ring-brand-100" : "border-border/80 shadow-card hover:border-brand-200 hover:shadow-lift",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-ink">{name}</h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{def.description}</p>
                    </div>
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
                      {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
                    <div>
                      <div className="text-[11px] text-ink-soft">Kitle büyüklüğü</div>
                      <div className="tabular text-sm font-semibold">{formatCompact(stats.eligibleCustomers)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-soft">{inactive ? "Pasiflik öncesi ort." : "Ort. aylık harcama"}</div>
                      <div className="tabular text-sm font-semibold">
                        {inactive && stats.avgHistoricalMonthlySpend === 0 ? "Hiç harcama yok" : formatCurrency(inactive ? stats.avgHistoricalMonthlySpend : stats.avgMonthlySpend)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-soft">Kampanya tepkisi</div>
                      <div className="tabular text-sm font-semibold">{formatPercent(stats.historicalResponse)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {def.tags?.map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                    {!inactive && <Badge variant={stats.spendTrend < -0.05 ? "warning" : "muted"}>Eğilim {formatSignedPercent(stats.spendTrend)}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="custom">
          <AudienceBuilder current={audience} onApply={setAudience} />
        </TabsContent>
      </Tabs>

      {!audience ? (
        <Card className="border-dashed p-8 text-center text-sm text-ink-soft">Kitle analizi için bir hedef kitle seçin veya yeni bir kitle oluşturun.</Card>
      ) : statsState.error ? (
        <ErrorState message={statsState.error} />
      ) : !statsState.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <AudienceAnalytics stats={statsState.data} title={selectionLabel(audience, conditions)} />
      )}
    </div>
  );
}
