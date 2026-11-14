/**
 * Chart palette — validated categorical order (light surface).
 * Scenario slots follow this fixed order and are never cycled.
 * Three slots sit below 3:1 contrast, so every chart ships direct labels
 * or a companion table (relief rule).
 */
export const SERIES = ["#6250d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#2a78d6", "#008300", "#e34948"] as const;

export const SCENARIO_COLORS = SERIES.slice(0, 4);

/** Part-of-whole emphasis: campaign effect vs. baseline. */
export const EFFECT_COLOR = "#6250d6";
export const BASELINE_COLOR = "#CFCAE8";

export const PREDICTED_COLOR = "#B9B2E3";
export const ACTUAL_COLOR = "#6250d6";

export const GRID = "#ECEBF5";
export const AXIS_TEXT = "#6B6B85";
