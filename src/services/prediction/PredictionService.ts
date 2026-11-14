import type { AudienceSelection, AudienceStats, CampaignConditions, SimulationRequest, SimulationResult } from "@/domain/types";

/**
 * Prediction service contract.
 *
 * The UI only talks to this interface. The initial implementation
 * (DemoPredictionService) runs the deterministic synthetic engine in the
 * browser. A future MLPredictionService can call a Python/FastAPI backend and
 * return the same shapes, so no component needs to change.
 */
export interface PredictionService {
  readonly kind: "demo" | "ml";
  readonly label: string;
  simulate(request: SimulationRequest, signal?: AbortSignal): Promise<SimulationResult>;
  simulateMany(requests: SimulationRequest[], signal?: AbortSignal): Promise<SimulationResult[]>;
  audienceStats(audience: AudienceSelection, conditions: CampaignConditions | null): Promise<AudienceStats>;
}

export class PredictionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PredictionError";
  }
}
