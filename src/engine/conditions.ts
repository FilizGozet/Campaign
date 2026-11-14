import type { CampaignConditions, RewardMechanism } from "@/domain/types";
import { CATEGORY_LABELS, CHANNEL_LABELS, PRODUCT_LABELS } from "@/domain/labels";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { sortedTiers, validateReward } from "./rewards";

export type FieldErrors = Record<string, string>;

/** Validates campaign conditions. Keys match form field names. */
export function validateConditions(k: CampaignConditions): FieldErrors {
  const e: FieldErrors = {};
  if (!(k.durationDays >= 1 && k.durationDays <= 365)) e.durationDays = "Süre 1–365 gün arasında olmalıdır.";
  if (!(k.budget > 0)) e.budget = "Bütçe sıfırdan büyük olmalıdır.";
  const rewardErrors = validateReward(k.reward);
  if (rewardErrors.length) e.reward = rewardErrors.join(" ");

  switch (k.objective) {
    case "spending_growth":
      if (k.targetType === "fixed" && !(k.fixedTarget > 0)) e.fixedTarget = "Hedef tutar sıfırdan büyük olmalıdır.";
      if (k.targetType === "dynamic" && !(k.increasePct > 0 && k.increasePct <= 2))
        e.increasePct = "Artış oranı %1 ile %200 arasında olmalıdır.";
      break;
    case "reactivation":
      if (k.activationCondition === "first_transaction" && !(k.minTxAmount > 0))
        e.minTxAmount = "Minimum işlem tutarı sıfırdan büyük olmalıdır.";
      if (k.activationCondition === "min_total_spend" && !(k.minTotalSpend > 0))
        e.minTotalSpend = "Minimum toplam harcama sıfırdan büyük olmalıdır.";
      if (k.activationCondition === "tx_count" && !(k.requiredTxCount >= 1 && k.requiredTxCount <= 50))
        e.requiredTxCount = "İşlem adedi 1–50 arasında olmalıdır.";
      if (k.durationDays > 90) e.durationDays = "Aktivasyon süresi en fazla 90 gün olabilir.";
      break;
    case "category_growth":
      if (k.spendCondition !== "tx_count" && !(k.minCategorySpend > 0))
        e.minCategorySpend = "Minimum sektör harcaması sıfırdan büyük olmalıdır.";
      if (k.spendCondition === "tx_count" && !(k.requiredTxCount >= 1 && k.requiredTxCount <= 50))
        e.requiredTxCount = "İşlem adedi 1–50 arasında olmalıdır.";
      break;
    case "product_adoption":
      if (k.requiredAction === "first_spend" && !(k.requiredSpend > 0))
        e.requiredSpend = "Gerekli harcama tutarı sıfırdan büyük olmalıdır.";
      if (k.reward.type !== "fixed" && k.requiredAction !== "first_spend" && k.requiredAction !== "first_usage")
        e.reward = "Yüzdesel iade yalnızca harcama içeren aksiyonlarda kullanılabilir.";
      break;
    case "acquisition":
      if (k.requireFirstTransaction && !(k.minFirstTxAmount > 0))
        e.minFirstTxAmount = "İlk işlem tutarı sıfırdan büyük olmalıdır.";
      break;
    case "transaction_frequency":
      if (!(k.requiredTxCount >= 1 && k.requiredTxCount <= 60)) e.requiredTxCount = "İşlem adedi 1–60 arasında olmalıdır.";
      if (!(k.minTxAmount >= 0)) e.minTxAmount = "Minimum işlem tutarı negatif olamaz.";
      if (k.differentDays && k.requiredTxCount > k.durationDays)
        e.requiredTxCount = "Farklı gün şartında işlem adedi kampanya süresini aşamaz.";
      break;
  }
  return e;
}

export function describeReward(r: RewardMechanism): string {
  switch (r.type) {
    case "fixed":
      return `${formatCurrency(r.amount)} bonus`;
    case "percentage":
      return `${formatPercent(r.rate, r.rate < 0.1 ? 1 : 0)} iade`;
    case "capped":
      return `${formatPercent(r.rate, r.rate < 0.1 ? 1 : 0)} iade (en fazla ${formatCurrency(r.cap)})`;
    case "tiered":
      return sortedTiers(r.tiers)
        .map((t) => `${formatCurrency(t.minSpend)}+ → ${formatCurrency(t.reward)}`)
        .join(", ");
  }
}

/** One-sentence natural-language summary of the campaign rule. */
export function describeConditions(k: CampaignConditions): string {
  const reward = describeReward(k.reward);
  const d = `${k.durationDays} gün`;
  switch (k.objective) {
    case "spending_growth": {
      const scope = [
        k.eligibleCategory !== "tum" ? `${CATEGORY_LABELS[k.eligibleCategory]} sektöründe` : null,
        k.channel !== "tum" ? `${CHANNEL_LABELS[k.channel]} kanalında` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const target =
        k.targetType === "dynamic"
          ? `son 3 aylık ortalama harcamasını ${formatPercent(k.increasePct)} artıran`
          : `toplam ${formatCurrency(k.fixedTarget)} harcama yapan`;
      return `${scope ? scope + " " : ""}${d} içinde ${target} müşteriye ${reward}.`;
    }
    case "reactivation": {
      const cond =
        k.activationCondition === "first_transaction"
          ? `en az ${formatCurrency(k.minTxAmount)}'lik ilk harcamalarını yapmaları`
          : k.activationCondition === "min_total_spend"
            ? `toplam en az ${formatCurrency(k.minTotalSpend)} harcama yapmaları`
            : `en az ${k.requiredTxCount} işlem yapmaları`;
      return `Son ${k.inactivityDays} gündür harcama yapmayan müşterilere, ${d} içinde ${cond} karşılığında ${reward}.`;
    }
    case "category_growth": {
      const cat = CATEGORY_LABELS[k.category];
      const scope = k.merchantScope === "tum_isyerleri" ? "" : k.merchantScope === "anlasmali_isyerleri" ? " anlaşmalı iş yerlerinde" : " seçili markalarda";
      const cond =
        k.spendCondition === "total_spend"
          ? `toplam ${formatCurrency(k.minCategorySpend)} harcamaya`
          : k.spendCondition === "single_transaction"
            ? `tek seferde en az ${formatCurrency(k.minCategorySpend)} harcamaya`
            : `en az ${k.requiredTxCount} işleme`;
      return `${cat} sektöründe${scope} ${d} içinde ${cond} ${reward}.`;
    }
    case "product_adoption": {
      const p = PRODUCT_LABELS[k.product];
      const act = {
        application: `${p} başvurusu yapan`,
        activation: `${p} ürününü aktive eden`,
        first_usage: `${p} ürününü ilk kez kullanan`,
        first_spend: `${p} ürününü aktive edip ilk ${formatCurrency(k.requiredSpend)} harcamasını yapan`,
      }[k.requiredAction];
      return `${d} içinde ${act} müşteriye ${reward}.`;
    }
    case "acquisition": {
      const act = { mobil_kayit: "mobil uygulamadan müşteri olup", basvuru_onayi: "başvurusu onaylanıp", kart_aktivasyonu: "kartını aktive edip" }[k.onboardingAction];
      const tx = k.requireFirstTransaction ? ` en az ${formatCurrency(k.minFirstTxAmount)}'lik ilk işlemini tamamlayana` : " kaydını tamamlayana";
      return `${d} içinde ${act}${tx} ${reward} hoş geldin ödülü.`;
    }
    case "transaction_frequency":
      return `${d} içinde${k.differentDays ? " farklı günlerde" : ""} ${k.minTxAmount > 0 ? `${formatCurrency(k.minTxAmount)} ve üzeri ` : ""}${formatNumber(k.requiredTxCount)} işlem yapan müşteriye ${reward}.`;
  }
}

/** Short key-condition chips (for cards and tables). */
export function keyConditionChips(k: CampaignConditions): string[] {
  const chips: string[] = [];
  switch (k.objective) {
    case "spending_growth":
      chips.push(k.targetType === "dynamic" ? `Hedef +${formatPercent(k.increasePct)}` : `Hedef ${formatCurrency(k.fixedTarget)}`);
      break;
    case "reactivation":
      chips.push(`Pasif ${k.inactivityDays}+ gün`);
      chips.push(
        k.activationCondition === "first_transaction"
          ? `İlk işlem ≥ ${formatCurrency(k.minTxAmount)}`
          : k.activationCondition === "min_total_spend"
            ? `Toplam ≥ ${formatCurrency(k.minTotalSpend)}`
            : `${k.requiredTxCount} işlem`,
      );
      break;
    case "category_growth":
      chips.push(CATEGORY_LABELS[k.category]);
      chips.push(k.spendCondition === "tx_count" ? `${k.requiredTxCount} işlem` : `≥ ${formatCurrency(k.minCategorySpend)}`);
      break;
    case "product_adoption":
      chips.push(PRODUCT_LABELS[k.product]);
      if (k.requiredAction === "first_spend") chips.push(`İlk ${formatCurrency(k.requiredSpend)}`);
      break;
    case "acquisition":
      if (k.requireFirstTransaction) chips.push(`İlk işlem ≥ ${formatCurrency(k.minFirstTxAmount)}`);
      break;
    case "transaction_frequency":
      chips.push(`${k.requiredTxCount} işlem${k.differentDays ? " (farklı gün)" : ""}`);
      break;
  }
  chips.push(describeReward(k.reward));
  chips.push(`${k.durationDays} gün`);
  chips.push(`Bütçe ${formatCurrency(k.budget, { compact: true })}`);
  return chips;
}

/** Main "difficulty" parameter for the studio (spending threshold) per objective. */
export function thresholdOf(k: CampaignConditions): { label: string; value: number; min: number; max: number; step: number; unit: "TL" | "%" | "adet" } {
  switch (k.objective) {
    case "spending_growth":
      return k.targetType === "dynamic"
        ? { label: "Harcama artış hedefi", value: Math.round(k.increasePct * 100), min: 5, max: 60, step: 1, unit: "%" }
        : { label: "Hedef harcama tutarı", value: k.fixedTarget, min: 1000, max: 50000, step: 500, unit: "TL" };
    case "reactivation":
      return k.activationCondition === "tx_count"
        ? { label: "Gerekli işlem adedi", value: k.requiredTxCount, min: 1, max: 10, step: 1, unit: "adet" }
        : k.activationCondition === "min_total_spend"
          ? { label: "Minimum toplam harcama", value: k.minTotalSpend, min: 100, max: 10000, step: 100, unit: "TL" }
          : { label: "Minimum ilk işlem tutarı", value: k.minTxAmount, min: 50, max: 3000, step: 50, unit: "TL" };
    case "category_growth":
      return k.spendCondition === "tx_count"
        ? { label: "Gerekli sektör işlem adedi", value: k.requiredTxCount, min: 1, max: 15, step: 1, unit: "adet" }
        : { label: "Minimum sektör harcaması", value: k.minCategorySpend, min: 100, max: 15000, step: 100, unit: "TL" };
    case "product_adoption":
      return { label: "Gerekli ilk harcama", value: k.requiredSpend, min: 0, max: 10000, step: 250, unit: "TL" };
    case "acquisition":
      return { label: "Minimum ilk işlem tutarı", value: k.minFirstTxAmount, min: 0, max: 3000, step: 50, unit: "TL" };
    case "transaction_frequency":
      return { label: "Gerekli işlem adedi", value: k.requiredTxCount, min: 1, max: 20, step: 1, unit: "adet" };
  }
}

export function withThreshold(k: CampaignConditions, value: number): CampaignConditions {
  switch (k.objective) {
    case "spending_growth":
      return k.targetType === "dynamic" ? { ...k, increasePct: value / 100 } : { ...k, fixedTarget: value };
    case "reactivation":
      return k.activationCondition === "tx_count"
        ? { ...k, requiredTxCount: value }
        : k.activationCondition === "min_total_spend"
          ? { ...k, minTotalSpend: value }
          : { ...k, minTxAmount: value };
    case "category_growth":
      return k.spendCondition === "tx_count" ? { ...k, requiredTxCount: value } : { ...k, minCategorySpend: value };
    case "product_adoption":
      return { ...k, requiredSpend: value, requiredAction: value > 0 ? "first_spend" : k.requiredAction === "first_spend" ? "first_usage" : k.requiredAction };
    case "acquisition":
      return { ...k, minFirstTxAmount: value, requireFirstTransaction: value > 0 };
    case "transaction_frequency":
      return { ...k, requiredTxCount: value };
  }
}

/** Headline reward amount for the studio slider (TL or rate). */
export function rewardLever(r: RewardMechanism): { label: string; value: number; min: number; max: number; step: number; unit: "TL" | "%" } {
  switch (r.type) {
    case "fixed":
      return { label: "Bonus tutarı", value: r.amount, min: 25, max: 1000, step: 25, unit: "TL" };
    case "percentage":
    case "capped":
      return { label: "İade oranı", value: Math.round(r.rate * 1000) / 10, min: 0.5, max: 20, step: 0.5, unit: "%" };
    case "tiered": {
      const top = sortedTiers(r.tiers).at(-1)?.reward ?? 0;
      return { label: "En üst kademe ödülü", value: top, min: 50, max: 1500, step: 25, unit: "TL" };
    }
  }
}

export function withRewardLever(r: RewardMechanism, value: number): RewardMechanism {
  switch (r.type) {
    case "fixed":
      return { ...r, amount: value };
    case "percentage":
      return { ...r, rate: value / 100 };
    case "capped":
      return { ...r, rate: value / 100 };
    case "tiered": {
      const tiers = sortedTiers(r.tiers);
      const top = tiers.at(-1)?.reward || 1;
      const scale = value / top;
      return { ...r, tiers: tiers.map((t) => ({ ...t, reward: Math.max(5, Math.round((t.reward * scale) / 5) * 5) })) };
    }
  }
}

export function defaultReward(type: RewardMechanism["type"], current?: RewardMechanism): RewardMechanism {
  const base = current && current.type === "fixed" ? current.amount : 200;
  switch (type) {
    case "fixed":
      return { type, amount: base };
    case "percentage":
      return { type, rate: 0.05 };
    case "capped":
      return { type, rate: 0.1, cap: Math.max(base, 250) };
    case "tiered":
      return {
        type,
        tiers: [
          { minSpend: 3000, reward: 75 },
          { minSpend: 6000, reward: 175 },
          { minSpend: 10000, reward: 350 },
        ],
      };
  }
}
