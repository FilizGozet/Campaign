import type {
  ActivityStatus,
  CampaignStatus,
  Channel,
  CustomerSegment,
  CustomerSegmentId,
  ProductType,
  ReliabilityLevel,
  RewardType,
  SpendBand,
  SpendingCategory,
  TxBand,
} from "./types";

export const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  market: "Market",
  akaryakit: "Akaryakıt",
  restoran: "Restoran & Kafe",
  eticaret: "E-ticaret",
  giyim: "Giyim & Aksesuar",
  seyahat: "Seyahat & Konaklama",
};

export const PRODUCT_LABELS: Record<ProductType, string> = {
  kredi_karti: "Kredi kartı",
  otomatik_odeme: "Otomatik fatura ödeme",
  dijital_cuzdan: "Dijital cüzdan",
  temassiz_odeme: "Temassız ödeme",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  tum: "Tüm kanallar",
  pos: "Fiziki POS",
  eticaret: "İnternet alışverişi",
  mobil: "Mobil ödeme",
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  fixed: "Sabit bonus",
  percentage: "Yüzdesel iade (cashback)",
  capped: "Üst limitli iade",
  tiered: "Kademeli ödül",
};

export const REWARD_TYPE_HINTS: Record<RewardType, string> = {
  fixed: "Koşulu sağlayan her müşteriye aynı tutarda bonus verilir.",
  percentage: "Koşulu sağlayan müşterinin kampanya dönemindeki uygun harcamasının belirli bir yüzdesi iade edilir.",
  capped: "Yüzdesel iade, müşteri başına bir üst limitle sınırlandırılır.",
  tiered: "Harcama arttıkça daha yüksek ödül kademesine geçilir.",
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  taslak: "Taslak",
  simule_edildi: "Simüle edildi",
  karsilastirildi: "Karşılaştırıldı",
  arsivlendi: "Arşivlendi",
};

export const RELIABILITY_LABELS: Record<ReliabilityLevel, string> = {
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

export const SEGMENTS: Record<CustomerSegmentId, CustomerSegment> = {
  yuksek_degerli: {
    id: "yuksek_degerli",
    name: "Yüksek değerli aktif",
    description: "Yüksek ve istikrarlı aylık harcama, sık işlem.",
    color: "#6250d6",
  },
  duzenli: {
    id: "duzenli",
    name: "Düzenli harcayan",
    description: "Orta düzey harcama, düzenli kart kullanımı.",
    color: "#eb6834",
  },
  dusuk_aktivite: {
    id: "dusuk_aktivite",
    name: "Düşük aktiviteli",
    description: "Aktif ancak düşük tutarlı ve seyrek işlem.",
    color: "#1baf7a",
  },
  azalan: {
    id: "azalan",
    name: "Harcaması azalan",
    description: "Son dönemde harcaması belirgin şekilde düşen müşteriler.",
    color: "#eda100",
  },
  pasif: {
    id: "pasif",
    name: "Pasif",
    description: "Son 30 gün veya daha uzun süredir işlem yapmayan müşteriler.",
    color: "#e87ba4",
  },
  hic_kullanmayan: {
    id: "hic_kullanmayan",
    name: "Kartı olup hiç kullanmayan",
    description: "Kartı tanımlı ancak hiç işlem yapmamış müşteriler.",
    color: "#2a78d6",
  },
  aday: {
    id: "aday",
    name: "Potansiyel müşteri",
    description: "Bankanın müşterisi olmayan, dijital kanallarda etkileşimi olan adaylar.",
    color: "#008300",
  },
  yarim_basvuru: {
    id: "yarim_basvuru",
    name: "Başvurusu yarım kalan",
    description: "Başvuru sürecine başlayıp tamamlamayan adaylar.",
    color: "#e34948",
  },
};

export const ACTIVITY_LABELS: Record<ActivityStatus, string> = {
  aktif: "Aktif",
  azalan: "Harcaması azalan",
  pasif: "Pasif (30+ gün işlem yok)",
  hic: "Hiç işlem yapmamış",
};

export const SPEND_BAND_LABELS: Record<SpendBand, string> = {
  dusuk: "Düşük (< 3.000 TL/ay)",
  orta: "Orta (3.000–12.000 TL/ay)",
  yuksek: "Yüksek (> 12.000 TL/ay)",
};

export const TX_BAND_LABELS: Record<TxBand, string> = {
  "1_2": "Ayda 1–2 işlem",
  "3_9": "Ayda 3–9 işlem",
  "10_plus": "Ayda 10+ işlem",
};

/** Glossary of banking terms for contextual tooltips. */
export const GLOSSARY = {
  incremental:
    "Ek ciro: Kampanya olmasaydı gerçekleşmeyecek olan harcama. Doğru ölçümü kontrol grubu veya rastgele deney gerektirir.",
  observed:
    "Gözlenen kampanya harcaması: Koşulu sağlayan müşterilerin kampanya dönemindeki toplam harcaması. Kampanya olmadan da yapılacak harcamayı içerir.",
  qualification: "Ödüle hak kazanma oranı: Uygun müşterilerden kampanya koşulunu sağlaması beklenenlerin oranı.",
  costRatio: "Maliyet / ek ciro oranı: Her 1 TL tahmini ek ciro için katlanılan ödül maliyeti. Düşük olması daha verimlidir.",
  budgetUtilization: "Bütçe kullanımı: Beklenen ödül maliyetinin ayrılan bütçeye oranı.",
  cpa: "Edinim başına maliyet (CPA): Bir dönüşüm için katlanılan ortalama ödül maliyeti.",
  cac: "Müşteri edinim maliyeti (CAC): Yeni kazanılan her müşteri için ortalama ödül maliyeti.",
  shareOfWallet: "Kart kullanım payı: Müşterinin toplam harcamasının bankanın kartıyla yapılan tahmini oranı.",
  reliability:
    "Senaryo güvenilirliği: Veri kapsamı, desteklenen parametre aralıkları ve benzer geçmiş kampanya sayısına göre kural tabanlı bir göstergedir; istatistiksel güven aralığı değildir.",
  sensitivity:
    "Varsayım duyarlılığı: Müşteri tepki varsayımı ±%25 değiştirildiğinde sonucun aldığı değerler. İstatistiksel güven aralığı değildir.",
  dynamicTarget: "Dinamik hedef: Her müşterinin hedefi, kendi geçmiş ortalama harcamasına göre kişiselleştirilir.",
  naturalQualifiers:
    "Kampanyasız da koşulu sağlaması beklenenler: Müşterinin olağan harcama eğiliminin devam ettiği varsayımıyla hesaplanır (karşı-olgusal varsayım).",
} as const;
