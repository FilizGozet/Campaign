import type { CampaignConditions, SimulationRequest } from "@/domain/types";
import { rewardLever, thresholdOf, withRewardLever, withThreshold } from "./conditions";

export type SweepLever = "reward" | "threshold" | "duration" | "budget";

export const SWEEP_LABELS: Record<SweepLever, string> = {
  reward: "Ödül",
  threshold: "Koşul eşiği",
  duration: "Süre",
  budget: "Bütçe",
};

export interface LeverSpec {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export function leverSpec(k: CampaignConditions, lever: SweepLever): LeverSpec {
  switch (lever) {
    case "reward":
      return rewardLever(k.reward);
    case "threshold":
      return thresholdOf(k);
    case "duration":
      return { label: "Kampanya süresi", value: k.durationDays, min: 7, max: k.objective === "reactivation" ? 90 : 120, step: 1, unit: "gün" };
    case "budget":
      return { label: "Bütçe", value: k.budget, min: 250_000, max: Math.max(30_000_000, k.budget), step: 250_000, unit: "TL" };
  }
}

export function applyLever(k: CampaignConditions, lever: SweepLever, value: number): CampaignConditions {
  switch (lever) {
    case "reward":
      return { ...k, reward: withRewardLever(k.reward, value) };
    case "threshold":
      return withThreshold(k, value);
    case "duration":
      return { ...k, durationDays: value };
    case "budget":
      return { ...k, budget: value };
  }
}

/** Evenly spaced lever values (snapped to the lever step), always including the current value. */
export function sweepValues(spec: LeverSpec, points = 11): number[] {
  const out = new Set<number>();
  for (let i = 0; i < points; i++) {
    const raw = spec.min + ((spec.max - spec.min) * i) / (points - 1);
    out.add(Math.round(raw / spec.step) * spec.step);
  }
  out.add(spec.value);
  return [...out].filter((v) => v >= spec.min && v <= spec.max).sort((a, b) => a - b);
}

export function buildSweep(request: SimulationRequest, lever: SweepLever, points = 11) {
  const spec = leverSpec(request.conditions, lever);
  const values = sweepValues(spec, points);
  return {
    spec,
    values,
    requests: values.map((v) => ({ ...request, conditions: applyLever(request.conditions, lever, v) })),
  };
}
