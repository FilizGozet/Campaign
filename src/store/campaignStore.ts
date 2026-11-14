import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Campaign, CampaignStatus } from "@/domain/types";
import { createId } from "@/lib/id";
import { getSeed } from "./seed";

interface CampaignState {
  campaigns: Campaign[];
  upsert: (c: Campaign) => void;
  setStatus: (id: string, status: CampaignStatus) => void;
  attachScenario: (id: string, scenarioId: string) => void;
  detachScenario: (scenarioId: string) => void;
  duplicate: (id: string) => Campaign | undefined;
  remove: (id: string) => void;
  replaceAll: (c: Campaign[]) => void;
}

const STATUS_ORDER: CampaignStatus[] = ["taslak", "simule_edildi", "karsilastirildi"];

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: getSeed().campaigns,
      upsert: (c) => {
        const exists = get().campaigns.some((x) => x.id === c.id);
        const next = { ...c, updatedAt: new Date().toISOString() };
        set({ campaigns: exists ? get().campaigns.map((x) => (x.id === c.id ? next : x)) : [next, ...get().campaigns] });
      },
      setStatus: (id, status) =>
        set({
          campaigns: get().campaigns.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)),
        }),
      attachScenario: (id, scenarioId) =>
        set({
          campaigns: get().campaigns.map((c) => {
            if (c.id !== id || c.scenarioIds.includes(scenarioId)) return c;
            const status =
              c.status === "arsivlendi" || STATUS_ORDER.indexOf(c.status) >= 1 ? c.status : ("simule_edildi" as const);
            return { ...c, status, scenarioIds: [...c.scenarioIds, scenarioId], updatedAt: new Date().toISOString() };
          }),
        }),
      detachScenario: (scenarioId) =>
        set({ campaigns: get().campaigns.map((c) => ({ ...c, scenarioIds: c.scenarioIds.filter((s) => s !== scenarioId) })) }),
      duplicate: (id) => {
        const src = get().campaigns.find((c) => c.id === id);
        if (!src) return undefined;
        const now = new Date().toISOString();
        const copy: Campaign = {
          ...structuredClone(src),
          id: createId("kmp"),
          name: `${src.name} (kopya)`,
          status: "taslak",
          scenarioIds: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ campaigns: [copy, ...get().campaigns] });
        return copy;
      },
      remove: (id) => set({ campaigns: get().campaigns.filter((c) => c.id !== id) }),
      replaceAll: (campaigns) => set({ campaigns }),
    }),
    { name: "cis.campaigns.v1" },
  ),
);
