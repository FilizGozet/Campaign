import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { Stepper } from "@/components/wizard/Stepper";
import { StepObjective } from "@/components/wizard/StepObjective";
import { StepAudience } from "@/components/wizard/StepAudience";
import { StepConditions } from "@/components/wizard/StepConditions";
import { StepResults } from "@/components/wizard/StepResults";
import { StepCompare } from "@/components/wizard/StepCompare";
import { useWizardStore, useWizardCurrent, WIZARD_STEPS } from "@/store/wizardStore";
import { useCampaignStore } from "@/store/campaignStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { validateConditions } from "@/engine/conditions";
import { saveWizardDraft } from "@/services/campaignActions";

const STEP_META = [
  { title: "Kampanya hedefini belirle", description: "Bu kampanyayla neyi başarmak istiyorsunuz?" },
  { title: "Hedef kitleyi belirle", description: "Seçtiğiniz hedefe uygun hazır kitlelerden birini seçin veya davranışsal filtrelerle yeni bir kitle oluşturun." },
  { title: "Kampanya koşullarını belirle", description: "Alanlar seçilen kampanya hedefine göre uyarlanır. Özet panel, kurguyu ve anlık ön tahmini gösterir." },
  { title: "Tahmin Sonuçları", description: "Seçilen hedefe özel göstergeler, segment kırılımı ve senaryo güvenilirliği." },
  { title: "Senaryo Karşılaştırması", description: "Alternatif senaryoları yan yana inceleyin, ödünleşimleri ve segment farklarını görün." },
];

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { step, maxStep, goTo, reset, campaignId, name, loadCampaign, loadScenario } = useWizardStore();
  const { objective, audience, conditions } = useWizardCurrent();
  const [showErrors, setShowErrors] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Deep links: ?kampanya=<id> loads a campaign, ?senaryo=<id> loads a scenario, ?yeni=1 starts fresh.
  useEffect(() => {
    const cid = params.get("kampanya");
    const sid = params.get("senaryo");
    const fresh = params.get("yeni");
    if (cid) {
      const c = useCampaignStore.getState().campaigns.find((x) => x.id === cid);
      if (c) {
        loadCampaign(c);
        toast.info(`“${c.name}” düzenleniyor`);
      } else toast.error("Kampanya bulunamadı.");
    } else if (sid) {
      const s = useScenarioStore.getState().scenarios.find((x) => x.id === sid);
      if (s) {
        loadScenario(s, Number(params.get("adim") ?? 3));
        const c = useCampaignStore.getState().campaigns.find((x) => x.id === s.campaignId);
        if (c) useWizardStore.getState().setMeta({ name: c.name, category: c.category });
      } else toast.error("Senaryo bulunamadı.");
    } else if (fresh) {
      reset();
    }
    if (cid || sid || fresh) setParams({}, { replace: true });
  }, [params, setParams, loadCampaign, loadScenario, reset]);

  const conditionErrors = conditions ? validateConditions(conditions) : { x: "missing" };
  const stepValid = [!!objective, !!audience, Object.keys(conditionErrors).length === 0, true, true];
  const canVisit = (i: number) => {
    for (let j = 0; j < i; j++) if (!stepValid[j]) return false;
    return i <= Math.max(maxStep, step) + 1;
  };

  const next = () => {
    if (!stepValid[step]) {
      setShowErrors(true);
      toast.error(step === 0 ? "Devam etmek için bir kampanya hedefi seçin." : step === 1 ? "Devam etmek için bir hedef kitle seçin." : "Lütfen hatalı alanları düzeltin.");
      return;
    }
    setShowErrors(false);
    goTo(Math.min(step + 1, 4));
  };

  const meta = STEP_META[step];

  return (
    <div>
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span className="font-medium text-brand-600">{campaignId ? "Kampanya düzenleme" : "Yeni kampanya"}</span>
            {name && <span>· {name}</span>}
            {objective && <ObjectiveBadge objective={objective} />}
          </div>
        }
        title={meta.title}
        description={meta.description}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Sıfırla
            </Button>
            <Button
              variant="outline"
              disabled={!objective}
              onClick={() => {
                const c = saveWizardDraft();
                if (c) toast.success("Taslak kaydedildi", { description: `“${c.name}” Kampanyalarım listesinde.` });
              }}
            >
              <Save /> Taslağı kaydet
            </Button>
          </>
        }
      />
      <Stepper steps={WIZARD_STEPS} current={step} maxReached={maxStep} canVisit={canVisit} onSelect={(i) => goTo(i)} />

      <div className="mt-6">
        {step === 0 && <StepObjective />}
        {step === 1 && <StepAudience />}
        {step === 2 && <StepConditions showErrors={showErrors} />}
        {step === 3 && <StepResults onGoCompare={() => goTo(4)} />}
        {step === 4 && <StepCompare onEditConditions={() => goTo(2)} />}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border/70 bg-white/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => (step === 0 ? navigate("/kampanyalar") : goTo(step - 1))}>
            <ArrowLeft /> {step === 0 ? "Kampanyalarım" : "Geri"}
          </Button>
          <span className="hidden text-xs text-ink-soft sm:block">
            Adım {step + 1} / {WIZARD_STEPS.length} · Girdileriniz otomatik olarak saklanır
          </span>
          {step < 4 ? (
            <Button onClick={next}>
              {step === 2 ? "Simülasyonu çalıştır" : "Devam et"} <ArrowRight />
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate("/senaryolar")}>
              Senaryo kütüphanesi <ArrowRight />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Sihirbaz sıfırlansın mı?"
        description="Kaydedilmemiş girdiler silinir. Kaydedilmiş kampanya ve senaryolar etkilenmez."
        confirmLabel="Sıfırla"
        destructive
        onConfirm={() => {
          reset();
          toast.success("Yeni kampanya başlatıldı");
        }}
      />
    </div>
  );
}
