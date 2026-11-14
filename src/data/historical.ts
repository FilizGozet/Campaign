import type { CampaignActuals, CampaignObjective, CustomerSegmentId } from "@/domain/types";

/**
 * Synthetic completed campaigns with predicted vs. actual outcomes.
 * DEMO DATA — no real bank campaigns or customers are represented.
 */

type M = CampaignActuals["metrics"][number];
const qr = (p: number, a: number): M => ({ key: "qualificationRate", label: "Hak kazanma oranı", format: "percent", predicted: p, actual: a });
const cost = (p: number, a: number): M => ({ key: "totalCost", label: "Kampanya maliyeti", format: "currency", predicted: p, actual: a });
const conv = (p: number, a: number): M => ({ key: "conversions", label: "Dönüşüm / hak kazanan", format: "number", predicted: p, actual: a });
const obs = (p: number, a: number): M => ({ key: "observedSpending", label: "Gözlenen harcama", format: "currency", predicted: p, actual: a });
const inc = (p: number, a: number | null): M => ({ key: "incrementalSpending", label: "Ek ciro (kontrol grubuna göre)", format: "currency", predicted: p, actual: a });

const seg = (segmentId: CustomerSegmentId, predictedRate: number, actualRate: number, customers: number) => ({
  segmentId,
  predictedRate,
  actualRate,
  customers,
});

export const HISTORICAL_CAMPAIGNS: CampaignActuals[] = [
  {
    id: "h-2026-01",
    name: "Bahar Harcama Artışı",
    objective: "spending_growth",
    period: "Mart 2026",
    endDate: "2026-03-31",
    audienceName: "Düzenli harcama yapan müşteriler",
    eligibleCustomers: 318_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.2",
    metrics: [qr(0.31, 0.284), cost(19_700_000, 18_600_000), conv(98_600, 90_300), obs(1_240_000_000, 1_171_000_000), inc(176_000_000, 142_000_000)],
    segments: [seg("yuksek_degerli", 0.27, 0.25, 92_000), seg("duzenli", 0.33, 0.3, 226_000)],
  },
  {
    id: "h-2026-02",
    name: "Azalan Harcama Geri Kazanım",
    objective: "spending_growth",
    period: "Mayıs 2026",
    endDate: "2026-05-31",
    audienceName: "Harcaması son dönemde azalan müşteriler",
    eligibleCustomers: 164_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.2",
    metrics: [qr(0.22, 0.246), cost(5_400_000, 5_850_000), conv(36_100, 40_300), obs(298_000_000, 327_000_000), inc(52_000_000, 61_500_000)],
    segments: [seg("azalan", 0.2, 0.235, 120_000), seg("duzenli", 0.27, 0.28, 44_000)],
  },
  {
    id: "h-2026-03",
    name: "Kış Pasif Müşteri Aktivasyonu",
    objective: "reactivation",
    period: "Şubat 2026",
    endDate: "2026-02-28",
    audienceName: "Son 90 gündür harcama yapmayanlar",
    eligibleCustomers: 142_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.2",
    metrics: [qr(0.118, 0.094), cost(1_670_000, 1_410_000), conv(16_700, 13_350), obs(14_800_000, 11_900_000), inc(9_600_000, 7_100_000)],
    segments: [seg("pasif", 0.118, 0.094, 142_000)],
  },
  {
    id: "h-2026-04",
    name: "İlk Kart Kullanımı",
    objective: "reactivation",
    period: "Nisan 2026",
    endDate: "2026-04-30",
    audienceName: "Kartı olup hiç harcama yapmamış müşteriler",
    eligibleCustomers: 118_000,
    hadControlGroup: false,
    modelVersion: "demo-sim 0.2",
    metrics: [qr(0.052, 0.061), cost(615_000, 690_000), conv(6_150, 7_200), obs(4_100_000, 4_650_000), inc(4_100_000, null)],
    segments: [seg("hic_kullanmayan", 0.052, 0.061, 118_000)],
  },
  {
    id: "h-2026-05",
    name: "Akaryakıt Yaz Kampanyası",
    objective: "category_growth",
    period: "Temmuz 2026",
    endDate: "2026-07-31",
    audienceName: "Seçilen sektörde düzenli harcama yapanlar (Akaryakıt)",
    eligibleCustomers: 205_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.3",
    metrics: [qr(0.38, 0.352), cost(11_700_000, 11_150_000), conv(77_900, 72_150), obs(412_000_000, 389_000_000), inc(58_000_000, 49_000_000)],
    segments: [seg("yuksek_degerli", 0.45, 0.41, 64_000), seg("duzenli", 0.36, 0.34, 118_000), seg("azalan", 0.27, 0.26, 23_000)],
  },
  {
    id: "h-2026-06",
    name: "Market Çapraz Satış",
    objective: "category_growth",
    period: "Ağustos 2026",
    endDate: "2026-08-31",
    audienceName: "Diğer sektörlerde aktif olup seçilen sektörde pasif olanlar (Market)",
    eligibleCustomers: 61_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.3",
    metrics: [qr(0.09, 0.071), cost(824_000, 700_000), conv(5_490, 4_330), obs(17_600_000, 13_900_000), inc(11_400_000, 8_200_000)],
    segments: [seg("yuksek_degerli", 0.11, 0.085, 21_000), seg("duzenli", 0.08, 0.064, 40_000)],
  },
  {
    id: "h-2026-07",
    name: "Kredi Kartı İlk Harcama",
    objective: "product_adoption",
    period: "Haziran 2026",
    endDate: "2026-06-30",
    audienceName: "Ürüne sahip olmayan uygun müşteriler (Kredi kartı)",
    eligibleCustomers: 96_000,
    hadControlGroup: false,
    modelVersion: "demo-sim 0.3",
    metrics: [qr(0.064, 0.058), cost(1_840_000, 1_720_000), conv(6_140, 5_570), obs(15_400_000, 13_700_000), inc(7_700_000, null)],
    segments: [seg("duzenli", 0.071, 0.066, 52_000), seg("dusuk_aktivite", 0.049, 0.041, 31_000), seg("azalan", 0.06, 0.058, 13_000)],
  },
  {
    id: "h-2026-08",
    name: "Otomatik Ödeme Talimatı",
    objective: "product_adoption",
    period: "Eylül 2026",
    endDate: "2026-09-30",
    audienceName: "Ürüne ilgi gösterme olasılığı yüksek müşteriler (Otomatik fatura ödeme)",
    eligibleCustomers: 132_000,
    hadControlGroup: false,
    modelVersion: "demo-sim 0.3",
    metrics: [qr(0.112, 0.127), cost(1_480_000, 1_610_000), conv(14_800, 16_760), obs(0, 0), inc(0, null)],
    segments: [seg("duzenli", 0.12, 0.138, 78_000), seg("yuksek_degerli", 0.1, 0.112, 54_000)],
  },
  {
    id: "h-2026-09",
    name: "Dijital Hoş Geldin",
    objective: "acquisition",
    period: "Mayıs–Haziran 2026",
    endDate: "2026-06-30",
    audienceName: "Başvurusunu tamamlamayanlar",
    eligibleCustomers: 108_000,
    hadControlGroup: false,
    modelVersion: "demo-sim 0.2",
    metrics: [qr(0.094, 0.081), cost(2_540_000, 2_290_000), conv(10_150, 8_750), obs(18_200_000, 15_100_000), inc(18_200_000, null)],
    segments: [seg("yarim_basvuru", 0.094, 0.081, 108_000)],
  },
  {
    id: "h-2026-10",
    name: "5 İşleme 150 TL",
    objective: "transaction_frequency",
    period: "Ekim 2026",
    endDate: "2026-10-31",
    audienceName: "Ayda 1–2 işlem yapanlar",
    eligibleCustomers: 174_000,
    hadControlGroup: true,
    modelVersion: "demo-sim 0.3",
    metrics: [qr(0.142, 0.151), cost(3_700_000, 3_850_000), conv(24_700, 26_270), obs(81_000_000, 84_500_000), inc(14_200_000, 12_900_000)],
    segments: [seg("dusuk_aktivite", 0.135, 0.146, 139_000), seg("azalan", 0.17, 0.171, 35_000)],
  },
];

export function comparableCampaignCount(objective: CampaignObjective): number {
  return HISTORICAL_CAMPAIGNS.filter((c) => c.objective === objective).length;
}

export function hasControlGroupHistory(objective: CampaignObjective): boolean {
  return HISTORICAL_CAMPAIGNS.some((c) => c.objective === objective && c.hadControlGroup);
}

/** Relative forecast error: (actual − predicted) / predicted. */
export function forecastError(predicted: number, actual: number | null): number | null {
  if (actual === null || predicted === 0) return null;
  return (actual - predicted) / predicted;
}

// ---------------------------------------------------------------------------
// Model performance (demo)
// ---------------------------------------------------------------------------

export const MODEL_INFO = {
  currentVersion: "demo-sim 0.3",
  engine: "Kural tabanlı sentetik simülasyon motoru (makine öğrenmesi modeli değildir)",
  lastCalibration: "2026-10-15",
  trainingWindow: "Sentetik veri — 12 ay",
  nextVersion: "ml-forecast 1.0 (planlanan, FastAPI servisi)",
};

export const OBJECTIVE_SUPPORT: { objective: CampaignObjective; status: "destekleniyor" | "sinirli" | "deneysel"; campaigns: number; note: string }[] = [
  { objective: "spending_growth", status: "destekleniyor", campaigns: 2, note: "Kontrol gruplu geçmiş kampanya mevcut." },
  { objective: "reactivation", status: "destekleniyor", campaigns: 2, note: "Hiç kullanmamış kitlede kontrol grubu yok." },
  { objective: "category_growth", status: "destekleniyor", campaigns: 2, note: "Akaryakıt ve market sektörlerinde veri var." },
  { objective: "product_adoption", status: "sinirli", campaigns: 2, note: "Kontrol grubu yok; ek ciro doğrulanamaz." },
  { objective: "acquisition", status: "deneysel", campaigns: 1, note: "Aday verisi kısıtlı; harcama potansiyeli tahmini." },
  { objective: "transaction_frequency", status: "sinirli", campaigns: 1, note: "Tek kampanya gözlemi mevcut." },
];

export const DATA_QUALITY = [
  { label: "İşlem verisi tamlığı", value: 0.99, threshold: 0.95, description: "Kart işlem kayıtlarının eksiksizlik oranı." },
  { label: "Sektör (MCC) eşleşmesi", value: 0.9, threshold: 0.9, description: "İşlemlerin sektör koduyla eşleşme oranı." },
  { label: "Kart kullanım payı tahmini", value: 0.82, threshold: 0.85, description: "Cüzdan payı tahmini bulunan müşteri oranı." },
  { label: "Kampanya katılım geçmişi", value: 0.96, threshold: 0.9, description: "Son 12 ay teklif/katılım kaydı tamlığı." },
  { label: "Kontrol grubu kapsamı", value: 0.6, threshold: 0.75, description: "Geçmiş kampanyalardan kontrol grubu içerenlerin oranı." },
  { label: "Aday müşteri verisi", value: 0.58, threshold: 0.7, description: "Aday kayıtlarında harcama potansiyeli alanı doluluğu." },
];
