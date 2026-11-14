import { freshSeed } from "./seed";
import { useCampaignStore } from "./campaignStore";
import { useScenarioStore } from "./scenarioStore";
import { useWizardStore } from "./wizardStore";

/** Restores all demo data to its initial synthetic state. */
export function resetDemoData() {
  const seed = freshSeed();
  useCampaignStore.getState().replaceAll(seed.campaigns);
  useScenarioStore.getState().replaceAll(seed.scenarios);
  useWizardStore.getState().reset();
}
