import type { AudienceSelection, AudienceStats, CampaignConditions, SimulationRequest, SimulationResult } from "@/domain/types";
import { PredictionError, type PredictionService } from "./PredictionService";

/**
 * Placeholder for a future ML-backed service (e.g. Python/FastAPI).
 *
 * Expected endpoints (proposal):
 *   POST {baseUrl}/v1/simulate        body: SimulationRequest   → SimulationResult
 *   POST {baseUrl}/v1/simulate/batch  body: SimulationRequest[] → SimulationResult[]
 *   POST {baseUrl}/v1/audience/stats  body: { audience, conditions } → AudienceStats
 *
 * The backend must set `source: "ml"` and should return statistically grounded
 * uncertainty only where the model supports it.
 */
export class MLPredictionService implements PredictionService {
  readonly kind = "ml" as const;
  readonly label = "ML tahmin servisi";

  constructor(private baseUrl: string) {}

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      throw new PredictionError("Tahmin servisine ulaşılamadı.", e);
    }
    if (!res.ok) throw new PredictionError(`Tahmin servisi hata döndürdü (${res.status}).`);
    return (await res.json()) as T;
  }

  simulate(request: SimulationRequest, signal?: AbortSignal) {
    return this.post<SimulationResult>("/v1/simulate", request, signal);
  }

  simulateMany(requests: SimulationRequest[], signal?: AbortSignal) {
    return this.post<SimulationResult[]>("/v1/simulate/batch", requests, signal);
  }

  audienceStats(audience: AudienceSelection, conditions: CampaignConditions | null) {
    return this.post<AudienceStats>("/v1/audience/stats", { audience, conditions });
  }
}
