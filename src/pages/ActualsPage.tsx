import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";
import type { CampaignActuals } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { ObjectiveBadge, ObjectiveTile } from "@/components/common/ObjectiveIcon";
import { KpiCard } from "@/components/common/KpiCard";
import { InfoTip } from "@/components/common/InfoTip";
import { Legend, TooltipCard } from "@/components/charts/ChartTooltip";
import { forecastError, HISTORICAL_CAMPAIGNS } from "@/data/historical";
import { SEGMENTS } from "@/domain/labels";
import { formatMetric, formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import { ACTUAL_COLOR, GRID, PREDICTED_COLOR } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";

function ErrorPill({ e }: { e: number | null }) {
  if (e === null) return <span className="text-xs text-ink-soft">—</span>;
  const abs = Math.abs(e);
  return (
    <span className={cn("tabular rounded-md px-1.5 py-0.5 text-[11.5px] font-medium", abs <= 0.1 ? "bg-emerald-50 text-emerald-700" : abs <= 0.2 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>
      {formatSignedPercent(e)}
    </span>
  );
}

function CampaignDetail({ c }: { c: CampaignActuals }) {
  const segData = c.segments.map((s) => ({ name: SEGMENTS[s.segmentId].name, predicted: s.predictedRate, actual: s.actualRate, customers: s.customers }));
  const shown = c.metrics.filter((m) => !(m.key === "observedSpending" && m.predicted === 0));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <ObjectiveBadge objective={c.objective} />
        <Badge variant="outline">{c.period}</Badge>
        <Badge variant="outline">Model: {c.modelVersion}</Badge>
        {c.hadControlGroup ? (
          <Badge variant="success"><CheckCircle2 /> Kontrol grubu var</Badge>
        ) : (
          <Badge variant="warning"><XCircle /> Kontrol grubu yok</Badge>
        )}
        <span className="text-xs text-ink-soft">{c.audienceName} · {formatNumber(c.eligibleCustomers)} uygun müşteri</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shown.slice(0, 4).map((m) => {
          const e = forecastError(m.predicted, m.actual);
          return (
            <KpiCard
              key={m.key}
              label={m.label}
              value={m.actual === null ? "Ölçülemedi" : formatMetric(m.actual, m.format, true)}
              sub={<span>Tahmin: {formatMetric(m.predicted, m.format, true)}</span>}
              footer={<div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-soft">Tahmin hatası <ErrorPill e={e} /></div>}
              tooltip={m.actual === null ? "Kontrol grubu olmadığı için gerçek ek ciro ölçülemedi." : "Gerçekleşen değer (sentetik örnek)."}
            />
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tahmin ve gerçekleşme</CardTitle>
            <CardDescription>Tahmin hatası = (gerçekleşen − tahmin) / tahmin</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Metrik</TableHead>
                  <TableHead className="text-right">Tahmin</TableHead>
                  <TableHead className="text-right">Gerçekleşen</TableHead>
                  <TableHead className="text-right">Hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="text-[13px]">{m.label}</TableCell>
                    <TableCell className="tabular text-right">{formatMetric(m.predicted, m.format, true)}</TableCell>
                    <TableCell className="tabular text-right font-medium">{m.actual === null ? <span className="text-xs font-normal text-ink-soft">Ölçülemedi</span> : formatMetric(m.actual, m.format, true)}</TableCell>
                    <TableCell className="text-right"><ErrorPill e={forecastError(m.predicted, m.actual)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!c.hadControlGroup && <p className="px-3 pt-3 text-xs text-ink-soft">Kontrol grubu olmadan gözlenen harcama ile gerçek ek ciro ayrıştırılamaz; bu nedenle ek ciro gerçekleşmesi ölçülmemiştir.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Segment düzeyinde hak kazanma oranı</CardTitle>
            <CardDescription>Tahmin edilen ve gerçekleşen oran</CardDescription>
          </CardHeader>
          <CardContent>
            <Legend items={[{ label: "Tahmin", color: PREDICTED_COLOR }, { label: "Gerçekleşen", color: ACTUAL_COLOR }]} />
            <div className="mt-3 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segData} margin={{ top: 18, left: -8, right: 8 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatPercent(v)} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    cursor={{ fill: "rgba(103,56,200,0.05)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <TooltipCard
                          title={String(payload[0].payload.name)}
                          rows={[
                            { label: "Tahmin", value: formatPercent(payload[0].payload.predicted, 1), color: PREDICTED_COLOR },
                            { label: "Gerçekleşen", value: formatPercent(payload[0].payload.actual, 1), color: ACTUAL_COLOR },
                            { label: "Fark", value: formatSignedPercent((payload[0].payload.actual - payload[0].payload.predicted) / payload[0].payload.predicted) },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="predicted" name="Tahmin" fill={PREDICTED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="actual" name="Gerçekleşen" fill={ACTUAL_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList dataKey="actual" position="top" formatter={(v: number) => formatPercent(v, 1)} style={{ fontSize: 10.5, fill: "#6B6B85" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ActualsPage() {
  const [selectedId, setSelectedId] = useState(HISTORICAL_CAMPAIGNS.at(-1)!.id);
  const selected = HISTORICAL_CAMPAIGNS.find((c) => c.id === selectedId)!;
  const errorData = HISTORICAL_CAMPAIGNS.map((c) => {
    const m = c.metrics.find((x) => x.key === "qualificationRate")!;
    return { name: c.name, error: forecastError(m.predicted, m.actual) ?? 0 };
  });

  return (
    <div>
      <PageHeader
        title="Gerçekleşen Sonuçlar"
        description="Tamamlanmış kampanyalarda tahmin edilen ve gerçekleşen sonuçların karşılaştırması. Gösterilen tüm kampanyalar sentetik örneklerdir."
        eyebrow={
          <div className="flex flex-wrap gap-2">
            <DataSourceBadge source="observed" />
          </div>
        }
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Hak kazanma oranında tahmin hatası <InfoTip content="Pozitif: gerçekleşen tahminden yüksek. Negatif: gerçekleşen tahminden düşük." />
          </CardTitle>
          <CardDescription>Kampanya bazında (gerçekleşen − tahmin) / tahmin · Mavi: gerçekleşen tahminden yüksek, turuncu: düşük. Ayrıntı için bir çubuğa tıklayın.</CardDescription>
        </CardHeader>
        <CardContent style={{ height: errorData.length * 30 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={errorData} layout="vertical" margin={{ top: 4, left: 8, right: 56, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tickFormatter={(v) => formatPercent(v)} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={210} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#17172F" }} />
              <ReferenceLine x={0} stroke="#9C98C2" />
              <Tooltip cursor={{ fill: "rgba(103,56,200,0.05)" }} content={({ active, payload }) => (active && payload?.length ? <TooltipCard title={String(payload[0].payload.name)} rows={[{ label: "Tahmin hatası", value: formatSignedPercent(Number(payload[0].value)) }]} /> : null)} />
              <Bar dataKey="error" radius={4} maxBarSize={18} onClick={(_, i) => setSelectedId(HISTORICAL_CAMPAIGNS[i].id)} className="cursor-pointer">
                {errorData.map((d, i) => (
                  <Cell key={d.name} fill={d.error >= 0 ? "#2a78d6" : "#eb6834"} opacity={HISTORICAL_CAMPAIGNS[i].id === selectedId ? 1 : 0.55} />
                ))}
                <LabelList dataKey="error" position="right" formatter={(v: number) => formatSignedPercent(v)} style={{ fontSize: 11, fill: "#6B6B85" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tamamlanan kampanyalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[...HISTORICAL_CAMPAIGNS].reverse().map((c) => {
              const m = c.metrics.find((x) => x.key === "qualificationRate")!;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={c.id === selectedId}
                  className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors", c.id === selectedId ? "border-brand-300 bg-brand-50/70" : "border-transparent hover:bg-brand-50/40")}
                >
                  <ObjectiveTile objective={c.objective} className="h-8 w-8 [&_svg]:h-4 [&_svg]:w-4" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{c.name}</div>
                    <div className="text-[11px] text-ink-soft">{c.period}</div>
                  </div>
                  <ErrorPill e={forecastError(m.predicted, m.actual)} />
                </button>
              );
            })}
          </CardContent>
        </Card>
        <div className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold">{selected.name}</h2>
          <CampaignDetail c={selected} />
        </div>
      </div>
    </div>
  );
}
