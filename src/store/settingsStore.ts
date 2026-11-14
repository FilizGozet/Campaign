import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoService } from "@/services/prediction";

interface SettingsState {
  userName: string;
  userRole: string;
  simulateLatency: boolean;
  compactNumbers: boolean;
  showFormulaNotes: boolean;
  set: (patch: Partial<Omit<SettingsState, "set">>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userName: "Deniz Arslan",
      userRole: "Kampanya Yöneticisi",
      simulateLatency: true,
      compactNumbers: true,
      showFormulaNotes: true,
      set: (patch) => set(patch),
    }),
    {
      name: "cis.settings.v1",
      onRehydrateStorage: () => (state) => demoService.setLatency(state?.simulateLatency ? 350 : 0),
    },
  ),
);

useSettingsStore.subscribe((s) => demoService.setLatency(s.simulateLatency ? 350 : 0));
demoService.setLatency(useSettingsStore.getState().simulateLatency ? 350 : 0);
