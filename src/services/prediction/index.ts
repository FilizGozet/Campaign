import { DemoPredictionService } from "./DemoPredictionService";
import { MLPredictionService } from "./MLPredictionService";
import type { PredictionService } from "./PredictionService";

export type { PredictionService } from "./PredictionService";
export { PredictionError } from "./PredictionService";

const ML_URL = import.meta.env.VITE_PREDICTION_API_URL as string | undefined;

/**
 * Service selection. Set VITE_PREDICTION_API_URL to route predictions to a
 * real backend; otherwise the local demo engine is used.
 */
export const demoService = new DemoPredictionService();
export const predictionService: PredictionService = ML_URL ? new MLPredictionService(ML_URL) : demoService;
