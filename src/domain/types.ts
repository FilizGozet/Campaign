/**
 * Campaign Intelligence Studio — domain model.
 *
 * The primary prediction-data concept is the customer–campaign pair: every
 * eligible customer in an audience is paired with the campaign conditions and
 * the engine estimates qualification / response for that pair. Pair-level
 * estimates are then aggregated to segment and campaign level.
 */

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export type CampaignObjective =
  | "spending_growth"
  | "reactivation"
  | "category_growth"
  | "product_adoption"
  | "acquisition"
  | "transaction_frequency";

export const OBJECTIVES: CampaignObjective[] = [
  "spending_growth",
  "reactivation",
  "category_growth",
  "product_adoption",
  "acquisition",
  "transaction_frequency",
];

export type SpendingCategory =
  | "market"
  | "akaryakit"
  | "restoran"
  | "eticaret"
  | "giyim"
  | "seyahat";

export type ProductType = "kredi_karti" | "otomatik_odeme" | "dijital_cuzdan" | "temassiz_odeme";

export type Channel = "tum" | "pos" | "eticaret" | "mobil";

// ---------------------------------------------------------------------------
// Customers & segments (synthetic)
// ---------------------------------------------------------------------------

export type CustomerSegmentId =
  | "yuksek_degerli"
  | "duzenli"
  | "dusuk_aktivite"
  | "azalan"
  | "pasif"
  | "hic_kullanmayan"
  | "aday"
  | "yarim_basvuru";

export interface CustomerSegment {
  id: CustomerSegmentId;
  name: string;
  description: string;
  color: string;
}

/** A synthetic customer (or prospect). Represents `weight` real-world customers. */
export interface Customer {
  id: string;
  type: "customer" | "prospect";
  segmentId: CustomerSegmentId;
  /** Number of real customers this synthetic record represents. */
  weight: number;
  /** Average monthly card spending over the last 3 months (TL). */
  monthlySpend: number;
  /** Average monthly spending before inactivity, for inactive customers (TL). */
  historicalMonthlySpend: number;
  /** Ratio of last month spend to the 3-month average (1 = flat). */
  spendTrend: number;
  /** Average monthly transaction count. */
  monthlyTx: number;
  /** Days since the last card transaction (999 = never). */
  daysSinceLastTx: number;
  /** Share of each category in total spending (sums ~1). Null = not available. */
  categoryShares: Record<SpendingCategory, number> | null;
  products: ProductType[];
  /** Products owned but not used in the last 90 days. */
  dormantProducts: ProductType[];
  /** Previously received an offer for these products without converting. */
  offeredNotConverted: ProductType[];
  /** Estimated share of wallet captured by our card (0–1). Null = unknown. */
  cardUsageShare: number | null;
  /** Campaigns offered / joined in the last 12 months. */
  pastOffers: number;
  pastParticipations: number;
  /** Synthetic propensity (0–1) to respond to an incentive. */
  responseScore: number;
  /** Synthetic propensity (0–1) to adopt a new product. */
  productPropensity: number;
  /** Share of this customer's attributes that are populated (0–1). */
  dataCoverage: number;
  /** Customer has a card but never used it. */
  neverUsedCard: boolean;
  /** Prospect started but did not finish an application. */
  incompleteApplication: boolean;
}

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------

export type ActivityStatus = "aktif" | "azalan" | "pasif" | "hic";
export type SpendBand = "dusuk" | "orta" | "yuksek";
export type TxBand = "1_2" | "3_9" | "10_plus";

/** Filters for the custom audience builder. All are optional. */
export interface AudienceFilters {
  spendBands?: SpendBand[];
  txBands?: TxBand[];
  activity?: ActivityStatus[];
  ownsProduct?: ProductType | "any";
  doesNotOwnProduct?: ProductType | "none";
  pastParticipation?: "any" | "participated" | "never";
  cardUsage?: "any" | "low" | "high";
  activeInCategory?: SpendingCategory | "any";
  minDataCoverage?: number;
}

export interface AudienceDefinition {
  id: string;
  objective: CampaignObjective;
  name: string;
  description: string;
  /** Pure predicate over the synthetic population. */
  predicate: (c: Customer, ctx: AudienceContext) => boolean;
  /** Whether the audience depends on the selected category / product. */
  dependsOn?: "category" | "product";
  tags?: string[];
}

export interface AudienceContext {
  category: SpendingCategory;
  product: ProductType;
}

/** Serializable audience selection stored inside scenarios. */
export type AudienceSelection =
  | { mode: "existing"; audienceId: string }
  | { mode: "custom"; name: string; filters: AudienceFilters };

export interface Audience {
  key: string;
  name: string;
  description: string;
  customers: Customer[];
}

export interface AudienceStats {
  eligibleCustomers: number;
  avgMonthlySpend: number;
  /** Average monthly spend before inactivity (equals avgMonthlySpend for active audiences). */
  avgHistoricalMonthlySpend: number;
  avgMonthlyTx: number;
  /** Weighted mean of spendTrend - 1 (e.g. -0.08 = 8% decline). */
  spendTrend: number;
  /** Historical campaign participation rate (participations / offers). */
  historicalResponse: number;
  dataCoverage: number;
  segmentBreakdown: { segmentId: CustomerSegmentId; customers: number; share: number }[];
  spendDistribution: { band: string; customers: number }[];
  monthlyTrend: { month: string; spend: number }[];
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export interface RewardTier {
  /** Minimum qualifying spending in the campaign period (TL). */
  minSpend: number;
  reward: number;
}

export type RewardMechanism =
  | { type: "fixed"; amount: number }
  | { type: "percentage"; rate: number }
  | { type: "capped"; rate: number; cap: number }
  | { type: "tiered"; tiers: RewardTier[] };

export type RewardType = RewardMechanism["type"];

// ---------------------------------------------------------------------------
// Campaign conditions (discriminated by objective)
// ---------------------------------------------------------------------------

interface BaseConditions {
  reward: RewardMechanism;
  durationDays: number;
  budget: number;
}

export interface SpendingGrowthConditions extends BaseConditions {
  objective: "spending_growth";
  targetType: "fixed" | "dynamic";
  fixedTarget: number;
  /** Percentage increase over the customer's historical average (0.2 = 20%). */
  increasePct: number;
  eligibleCategory: SpendingCategory | "tum";
  channel: Channel;
}

export interface ReactivationConditions extends BaseConditions {
  objective: "reactivation";
  inactivityDays: 30 | 90 | 180;
  activationCondition: "first_transaction" | "min_total_spend" | "tx_count";
  minTxAmount: number;
  minTotalSpend: number;
  requiredTxCount: number;
}

export interface CategoryGrowthConditions extends BaseConditions {
  objective: "category_growth";
  category: SpendingCategory;
  merchantScope: "tum_isyerleri" | "anlasmali_isyerleri" | "secili_markalar";
  spendCondition: "single_transaction" | "total_spend" | "tx_count";
  minCategorySpend: number;
  requiredTxCount: number;
}

export interface ProductAdoptionConditions extends BaseConditions {
  objective: "product_adoption";
  product: ProductType;
  requiredAction: "application" | "activation" | "first_usage" | "first_spend";
  requiredSpend: number;
}

export interface AcquisitionConditions extends BaseConditions {
  objective: "acquisition";
  acquisitionType: "dijital_musteri" | "kredi_karti_musterisi" | "maas_musterisi";
  onboardingAction: "mobil_kayit" | "basvuru_onayi" | "kart_aktivasyonu";
  requireFirstTransaction: boolean;
  minFirstTxAmount: number;
}

export interface TransactionFrequencyConditions extends BaseConditions {
  objective: "transaction_frequency";
  requiredTxCount: number;
  minTxAmount: number;
  differentDays: boolean;
}

export type CampaignConditions =
  | SpendingGrowthConditions
  | ReactivationConditions
  | CategoryGrowthConditions
  | ProductAdoptionConditions
  | AcquisitionConditions
  | TransactionFrequencyConditions;

export type ConditionsFor<O extends CampaignObjective> = Extract<CampaignConditions, { objective: O }>;

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export type MetricKey =
  | "qualifiedCustomers"
  | "qualificationRate"
  | "incrementalSpending"
  | "observedSpending"
  | "totalCost"
  | "costToIncrementalRatio"
  | "costPerQualified"
  | "subsequentSpending"
  | "categorySpending"
  | "firstUseRate"
  | "incrementalTransactions"
  | "costPerIncrementalTransaction"
  | "transactionVolume"
  | "budgetUtilization";

export type MetricFormat = "number" | "currency" | "percent" | "ratio";

export interface SegmentPrediction {
  segmentId: CustomerSegmentId;
  eligibleCustomers: number;
  /** Customers who would qualify without the campaign (counterfactual assumption). */
  naturalQualifiers: number;
  qualifiedCustomers: number;
  qualificationRate: number;
  observedSpending: number;
  incrementalSpending: number;
  incrementalTransactions: number;
  totalCost: number;
  dataCoverage: number;
}

export type ReliabilityLevel = "yuksek" | "orta" | "dusuk";

export interface ReliabilityInfo {
  level: ReliabilityLevel;
  dataCoverage: number;
  withinSupportedRange: boolean;
  /** Number of comparable historical campaigns with observed outcomes. */
  comparableCampaigns: number;
  notes: string[];
  /**
   * Assumption sensitivity: qualified customers when the response assumption
   * is varied ±25%. This is NOT a statistical confidence interval.
   */
  sensitivity: { low: number; high: number };
}

export interface SimulationResult {
  /** Deterministic hash of the inputs — identical inputs produce identical hashes. */
  inputHash: string;
  engineVersion: string;
  source: "demo" | "ml";
  objective: CampaignObjective;
  /** Customers in the selected audience before campaign eligibility rules. */
  audienceSize: number;
  eligibleCustomers: number;
  naturalQualifiers: number;
  /** Qualified (rewarded) customers after budget constraints. */
  qualifiedCustomers: number;
  /** Qualified customers if the budget were unlimited. */
  unconstrainedQualified: number;
  qualificationRate: number;
  observedSpending: number;
  incrementalSpending: number;
  /** True only when the incremental estimate rests on a justified counterfactual. */
  incrementalValidated: boolean;
  incrementalTransactions: number;
  transactionVolume: number;
  subsequentSpending: number;
  firstUseRate: number;
  totalCost: number;
  budget: number;
  budgetUtilization: number;
  budgetCapped: boolean;
  costPerQualified: number;
  costToIncrementalRatio: number;
  costPerIncrementalTransaction: number;
  categorySpending: number;
  segments: SegmentPrediction[];
  reliability: ReliabilityInfo;
}

export interface SimulationRequest {
  objective: CampaignObjective;
  audience: AudienceSelection;
  conditions: CampaignConditions;
}

// ---------------------------------------------------------------------------
// Scenarios & campaigns
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  name: string;
  campaignId?: string;
  objective: CampaignObjective;
  audience: AudienceSelection;
  conditions: CampaignConditions;
  /** Snapshot of the result at save time (results are reproducible). */
  result: SimulationResult;
  createdAt: string;
  updatedAt: string;
  source: "wizard" | "studio" | "seed";
  note?: string;
}

export type CampaignStatus = "taslak" | "simule_edildi" | "karsilastirildi" | "arsivlendi";

export interface Campaign {
  id: string;
  name: string;
  category: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  owner: string;
  audience: AudienceSelection | null;
  conditions: CampaignConditions | null;
  scenarioIds: string[];
}

// ---------------------------------------------------------------------------
// Historical actuals & model performance
// ---------------------------------------------------------------------------

export interface MetricActual {
  key: "qualificationRate" | "totalCost" | "conversions" | "observedSpending" | "incrementalSpending";
  label: string;
  format: MetricFormat;
  predicted: number;
  actual: number | null;
}

export interface SegmentActual {
  segmentId: CustomerSegmentId;
  predictedRate: number;
  actualRate: number;
  customers: number;
}

export interface CampaignActuals {
  id: string;
  name: string;
  objective: CampaignObjective;
  period: string;
  endDate: string;
  audienceName: string;
  eligibleCustomers: number;
  hadControlGroup: boolean;
  modelVersion: string;
  metrics: MetricActual[];
  segments: SegmentActual[];
}
