import type { CampaignConditions, ReliabilityInfo, ReliabilityLevel } from "@/domain/types";
import { comparableCampaignCount } from "@/data/historical";
import { headlineReward } from "./rewards";
import { formatPercent } from "@/lib/format";

/**
 * Parameter ranges for which comparable (synthetic) historical observations
 * exist. Outside these ranges the demo engine extrapolates and the scenario
 * is flagged as less reliable.
 */
export const SUPPORTED_RANGES = {
  durationDays: [7, 90],
  fixedReward: [25, 1000],
  cashbackRate: [0.01, 0.15],
  increasePct: [0.05, 0.5],
  txCount: [2, 15],
  minEligible: 5000,
} as const;

export function checkSupportedRange(k: CampaignConditions, eligibleCustomers: number): string[] {
  const notes: string[] = [];
  const [dMin, dMax] = SUPPORTED_RANGES.durationDays;
  if (k.durationDays < dMin || k.durationDays > dMax)
    notes.push(`Kampanya süresi (${k.durationDays} gün) desteklenen ${dMin}–${dMax} gün aralığının dışında.`);

  const r = k.reward;
  if (r.type === "fixed" && (r.amount < SUPPORTED_RANGES.fixedReward[0] || r.amount > SUPPORTED_RANGES.fixedReward[1]))
    notes.push("Sabit bonus tutarı geçmiş kampanyalarda gözlenen 25–1.000 TL aralığının dışında.");
  if ((r.type === "percentage" || r.type === "capped") && (r.rate < SUPPORTED_RANGES.cashbackRate[0] || r.rate > SUPPORTED_RANGES.cashbackRate[1]))
    notes.push(`İade oranı (${formatPercent(r.rate, 1)}) gözlenen %1–%15 aralığının dışında.`);
  if (r.type === "tiered" && r.tiers.some((t) => t.reward > SUPPORTED_RANGES.fixedReward[1]))
    notes.push("Bazı ödül kademeleri gözlenen en yüksek ödül tutarını aşıyor.");

  if (k.objective === "spending_growth" && k.targetType === "dynamic") {
    const [lo, hi] = SUPPORTED_RANGES.increasePct;
    if (k.increasePct < lo || k.increasePct > hi)
      notes.push(`Harcama artış hedefi (${formatPercent(k.increasePct)}) desteklenen %5–%50 aralığının dışında.`);
  }
  if ((k.objective === "transaction_frequency" || (k.objective === "category_growth" && k.spendCondition === "tx_count")) &&
      (k.requiredTxCount < SUPPORTED_RANGES.txCount[0] || k.requiredTxCount > SUPPORTED_RANGES.txCount[1]))
    notes.push("İşlem adedi şartı desteklenen 2–15 aralığının dışında.");
  if (k.objective === "acquisition" && k.acquisitionType === "maas_musterisi")
    notes.push("Maaş müşterisi kazanımı için geçmiş kampanya verisi bulunmuyor.");
  if (k.objective === "product_adoption" && k.product === "dijital_cuzdan")
    notes.push("Dijital cüzdan için geçmiş kampanya gözlemi bulunmuyor.");

  if (eligibleCustomers > 0 && eligibleCustomers < SUPPORTED_RANGES.minEligible)
    notes.push("Uygun müşteri sayısı küçük; sonuçlar daha oynak olabilir.");
  return notes;
}

export function reliabilityLevel(coverage: number, withinRange: boolean, comparable: number): ReliabilityLevel {
  const score = (coverage >= 0.85 ? 1 : 0) + (withinRange ? 1 : 0) + (comparable >= 2 ? 1 : 0);
  return score >= 3 ? "yuksek" : score === 2 ? "orta" : "dusuk";
}

export function buildReliability(args: {
  conditions: CampaignConditions;
  eligibleCustomers: number;
  dataCoverage: number;
  sensitivity: { low: number; high: number };
}): ReliabilityInfo {
  const rangeNotes = checkSupportedRange(args.conditions, args.eligibleCustomers);
  const comparable = comparableCampaignCount(args.conditions.objective);
  const notes = [...rangeNotes];
  if (args.dataCoverage < 0.85)
    notes.push(`Kitlenin ortalama veri kapsamı ${formatPercent(args.dataCoverage)}; eksik alanlar için popülasyon ortalaması kullanıldı.`);
  if (comparable < 2) notes.push(`Bu hedef için yalnızca ${comparable} benzer geçmiş kampanya mevcut.`);
  if (headlineReward(args.conditions.reward, 1) <= 0 && args.conditions.reward.type !== "percentage")
    notes.push("Ödül tanımı eksik.");
  return {
    level: reliabilityLevel(args.dataCoverage, rangeNotes.length === 0, comparable),
    dataCoverage: args.dataCoverage,
    withinSupportedRange: rangeNotes.length === 0,
    comparableCampaigns: comparable,
    notes,
    sensitivity: args.sensitivity,
  };
}
