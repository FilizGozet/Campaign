import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import type { SimulationResult } from "@/domain/types";
import { SEGMENTS } from "@/domain/labels";
import { formatCompact, formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { BASELINE_COLOR, EFFECT_COLOR, GRID } from "@/lib/chartTheme";
import { Legend, TooltipCard } from "@/components/charts/ChartTooltip";
import { safeDiv } from "@/engine/math";

/** Stacked horizontal bars: qualifiers expected anyway vs. campaign effect, per segment. */
export function SegmentQualificationChart({ result }: { result: SimulationResult }) {
  const data = result.segments.map((s) => ({
    name: SEGMENTS[s.segmentId].name,
    natural: s.naturalQualifiers,
    induced: Math.max(0, s.qualifiedCustomers - s.naturalQualifiers),
    rate: s.qualificationRate,
    total: s.qualifiedCustomers,
  }));
  const height = Math.max(160, data.length * 52 + 40);
  return (
    <div>
      <Legend
        items={[
          { label: "Kampanyasız da koşulu sağlaması beklenen", color: BASELINE_COLOR },
          { label: "Kampanyayla ilişkilendirilen ek hak kazanan", color: EFFECT_COLOR },
        ]}
      />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 72, top: 4, bottom: 4 }} barCategoryGap={14}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tickFormatter={(v) => formatCompact(v)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#17172F" }} />
            <Tooltip
              cursor={{ fill: "rgba(103,56,200,0.05)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(payload[0].payload.name)}
                    rows={[
                      { label: "Kampanyasız da", value: formatNumber(payload[0].payload.natural), color: BASELINE_COLOR },
                      { label: "Kampanya etkisi", value: formatNumber(payload[0].payload.induced), color: EFFECT_COLOR },
                      { label: "Hak kazanma oranı", value: formatPercent(payload[0].payload.rate, 1) },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="natural" stackId="a" fill={BASELINE_COLOR} stroke="#fff" strokeWidth={2} name="Kampanyasız da" />
            <Bar dataKey="induced" stackId="a" fill={EFFECT_COLOR} radius={[0, 4, 4, 0]} stroke="#fff" strokeWidth={2} name="Kampanya etkisi">
              <LabelList dataKey="rate" position="right" formatter={(v: number) => formatPercent(v, 1)} style={{ fontSize: 11, fill: "#6B6B85" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Donut of expected cost by segment, total in the centre, direct labels in the legend list. */
export function CostDonut({ result }: { result: SimulationResult }) {
  const data = result.segments
    .filter((s) => s.totalCost > 0)
    .map((s) => ({ name: SEGMENTS[s.segmentId].name, value: s.totalCost, color: SEGMENTS[s.segmentId].color }));
  const total = result.totalCost;
  if (!data.length) return <p className="py-10 text-center text-sm text-ink-soft">Beklenen maliyet yok.</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={data.length > 1 ? 2 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(payload[0].name)}
                    rows={[
                      { label: "Maliyet", value: formatCurrency(Number(payload[0].value)), color: payload[0].payload.color },
                      { label: "Pay", value: formatPercent(safeDiv(Number(payload[0].value), total), 1) },
                    ]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-ink-soft">Toplam</span>
          <span className="tabular text-base font-semibold">{formatCurrency(total, { compact: true })}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-soft">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="tabular shrink-0 font-medium text-ink">
              {formatPercent(safeDiv(d.value, total))} · {formatCurrency(d.value, { compact: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Observed campaign spending split into "expected anyway" and incremental estimate. */
export function SpendingSplit({ result }: { result: SimulationResult }) {
  const observed = result.observedSpending;
  const inc = Math.min(result.incrementalSpending, observed);
  const base = Math.max(0, observed - inc);
  const incShare = safeDiv(inc, observed);
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-soft">Gözlenecek kampanya harcaması</span>
        <span className="tabular text-lg font-semibold">{formatCurrency(observed, { compact: true })}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-brand-50" role="img" aria-label={`Ek ciro payı ${formatPercent(incShare)}`}>
        <div style={{ width: `${(1 - incShare) * 100}%`, background: BASELINE_COLOR }} className="border-r-2 border-white" />
        <div style={{ width: `${incShare * 100}%`, background: result.incrementalValidated ? EFFECT_COLOR : "repeating-linear-gradient(45deg,#6250d6 0 4px,#9b8fe6 4px 8px)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="flex items-center gap-1.5 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BASELINE_COLOR }} /> Kampanyasız da beklenen
          </div>
          <div className="tabular mt-0.5 font-medium">{formatCurrency(base, { compact: true })}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EFFECT_COLOR }} /> Tahmini ek ciro {result.incrementalValidated ? "" : "(doğrulanmadı)"}
          </div>
          <div className="tabular mt-0.5 font-medium">
            {result.incrementalValidated ? "" : "~"}
            {formatCurrency(inc, { compact: true })} · {formatPercent(incShare)}
          </div>
        </div>
      </div>
    </div>
  );
}
