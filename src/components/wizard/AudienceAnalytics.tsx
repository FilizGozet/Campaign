import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp, Users, Wallet, History, Database } from "lucide-react";
import type { AudienceStats } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { SEGMENTS } from "@/domain/labels";
import { attributeAvailability } from "@/data/audiences";
import { formatCompact, formatCurrency, formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import { GRID, SERIES } from "@/lib/chartTheme";
import { TooltipCard } from "@/components/charts/ChartTooltip";

export function AudienceAnalytics({ stats, title }: { stats: AudienceStats; title: string }) {
  const avail = attributeAvailability();
  const inactive = stats.avgMonthlySpend === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">Kitle analizi</h3>
          <p className="text-[13px] text-ink-soft">{title}</p>
        </div>
        <DataSourceBadge source="observed" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Toplam uygun müşteri" icon={<Users />} value={formatNumber(stats.eligibleCustomers)} sub="Kampanya uygunluk kuralları öncesi" highlight />
        <KpiCard
          label="Ortalama aylık harcama"
          icon={<Wallet />}
          value={inactive ? (stats.avgHistoricalMonthlySpend > 0 ? formatCurrency(stats.avgHistoricalMonthlySpend) : "—") : formatCurrency(stats.avgMonthlySpend)}
          sub={inactive ? (stats.avgHistoricalMonthlySpend > 0 ? "Pasiflik öncesi ortalama; son dönemde işlem yok" : "Kart hiç kullanılmamış") : `Ayda ort. ${formatNumber(stats.avgMonthlyTx, 1)} işlem`}
        />
        <KpiCard
          label="Harcama eğilimi"
          icon={stats.spendTrend < 0 ? <TrendingDown /> : <TrendingUp />}
          value={inactive ? "Pasif" : formatSignedPercent(stats.spendTrend)}
          sub="Son ay / 3 aylık ortalama"
          tooltip="Son ay harcamasının son 3 aylık ortalamaya göre değişimi."
        />
        <KpiCard
          label="Geçmiş kampanya tepkisi"
          icon={<History />}
          value={formatPercent(stats.historicalResponse, 1)}
          sub="Son 12 ay katılım / teklif"
          tooltip="Son 12 ayda teklif edilen kampanyalara katılım oranı (gözlenen, sentetik)."
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Aylık harcama dağılımı</CardTitle>
            <CardDescription>Müşteri sayısı, aylık harcama aralığına göre (TL)</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.spendDistribution} margin={{ left: -8, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="band" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCompact(v)} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  cursor={{ fill: "rgba(103,56,200,0.05)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipCard title={`${payload[0].payload.band} TL`} rows={[{ label: "Müşteri", value: formatNumber(Number(payload[0].value)), color: SERIES[0] }]} />
                    ) : null
                  }
                />
                <Bar dataKey="customers" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Harcama eğilimi</CardTitle>
            <CardDescription>Ortalama aylık harcama, son 6 ay</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend} margin={{ left: -8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCompact(v)} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipCard title={String(payload[0].payload.month)} rows={[{ label: "Ort. harcama", value: formatCurrency(Number(payload[0].value)), color: SERIES[0] }]} />
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="spend" stroke={SERIES[0]} strokeWidth={2} fill="url(#trendFill)" dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Segment kırılımı</CardTitle>
            <CardDescription>Davranışsal segmentlere göre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.segmentBreakdown.map((s) => (
              <div key={s.segmentId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEGMENTS[s.segmentId].color }} />
                    {SEGMENTS[s.segmentId].name}
                  </span>
                  <span className="tabular text-ink-soft">
                    {formatPercent(s.share)} · {formatCompact(s.customers)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-brand-50">
                  <div className="h-1.5 rounded-full" style={{ width: `${s.share * 100}%`, background: SEGMENTS[s.segmentId].color }} />
                </div>
              </div>
            ))}
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11.5px] leading-relaxed text-ink-soft">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
                <Database className="h-3.5 w-3.5" /> Veri kullanılabilirliği
              </div>
              Davranışsal öznitelikler isteğe bağlıdır ve veri bulunabilirliğine tabidir. Sektör kırılımı müşterilerin {formatPercent(avail.categoryShares)}'inde, kart kullanım payı {formatPercent(avail.cardUsageShare)}'inde mevcuttur. Kitlenin ortalama veri kapsamı: {formatPercent(stats.dataCoverage)}. Demografik veri kullanılmamaktadır.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
