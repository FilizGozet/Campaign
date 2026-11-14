/** Numerical helpers for the demo simulation engine. All functions are pure. */

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

/**
 * A lognormal distribution parameterised by its arithmetic mean and log-sigma.
 * Used to model a customer's spending in a period around their expected level.
 */
export interface Lognormal {
  mean: number;
  sigma: number;
}

const mu = (d: Lognormal) => Math.log(d.mean) - (d.sigma * d.sigma) / 2;

/** P(X ≥ k). */
export function lnExceed(d: Lognormal, k: number): number {
  if (k <= 0) return 1;
  if (d.mean <= 0) return 0;
  if (d.sigma <= 0) return d.mean >= k ? 1 : 0;
  return 1 - normalCdf((Math.log(k) - mu(d)) / d.sigma);
}

/** Partial expectation E[X · 1{X ≥ k}]. */
export function lnPartialExpectation(d: Lognormal, k: number): number {
  if (d.mean <= 0) return 0;
  if (k <= 0) return d.mean;
  if (d.sigma <= 0) return d.mean >= k ? d.mean : 0;
  return d.mean * normalCdf((mu(d) + d.sigma * d.sigma - Math.log(k)) / d.sigma);
}

/** E[X | X ≥ k]. Falls back to k when the tail probability is negligible. */
export function lnConditionalMean(d: Lognormal, k: number): number {
  const p = lnExceed(d, k);
  if (p < 1e-9) return Math.max(k, d.mean);
  return lnPartialExpectation(d, k) / p;
}

/** P(N ≥ k) for N ~ Poisson(lambda). */
export function poissonAtLeast(k: number, lambda: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return clamp(1 - cdf, 0, 1);
}

/** Probability that something with a monthly rate happens at least once within `days`. */
export function periodProbability(monthlyRate: number, days: number): number {
  return 1 - Math.pow(1 - clamp(monthlyRate, 0, 0.999), days / 30);
}

export const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
