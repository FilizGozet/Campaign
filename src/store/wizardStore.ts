import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { AudienceSelection, Campaign, CampaignConditions, CampaignObjective, Scenario } from "@/domain/types";
import { defaultConditions } from "@/domain/objectives";

export const WIZARD_STEPS = ["Hedef", "Hedef Kitle", "Kampanya Koşulları", "Tahmin Sonuçları", "Senaryo Karşılaştırması"] as const;

export interface WizardState {
  campaignId: string | null;
  name: string;
  category: string;
  objective: CampaignObjective | null;
  /** Kept per objective so switching objectives never loses inputs. */
  audienceByObjective: Partial<Record<CampaignObjective, AudienceSelection>>;
  conditionsByObjective: Partial<Record<CampaignObjective, CampaignConditions>>;
  step: number;
  maxStep: number;
  compareIds: string[];
  lastSavedScenarioId: string | null;

  setMeta: (patch: { name?: string; category?: string }) => void;
  setObjective: (o: CampaignObjective) => void;
  setAudience: (a: AudienceSelection) => void;
  setConditions: (c: CampaignConditions) => void;
  goTo: (step: number) => void;
  setCompareIds: (ids: string[]) => void;
  setCampaignId: (id: string) => void;
  setLastSaved: (id: string | null) => void;
  reset: () => void;
  loadCampaign: (c: Campaign) => void;
  loadScenario: (s: Scenario, step?: number) => void;
}

const initial = {
  campaignId: null,
  name: "",
  category: "",
  objective: null,
  audienceByObjective: {},
  conditionsByObjective: {},
  step: 0,
  maxStep: 0,
  compareIds: [],
  lastSavedScenarioId: null,
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initial,
      setMeta: (patch) => set(patch),
      setObjective: (o) => {
        const conds = get().conditionsByObjective;
        set({
          objective: o,
          conditionsByObjective: conds[o] ? conds : { ...conds, [o]: defaultConditions(o) },
          maxStep: Math.max(get().maxStep, 0),
        });
      },
      setAudience: (a) => {
        const o = get().objective;
        if (!o) return;
        let conds = get().conditionsByObjective;
        // Keep the reactivation inactivity period in sync with the chosen audience.
        const k = conds[o];
        if (k?.objective === "reactivation" && a.mode === "existing") {
          const days = a.audienceId === "re_30" ? 30 : a.audienceId === "re_180" ? 180 : 90;
          conds = { ...conds, reactivation: { ...k, inactivityDays: days } };
        }
        set({ audienceByObjective: { ...get().audienceByObjective, [o]: a }, conditionsByObjective: conds });
      },
      setConditions: (c) => set({ conditionsByObjective: { ...get().conditionsByObjective, [c.objective]: c } }),
      goTo: (step) => set({ step, maxStep: Math.max(get().maxStep, step) }),
      setCompareIds: (ids) => set({ compareIds: ids }),
      setCampaignId: (id) => set({ campaignId: id }),
      setLastSaved: (id) => set({ lastSavedScenarioId: id }),
      reset: () => set({ ...initial }),
      loadCampaign: (c) =>
        set({
          ...initial,
          campaignId: c.id,
          name: c.name,
          category: c.category,
          objective: c.objective,
          audienceByObjective: c.audience ? { [c.objective]: c.audience } : {},
          conditionsByObjective: { [c.objective]: c.conditions ?? defaultConditions(c.objective) },
          step: c.audience ? 2 : 1,
          maxStep: c.audience ? (c.scenarioIds.length ? 4 : 2) : 1,
          compareIds: c.scenarioIds.slice(0, 4),
        }),
      loadScenario: (s, step = 2) =>
        set({
          ...initial,
          campaignId: s.campaignId ?? null,
          name: get().campaignId === s.campaignId ? get().name : "",
          category: get().campaignId === s.campaignId ? get().category : "",
          objective: s.objective,
          audienceByObjective: { [s.objective]: structuredClone(s.audience) },
          conditionsByObjective: { [s.objective]: structuredClone(s.conditions) },
          step,
          maxStep: 4,
          compareIds: [s.id],
        }),
    }),
    { name: "cis.wizard.v1" },
  ),
);

export function useWizardCurrent() {
  return useWizardStore(
    useShallow((s) => ({
    objective: s.objective,
    audience: s.objective ? (s.audienceByObjective[s.objective] ?? null) : null,
      conditions: s.objective ? (s.conditionsByObjective[s.objective] ?? null) : null,
    })),
  );
}
