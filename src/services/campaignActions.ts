import type { Campaign, Scenario, SimulationRequest, SimulationResult } from "@/domain/types";
import { getObjective } from "@/domain/objectives";
import { useCampaignStore } from "@/store/campaignStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useWizardStore } from "@/store/wizardStore";
import { useNotificationStore } from "@/store/notificationStore";
import { createId } from "@/lib/id";
import { makeScenario } from "./scenarioFactory";

/** Ensures the wizard's draft is backed by a campaign record; returns its id. */
export function ensureWizardCampaign(): string {
  const w = useWizardStore.getState();
  const store = useCampaignStore.getState();
  const objective = w.objective!;
  const audience = w.audienceByObjective[objective] ?? null;
  const conditions = w.conditionsByObjective[objective] ?? null;
  const existing = w.campaignId ? store.campaigns.find((c) => c.id === w.campaignId) : undefined;
  const now = new Date().toISOString();
  const campaign: Campaign = existing
    ? {
        ...existing,
        name: w.name.trim() || existing.name,
        category: w.category || existing.category,
        objective,
        audience,
        conditions,
      }
    : {
        id: createId("kmp"),
        name: w.name.trim() || `${getObjective(objective).shortName} kampanyası`,
        category: w.category || "Genel",
        objective,
        status: "taslak",
        createdAt: now,
        updatedAt: now,
        owner: "Deniz Arslan",
        audience,
        conditions,
        scenarioIds: [],
      };
  store.upsert(campaign);
  if (!existing) {
    w.setCampaignId(campaign.id);
    if (!w.name.trim()) w.setMeta({ name: campaign.name });
  }
  return campaign.id;
}

/** Saves the draft campaign without creating a scenario. */
export function saveWizardDraft(): Campaign | undefined {
  const id = ensureWizardCampaign();
  return useCampaignStore.getState().campaigns.find((c) => c.id === id);
}

export function saveScenarioFromWizard(name: string, request: SimulationRequest, result: SimulationResult, note?: string): Scenario {
  const campaignId = ensureWizardCampaign();
  const scenario = makeScenario({ name, request, result, source: "wizard", campaignId, note });
  useScenarioStore.getState().add(scenario);
  useCampaignStore.getState().attachScenario(campaignId, scenario.id);
  const w = useWizardStore.getState();
  w.setLastSaved(scenario.id);
  if (!w.compareIds.includes(scenario.id)) w.setCompareIds([...w.compareIds, scenario.id].slice(-4));
  useNotificationStore.getState().push({ title: "Senaryo kaydedildi", body: `“${name}” senaryo kütüphanesine eklendi.`, href: "/senaryolar" });
  return scenario;
}

export function saveScenarioStandalone(name: string, request: SimulationRequest, result: SimulationResult, source: Scenario["source"], note?: string): Scenario {
  const scenario = makeScenario({ name, request, result, source, note });
  useScenarioStore.getState().add(scenario);
  return scenario;
}

export function deleteScenario(id: string) {
  useScenarioStore.getState().remove(id);
  useCampaignStore.getState().detachScenario(id);
  const w = useWizardStore.getState();
  if (w.compareIds.includes(id)) w.setCompareIds(w.compareIds.filter((x) => x !== id));
}

export function duplicateScenario(id: string): Scenario | undefined {
  const copy = useScenarioStore.getState().duplicate(id);
  if (copy?.campaignId) useCampaignStore.getState().attachScenario(copy.campaignId, copy.id);
  return copy;
}

export function markCompared(scenarios: Scenario[]) {
  const ids = new Set(scenarios.map((s) => s.campaignId).filter(Boolean) as string[]);
  const store = useCampaignStore.getState();
  ids.forEach((id) => {
    const c = store.campaigns.find((x) => x.id === id);
    if (c && c.status !== "arsivlendi" && c.status !== "karsilastirildi") store.setStatus(id, "karsilastirildi");
  });
}

/** Plain-text scenario summary for export. */
export function scenarioSummaryText(s: Scenario, lines: string[]): string {
  return [`Campaign Intelligence Studio — Senaryo özeti`, `Senaryo: ${s.name}`, `Kaydedilme: ${new Date(s.createdAt).toLocaleString("tr-TR")}`, ...lines, "", "Not: Bu değerler sentetik veri üzerinde çalışan demo simülasyonudur; doğrulanmış tahmin değildir."].join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
