import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, Ban, Target, X } from "lucide-react";
import type { CustomerSegmentId, Scenario } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, NumberInput } from "@/components/common/Field";
import { InfoTip } from "@/components/common/InfoTip";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { InsightList } from "@/components/results/InsightList";
import { displayMetric } from "@/components/results/metricDisplay";
import { TooltipCard } from "@/components/charts/ChartTooltip";
import { SEGMENTS, RELIABILITY_LABELS } from "@/domain/labels";
import { comparisonInsights, comparisonMetricsFor, OPTIMIZATION_LABELS, rankScenarios, type OptimizationGoal } from "@/engine/insights";
import { describeConditions } from "@/engine/conditions";
import { selectionLabel } from "@/data/audiences";
import { safeDiv } from "@/engine/math";
import { formatCompact, formatCurrency, formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import { GRID, SCENARIO_COLORS } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

export const scenarioLetter = (i: number) => String.fromCharCode(65 + i);

function MiniBar({ title, data, format, tooltip, unvalidated }: { title: string; data: { name: string; value: number; color: string }[]; format: (v: number) => string; tooltip?: string; unvalidated?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-1.5 text-[13.5px]">
          {title} {tooltip && <InfoTip content={tooltip} />}
          {unvalidated && <Badge variant="warning">Doğrulanmadı</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[190px] pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#17172F", fontWeight: 600 }} />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ fill: "rgba(103,56,200,0.05)" }}
              content={({ active, payload }) =>
                active && payload?.length ? <TooltipCard title={`Senaryo ${payload[0].payload.name}`} rows={[{ label: title, value: format(Number(payload[0].value)), color: payload[0].payload.color }]} /> : null
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
              <LabelList
                dataKey="value"
                content={(p) => (
                  <text x={Number(p.x) + Number(p.width) / 2} y={Number(p.y) - 6} textAnchor="middle" fontSize={11} fill="#6B6B85" className="tabular">
                    {format(Number(p.value))}
                  </text>
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ComparisonView({ scenarios, onRemove }: { scenarios: Scenario[]; onRemove?: (id: string) => void }) {
  const [goal, setGoal] = useState<OptimizationGoal>("none");
  const [maxBudget, setMaxBudget] = useState<number>(0);
  const [minQualified, setMinQualified] = useState<number>(0);

  const metrics = comparisonMetricsFor(scenarios);
  const insights = useMemo(() => comparisonInsights(scenarios), [scenarios]);
  const ranking = useMemo(
    () => rankScenarios(scenarios, goal, { maxBudget: maxBudget || undefined, minQualified: minQualified || undefined }),
    [scenarios, goal, maxBudget, minQualified],
  );
  const rankOf = (id: string) => ranking.find((r) => r.id === id);
  const leader = goal !== "none" ? ranking.find((r) => r.rank === 1) : undefined;
  const anyUnvalidated = scenarios.some((s) => !s.result.incrementalValidated);

  const segmentIds = useMemo(() => {
    const ids = new Set<CustomerSegmentId>();
    scenarios.forEach((s) => s.result.segments.forEach((g) => ids.add(g.segmentId)));
    return [...ids];
  }, [scenarios]);

  const chartData = (pick: (s: Scenario) => number) => scenarios.map((s, i) => ({ name: scenarioLetter(i), value: pick(s), color: SCENARIO_COLORS[i] }));

  return (
    <div className="space-y-6">
      {/* Scenario headers */}
      <div className={cn("grid gap-4", scenarios.length === 2 ? "md:grid-cols-2" : scenarios.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4")}>
        {scenarios.map((s, i) => {
          const r = rankOf(s.id);
          return (
            <Card key={s.id} className={cn("relative p-4", leader?.id === s.id && "border-brand-300 ring-4 ring-brand-100")}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: SCENARIO_COLORS[i] }}>
                  {scenarioLetter(i)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold" title={s.name}>{s.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <ObjectiveBadge objective={s.objective} />
                    {i === 0 && <Badge variant="muted">Referans</Badge>}
                  </div>
                </div>
                {onRemove && (
                  <Button variant="ghost" size="icon-sm" aria-label={`${s.name} senaryosunu karşılaştırmadan çıkar`} onClick={() => onRemove(s.id)}>
                    <X />
                  </Button>
                )}
              </div>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-soft">{describeConditions(s.conditions)}</p>
              <div className="mt-2 text-[11px] text-ink-soft">Kitle: {selectionLabel(s.audience, s.conditions)}</div>
              {goal !== "none" && r && (
                <div className="mt-3">
                  {r.rank ? (
                    <Badge variant={r.rank === 1 ? "solid" : "default"}>
                      <Award /> {r.rank === 1 ? "Seçilen hedefe göre öne çıkan" : `Sıra: ${r.rank}`}
                    </Badge>
                  ) : (
                    <Badge variant="danger" title={r.reasons.join("; ")}>
                      <Ban /> Kısıtı sağlamıyor
                    </Badge>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Optimisation goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand-600" /> Optimizasyon hedefi
          </CardTitle>
          <CardDescription>Hiçbir senaryo otomatik olarak “en iyi” sayılmaz. Bir hedef ve isteğe bağlı kısıtlar seçtiğinizde senaryolar bu kurala göre sıralanır.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Birincil hedef">
            <Select value={goal} onValueChange={(v) => setGoal(v as OptimizationGoal)}>
              <SelectTrigger aria-label="Optimizasyon hedefi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OPTIMIZATION_LABELS) as OptimizationGoal[]).map((g) => (
                  <SelectItem key={g} value={g}>{OPTIMIZATION_LABELS[g]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Azami maliyet (kısıt)" hint="0 = kısıt yok">
            <NumberInput value={maxBudget} min={0} suffix="TL" onChange={setMaxBudget} ariaLabel="Azami maliyet" />
          </Field>
          <Field label="Asgari hak kazanan (kısıt)" hint="0 = kısıt yok">
            <NumberInput value={minQualified} min={0} suffix="kişi" onChange={setMinQualified} ariaLabel="Asgari hak kazanan" />
          </Field>
          {goal !== "none" && (
            <div className="rounded-lg bg-brand-50/60 p-3 text-xs leading-relaxed text-ink-soft md:col-span-3">
              {leader ? (
                <>
                  <strong className="text-ink">{scenarios.find((s) => s.id === leader.id)?.name}</strong>, “{OPTIMIZATION_LABELS[goal]}” hedefine ve tanımlı kısıtlara göre öne çıkıyor.
                  {goal === "max_incremental" && anyUnvalidated && " Uyarı: bazı senaryoların ek ciro tahmini doğrulanmamıştır."}
                  {goal === "max_efficiency" && " Verimlilik: harcama hedeflerinde TL başına tahmini ek ciro, diğer hedeflerde TL başına hak kazanan müşteri."}
                </>
              ) : (
                "Tanımlanan kısıtları sağlayan senaryo yok. Kısıtları gevşetin veya yeni senaryo oluşturun."
              )}{" "}
              Sonuç, demo simülasyon değerlerine ve veri kapsamına bağlıdır; nihai karar kampanya yöneticisine aittir.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric table */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Metrik karşılaştırması</CardTitle>
            <CardDescription>Farklar referans senaryoya (A) göredir. Yeşil: metrik yönüne göre daha olumlu, kırmızı: daha olumsuz.</CardDescription>
          </div>
          <DataSourceBadge source="demo" short />
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px]">Metrik</TableHead>
                {scenarios.map((s, i) => (
                  <TableHead key={s.id} className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SCENARIO_COLORS[i] }} /> {scenarioLetter(i)}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => {
                const ref = displayMetric(scenarios[0].result, m);
                return (
                  <TableRow key={m.key}>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-[13px]">
                        {m.label} <InfoTip content={m.tooltip} />
                      </span>
                    </TableCell>
                    {scenarios.map((s, i) => {
                      const v = displayMetric(s.result, m);
                      const d = safeDiv(v.raw - ref.raw, Math.abs(ref.raw));
                      const better = m.lowerIsBetter ? d < 0 : d > 0;
                      return (
                        <TableCell key={s.id} className="text-right">
                          <div className={cn("tabular font-medium", v.unvalidated && "text-ink-soft/70")}>
                            {v.unvalidated ? "~" : ""}
                            {v.text}
                          </div>
                          {i > 0 && Math.abs(d) >= 0.005 && ref.raw !== 0 && (
                            <div className={cn("tabular text-[11px]", m.key === "budgetUtilization" ? "text-ink-soft" : better ? "text-success" : "text-danger")}>
                              {formatSignedPercent(d)}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell className="text-[13px]">Senaryo güvenilirliği</TableCell>
                {scenarios.map((s) => (
                  <TableCell key={s.id} className="text-right">
                    <Badge variant={s.result.reliability.level === "yuksek" ? "success" : s.result.reliability.level === "orta" ? "warning" : "danger"}>
                      {RELIABILITY_LABELS[s.result.reliability.level]}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
          {anyUnvalidated && <p className="px-3 pt-3 text-xs text-ink-soft">“~” ile gösterilen ek ciro değerleri doğrulanmamış karşı-olgusal varsayıma dayanır: Ek ciro tahmini doğrulanmadı.</p>}
        </CardContent>
      </Card>

      {/* Charts — one measure per chart, never dual-axis */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniBar title="Hak kazanan müşteri" data={chartData((s) => s.result.qualifiedCustomers)} format={(v) => formatCompact(v)} />
        <MiniBar title="Beklenen maliyet" data={chartData((s) => s.result.totalCost)} format={(v) => formatCurrency(v, { compact: true })} />
        <MiniBar title="Tahmini ek ciro" data={chartData((s) => s.result.incrementalSpending)} format={(v) => formatCurrency(v, { compact: true })} unvalidated={anyUnvalidated} />
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[13.5px]">Bütçe kullanımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-3">
            {scenarios.map((s, i) => (
              <div key={s.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold">{scenarioLetter(i)}</span>
                  <span className="tabular text-ink-soft">
                    {formatPercent(s.result.budgetUtilization)} · {formatCurrency(s.result.budget, { compact: true })}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-brand-50">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, s.result.budgetUtilization * 100)}%`, background: SCENARIO_COLORS[i] }} />
                </div>
                {s.result.budgetCapped && <div className="mt-1 text-[11px] text-warning">Bütçe sınırına ulaşıyor</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Segment differences */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Segment düzeyinde farklar</CardTitle>
            <CardDescription>Her segment için beklenen hak kazanma oranı ve hak kazanan müşteri sayısı.</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Segment</TableHead>
                  {scenarios.map((s, i) => (
                    <TableHead key={s.id} className="text-right">{scenarioLetter(i)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {segmentIds.map((seg) => {
                  const ref = scenarios[0].result.segments.find((x) => x.segmentId === seg);
                  return (
                    <TableRow key={seg}>
                      <TableCell>
                        <span className="flex items-center gap-2 text-[13px]">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEGMENTS[seg].color }} /> {SEGMENTS[seg].name}
                        </span>
                      </TableCell>
                      {scenarios.map((s, i) => {
                        const g = s.result.segments.find((x) => x.segmentId === seg);
                        if (!g) return <TableCell key={s.id} className="text-right text-ink-soft">—</TableCell>;
                        const diff = ref && i > 0 ? (g.qualificationRate - ref.qualificationRate) * 100 : null;
                        return (
                          <TableCell key={s.id} className="text-right">
                            <div className="tabular font-medium">{formatPercent(g.qualificationRate, 1)}</div>
                            <div className="tabular text-[11px] text-ink-soft">
                              {formatNumber(g.qualifiedCustomers)}
                              {diff !== null && Math.abs(diff) >= 0.05 && (
                                <span className={diff > 0 ? "text-success" : "text-danger"}> ({diff > 0 ? "+" : "−"}{Math.abs(diff).toFixed(1).replace(".", ",")} puan)</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ödünleşimler ve içgörüler</CardTitle>
            <CardDescription>Hesaplanan sonuçlardan kural tabanlı olarak üretilmiştir.</CardDescription>
          </CardHeader>
          <CardContent>
            <InsightList insights={insights} empty="Senaryolar arasında belirgin bir ödünleşim tespit edilmedi." />
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-ink-soft">
              Karşılaştırmanın güvenilirliği, geçmiş veri kapsamına ve parametrelerin desteklenen aralıklarda olmasına bağlıdır. Farklar nedensel etki kanıtı değildir.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
