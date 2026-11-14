import type { AudienceSelection, CampaignConditions, SimulationRequest } from "@/domain/types";
import { computeAudienceStats, contextFromConditions, resolveAudience } from "@/data/audiences";
import { simulate } from "@/engine/simulate";
import { validateConditions } from "@/engine/conditions";
import { PredictionError, type PredictionService } from "./PredictionService";

export interface DemoOptions {
  /** Artificial latency (ms) to exercise loading states. */
  latencyMs?: number;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Runs the deterministic synthetic simulation engine locally. */
export class DemoPredictionService implements PredictionService {
  readonly kind = "demo" as const;
  readonly label = "Demo simülasyon motoru (sentetik)";

  constructor(private options: DemoOptions = {}) {}

  setLatency(ms: number) {
    this.options.latencyMs = ms;
  }

  async simulate(request: SimulationRequest, signal?: AbortSignal) {
    await wait(this.options.latencyMs ?? 0, signal);
    const errors = validateConditions(request.conditions);
    if (Object.keys(errors).length) {
      throw new PredictionError(`Kampanya koşulları geçersiz: ${Object.values(errors)[0]}`);
    }
    if (request.objective !== request.conditions.objective) {
      throw new PredictionError("Kampanya hedefi ile koşullar uyumsuz.");
    }
    try {
      return simulate(request);
    } catch (e) {
      throw new PredictionError("Simülasyon hesaplanırken beklenmeyen bir hata oluştu.", e);
    }
  }

  async simulateMany(requests: SimulationRequest[], signal?: AbortSignal) {
    return Promise.all(requests.map((r) => this.simulate(r, signal)));
  }

  async audienceStats(audience: AudienceSelection, conditions: CampaignConditions | null) {
    const resolved = resolveAudience(audience, contextFromConditions(conditions));
    return computeAudienceStats(resolved.customers);
  }
}
