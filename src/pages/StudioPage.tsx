import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Camera, Copy, Download, FlaskConical, GitCompare, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import type { AudienceSelection, CampaignConditions, CampaignObjective, MetricKey, Scenario, SimulationResult } from "@/domain/types";
import { OBJECTIVES } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, InlineLoader, KpiSkeletonRow } from "@/components/common/States";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { SaveScenarioDialog } from "@/components/common/SaveScenarioDialog";
import { InfoTip } from "@/components/common/InfoTip";
import { Segmented } from "@/components/common/Field";
import { KpiGrid } from "@/components/results/KpiGrid";
import { SegmentQualificationChart } from "@/components/results/SegmentCharts";
import { InsightList } from "@/components/results/InsightList";
import { TooltipCard } from "@/components/charts/ChartTooltip";
import { useSimulation } from "@/hooks/useSimulation";
import { useScenarioStore, MAX_COMPARE } from "@/store/scenarioStore";
import { getObjective, defaultConditions, type KpiDefinition } from "@/domain/objectives";
import { REWARD_TYPE_LABELS } from "@/domain/labels";
import { audienceDisplayName, audiencesForObjective, contextFromConditions, selectionLabel } from "@/data/audiences";
import { describeConditions, defaultReward, keyConditionChips, validateConditions } from "@/engine/conditions";
import { applyLever, buildSweep, leverSpec, SWEEP_LABELS, type SweepLever } from "@/engine/sweep";
import { comparisonInsights, metricValue, resultInsights } from "@/engine/insights";
import { predictionService } from "@/services/prediction";
import { downloadText, duplicateScenario, saveScenarioStandalone, scenarioSummaryText } from "@/services/campaignActions";
import { stableStringify } from "@/engine/hash";
import { formatCurrency, formatDateTime, formatMetric, formatNumber, formatPercent } from "@/lib/format";
import { EFFECT_COLOR, GRID } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Studio state (persisted separately from the wizard)
// ---------------------------------------------------------------------------

interface StudioState {
  objective: CampaignObjective;
  audience: Partial<Record<CampaignObjective, AudienceSelection>>;
  conditions: Partial<Record<CampaignObjective, CampaignConditions>>;
  compareIds: string[];
  set: (patch: Partial<Omit<StudioState, "set">>) => void;
}

const useStudioStore = create<StudioState>()(
  persist((set) => ({ objective: "spending_growth", audience: {}, conditions: {}, compareIds: [], set: (p) => set(p) }), { name: "cis.studio.v1" }),
);

const defaultAudience = (o: CampaignObjective): AudienceSelection => ({ mode: "existing", audienceId: audiencesForObjective(o)[0].id });

// ---------------------------------------------------------------------------

function LeverSlider({ conditions, lever, onChange }: { conditions: CampaignConditions; lever: SweepLever; onChange: (c: CampaignConditions) => void }) {
  const spec = leverSpec(conditions, lever);
  const fmt = (v: number) => (spec.unit === "TL" ? formatCurrency(v, { compact: v >= 100000 }) : spec.unit === "%" ? `%${formatNumber(v, spec.step < 1 ? 1 : 0)}` : `${formatNumber(v)} ${spec.unit}`);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-ink">{spec.label}</span>
        <span className="tabular rounded-md bg-brand-50 px-2 py-0.5 text-[13px] font-semibold text-brand-700">{fmt(spec.value)}</span>
      </div>
      <Slider
        aria-label={spec.label}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={[Math.min(spec.max, Math.max(spec.min, spec.value))]}
        onValueChange={([v]) => onChange(applyLever(conditions, lever, v))}
      />
      <div className="tabular flex justify-between text-[10.5px] text-ink-soft">
        <span>{fmt(spec.min)}</span>
        <span>{fmt(spec.max)}</span>
      </div>
    </div>
  );
}

function WhatIfCurve({ objective, audience, conditions }: { objective: CampaignObjective; audience: AudienceSelection; conditions: CampaignConditions }) {
  const def = getObjective(objective);
  const [lever, setLever] = useState<SweepLever>("reward");
  const [metricKey, setMetricKey] = useState<MetricKey>(def.primaryKpis[0].key);
  const metric: KpiDefinition = def.comparisonMetrics.find((m) => m.key === metricKey) ?? def.primaryKpis[0];
  const [points, setPoints] = useState<{ x: number; y: number; capped: boolean }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const sweep = useMemo(() => buildSweep({ objective, audience, conditions }, lever, 11), [objective, audience, conditions, lever]);
  const key = stableStringify(sweep.requests);

  useEffect(() => {
    if (!def.comparisonMetrics.some((m) => m.key === metricKey)) setMetricKey(def.primaryKpis[0].key);
  }, [def, metricKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      predictionService
        .simulateMany(sweep.requests)
        .then((rs: SimulationResult[]) => {
          if (cancelled) return;
          setPoints(rs.map((r, i) => ({ x: sweep.values[i], y: metricValue(r, metric.key), capped: r.budgetCapped })));
          setLoading(false);
        })
        .catch(() => !cancelled && (setLoading(false), setPoints([])));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, metric.key]);

  const current = points?.find((p) => p.x === sweep.spec.value);
  const fmtX = (v: number) => (sweep.spec.unit === "TL" ? formatCurrency(v, { compact: true }) : sweep.spec.unit === "%" ? `%${formatNumber(v, sweep.spec.step < 1 ? 1 : 0)}` : `${formatNumber(v)}`);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-1.5">
              Ne olursa? eğrisi <InfoTip content="Diğer tüm parametreler sabitken seçilen parametre değiştiğinde demo motorun ürettiği değerler. Nedensel etki tahmini değildir." />
            </CardTitle>
            <CardDescription>Seçili parametrenin seçili metriğe etkisi (demo)</CardDescription>
          </div>
          {loading && <InlineLoader />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented size="sm" ariaLabel="Değişken parametre" value={lever} onChange={setLever} options={(Object.keys(SWEEP_LABELS) as SweepLever[]).map((l) => ({ value: l, label: SWEEP_LABELS[l] }))} />
          <Select value={metric.key} onValueChange={(v) => setMetricKey(v as MetricKey)}>
            <SelectTrigger className="h-8 w-[230px] text-xs" aria-label="Metrik"><SelectValue /></SelectTrigger>
            <SelectContent>
              {def.comparisonMetrics.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="h-[240px]">
        {points && points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtX} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatMetric(v, metric.format, true)} axisLine={false} tickLine={false} width={64} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipCard
                      title={`${sweep.spec.label}: ${fmtX(Number(payload[0].payload.x))}`}
                      rows={[
                        { label: metric.label, value: formatMetric(Number(payload[0].payload.y), metric.format), color: EFFECT_COLOR },
                        { label: "Bütçe", value: payload[0].payload.capped ? "Sınıra ulaşıldı" : "Yeterli" },
                      ]}
                    />
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke={EFFECT_COLOR}
                strokeWidth={2}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; index?: number; payload?: { capped: boolean } }) => (
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={4} stroke={EFFECT_COLOR} strokeWidth={2} fill={p.payload?.capped ? "#fff" : EFFECT_COLOR} />
                )}
              />
              {current && <ReferenceDot x={current.x} y={current.y} r={7} fill={EFFECT_COLOR} stroke="#fff" strokeWidth={2} label={{ value: "Mevcut", position: "top", fontSize: 11, fill: "#17172F" }} />}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">{points ? <span className="text-sm text-ink-soft">Eğri hesaplanamadı.</span> : <InlineLoader />}</div>
        )}
      </CardContent>
      {points?.some((p) => p.capped) && (
        <p className="px-5 pb-4 text-[11.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-warning">Bütçe kısıtı etkin:</span> içi boş noktalarda beklenen ödül talebi bütçeyi aşıyor; kampanya bütçe dolunca kapanacağı için bu noktalarda sonuçlar bütçe oranında ölçeklenir. Bu nedenle ödül arttıkça hak kazanan sayısı azalabilir.
        </p>
      )}
    </Card>
  );
}

function SnapshotPanel({ live, onLoad }: { live: SimulationResult | null; onLoad: (s: Scenario) => void }) {
  const navigate = useNavigate();
  const allScenarios = useScenarioStore((s) => s.scenarios);
  const snapshots = useMemo(() => allScenarios.filter((s) => s.source === "studio"), [allScenarios]);
  const { compareIds, set } = useStudioStore();
  const selected = compareIds.map((id) => snapshots.find((s) => s.id === id)).filter((s): s is Scenario => !!s);
  const insights = useMemo(() => (selected.length >= 2 ? comparisonInsights(selected) : live ? resultInsights(live) : []), [selected, live]);
  const toggle = (id: string) =>
    set({ compareIds: compareIds.includes(id) ? compareIds.filter((x) => x !== id) : compareIds.length < MAX_COMPARE ? [...compareIds, id] : compareIds });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Anlık görüntüler</CardTitle>
          <CardDescription>Stüdyoda kaydedilen senaryolar ({snapshots.length})</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {snapshots.length === 0 ? (
            <p className="rounded-lg border border-dashed border-brand-200 p-4 text-center text-xs text-ink-soft">Henüz anlık görüntü yok. Kaydırıcıları ayarlayıp “Anlık görüntü al” ile kaydedin.</p>
          ) : (
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {snapshots.map((s) => (
                <div key={s.id} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2", compareIds.includes(s.id) ? "border-brand-300 bg-brand-50/60" : "border-border")}>
                  <Checkbox checked={compareIds.includes(s.id)} onCheckedChange={() => toggle(s.id)} disabled={!compareIds.includes(s.id) && compareIds.length >= MAX_COMPARE} aria-label={`${s.name} karşılaştırmaya ekle`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">{s.name}</div>
                    <div className="tabular text-[10.5px] text-ink-soft">{formatNumber(s.result.qualifiedCustomers)} · {formatCurrency(s.result.totalCost, { compact: true })} · {formatDateTime(s.createdAt)}</div>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`${s.name} parametrelerini yükle`} title="Parametreleri yükle" onClick={() => onLoad(s)}>
                    <Upload />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${s.name} kopyala`}
                    title="Kopyala"
                    onClick={() => {
                      const c = duplicateScenario(s.id);
                      if (c) toast.success("Senaryo kopyalandı", { description: c.name });
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button className="mt-2 w-full" variant="outline" size="sm" disabled={selected.length < 2} onClick={() => navigate(`/senaryolar/karsilastir?ids=${selected.map((s) => s.id).join(",")}`)}>
            <GitCompare /> Seçilenleri karşılaştır ({selected.length})
          </Button>
        </CardContent>
      </Card>

      {selected.length > 0 && live && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Karşılaştırma özeti</CardTitle>
            <CardDescription>Canlı simülasyon ve seçili anlık görüntüler</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-3">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft">
                  <th className="py-1.5 font-semibold">Senaryo</th>
                  <th className="py-1.5 text-right font-semibold">Hak k.</th>
                  <th className="py-1.5 text-right font-semibold">Maliyet</th>
                  <th className="py-1.5 text-right font-semibold">Oran</th>
                </tr>
              </thead>
              <tbody>
                {[{ id: "live", name: "Canlı", r: live }, ...selected.map((s) => ({ id: s.id, name: s.name, r: s.result }))].map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className={cn("max-w-[110px] truncate py-1.5", row.id === "live" && "font-semibold text-brand-700")}>{row.name}</td>
                    <td className="tabular py-1.5 text-right">{formatNumber(row.r.qualifiedCustomers)}</td>
                    <td className="tabular py-1.5 text-right">{formatCurrency(row.r.totalCost, { compact: true })}</td>
                    <td className="tabular py-1.5 text-right">{formatPercent(row.r.qualificationRate, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Senaryo içgörüleri</CardTitle>
          <CardDescription>{selected.length >= 2 ? "Seçili anlık görüntüler arasındaki ödünleşimler" : "Canlı simülasyon için kural tabanlı bulgular"}</CardDescription>
        </CardHeader>
        <CardContent>
          <InsightList insights={insights} dense />
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudioPage() {
  const [params, setParams] = useSearchParams();
  const st = useStudioStore();
  const objective = st.objective;
  const audience = st.audience[objective] ?? defaultAudience(objective);
  const conditions = st.conditions[objective] ?? defaultConditions(objective);
  const [saveOpen, setSaveOpen] = useState(false);

  const setConditions = (c: CampaignConditions) => st.set({ conditions: { ...useStudioStore.getState().conditions, [c.objective]: c } });
  const setAudience = (a: AudienceSelection) => st.set({ audience: { ...useStudioStore.getState().audience, [objective]: a } });
  const loadScenario = (s: Scenario) => {
    const cur = useStudioStore.getState();
    st.set({ objective: s.objective, audience: { ...cur.audience, [s.objective]: s.audience }, conditions: { ...cur.conditions, [s.objective]: structuredClone(s.conditions) } });
    toast.info(`“${s.name}” parametreleri yüklendi`);
  };

  useEffect(() => {
    const sid = params.get("senaryo");
    if (!sid) return;
    const s = useScenarioStore.getState().scenarios.find((x) => x.id === sid);
    if (s) loadScenario(s);
    else toast.error("Senaryo bulunamadı.");
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const errors = validateConditions(conditions);
  const valid = Object.keys(errors).length === 0;
  const request = useMemo(() => (valid ? { objective, audience, conditions } : null), [valid, objective, audience, conditions]);
  const sim = useSimulation(request, 60);
  const ctx = contextFromConditions(conditions);
  const def = getObjective(objective);

  const reset = () => {
    const cur = useStudioStore.getState();
    st.set({ conditions: { ...cur.conditions, [objective]: defaultConditions(objective) }, audience: { ...cur.audience, [objective]: defaultAudience(objective) } });
    toast.success("Simülasyon varsayılan değerlere sıfırlandı");
  };

  const exportSummary = () => {
    if (!sim.data) return;
    const r = sim.data;
    const lines = [
      `Hedef: ${def.title}`,
      `Kitle: ${selectionLabel(audience, conditions)}`,
      `Kurgu: ${describeConditions(conditions)}`,
      "",
      ...def.comparisonMetrics.map((m) => `${m.label}: ${(m.key === "incrementalSpending" || m.key === "costToIncrementalRatio") && !r.incrementalValidated ? "~" : ""}${formatMetric(metricValue(r, m.key), m.format)}`),
      `Senaryo güvenilirliği: ${r.reliability.level}`,
      `Girdi özeti (hash): ${r.inputHash} · Motor: ${r.engineVersion}`,
    ];
    const pseudo = { name: "Stüdyo simülasyonu", createdAt: new Date().toISOString() } as Scenario;
    downloadText(`senaryo-ozeti-${r.inputHash}.txt`, scenarioSummaryText(pseudo, lines));
    downloadText(`senaryo-${r.inputHash}.json`, JSON.stringify({ request, result: r }, null, 2), "application/json");
    toast.success("Senaryo özeti indirildi", { description: "Metin özeti ve JSON girdisi/sonucu" });
  };

  return (
    <div>
      <PageHeader
        title="Kampanya Simülasyon Stüdyosu"
        description="Parametreleri ayarlayın ve demo sonuçlarının nasıl değiştiğini anında görün. Aynı girdiler her zaman aynı sonucu üretir."
        eyebrow={<DataSourceBadge source="demo" />}
        actions={
          <>
            <Button variant="ghost" onClick={reset}><RotateCcw /> Sıfırla</Button>
            <Button variant="outline" onClick={exportSummary} disabled={!sim.data}><Download /> Özeti dışa aktar</Button>
            <Button onClick={() => setSaveOpen(true)} disabled={!sim.data}><Camera /> Anlık görüntü al</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr_320px]">
        {/* Left — parameters */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-brand-600" /> Parametreler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <span className="text-[13px] font-medium">Kampanya hedefi</span>
                <Select value={objective} onValueChange={(v) => st.set({ objective: v as CampaignObjective })}>
                  <SelectTrigger aria-label="Kampanya hedefi"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{getObjective(o).shortName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-medium">Hedef kitle</span>
                <Select value={audience.mode === "existing" ? audience.audienceId : "custom"} onValueChange={(v) => setAudience({ mode: "existing", audienceId: v })}>
                  <SelectTrigger aria-label="Hedef kitle"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audience.mode === "custom" && <SelectItem value="custom">{audience.name}</SelectItem>}
                    {audiencesForObjective(objective).map((a) => <SelectItem key={a.id} value={a.id}>{audienceDisplayName(a, ctx)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-medium">Ödül mekanizması</span>
                <Select value={conditions.reward.type} onValueChange={(v) => setConditions({ ...conditions, reward: defaultReward(v as CampaignConditions["reward"]["type"], conditions.reward) })}>
                  <SelectTrigger aria-label="Ödül mekanizması"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {def.allowedRewards.map((t) => <SelectItem key={t} value={t}>{REWARD_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-5 border-t border-border pt-5">
                <LeverSlider conditions={conditions} lever="reward" onChange={setConditions} />
                <LeverSlider conditions={conditions} lever="threshold" onChange={setConditions} />
                <LeverSlider conditions={conditions} lever="duration" onChange={setConditions} />
                <LeverSlider conditions={conditions} lever="budget" onChange={setConditions} />
              </div>
              {!valid && <p role="alert" className="text-xs text-danger">{Object.values(errors)[0]}</p>}
            </CardContent>
          </Card>
        </aside>

        {/* Center — live results */}
        <section className="min-w-0 space-y-6">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] leading-relaxed text-ink">“{describeConditions(conditions)}”</p>
              {sim.loading && <InlineLoader />}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="default">{selectionLabel(audience, conditions)}</Badge>
              {keyConditionChips(conditions).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </Card>
          {sim.error ? (
            <ErrorState message={sim.error} onRetry={sim.retry} />
          ) : !sim.data ? (
            <KpiSkeletonRow count={def.primaryKpis.length} />
          ) : (
            <>
              <KpiGrid result={sim.data} className="xl:grid-cols-2 2xl:grid-cols-3" />
              <WhatIfCurve objective={objective} audience={audience} conditions={conditions} />
              <Card>
                <CardHeader>
                  <CardTitle>Segment performansı</CardTitle>
                  <CardDescription>
                    {formatNumber(sim.data.eligibleCustomers)} uygun müşteri · bütçe kullanımı {formatPercent(sim.data.budgetUtilization)}
                    {sim.data.budgetCapped && " · bütçe sınırına ulaşıldı"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SegmentQualificationChart result={sim.data} />
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {/* Right — snapshots & insights */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <SnapshotPanel live={sim.data} onLoad={loadScenario} />
        </aside>
      </div>

      <SaveScenarioDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Anlık görüntü al"
        defaultName={`Stüdyo — ${def.shortName} ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}
        onSave={(name, note) => {
          if (!sim.data || !request) return;
          const s = saveScenarioStandalone(name, request, sim.data, "studio", note || undefined);
          const cur = useStudioStore.getState().compareIds;
          if (cur.length < MAX_COMPARE) st.set({ compareIds: [...cur, s.id] });
          toast.success("Anlık görüntü kaydedildi", { description: "Senaryo kütüphanesine de eklendi." });
        }}
      />
    </div>
  );
}
