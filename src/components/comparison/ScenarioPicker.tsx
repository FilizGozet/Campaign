import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CampaignObjective, Scenario } from "@/domain/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { MAX_COMPARE } from "@/store/scenarioStore";
import { cn } from "@/lib/utils";

export function ScenarioPicker({
  scenarios,
  selected,
  onChange,
  preferObjective,
  preferCampaignId,
}: {
  scenarios: Scenario[];
  selected: string[];
  onChange: (ids: string[]) => void;
  preferObjective?: CampaignObjective | null;
  preferCampaignId?: string | null;
}) {
  const [q, setQ] = useState("");
  const [onlySame, setOnlySame] = useState(!!preferObjective);
  const list = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return scenarios
      .filter((s) => !onlySame || !preferObjective || s.objective === preferObjective)
      .filter((s) => !term || s.name.toLocaleLowerCase("tr").includes(term))
      .sort((a, b) => {
        const pa = a.campaignId && a.campaignId === preferCampaignId ? 0 : 1;
        const pb = b.campaignId && b.campaignId === preferCampaignId ? 0 : 1;
        return pa - pb || b.createdAt.localeCompare(a.createdAt);
      });
  }, [scenarios, q, onlySame, preferObjective, preferCampaignId]);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_COMPARE) onChange([...selected, id]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Senaryo ara" className="pl-9" aria-label="Senaryo ara" />
        </div>
        {preferObjective && (
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <Checkbox checked={onlySame} onCheckedChange={(c) => setOnlySame(!!c)} /> Yalnızca aynı hedef
          </label>
        )}
        <Badge variant={selected.length >= MAX_COMPARE ? "warning" : "default"}>
          {selected.length} / {MAX_COMPARE} seçili
        </Badge>
      </div>
      <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {list.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">Eşleşen senaryo yok.</p>}
        {list.map((s) => {
          const checked = selected.includes(s.id);
          const disabled = !checked && selected.length >= MAX_COMPARE;
          return (
            <label
              key={s.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                checked ? "border-brand-300 bg-brand-50/60" : "border-border bg-white hover:bg-brand-50/30",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(s.id)} aria-label={`${s.name} senaryosunu seç`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-medium">{s.name}</span>
                  <ObjectiveBadge objective={s.objective} />
                  {s.campaignId && s.campaignId === preferCampaignId && <Badge variant="muted">Bu kampanya</Badge>}
                </div>
                <div className="tabular mt-0.5 text-[11.5px] text-ink-soft">
                  {formatNumber(s.result.qualifiedCustomers)} hak kazanan · {formatCurrency(s.result.totalCost, { compact: true })} maliyet · {formatDate(s.createdAt)}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {selected.length >= MAX_COMPARE && <p className="text-xs text-ink-soft">En fazla {MAX_COMPARE} senaryo karşılaştırılabilir.</p>}
    </div>
  );
}
