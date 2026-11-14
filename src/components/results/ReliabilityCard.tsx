import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { SimulationResult } from "@/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/common/InfoTip";
import { GLOSSARY, RELIABILITY_LABELS } from "@/domain/labels";
import { formatNumber, formatPercent } from "@/lib/format";

export function ReliabilityCard({ result }: { result: SimulationResult }) {
  const r = result.reliability;
  const Icon = r.level === "yuksek" ? ShieldCheck : r.level === "orta" ? ShieldQuestion : ShieldAlert;
  const variant = r.level === "yuksek" ? "success" : r.level === "orta" ? "warning" : "danger";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5">
          Senaryo güvenilirliği <InfoTip content={GLOSSARY.reliability} />
        </CardTitle>
        <Badge variant={variant}>
          <Icon /> {RELIABILITY_LABELS[r.level]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-brand-50/50 p-2.5">
            <dt className="text-[11px] text-ink-soft">Veri kapsamı</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold">{formatPercent(r.dataCoverage)}</dd>
          </div>
          <div className="rounded-lg bg-brand-50/50 p-2.5">
            <dt className="text-[11px] text-ink-soft">Desteklenen aralık</dt>
            <dd className="mt-0.5 text-sm font-semibold">{r.withinSupportedRange ? "İçinde" : "Dışında"}</dd>
          </div>
          <div className="rounded-lg bg-brand-50/50 p-2.5">
            <dt className="text-[11px] text-ink-soft">Benzer kampanya</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold">{r.comparableCampaigns}</dd>
          </div>
        </dl>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
            Varsayım duyarlılığı (hak kazanan) <InfoTip content={GLOSSARY.sensitivity} />
          </div>
          <SensitivityBar low={r.sensitivity.low} point={result.qualifiedCustomers} high={r.sensitivity.high} />
          <p className="mt-1.5 text-[11px] text-ink-soft">İstatistiksel güven aralığı değildir; tepki varsayımı ±%25 değiştirildiğinde elde edilen değerlerdir.</p>
        </div>
        {r.notes.length > 0 && (
          <ul className="space-y-1.5 border-t border-border pt-3 text-xs text-ink-soft">
            {r.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {n}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SensitivityBar({ low, point, high }: { low: number; point: number; high: number }) {
  const max = Math.max(high * 1.1, 1);
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-brand-50">
        <div className="absolute h-2 rounded-full bg-brand-200" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        <div className="absolute -top-1 h-4 w-1 rounded-full bg-brand-600" style={{ left: `calc(${pct(point)} - 2px)` }} />
      </div>
      <div className="tabular mt-1.5 flex justify-between text-[11px] text-ink-soft">
        <span>Düşük: {formatNumber(low)}</span>
        <span className="font-medium text-ink">Nokta: {formatNumber(point)}</span>
        <span>Yüksek: {formatNumber(high)}</span>
      </div>
    </div>
  );
}
