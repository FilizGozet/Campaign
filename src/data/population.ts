import { createRng, type Rng } from "@/lib/random";
import type { Customer, CustomerSegmentId, ProductType, SpendingCategory } from "@/domain/types";

/**
 * Synthetic customer population.
 *
 * Every record is fictional and generated from a fixed seed, so the dataset —
 * and therefore every simulation — is identical across sessions and machines.
 * Each record represents `weight` real-world customers to keep computation fast.
 */

export const POPULATION_SEED = 20261114;
export const CUSTOMER_RECORDS = 4800;
export const PROSPECT_RECORDS = 1200;
export const CUSTOMER_WEIGHT = 250;
export const PROSPECT_WEIGHT = 300;

export const CATEGORIES: SpendingCategory[] = ["market", "akaryakit", "restoran", "eticaret", "giyim", "seyahat"];
export const PRODUCTS: ProductType[] = ["kredi_karti", "otomatik_odeme", "dijital_cuzdan", "temassiz_odeme"];

/** Population-level average category shares, used when a customer's shares are unavailable. */
export const DEFAULT_CATEGORY_SHARES: Record<SpendingCategory, number> = {
  market: 0.3,
  akaryakit: 0.16,
  restoran: 0.14,
  eticaret: 0.2,
  giyim: 0.12,
  seyahat: 0.08,
};

interface SegmentProfile {
  share: number;
  spend: number;
  spendSigma: number;
  tx: number;
  trendMean: number;
  trendSd: number;
  response: number;
  propensity: number;
}

const CUSTOMER_PROFILES: Partial<Record<CustomerSegmentId, SegmentProfile>> = {
  yuksek_degerli: { share: 0.12, spend: 22000, spendSigma: 0.45, tx: 26, trendMean: 1.02, trendSd: 0.08, response: 0.42, propensity: 0.55 },
  duzenli: { share: 0.3, spend: 7500, spendSigma: 0.45, tx: 14, trendMean: 1.0, trendSd: 0.08, response: 0.5, propensity: 0.5 },
  dusuk_aktivite: { share: 0.18, spend: 1800, spendSigma: 0.6, tx: 2.6, trendMean: 0.98, trendSd: 0.12, response: 0.4, propensity: 0.38 },
  azalan: { share: 0.12, spend: 5200, spendSigma: 0.5, tx: 6.5, trendMean: 0.68, trendSd: 0.1, response: 0.36, propensity: 0.35 },
  pasif: { share: 0.18, spend: 0, spendSigma: 0.5, tx: 0, trendMean: 0, trendSd: 0, response: 0.24, propensity: 0.22 },
  hic_kullanmayan: { share: 0.1, spend: 0, spendSigma: 0, tx: 0, trendMean: 0, trendSd: 0, response: 0.15, propensity: 0.2 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function categoryShares(rng: Rng, segment: CustomerSegmentId): Record<SpendingCategory, number> {
  const raw = CATEGORIES.map((cat) => {
    const base = DEFAULT_CATEGORY_SHARES[cat];
    // Some customers are completely passive in a category.
    if (rng.chance(segment === "dusuk_aktivite" ? 0.35 : 0.14)) return 0;
    return base * Math.exp(rng.normal() * 0.7);
  });
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(CATEGORIES.map((c, i) => [c, raw[i] / total])) as Record<SpendingCategory, number>;
}

function pickSegment(rng: Rng): CustomerSegmentId {
  const r = rng.next();
  let acc = 0;
  for (const [id, p] of Object.entries(CUSTOMER_PROFILES) as [CustomerSegmentId, SegmentProfile][]) {
    acc += p.share;
    if (r < acc) return id;
  }
  return "duzenli";
}

function makeCustomer(rng: Rng, index: number): Customer {
  const segmentId = pickSegment(rng);
  const p = CUSTOMER_PROFILES[segmentId]!;
  const isInactive = segmentId === "pasif" || segmentId === "hic_kullanmayan";

  const monthlySpend = isInactive ? 0 : Math.round(rng.lognormal(p.spend, p.spendSigma));
  const historicalMonthlySpend =
    segmentId === "pasif" ? Math.round(rng.lognormal(4200, 0.6)) : segmentId === "hic_kullanmayan" ? 0 : monthlySpend;
  const monthlyTx = isInactive ? 0 : Math.max(1, Math.round(rng.lognormal(p.tx, 0.35) * 10) / 10);
  const daysSinceLastTx =
    segmentId === "hic_kullanmayan"
      ? 999
      : segmentId === "pasif"
        ? Math.round(30 + Math.pow(rng.next(), 1.4) * 330)
        : rng.int(0, Math.max(1, Math.round(30 / Math.max(monthlyTx, 1))));

  const products: ProductType[] = [];
  const dormantProducts: ProductType[] = [];
  const offeredNotConverted: ProductType[] = [];
  const ownBase = segmentId === "yuksek_degerli" ? 0.8 : segmentId === "duzenli" ? 0.62 : 0.4;
  for (const prod of PRODUCTS) {
    const ownP = prod === "kredi_karti" ? ownBase : prod === "temassiz_odeme" ? ownBase * 0.9 : ownBase * 0.55;
    if (rng.chance(ownP)) {
      products.push(prod);
      if (rng.chance(isInactive ? 0.8 : 0.18)) dormantProducts.push(prod);
    } else if (rng.chance(0.18)) {
      offeredNotConverted.push(prod);
    }
  }

  const pastOffers = rng.int(isInactive ? 0 : 2, isInactive ? 4 : 10);
  const response = clamp(p.response + rng.normal() * 0.12, 0.03, 0.92);
  const pastParticipations = Math.min(pastOffers, Math.round(pastOffers * clamp(response * 0.9 + rng.normal() * 0.08, 0, 1)));

  const hasShares = !isInactive && rng.chance(0.9);
  const hasWallet = !isInactive && rng.chance(0.82);
  const fields = [hasShares, hasWallet, true, true, rng.chance(0.93), rng.chance(0.88)];
  const dataCoverage = fields.filter(Boolean).length / fields.length;

  return {
    id: `M-${String(index + 1).padStart(5, "0")}`,
    type: "customer",
    segmentId,
    weight: CUSTOMER_WEIGHT,
    monthlySpend,
    historicalMonthlySpend,
    spendTrend: isInactive ? 0 : clamp(p.trendMean + rng.normal() * p.trendSd, 0.35, 1.5),
    monthlyTx,
    daysSinceLastTx,
    categoryShares: hasShares ? categoryShares(rng, segmentId) : null,
    products,
    dormantProducts,
    offeredNotConverted,
    cardUsageShare: hasWallet ? clamp(rng.lognormal(segmentId === "yuksek_degerli" ? 0.62 : 0.45, 0.45), 0.05, 1) : null,
    pastOffers,
    pastParticipations,
    responseScore: response,
    productPropensity: clamp(p.propensity + rng.normal() * 0.18, 0.02, 0.97),
    dataCoverage,
    neverUsedCard: segmentId === "hic_kullanmayan",
    incompleteApplication: false,
  };
}

function makeProspect(rng: Rng, index: number): Customer {
  const incomplete = rng.chance(0.3);
  const segmentId: CustomerSegmentId = incomplete ? "yarim_basvuru" : "aday";
  const fields = [rng.chance(0.7), rng.chance(0.55), true, rng.chance(0.6)];
  return {
    id: `A-${String(index + 1).padStart(5, "0")}`,
    type: "prospect",
    segmentId,
    weight: PROSPECT_WEIGHT,
    monthlySpend: 0,
    historicalMonthlySpend: Math.round(rng.lognormal(6000, 0.6)), // estimated external spend potential
    spendTrend: 0,
    monthlyTx: 0,
    daysSinceLastTx: 999,
    categoryShares: null,
    products: [],
    dormantProducts: [],
    offeredNotConverted: [],
    cardUsageShare: null,
    pastOffers: 0,
    pastParticipations: 0,
    responseScore: clamp((incomplete ? 0.42 : 0.22) + rng.normal() * 0.1, 0.02, 0.9),
    productPropensity: clamp((incomplete ? 0.6 : 0.35) + rng.normal() * 0.18, 0.02, 0.97),
    dataCoverage: fields.filter(Boolean).length / fields.length,
    neverUsedCard: false,
    incompleteApplication: incomplete,
  };
}

let cache: Customer[] | null = null;

/** Returns the full synthetic population (generated once, deterministically). */
export function getPopulation(): Customer[] {
  if (cache) return cache;
  const rng = createRng(POPULATION_SEED);
  const customers = Array.from({ length: CUSTOMER_RECORDS }, (_, i) => makeCustomer(rng, i));
  const prospects = Array.from({ length: PROSPECT_RECORDS }, (_, i) => makeProspect(rng, i));
  cache = [...customers, ...prospects];
  return cache;
}

export function getCustomerShare(c: Customer, cat: SpendingCategory): number {
  return (c.categoryShares ?? DEFAULT_CATEGORY_SHARES)[cat];
}

export function avgTicket(c: Customer): number {
  if (c.monthlyTx > 0) return c.monthlySpend / c.monthlyTx;
  if (c.historicalMonthlySpend > 0) return c.historicalMonthlySpend / 6;
  return 450;
}
