import { useEffect, useMemo, useState } from "react";
import { Copy, GitCompare, PencilLine, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/States";
import { SaveScenarioDialog } from "@/components/common/SaveScenarioDialog";
import { ComparisonView } from "@/components/comparison/ComparisonView";
import { ScenarioPicker } from "@/components/comparison/ScenarioPicker";
import { useWizardStore, useWizardCurrent } from "@/store/wizardStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useSimulation } from "@/hooks/useSimulation";
import { duplicateScenario, markCompared, saveScenarioFromWizard } from "@/services/campaignActions";
import { useCampaignStore } from "@/store/campaignStore";

export function StepCompare({ onEditConditions }: { onEditConditions: () => void }) {
  const { objective, audience, conditions } = useWizardCurrent();
  const { campaignId, compareIds, setCompareIds, loadScenario } = useWizardStore();
  const scenarios = useScenarioStore((s) => s.scenarios);
  const req = useMemo(() => (objective && audience && conditions ? { objective, audience, conditions } : null), [objective, audience, conditions]);
  const sim = useSimulation(req, 0);
  const [saveOpen, setSaveOpen] = useState(false);
  const selected = compareIds.map((id) => scenarios.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const currentSaved = sim.data && scenarios.some((s) => s.result.inputHash === sim.data!.inputHash && s.campaignId === campaignId);
  const campaignScenarioCount = scenarios.filter((s) => campaignId && s.campaignId === campaignId).length;

  useEffect(() => {
    if (selected.length >= 2) markCompared(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((s) => s.id).join(",")]);

  // Drop ids of deleted scenarios.
  useEffect(() => {
    if (selected.length !== compareIds.length) setCompareIds(selected.map((s) => s.id));
  }, [selected.length, compareIds.length, selected, setCompareIds]);

  const editScenario = (id: string, copy: boolean) => {
    const src = copy ? duplicateScenario(id) : scenarios.find((s) => s.id === id);
    if (!src) return;
    const campaign = useCampaignStore.getState().campaigns.find((c) => c.id === src.campaignId);
    loadScenario(src, 2);
    if (campaign) useWizardStore.getState().setMeta({ name: campaign.name, category: campaign.category });
    toast.info(copy ? `“${src.name}” oluşturuldu` : `“${src.name}” düzenleniyor`, { description: "Koşulları değiştirip yeni senaryo olarak kaydedebilirsiniz." });
    onEditConditions();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Karşılaştırılacak senaryolar</CardTitle>
            <CardDescription>En fazla dört senaryoyu yan yana karşılaştırın. İlk seçilen senaryo referans kabul edilir.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioPicker scenarios={scenarios} selected={compareIds} onChange={setCompareIds} preferObjective={objective} preferCampaignId={campaignId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Senaryo işlemleri</CardTitle>
            <CardDescription>Alternatifler oluşturmak için mevcut kurguyu kaydedin, sonra parametreleri değiştirin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Button className="w-full justify-start" variant={currentSaved ? "outline" : "default"} disabled={!sim.data} onClick={() => setSaveOpen(true)}>
              <Save /> {currentSaved ? "Mevcut kurgu kayıtlı — farklı adla kaydet" : "Mevcut kurguyu senaryo olarak kaydet"}
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={onEditConditions}>
              <Plus /> Parametreleri değiştirerek alternatif oluştur
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full justify-start" variant="outline" disabled={!selected.length}>
                  <Copy /> Seçili senaryoyu kopyala ve düzenle
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {selected.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => editScenario(s.id, true)}>
                    <Copy /> <span className="truncate">{s.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full justify-start" variant="ghost" disabled={!selected.length}>
                  <PencilLine /> Seçili senaryonun koşullarını yükle
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {selected.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => editScenario(s.id, false)}>
                    <PencilLine /> <span className="truncate">{s.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="pt-1 text-xs text-ink-soft">Kaydedilen senaryolar orijinal sonuçlarıyla saklanır; düzenleme yeni bir senaryo olarak kaydedilir.</p>
          </CardContent>
        </Card>
      </div>

      {selected.length < 2 ? (
        <EmptyState
          icon={<GitCompare className="h-6 w-6" />}
          title="Karşılaştırma için en az iki senaryo seçin"
          description={
            campaignScenarioCount < 2
              ? "Mevcut kurguyu kaydedin, ardından hedef, ödül veya bütçe gibi parametreleri değiştirerek alternatif senaryolar oluşturun."
              : "Yukarıdaki listeden karşılaştırmak istediğiniz senaryoları işaretleyin."
          }
          action={
            <>
              <Button onClick={() => setSaveOpen(true)} disabled={!sim.data || !!currentSaved}>
                <Save /> Mevcut kurguyu kaydet
              </Button>
              <Button variant="outline" onClick={onEditConditions}>
                <Plus /> Alternatif oluştur
              </Button>
            </>
          }
        />
      ) : (
        <ComparisonView scenarios={selected} onRemove={(id) => setCompareIds(compareIds.filter((x) => x !== id))} />
      )}

      <SaveScenarioDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultName={`Senaryo ${String.fromCharCode(65 + Math.min(campaignScenarioCount, 25))}`}
        onSave={(name, note) => {
          if (!sim.data || !req) return;
          saveScenarioFromWizard(name, req, sim.data, note || undefined);
          toast.success("Senaryo kaydedildi ve karşılaştırmaya eklendi");
        }}
      />
    </div>
  );
}
