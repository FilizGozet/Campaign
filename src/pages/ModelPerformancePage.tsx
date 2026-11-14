import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Cpu, Database, GitBranch, ServerCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { Legend, TooltipCard } from "@/components/charts/ChartTooltip";
import { DATA_QUALITY, MODEL_INFO, OBJECTIVE_SUPPORT } from "@/data/historical";
import { errorTrend, overallErrors, segmentErrors } from "@/data/modelPerformance";
import { attributeAvailability } from "@/data/audiences";
import { SEGMENTS } from "@/domain/labels";
import { predictionService } from "@/services/prediction";
import { formatPercent, formatSignedPercent, formatCompact } from "@/lib/format";
import { GRID, SERIES } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

const SERIES_DEF = [
  { key: "qualification", label: "Hak kazanma oranı", color: SERIES[0] },
  { key: "cost", label: "Kampanya maliyeti", color: SERIES[1] },
  { key: "spending", label: "Gözlenen harcama", color: SERIES[2] },
] as const;

const SUPPORT_BADGE = {
  destekleniyor: { label: "Destekleniyor", variant: "success" as const },
  sinirli: { label: "Sınırlı", variant: "warning" as const },
  deneysel: { label: "Deneysel", variant: "danger" as const },
};

export default function ModelPerformancePage() {
  const trend = errorTrend();
  const segs = segmentErrors();
  const overall = overallErrors();
  const avail = attributeAvailability();
  return (
    <div>
      <PageHeader
        title="Model Performansı"
        description="Tahmin motorunun geçmiş kampanyalardaki isabeti, veri kapsamı ve veri kalitesi göstergeleri. Bu sayfadaki tüm metrikler gösterim amaçlı sentetik verilerdir."
        eyebrow={<div className="flex flex-wrap gap-2"><DataSourceBadge source="observed" /><DataSourceBadge source="ml" /></div>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Hak kazanma oranı — ort. mutlak hata" value={formatPercent(overall.qualification, 1)} sub={`${overall.total} kampanya`} highlight tooltip="Ortalama mutlak yüzde hata (MAPE): |gerçekleşen − tahmin| / tahmin ortalaması." />
        <KpiCard label="Maliyet — ort. mutlak hata" value={formatPercent(overall.cost, 1)} sub="Tüm hedefler" />
        <KpiCard label="Gözlenen harcama — ort. mutlak hata" value={formatPercent(overall.spending, 1)} sub="Harcama ölçülen kampanyalar" />
        <KpiCard label="Ek ciro — ort. mutlak hata" value={formatPercent(overall.incremental, 1)} sub={`Yalnızca kontrol gruplu ${overall.withControl} kampanya`} warning={overall.withControl < overall.total ? `${overall.total - overall.withControl} kampanyada ölçülemedi` : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Tahmin hatası eğilimi</CardTitle>
            <CardDescription>Kampanya bitiş ayına göre ortalama mutlak yüzde hata</CardDescription>
          </CardHeader>
          <CardContent>
            <Legend items={SERIES_DEF.map((s) => ({ label: s.label, color: s.color }))} />
            <div className="mt-3 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 16, left: -4 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatPercent(v)} axisLine={false} tickLine={false} width={44} />
                  <ReferenceLine x={trend.find((t) => t.version === "demo-sim 0.3")?.month} stroke="#9C98C2" strokeDasharray="4 4" label={{ value: "v0.3", position: "insideTopRight", fontSize: 11, fill: "#6B6B85" }} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <TooltipCard
                          title={`${label} · ${payload[0].payload.version} · ${payload[0].payload.campaigns} kampanya`}
                          rows={payload.map((p) => ({ label: String(p.name), value: p.value === null ? "—" : formatPercent(Number(p.value), 1), color: String(p.color) }))}
                        />
                      ) : null
                    }
                  />
                  {SERIES_DEF.map((s) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Model sürümü</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {[
              { Icon: GitBranch, label: "Etkin sürüm", value: MODEL_INFO.currentVersion },
              { Icon: Cpu, label: "Motor", value: MODEL_INFO.engine },
              { Icon: ServerCog, label: "Tahmin servisi", value: predictionService.label },
              { Icon: Database, label: "Kalibrasyon verisi", value: `${MODEL_INFO.trainingWindow} · son kalibrasyon ${MODEL_INFO.lastCalibration}` },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <div>
                  <div className="text-[11px] text-ink-soft">{label}</div>
                  <div className="font-medium">{value}</div>
                </div>
              </div>
            ))}
            <div className="rounded-lg bg-brand-50/60 p-3 text-xs text-ink-soft">
              Planlanan: <span className="font-medium text-ink">{MODEL_INFO.nextVersion}</span>. Arayüz, PredictionService soyutlaması sayesinde değişmeden gerçek tahmin servisine bağlanabilir.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Segment düzeyinde hata</CardTitle>
            <CardDescription>Hak kazanma oranında müşteri ağırlıklı sapma (gerçekleşen − tahmin) / tahmin</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segs.map((s) => ({ name: SEGMENTS[s.segmentId].name, bias: s.bias, mape: s.mape, customers: s.customers }))} layout="vertical" margin={{ left: 8, right: 56 }}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" tickFormatter={(v) => formatPercent(v)} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#17172F" }} />
                <ReferenceLine x={0} stroke="#9C98C2" />
                <Tooltip
                  cursor={{ fill: "rgba(103,56,200,0.05)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipCard
                        title={String(payload[0].payload.name)}
                        rows={[
                          { label: "Ortalama sapma", value: formatSignedPercent(payload[0].payload.bias) },
                          { label: "Ort. mutlak hata", value: formatPercent(payload[0].payload.mape, 1) },
                          { label: "Müşteri", value: formatCompact(payload[0].payload.customers) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="bias" radius={4} maxBarSize={20}>
                  {segs.map((s) => <Cell key={s.segmentId} fill={s.bias >= 0 ? "#2a78d6" : "#eb6834"} />)}
                  <LabelList dataKey="bias" position="right" formatter={(v: number) => formatSignedPercent(v)} style={{ fontSize: 11, fill: "#6B6B85" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Desteklenen kampanya hedefleri</CardTitle>
            <CardDescription>Geçmiş gözlem sayısı ve kapsam durumu</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Hedef</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Kampanya</TableHead>
                  <TableHead>Not</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OBJECTIVE_SUPPORT.map((o) => (
                  <TableRow key={o.objective}>
                    <TableCell><ObjectiveBadge objective={o.objective} /></TableCell>
                    <TableCell><Badge variant={SUPPORT_BADGE[o.status].variant}>{SUPPORT_BADGE[o.status].label}</Badge></TableCell>
                    <TableCell className="tabular text-right">{o.campaigns}</TableCell>
                    <TableCell className="text-xs text-ink-soft">{o.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Veri kalitesi göstergeleri</CardTitle>
            <CardDescription>Eşik altındaki göstergeler senaryo güvenilirliğini düşürür.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {DATA_QUALITY.map((d) => {
              const ok = d.value >= d.threshold;
              return (
                <div key={d.label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium">{d.label}</span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", ok ? "text-success" : "text-warning")}>
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {formatPercent(d.value)}
                    </span>
                  </div>
                  <div className="relative mt-2 h-1.5 rounded-full bg-brand-50">
                    <div className={cn("h-1.5 rounded-full", ok ? "bg-brand-500" : "bg-amber-500")} style={{ width: `${d.value * 100}%` }} />
                    <div className="absolute -top-1 h-3.5 w-0.5 bg-ink/40" style={{ left: `${d.threshold * 100}%` }} title={`Eşik ${formatPercent(d.threshold)}`} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-soft">{d.description} Eşik: {formatPercent(d.threshold)}.</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Veri kapsamı</CardTitle>
            <CardDescription>Sentetik müşteri popülasyonunda doluluk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {[
              ["İşlem ve harcama verisi", avail.transactions],
              ["Ürün sahipliği", avail.products],
              ["Kampanya geçmişi", avail.campaignHistory],
              ["Sektör kırılımı", avail.categoryShares],
              ["Kart kullanım payı", avail.cardUsageShare],
            ].map(([label, v]) => (
              <div key={label as string}>
                <div className="mb-1 flex justify-between"><span>{label}</span><span className="tabular text-ink-soft">{formatPercent(v as number)}</span></div>
                <div className="h-1.5 rounded-full bg-brand-50"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(v as number) * 100}%` }} /></div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-ink-soft">Demografik öznitelik kullanılmamaktadır. Eksik alanlar için popülasyon ortalamaları kullanılır ve güvenilirlik göstergesine yansıtılır.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
