import type {
  Audience,
  AudienceContext,
  AudienceDefinition,
  AudienceFilters,
  AudienceSelection,
  AudienceStats,
  CampaignConditions,
  CampaignObjective,
  Customer,
  CustomerSegmentId,
} from "@/domain/types";
import { CATEGORY_LABELS, PRODUCT_LABELS } from "@/domain/labels";
import { avgTicket, getCustomerShare, getPopulation } from "./population";

const isActive = (c: Customer) => c.type === "customer" && c.monthlySpend > 0 && c.daysSinceLastTx < 30;
const share = (c: Customer, ctx: AudienceContext) => (c.categoryShares ? c.categoryShares[ctx.category] : null);

export const AUDIENCE_DEFINITIONS: AudienceDefinition[] = [
  // A — Spending growth
  {
    id: "sg_regular",
    objective: "spending_growth",
    name: "Düzenli harcama yapan müşteriler",
    description: "Son 3 ayda istikrarlı ve düzenli kart harcaması olan aktif müşteriler.",
    predicate: (c) => isActive(c) && (c.segmentId === "yuksek_degerli" || c.segmentId === "duzenli") && c.spendTrend >= 0.9,
    tags: ["Aktif", "İstikrarlı"],
  },
  {
    id: "sg_declining",
    objective: "spending_growth",
    name: "Harcaması son dönemde azalan müşteriler",
    description: "Son ay harcaması 3 aylık ortalamasının %15'inden fazla altında kalan müşteriler.",
    predicate: (c) => isActive(c) && c.spendTrend < 0.85,
    tags: ["Risk", "Azalan"],
  },
  {
    id: "sg_category_active",
    objective: "spending_growth",
    name: "Belirli sektörde aktif müşteriler",
    description: "Seçilen sektörde harcamasının en az %20'sini yapan müşteriler.",
    dependsOn: "category",
    predicate: (c, ctx) => isActive(c) && (share(c, ctx) ?? 0) >= 0.2,
    tags: ["Sektörel"],
  },
  {
    id: "sg_low_share",
    objective: "spending_growth",
    name: "Kart kullanım payı düşük müşteriler",
    description: "Toplam harcamasının tahminen %35'inden azını bankamızın kartıyla yapan müşteriler.",
    predicate: (c) => isActive(c) && c.cardUsageShare !== null && c.cardUsageShare < 0.35,
    tags: ["Cüzdan payı"],
  },
  // B — Reactivation
  {
    id: "re_30",
    objective: "reactivation",
    name: "Son 30 gündür harcama yapmayanlar",
    description: "En az 30 gündür kartla işlem yapmayan, daha önce aktif olmuş müşteriler.",
    predicate: (c) => c.type === "customer" && c.daysSinceLastTx >= 30 && !c.neverUsedCard,
    tags: ["Pasif 30+"],
  },
  {
    id: "re_90",
    objective: "reactivation",
    name: "Son 90 gündür harcama yapmayanlar",
    description: "En az 90 gündür işlem yapmayan müşteriler. Kendiliğinden geri dönüş olasılığı düşüktür.",
    predicate: (c) => c.type === "customer" && c.daysSinceLastTx >= 90 && !c.neverUsedCard,
    tags: ["Pasif 90+"],
  },
  {
    id: "re_180",
    objective: "reactivation",
    name: "Son 180 gündür harcama yapmayanlar",
    description: "Uzun süredir pasif olan, kayıp riski yüksek müşteriler.",
    predicate: (c) => c.type === "customer" && c.daysSinceLastTx >= 180 && !c.neverUsedCard,
    tags: ["Pasif 180+"],
  },
  {
    id: "re_never",
    objective: "reactivation",
    name: "Kartı olup hiç harcama yapmamış müşteriler",
    description: "Kartı tanımlı olduğu hâlde hiç işlem yapmamış müşteriler.",
    predicate: (c) => c.neverUsedCard,
    tags: ["Hiç kullanmamış"],
  },
  // C — Category growth
  {
    id: "cg_regular",
    objective: "category_growth",
    name: "Seçilen sektörde düzenli harcama yapanlar",
    description: "Seçili sektörde ayda ortalama 2+ işlem yapan müşteriler.",
    dependsOn: "category",
    predicate: (c, ctx) => isActive(c) && (share(c, ctx) ?? 0) >= 0.12 && c.monthlyTx * (share(c, ctx) ?? 0) >= 2,
    tags: ["Sektörde aktif"],
  },
  {
    id: "cg_light",
    objective: "category_growth",
    name: "Seçilen sektörde az harcayanlar",
    description: "Seçili sektörde harcaması olan ancak payı %8'in altında kalan müşteriler.",
    dependsOn: "category",
    predicate: (c, ctx) => {
      const s = share(c, ctx);
      return isActive(c) && s !== null && s > 0 && s < 0.08;
    },
    tags: ["Düşük pay"],
  },
  {
    id: "cg_cross",
    objective: "category_growth",
    name: "Diğer sektörlerde aktif olup seçilen sektörde pasif olanlar",
    description: "Ayda 3.000 TL üzeri harcayan ancak seçili sektörde neredeyse hiç işlem yapmayanlar.",
    dependsOn: "category",
    predicate: (c, ctx) => {
      const s = share(c, ctx);
      return isActive(c) && s !== null && s < 0.02 && c.monthlySpend >= 3000;
    },
    tags: ["Çapraz satış"],
  },
  {
    id: "cg_declining",
    objective: "category_growth",
    name: "Seçilen sektörde harcaması azalanlar",
    description: "Sektörde payı olan ve son dönemde genel harcaması azalan müşteriler.",
    dependsOn: "category",
    predicate: (c, ctx) => isActive(c) && (share(c, ctx) ?? 0) >= 0.08 && c.spendTrend < 0.85,
    tags: ["Azalan"],
  },
  // D — Product adoption
  {
    id: "pa_non_owner",
    objective: "product_adoption",
    name: "Ürüne sahip olmayan uygun müşteriler",
    description: "Seçili ürüne sahip olmayan, ayda en az 1.500 TL harcayan aktif müşteriler.",
    dependsOn: "product",
    predicate: (c, ctx) => isActive(c) && !c.products.includes(ctx.product) && c.monthlySpend >= 1500,
    tags: ["Uygun"],
  },
  {
    id: "pa_dormant_owner",
    objective: "product_adoption",
    name: "Ürüne sahip olup kullanmayan müşteriler",
    description: "Seçili ürüne sahip ancak son 90 günde kullanmamış müşteriler.",
    dependsOn: "product",
    predicate: (c, ctx) => c.type === "customer" && c.dormantProducts.includes(ctx.product),
    tags: ["Atıl ürün"],
  },
  {
    id: "pa_offered",
    objective: "product_adoption",
    name: "Daha önce teklif alıp dönüşüm sağlamayanlar",
    description: "Son 12 ayda seçili ürün için teklif alıp başvurmayan müşteriler.",
    dependsOn: "product",
    predicate: (c, ctx) => c.type === "customer" && c.offeredNotConverted.includes(ctx.product),
    tags: ["Yeniden hedefleme"],
  },
  {
    id: "pa_high_propensity",
    objective: "product_adoption",
    name: "Ürüne ilgi gösterme olasılığı yüksek müşteriler",
    description: "Ürüne sahip olmayan ve sentetik ilgi skoru 0,60 üzerinde olan müşteriler.",
    dependsOn: "product",
    predicate: (c, ctx) => c.type === "customer" && !c.products.includes(ctx.product) && c.productPropensity >= 0.6,
    tags: ["Yüksek ilgi"],
  },
  // E — Acquisition
  {
    id: "ac_potential",
    objective: "acquisition",
    name: "Potansiyel müşteri segmentleri",
    description: "Dijital kanallarda etkileşimi olan, bankanın müşterisi olmayan adaylar.",
    predicate: (c) => c.type === "prospect" && c.segmentId === "aday",
    tags: ["Aday"],
  },
  {
    id: "ac_incomplete",
    objective: "acquisition",
    name: "Başvurusunu tamamlamayanlar",
    description: "Başvuru sürecine başlayıp tamamlamayan adaylar.",
    predicate: (c) => c.type === "prospect" && c.incompleteApplication,
    tags: ["Yarım başvuru"],
  },
  {
    id: "ac_product_candidates",
    objective: "acquisition",
    name: "İlgili ürün için yeni müşteri adayları",
    description: "Ürün ilgisi skoru 0,50 üzerinde olan aday müşteriler.",
    predicate: (c) => c.type === "prospect" && c.productPropensity >= 0.5,
    tags: ["Ürün odaklı"],
  },
  // F — Transaction frequency
  {
    id: "tf_low",
    objective: "transaction_frequency",
    name: "Ayda 1–2 işlem yapanlar",
    description: "Aktif ancak ayda ortalama 1–2 işlem yapan müşteriler.",
    predicate: (c) => isActive(c) && c.monthlyTx < 3,
    tags: ["Seyrek"],
  },
  {
    id: "tf_declining",
    objective: "transaction_frequency",
    name: "İşlem sıklığı azalanlar",
    description: "İşlem ve harcama eğilimi son dönemde düşüş gösteren müşteriler.",
    predicate: (c) => isActive(c) && c.spendTrend < 0.85 && c.monthlyTx >= 2,
    tags: ["Azalan"],
  },
  {
    id: "tf_high_ticket",
    objective: "transaction_frequency",
    name: "Yüksek tutarlı ancak seyrek işlem yapanlar",
    description: "Ortalama işlem tutarı 1.500 TL üzeri olup ayda en fazla 4 işlem yapan müşteriler.",
    predicate: (c) => isActive(c) && avgTicket(c) >= 1500 && c.monthlyTx <= 4,
    tags: ["Yüksek sepet"],
  },
];

export function audiencesForObjective(objective: CampaignObjective): AudienceDefinition[] {
  return AUDIENCE_DEFINITIONS.filter((a) => a.objective === objective);
}

export function getAudienceDefinition(id: string): AudienceDefinition | undefined {
  return AUDIENCE_DEFINITIONS.find((a) => a.id === id);
}

export function contextFromConditions(conditions: CampaignConditions | null | undefined): AudienceContext {
  const ctx: AudienceContext = { category: "market", product: "kredi_karti" };
  if (!conditions) return ctx;
  if (conditions.objective === "category_growth") ctx.category = conditions.category;
  if (conditions.objective === "spending_growth" && conditions.eligibleCategory !== "tum")
    ctx.category = conditions.eligibleCategory;
  if (conditions.objective === "product_adoption") ctx.product = conditions.product;
  return ctx;
}

// ---------------------------------------------------------------------------
// Custom audience builder
// ---------------------------------------------------------------------------

export function matchesFilters(c: Customer, f: AudienceFilters): boolean {
  if (f.minDataCoverage && c.dataCoverage < f.minDataCoverage) return false;
  if (f.spendBands?.length) {
    const ref = c.monthlySpend || c.historicalMonthlySpend;
    const band = ref < 3000 ? "dusuk" : ref <= 12000 ? "orta" : "yuksek";
    if (!f.spendBands.includes(band)) return false;
  }
  if (f.txBands?.length) {
    const band = c.monthlyTx < 3 ? "1_2" : c.monthlyTx < 10 ? "3_9" : "10_plus";
    if (c.monthlyTx === 0 || !f.txBands.includes(band)) return false;
  }
  if (f.activity?.length) {
    const status = c.neverUsedCard
      ? "hic"
      : c.daysSinceLastTx >= 30
        ? "pasif"
        : c.spendTrend < 0.85
          ? "azalan"
          : "aktif";
    if (c.type !== "customer" || !f.activity.includes(status)) return false;
  }
  if (f.ownsProduct && f.ownsProduct !== "any" && !c.products.includes(f.ownsProduct)) return false;
  if (f.doesNotOwnProduct && f.doesNotOwnProduct !== "none" && c.products.includes(f.doesNotOwnProduct)) return false;
  if (f.pastParticipation === "participated" && c.pastParticipations === 0) return false;
  if (f.pastParticipation === "never" && c.pastParticipations > 0) return false;
  if (f.cardUsage === "low" && (c.cardUsageShare === null || c.cardUsageShare >= 0.35)) return false;
  if (f.cardUsage === "high" && (c.cardUsageShare === null || c.cardUsageShare < 0.6)) return false;
  if (f.activeInCategory && f.activeInCategory !== "any") {
    if (!c.categoryShares || c.categoryShares[f.activeInCategory] < 0.1) return false;
  }
  return true;
}

/** Data availability for optional attributes (share of population with the field populated). */
export function attributeAvailability() {
  const pop = getPopulation().filter((c) => c.type === "customer");
  const n = pop.length;
  return {
    categoryShares: pop.filter((c) => c.categoryShares).length / n,
    cardUsageShare: pop.filter((c) => c.cardUsageShare !== null).length / n,
    transactions: 1,
    products: 1,
    campaignHistory: 1,
  };
}

// ---------------------------------------------------------------------------
// Resolution & analytics
// ---------------------------------------------------------------------------

const resolveCache = new Map<string, Customer[]>();

export function audienceKey(sel: AudienceSelection, ctx: AudienceContext): string {
  return sel.mode === "existing"
    ? `e:${sel.audienceId}:${ctx.category}:${ctx.product}`
    : `c:${JSON.stringify(sel.filters)}`;
}

export function resolveAudience(sel: AudienceSelection, ctx: AudienceContext): Audience {
  const key = audienceKey(sel, ctx);
  let customers = resolveCache.get(key);
  const def = sel.mode === "existing" ? getAudienceDefinition(sel.audienceId) : undefined;
  if (!customers) {
    const pop = getPopulation();
    customers =
      sel.mode === "existing"
        ? def
          ? pop.filter((c) => def.predicate(c, ctx))
          : []
        : pop.filter((c) => matchesFilters(c, sel.filters));
    if (resolveCache.size > 200) resolveCache.clear();
    resolveCache.set(key, customers);
  }
  return {
    key,
    name: sel.mode === "existing" ? audienceDisplayName(def, ctx) : sel.name || "Özel kitle",
    description: def?.description ?? "Özel filtrelerle oluşturulan kitle.",
    customers,
  };
}

export function audienceDisplayName(def: AudienceDefinition | undefined, ctx: AudienceContext): string {
  if (!def) return "Bilinmeyen kitle";
  if (def.dependsOn === "category") return `${def.name} (${CATEGORY_LABELS[ctx.category]})`;
  if (def.dependsOn === "product") return `${def.name} (${PRODUCT_LABELS[ctx.product]})`;
  return def.name;
}

export function selectionLabel(sel: AudienceSelection | null, conditions?: CampaignConditions | null): string {
  if (!sel) return "Seçilmedi";
  if (sel.mode === "custom") return sel.name || "Özel kitle";
  return audienceDisplayName(getAudienceDefinition(sel.audienceId), contextFromConditions(conditions));
}

const MONTHS = ["Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim"];

export function computeAudienceStats(customers: Customer[]): AudienceStats {
  let w = 0;
  let spend = 0;
  let tx = 0;
  let trendW = 0;
  let trend = 0;
  let offers = 0;
  let parts = 0;
  let cov = 0;
  const seg = new Map<CustomerSegmentId, number>();
  const bands = [
    { band: "0", min: -1, max: 1, customers: 0 },
    { band: "1–1,5 B", min: 1, max: 1500, customers: 0 },
    { band: "1,5–3 B", min: 1500, max: 3000, customers: 0 },
    { band: "3–6 B", min: 3000, max: 6000, customers: 0 },
    { band: "6–12 B", min: 6000, max: 12000, customers: 0 },
    { band: "12–25 B", min: 12000, max: 25000, customers: 0 },
    { band: "25 B+", min: 25000, max: Infinity, customers: 0 },
  ];
  for (const c of customers) {
    w += c.weight;
    spend += c.monthlySpend * c.weight;
    tx += c.monthlyTx * c.weight;
    if (c.monthlySpend > 0) {
      trendW += c.weight;
      trend += c.spendTrend * c.weight;
    }
    offers += c.pastOffers * c.weight;
    parts += c.pastParticipations * c.weight;
    cov += c.dataCoverage * c.weight;
    seg.set(c.segmentId, (seg.get(c.segmentId) ?? 0) + c.weight);
    const b = bands.find((x) => c.monthlySpend > x.min && c.monthlySpend <= x.max) ?? bands[0];
    b.customers += c.weight;
  }
  const avgSpend = w ? spend / w : 0;
  const avgTrend = trendW ? trend / trendW - 1 : 0;
  const hasInactive = customers.some((c) => c.monthlySpend === 0);
  const histSpend = hasInactive
    ? customers.reduce((a, c) => a + c.historicalMonthlySpend * c.weight, 0) / (w || 1)
    : avgSpend;
  const monthlyTrend = MONTHS.map((month, i) => {
    if (hasInactive && avgSpend === 0) {
      // Inactive audiences: spend decays to zero over the window.
      return { month, spend: Math.round(histSpend * Math.max(0, 1 - i / 3)) };
    }
    const start = avgSpend / (1 + avgTrend * 0.5);
    return { month, spend: Math.round(start * (1 + (avgTrend * i) / 5) * (1 + 0.025 * Math.sin(i * 1.7))) };
  });
  return {
    eligibleCustomers: w,
    avgMonthlySpend: avgSpend,
    avgHistoricalMonthlySpend: histSpend,
    avgMonthlyTx: w ? tx / w : 0,
    spendTrend: avgTrend,
    historicalResponse: offers ? parts / offers : 0,
    dataCoverage: w ? cov / w : 0,
    segmentBreakdown: [...seg.entries()]
      .map(([segmentId, n]) => ({ segmentId, customers: n, share: n / (w || 1) }))
      .sort((a, b) => b.customers - a.customers),
    spendDistribution: bands.map(({ band, customers }) => ({ band, customers })),
    monthlyTrend,
  };
}

export { getCustomerShare };
