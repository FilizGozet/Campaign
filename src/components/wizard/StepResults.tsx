import { useMemo, useState } from "react";
import { ArrowRight, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState, KpiSkeletonRow } from "@/components/common/States";
import { Skeleton } from "@/components/ui/skeleton";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { SaveScenarioDialog } from "@/components/common/SaveScenarioDialog";
import { ResultsDashboard } from "@/components/results/ResultsDashboard";
import { useWizardStore, useWizardCurrent } from "@/store/wizardStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useSimulation } from "@/hooks/useSimulation";
import { describeConditions, keyConditionChips } from "@/engine/conditions";
import { selectionLabel } from "@/data/audiences";
import { getObjective } from "@/domain/objectives";
import { saveScenarioFromWizard } from "@/services/campaignActions";
import { formatNumber } from "@/lib/format";

export function StepResults({ onGoCompare }: { onGoCompare: () => void }) {
  const { objective, audience, conditions } = useWizardCurrent();
  const campaignId = useWizardStore((s) => s.campaignId);
  const lastSaved = useWizardStore((s) => s.lastSavedScenarioId);
  const scenarioCount = useScenarioStore((s) => s.scenarios.filter((x) => campaignId && x.campaignId === campaignId).length);
  const req = useMemo(() => (objective && audience && conditions ? { objective, audience, conditions } : null), [objective, audience, conditions]);
  const sim = useSimulation(req, 0);
  const [saveOpen, setSaveOpen] = useState(false);
  const savedScenario = useScenarioStore((s) => s.scenarios.find((x) => x.id === lastSaved));
  const alreadySaved = !!(savedScenario && sim.data && savedScenario.result.inputHash === sim.data.inputHash);

  if (!req || !conditions || !objective) return null;

  const summary = (
    <Card>
      <CardHeader>
        <CardTitle>Kampanya özeti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[13px]">
        <p className="leading-relaxed text-ink">{describeConditions(conditions)}</p>
        <div className="text-xs text-ink-soft">
          Hedef: <span className="font-medium text-ink">{getObjective(objective).shortName}</span> · Kitle: <span className="font-medium text-ink">{selectionLabel(audience, conditions)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keyConditionChips(conditions).map((c) => (
            <Badge key={c} variant="outline">{c}</Badge>
          ))}
        </div>
        {sim.data && (
          <p className="text-xs text-ink-soft">
            Kitledeki {formatNumber(sim.data.audienceSize)} müşteriden {formatNumber(sim.data.eligibleCustomers)}'i kampanya uygunluk kurallarını karşılıyor.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-[13px] text-amber-900 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Bu sonuçlar <strong>sentetik veri üzerinde çalışan demo simülasyonudur</strong>; eğitilmiş bir makine öğrenmesi tahmini değildir. Ödül ile müşteri davranışı arasındaki ilişki bir model varsayımıdır, kanıtlanmış nedensel etki değildir.
          </span>
        </div>
        <DataSourceBadge source="demo" />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {alreadySaved && <span className="text-xs text-ink-soft">Bu kurgu “{savedScenario?.name}” olarak kaydedildi.</span>}
        <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!sim.data}>
          <Save /> {alreadySaved ? "Farklı adla kaydet" : "Senaryoyu kaydet"}
        </Button>
        <Button onClick={onGoCompare} disabled={!sim.data}>
          Karşılaştırmaya geç <ArrowRight />
        </Button>
      </div>
      {sim.error ? (
        <ErrorState title="Simülasyon çalıştırılamadı" message={sim.error} onRetry={sim.retry} />
      ) : !sim.data ? (
        <div className="space-y-6" aria-busy="true">
          <KpiSkeletonRow count={getObjective(objective).primaryKpis.length} />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className={sim.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ResultsDashboard result={sim.data} summary={summary} />
        </div>
      )}
      <SaveScenarioDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultName={`Senaryo ${String.fromCharCode(65 + Math.min(scenarioCount, 25))}`}
        onSave={(name, note) => {
          if (!sim.data) return;
          saveScenarioFromWizard(name, req, sim.data, note || undefined);
          toast.success("Senaryo kaydedildi", { description: `“${name}” karşılaştırmaya eklendi.` });
        }}
      />
    </div>
  );
}
