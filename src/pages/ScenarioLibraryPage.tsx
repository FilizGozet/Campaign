import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, ExternalLink, FlaskConical, GitCompare, Library, MoreHorizontal, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { CampaignObjective, Scenario } from "@/domain/types";
import { OBJECTIVES } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { displayMetric } from "@/components/results/metricDisplay";
import { useScenarioStore, MAX_COMPARE } from "@/store/scenarioStore";
import { useCampaignStore } from "@/store/campaignStore";
import { getObjective } from "@/domain/objectives";
import { keyConditionChips } from "@/engine/conditions";
import { selectionLabel } from "@/data/audiences";
import { deleteScenario, duplicateScenario } from "@/services/campaignActions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function ScenarioCard({ s, selected, onToggle, disabled, onDelete }: { s: Scenario; selected: boolean; onToggle: () => void; disabled: boolean; onDelete: () => void }) {
  const navigate = useNavigate();
  const campaign = useCampaignStore((st) => st.campaigns.find((c) => c.id === s.campaignId));
  const kpis = getObjective(s.objective).primaryKpis.slice(0, 3);
  return (
    <Card className={cn("flex flex-col p-5 transition-all hover:shadow-lift", selected && "border-brand-300 ring-4 ring-brand-100")}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} disabled={disabled && !selected} aria-label={`${s.name} karşılaştırmaya ekle`} className="mt-1" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold" title={s.name}>{s.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ObjectiveBadge objective={s.objective} />
            {s.source === "studio" && <Badge variant="info">Stüdyo</Badge>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${s.name} işlemleri`}><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => navigate(`/kampanya/yeni?senaryo=${s.id}&adim=3`)}><ExternalLink /> Senaryoyu aç</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/simulasyon?senaryo=${s.id}`)}><FlaskConical /> Stüdyoda incele</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const c = duplicateScenario(s.id);
                if (c) toast.success("Senaryo kopyalandı", { description: c.name });
              }}
            >
              <Copy /> Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}><Trash2 /> Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 text-xs text-ink-soft">
        <div className="truncate">Kitle: <span className="text-ink">{selectionLabel(s.audience, s.conditions)}</span></div>
        {campaign && <div className="truncate">Kampanya: <span className="text-ink">{campaign.name}</span></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {keyConditionChips(s.conditions).slice(0, 4).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-brand-50/50 p-3">
        {kpis.map((k) => {
          const m = displayMetric(s.result, k, true);
          return (
            <div key={k.key} className="min-w-0">
              <dt className="line-clamp-2 text-[10.5px] leading-tight text-ink-soft">{k.label}</dt>
              <dd className={cn("tabular mt-1 text-[13.5px] font-semibold", m.unvalidated && "text-ink-soft/70")}>{m.unvalidated ? "~" : ""}{m.text}</dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-ink-soft">
        <span>{formatDateTime(s.createdAt)}</span>
        <Button variant="link" size="sm" className="h-auto text-xs" onClick={() => navigate(`/kampanya/yeni?senaryo=${s.id}&adim=3`)}>Aç</Button>
      </div>
    </Card>
  );
}

export default function ScenarioLibraryPage() {
  const scenarios = useScenarioStore((s) => s.scenarios);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [objective, setObjective] = useState<CampaignObjective | "all">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<Scenario | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return scenarios
      .filter((s) => objective === "all" || s.objective === objective)
      .filter((s) => !term || s.name.toLocaleLowerCase("tr").includes(term))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [scenarios, q, objective]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));

  return (
    <div className="pb-20">
      <PageHeader
        title="Senaryo Kütüphanesi"
        description="Kaydedilmiş tüm senaryolar bu tarayıcıda saklanır. Karşılaştırmak için en fazla dört senaryo seçin."
        eyebrow={<DataSourceBadge source="demo" />}
        actions={
          <Button variant="outline" onClick={() => navigate("/simulasyon")}>
            <FlaskConical /> Simülasyon stüdyosu
          </Button>
        }
      />
      <Card className="mb-5 p-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Senaryo ara" className="pl-9" aria-label="Senaryo ara" />
          </div>
          <Select value={objective} onValueChange={(v) => setObjective(v as CampaignObjective | "all")}>
            <SelectTrigger className="md:w-[240px]" aria-label="Hedef filtresi"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm hedefler</SelectItem>
              {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{getObjective(o).shortName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title={scenarios.length ? "Eşleşen senaryo yok" : "Henüz kaydedilmiş senaryo yok"}
          description={scenarios.length ? "Arama veya filtreyi değiştirin." : "Yeni kampanya sihirbazında veya simülasyon stüdyosunda bir senaryo kaydedin."}
          action={<Button onClick={() => navigate("/kampanya/yeni?yeni=1")}>Yeni kampanya</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((s) => (
            <ScenarioCard key={s.id} s={s} selected={selected.includes(s.id)} disabled={selected.length >= MAX_COMPARE} onToggle={() => toggle(s.id)} onDelete={() => setToDelete(s)} />
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#1E1B38] px-4 py-3 text-white shadow-2xl">
          <span className="text-[13px]">{selected.length} senaryo seçildi {selected.length >= MAX_COMPARE && "(en fazla)"}</span>
          <Button size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setSelected([])}><X /> Temizle</Button>
          <Button size="sm" className="bg-brand-500 hover:bg-brand-400" disabled={selected.length < 2} onClick={() => navigate(`/senaryolar/karsilastir?ids=${selected.join(",")}`)}>
            <GitCompare /> Karşılaştır
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Senaryo silinsin mi?"
        description={toDelete ? `“${toDelete.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ""}
        confirmLabel="Sil"
        destructive
        onConfirm={() => {
          if (!toDelete) return;
          deleteScenario(toDelete.id);
          setSelected((s) => s.filter((x) => x !== toDelete.id));
          toast.success("Senaryo silindi");
        }}
      />
    </div>
  );
}
