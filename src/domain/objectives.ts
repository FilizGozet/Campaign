import type {
  CampaignConditions,
  CampaignObjective,
  ConditionsFor,
  MetricFormat,
  MetricKey,
  RewardType,
} from "./types";
import { GLOSSARY } from "./labels";

export interface KpiDefinition {
  key: MetricKey;
  label: string;
  format: MetricFormat;
  tooltip: string;
  /** Lower values are better (for comparison highlighting). */
  lowerIsBetter?: boolean;
}

export interface ObjectiveDefinition {
  id: CampaignObjective;
  code: string;
  shortName: string;
  title: string;
  description: string;
  icon: "TrendingUp" | "RotateCcw" | "ShoppingBasket" | "PackagePlus" | "UserPlus" | "Repeat";
  /** Unit name for a "qualified" customer under this objective. */
  qualifiedLabel: string;
  primaryKpis: KpiDefinition[];
  /** Metrics shown in the comparison table (superset of primary KPIs). */
  comparisonMetrics: KpiDefinition[];
  allowedRewards: RewardType[];
  example: string;
  focusQuestions: string[];
}

const K = {
  qualificationRate: (label = "Ödüle hak kazanma oranı"): KpiDefinition => ({
    key: "qualificationRate",
    label,
    format: "percent",
    tooltip: GLOSSARY.qualification,
  }),
  qualified: (label: string): KpiDefinition => ({
    key: "qualifiedCustomers",
    label,
    format: "number",
    tooltip: "Bütçe kısıtı uygulandıktan sonra koşulu sağlayıp ödül alması beklenen müşteri sayısı (demo simülasyon).",
  }),
  incremental: (label = "Tahmini ek ciro"): KpiDefinition => ({
    key: "incrementalSpending",
    label,
    format: "currency",
    tooltip: GLOSSARY.incremental,
  }),
  cost: (): KpiDefinition => ({
    key: "totalCost",
    label: "Beklenen kampanya maliyeti",
    format: "currency",
    tooltip: "Beklenen toplam ödül maliyeti. Bütçe aşılırsa bütçe tutarında sınırlanır.",
    lowerIsBetter: true,
  }),
  costRatio: (): KpiDefinition => ({
    key: "costToIncrementalRatio",
    label: "Maliyet / ek ciro",
    format: "ratio",
    tooltip: GLOSSARY.costRatio,
    lowerIsBetter: true,
  }),
  costPer: (label: string, tooltip: string): KpiDefinition => ({
    key: "costPerQualified",
    label,
    format: "currency",
    tooltip,
    lowerIsBetter: true,
  }),
  budget: (): KpiDefinition => ({
    key: "budgetUtilization",
    label: "Bütçe kullanımı",
    format: "percent",
    tooltip: GLOSSARY.budgetUtilization,
  }),
  observed: (label = "Gözlenen kampanya harcaması"): KpiDefinition => ({
    key: "observedSpending",
    label,
    format: "currency",
    tooltip: GLOSSARY.observed,
  }),
};

export const OBJECTIVE_DEFINITIONS: Record<CampaignObjective, ObjectiveDefinition> = {
  spending_growth: {
    id: "spending_growth",
    code: "A",
    shortName: "Harcama artışı",
    title: "Mevcut müşterilerin harcamasını artırmak",
    description: "Aktif müşterilerin belirli bir dönemde daha fazla harcama yapmasını sağlamak.",
    icon: "TrendingUp",
    qualifiedLabel: "Hedefe ulaşan müşteri",
    primaryKpis: [
      K.qualificationRate(),
      K.qualified("Beklenen hak kazanan müşteri"),
      K.incremental(),
      K.cost(),
      K.costRatio(),
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped", "tiered"],
    example: "Son 3 aylık ortalama harcamasını %20 artıran müşteriye 200 TL bonus.",
    focusQuestions: ["Hedef zorluğu katılımı nasıl etkiler?", "Ek ciro maliyeti karşılıyor mu?"],
  },
  reactivation: {
    id: "reactivation",
    code: "B",
    shortName: "Yeniden aktivasyon",
    title: "Harcama yapmayan müşterileri aktifleştirmek",
    description: "Belirli bir süredir işlem yapmayan müşterilerin yeniden kart kullanmasını sağlamak.",
    icon: "RotateCcw",
    qualifiedLabel: "Yeniden aktifleşen müşteri",
    primaryKpis: [
      K.qualified("Beklenen aktifleşen müşteri"),
      K.qualificationRate("Aktivasyon oranı"),
      K.costPer("Aktifleşen müşteri başına maliyet", "Yeniden aktifleşen her müşteri için ortalama ödül maliyeti."),
      {
        key: "subsequentSpending",
        label: "Sonraki 3 ay beklenen harcama",
        format: "currency",
        tooltip:
          "Aktifleşen müşterilerin kampanya sonrası 3 ayda yapması beklenen harcama. Kalıcılık varsayımına dayanır, doğrulanmamıştır.",
      },
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped"],
    example:
      "Son 90 gündür harcama yapmayan müşterilere, 30 gün içinde en az 500 TL'lik ilk harcamalarını yapmaları karşılığında 100 TL bonus.",
    focusQuestions: ["Pasiflik süresi uzadıkça aktivasyon nasıl değişir?", "İlk işlem eşiği ne olmalı?"],
  },
  category_growth: {
    id: "category_growth",
    code: "C",
    shortName: "Sektörel harcama",
    title: "Belirli bir sektörde harcamayı artırmak",
    description: "Market, akaryakıt, restoran gibi sektörlerde kart kullanımını artırmak.",
    icon: "ShoppingBasket",
    qualifiedLabel: "Koşulu sağlayan müşteri",
    primaryKpis: [
      {
        key: "categorySpending",
        label: "Beklenen sektör harcaması",
        format: "currency",
        tooltip: "Koşulu sağlayan müşterilerin seçili sektördeki toplam beklenen harcaması (gözlenen, ek ciro değil).",
      },
      K.incremental("Tahmini ek sektör harcaması"),
      K.qualified("Koşulu sağlayan müşteri"),
      K.cost(),
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped", "tiered"],
    example: "Akaryakıt sektöründe 30 gün içinde toplam 3.000 TL harcamaya 150 TL bonus.",
    focusQuestions: ["Sektörde pasif müşteriler ne kadar tepki verir?", "Tek işlem mi toplam harcama mı?"],
  },
  product_adoption: {
    id: "product_adoption",
    code: "D",
    shortName: "Ürün kullanımı",
    title: "Yeni ürün kullanımını artırmak",
    description: "Kredi kartı, otomatik ödeme veya diğer bankacılık ürünlerinin kullanımını teşvik etmek.",
    icon: "PackagePlus",
    qualifiedLabel: "Ürün dönüşümü",
    primaryKpis: [
      K.qualified("Beklenen ürün dönüşümü"),
      K.qualificationRate("Dönüşüm oranı"),
      K.costPer("Edinim başına maliyet (CPA)", GLOSSARY.cpa),
      {
        key: "firstUseRate",
        label: "Beklenen ilk kullanım oranı",
        format: "percent",
        tooltip: "Dönüşen müşterilerden ürünü kampanya döneminde ilk kez kullanması beklenenlerin oranı.",
      },
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped"],
    example: "Yeni kredi kartını aktive edip ilk 2.000 TL harcamasını yapan müşteriye 300 TL bonus.",
    focusQuestions: ["Hangi aksiyon ödüllendirilmeli?", "Harcama şartı dönüşümü ne kadar düşürür?"],
  },
  acquisition: {
    id: "acquisition",
    code: "E",
    shortName: "Müşteri kazanımı",
    title: "Yeni müşteri kazanmak",
    description: "Bankaya yeni müşteriler kazandırmak ve ilk işlemlerini teşvik etmek.",
    icon: "UserPlus",
    qualifiedLabel: "Kazanılan müşteri",
    primaryKpis: [
      K.qualified("Beklenen kazanılan müşteri"),
      K.qualificationRate("Kazanım oranı"),
      K.costPer("Müşteri edinim maliyeti (CAC)", GLOSSARY.cac),
      K.budget(),
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped"],
    example: "Yeni müşteri olup ilk işlemini tamamlayana 250 TL ödül.",
    focusQuestions: ["İlk işlem şartı kazanımı nasıl etkiler?", "Bütçe yeterli mi?"],
  },
  transaction_frequency: {
    id: "transaction_frequency",
    code: "F",
    shortName: "İşlem sıklığı",
    title: "İşlem sıklığını artırmak",
    description: "Mevcut müşterilerin daha sık işlem yapmasını sağlamak.",
    icon: "Repeat",
    qualifiedLabel: "Koşulu sağlayan müşteri",
    primaryKpis: [
      {
        key: "incrementalTransactions",
        label: "Beklenen ek işlem adedi",
        format: "number",
        tooltip: "Kampanya olmadan gerçekleşmeyeceği varsayılan ek işlem sayısı (karşı-olgusal varsayıma dayalı demo tahmin).",
      },
      K.qualificationRate("Beklenen hak kazanma oranı"),
      {
        key: "costPerIncrementalTransaction",
        label: "Ek işlem başına maliyet",
        format: "currency",
        tooltip: "Toplam ödül maliyetinin beklenen ek işlem sayısına oranı.",
        lowerIsBetter: true,
      },
      {
        key: "transactionVolume",
        label: "Beklenen işlem hacmi",
        format: "number",
        tooltip: "Uygun kitlenin kampanya dönemindeki beklenen toplam işlem adedi (kampanyalı).",
      },
    ],
    comparisonMetrics: [],
    allowedRewards: ["fixed", "percentage", "capped", "tiered"],
    example: "30 gün içinde farklı günlerde 5 işlem yapan müşteriye 150 TL bonus.",
    focusQuestions: ["Kaç işlem şartı makul?", "Farklı gün şartı katılımı nasıl etkiler?"],
  },
};

// Comparison metrics: primary KPIs + shared financial metrics (deduplicated).
for (const def of Object.values(OBJECTIVE_DEFINITIONS)) {
  const extra: KpiDefinition[] = [
    K.qualified(def.qualifiedLabel),
    K.qualificationRate(),
    K.observed(),
    K.incremental(),
    K.cost(),
    K.budget(),
  ];
  const seen = new Set<MetricKey>();
  def.comparisonMetrics = [...def.primaryKpis, ...extra].filter((k) => {
    if (seen.has(k.key)) return false;
    seen.add(k.key);
    return true;
  });
}

export function getObjective(o: CampaignObjective): ObjectiveDefinition {
  return OBJECTIVE_DEFINITIONS[o];
}

// ---------------------------------------------------------------------------
// Default conditions per objective
// ---------------------------------------------------------------------------

export function defaultConditions<O extends CampaignObjective>(objective: O): ConditionsFor<O> {
  const map: { [K in CampaignObjective]: ConditionsFor<K> } = {
    spending_growth: {
      objective: "spending_growth",
      targetType: "dynamic",
      fixedTarget: 12000,
      increasePct: 0.2,
      eligibleCategory: "tum",
      channel: "tum",
      reward: { type: "fixed", amount: 200 },
      durationDays: 30,
      budget: 35_000_000,
    },
    reactivation: {
      objective: "reactivation",
      inactivityDays: 90,
      activationCondition: "first_transaction",
      minTxAmount: 500,
      minTotalSpend: 1500,
      requiredTxCount: 3,
      reward: { type: "fixed", amount: 100 },
      durationDays: 30,
      budget: 4_000_000,
    },
    category_growth: {
      objective: "category_growth",
      category: "akaryakit",
      merchantScope: "tum_isyerleri",
      spendCondition: "total_spend",
      minCategorySpend: 3000,
      requiredTxCount: 4,
      reward: { type: "fixed", amount: 150 },
      durationDays: 30,
      budget: 16_000_000,
    },
    product_adoption: {
      objective: "product_adoption",
      product: "kredi_karti",
      requiredAction: "first_spend",
      requiredSpend: 2000,
      reward: { type: "fixed", amount: 300 },
      durationDays: 45,
      budget: 12_000_000,
    },
    acquisition: {
      objective: "acquisition",
      acquisitionType: "dijital_musteri",
      onboardingAction: "mobil_kayit",
      requireFirstTransaction: true,
      minFirstTxAmount: 250,
      reward: { type: "fixed", amount: 250 },
      durationDays: 60,
      budget: 9_000_000,
    },
    transaction_frequency: {
      objective: "transaction_frequency",
      requiredTxCount: 5,
      minTxAmount: 100,
      differentDays: true,
      reward: { type: "fixed", amount: 150 },
      durationDays: 30,
      budget: 10_000_000,
    },
  };
  return structuredClone(map[objective]) as ConditionsFor<O>;
}

export function isConditionsFor<O extends CampaignObjective>(
  c: CampaignConditions,
  o: O,
): c is ConditionsFor<O> {
  return c.objective === o;
}
