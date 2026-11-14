import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceSelection, AudienceStats, CampaignConditions, SimulationRequest, SimulationResult } from "@/domain/types";
import { predictionService } from "@/services/prediction";
import { stableStringify } from "@/engine/hash";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs a simulation through the PredictionService whenever the request changes.
 * Keeps the previous result visible while recomputing (no flicker on sliders).
 */
export function useSimulation(request: SimulationRequest | null, debounceMs = 120) {
  const [state, setState] = useState<AsyncState<SimulationResult>>({ data: null, loading: !!request, error: null });
  const [nonce, setNonce] = useState(0);
  const key = request ? stableStringify(request) : "";
  const reqRef = useRef(request);
  reqRef.current = request;

  useEffect(() => {
    const req = reqRef.current;
    if (!req) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const t = setTimeout(() => {
      predictionService
        .simulate(req, ctrl.signal)
        .then((data) => !ctrl.signal.aborted && setState({ data, loading: false, error: null }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
          setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Simülasyon başarısız oldu." }));
        });
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [key, nonce, debounceMs]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

export function useAudienceStats(audience: AudienceSelection | null, conditions: CampaignConditions | null) {
  const [state, setState] = useState<AsyncState<AudienceStats>>({ data: null, loading: !!audience, error: null });
  const key = audience ? stableStringify({ audience, c: conditions && { o: conditions.objective, cat: "category" in conditions ? conditions.category : null, p: "product" in conditions ? conditions.product : null, e: "eligibleCategory" in conditions ? conditions.eligibleCategory : null } }) : "";
  const ref = useRef({ audience, conditions });
  ref.current = { audience, conditions };
  useEffect(() => {
    const { audience: a, conditions: c } = ref.current;
    if (!a) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    predictionService
      .audienceStats(a, c)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((e: unknown) => !cancelled && setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Kitle analizi yüklenemedi." }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}
