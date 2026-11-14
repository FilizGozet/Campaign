import type { Scenario, SimulationRequest, SimulationResult } from "@/domain/types";
import { simulate } from "@/engine/simulate";
import { createId } from "@/lib/id";

/** Builds a scenario record from a request and an already computed result. */
export function makeScenario(args: {
  name: string;
  request: SimulationRequest;
  result: SimulationResult;
  source: Scenario["source"];
  campaignId?: string;
  note?: string;
  at?: string;
}): Scenario {
  const now = args.at ?? new Date().toISOString();
  return {
    id: createId("snr"),
    name: args.name,
    campaignId: args.campaignId,
    objective: args.request.objective,
    audience: structuredClone(args.request.audience),
    conditions: structuredClone(args.request.conditions),
    result: args.result,
    createdAt: now,
    updatedAt: now,
    source: args.source,
    note: args.note,
  };
}

/** Synchronous helper for seed data (uses the deterministic demo engine). */
export function makeSeedScenario(name: string, request: SimulationRequest, at: string, campaignId?: string, note?: string): Scenario {
  return makeScenario({ name, request, result: simulate(request), source: "seed", campaignId, note, at });
}

export function scenarioRequest(s: Pick<Scenario, "objective" | "audience" | "conditions">): SimulationRequest {
  return { objective: s.objective, audience: s.audience, conditions: s.conditions };
}
