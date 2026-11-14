import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Scenario } from "@/domain/types";
import { createId } from "@/lib/id";
import { getSeed } from "./seed";

export const MAX_COMPARE = 4;

interface ScenarioState {
  scenarios: Scenario[];
  add: (s: Scenario) => void;
  update: (id: string, patch: Partial<Scenario>) => void;
  duplicate: (id: string) => Scenario | undefined;
  remove: (id: string) => void;
  replaceAll: (s: Scenario[]) => void;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      scenarios: getSeed().scenarios,
      add: (s) => set({ scenarios: [s, ...get().scenarios] }),
      update: (id, patch) =>
        set({
          scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)),
        }),
      duplicate: (id) => {
        const src = get().scenarios.find((s) => s.id === id);
        if (!src) return undefined;
        const now = new Date().toISOString();
        const copy: Scenario = { ...structuredClone(src), id: createId("snr"), name: `${src.name} (kopya)`, createdAt: now, updatedAt: now };
        set({ scenarios: [copy, ...get().scenarios] });
        return copy;
      },
      remove: (id) => set({ scenarios: get().scenarios.filter((s) => s.id !== id) }),
      replaceAll: (scenarios) => set({ scenarios }),
    }),
    { name: "cis.scenarios.v1" },
  ),
);

export const useScenario = (id: string | undefined) => useScenarioStore((s) => s.scenarios.find((x) => x.id === id));
