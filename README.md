# Campaign Intelligence Studio

Bankacılık kampanyaları için **simülasyon ve karar destek platformu** (prototip).
Kampanya yöneticileri; hedef, hedef kitle, ödül, harcama koşulu ve bütçe kombinasyonlarını gerçek kampanyaya çıkmadan önce simüle eder, senaryoları karşılaştırır ve geçmiş tahminlerin isabetini izler.

> **“Bu kampanya koşullarını değiştirirsem beklenen sonuçlar nasıl değişir?”**

> ⚠️ **Önemli:** Tüm veriler sentetiktir. Tahminler, belgelenmiş kural tabanlı bir **demo simülasyon motoru** tarafından üretilir; eğitilmiş bir makine öğrenmesi modeli değildir ve finansal karar için doğrulanmamıştır. Platform kampanya yayınlamaz ve karar vermez.

---

## Kurulum

Gereksinim: Node.js 18+ (20/22 önerilir).

```bash
npm install
```

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır. Backend, API anahtarı veya harici servis gerekmez.

Diğer komutlar:

| Komut | Açıklama |
|---|---|
| `npm run build` | Tip kontrolü + üretim derlemesi (`dist/`) |
| `npm run preview` | Üretim derlemesini yerelde sunar |
| `npm test` | Hesaplama motoru birim testleri (Vitest) |
| `npm run typecheck` | Yalnızca TypeScript tip kontrolü |

---

## Özellikler

| Sayfa | İçerik |
|---|---|
| **Dashboard** | Kampanya hattı, son kampanyalar ve senaryolar, veri katmanları açıklaması |
| **Yeni Kampanya** | 5 adımlı sihirbaz: Hedef → Hedef Kitle → Kampanya Koşulları → Tahmin Sonuçları → Senaryo Karşılaştırması |
| **Kampanyalarım** | Arama, hedef/durum filtresi, sıralama, detay, kopyalama, taslak düzenleme, arşivleme, silme |
| **Simülasyon Stüdyosu** | Kaydırıcılarla anlık ne-olursa analizi, duyarlılık eğrisi, anlık görüntüler, karşılaştırma özeti, dışa aktarma |
| **Senaryo Kütüphanesi** | Kayıtlı senaryo kartları, açma, kopyalama, silme (onaylı), 2–4 senaryo karşılaştırma |
| **Gerçekleşen Sonuçlar** | Tahmin–gerçekleşme karşılaştırması, tahmin hatası, segment farkları, kontrol grubu durumu |
| **Model Performansı** | Hata eğilimi, segment düzeyinde sapma, model sürümü, veri kapsamı, desteklenen hedefler, veri kalitesi |
| **Ayarlar** | Profil, servis gecikmesi simülasyonu, demo verisini sıfırlama |

**Altı kampanya hedefi** ayrı iş akışlarına sahiptir; seçilen hedef, kitle seçeneklerini, koşul alanlarını ve gösterilen KPI'ları belirler:

| Hedef | Örnek koşul | Ana göstergeler |
|---|---|---|
| A — Harcama artışı | Son 3 ay ortalamasını %20 artırana 200 TL | Hak kazanma oranı, hak kazanan, ek ciro, maliyet, maliyet/ek ciro |
| B — Yeniden aktivasyon | 90+ gün pasif, 30 günde ≥500 TL ilk işlem → 100 TL | Aktifleşen müşteri, aktivasyon oranı, müşteri başı maliyet, sonraki harcama |
| C — Sektörel harcama | Akaryakıtta 30 günde 3.000 TL → 150 TL | Sektör harcaması, ek sektör harcaması, hak kazanan, maliyet |
| D — Ürün kullanımı | Kartı aktive edip ilk 2.000 TL → 300 TL | Dönüşüm, dönüşüm oranı, CPA, ilk kullanım oranı |
| E — Müşteri kazanımı | Yeni müşteri + ilk işlem → 250 TL | Kazanılan müşteri, kazanım oranı, CAC, bütçe kullanımı |
| F — İşlem sıklığı | Farklı günlerde 5 işlem → 150 TL | Ek işlem, hak kazanma oranı, ek işlem başı maliyet, işlem hacmi |

Ödül mekanizmaları: **sabit bonus**, **yüzdesel iade**, **üst limitli iade**, **kademeli ödül** — yalnızca seçilen mekanizmanın alanları gösterilir.

---

## Mimari

```
src/
├── domain/          # Tipler (CampaignObjective, Scenario, SimulationResult…), etiketler, hedef tanımları
├── data/            # Sentetik popülasyon (seed'li), kitle tanımları, geçmiş kampanyalar, model performansı
├── engine/          # Saf, test edilebilir hesaplama motoru (React'tan bağımsız)
│   ├── math.ts          # Lognormal/Poisson kuyrukları, normal CDF
│   ├── pairModels.ts    # Müşteri–kampanya çifti modelleri (6 hedef)
│   ├── rewards.ts       # Ödül maliyeti kuralları (sabit/yüzde/limitli/kademeli)
│   ├── targets.ts       # Kişiselleştirilmiş hedef hesabı
│   ├── simulate.ts      # Toplama, bütçe kısıtı, segment kırılımı
│   ├── reliability.ts   # Desteklenen aralıklar, güvenilirlik göstergesi
│   ├── insights.ts      # Kural tabanlı içgörüler, optimizasyon sıralaması
│   ├── sweep.ts         # Ne-olursa eğrileri için parametre taraması
│   └── engine.test.ts   # Birim testleri
├── services/
│   ├── prediction/      # PredictionService arayüzü + Demo/ML uygulamaları
│   ├── scenarioFactory.ts
│   └── campaignActions.ts
├── store/           # Zustand + LocalStorage (sihirbaz, senaryolar, kampanyalar, bildirimler, ayarlar)
├── hooks/           # useSimulation, useAudienceStats (servis çağrıları, yükleme/hata durumu)
├── components/      # ui (shadcn tarzı), layout, common, wizard, results, comparison, charts
└── pages/           # Rota sayfaları (lazy-loaded)
```

### Tahmin servisi soyutlaması

Arayüz yalnızca `PredictionService` ile konuşur:

```ts
interface PredictionService {
  simulate(request: SimulationRequest, signal?: AbortSignal): Promise<SimulationResult>;
  simulateMany(requests: SimulationRequest[], signal?: AbortSignal): Promise<SimulationResult[]>;
  audienceStats(audience: AudienceSelection, conditions: CampaignConditions | null): Promise<AudienceStats>;
}
```

- `DemoPredictionService` — tarayıcıda deterministik sentetik motoru çalıştırır (varsayılan).
- `MLPredictionService` — Python/FastAPI arka ucu için hazır istemci. `.env.local` içine şunu ekleyerek etkinleşir:

  ```
  VITE_PREDICTION_API_URL=http://localhost:8000
  ```

  Beklenen uç noktalar: `POST /v1/simulate`, `POST /v1/simulate/batch`, `POST /v1/audience/stats` (gövde ve yanıt şekilleri `src/domain/types.ts` içindeki tiplerle aynıdır). Bileşenlerde değişiklik gerekmez.

---

## Demo hesaplama motoru

Temel veri kavramı **müşteri–kampanya çiftidir**. Sentetik popülasyondaki her uygun müşteri, kampanya koşullarıyla eşleştirilir; çift düzeyindeki tahminler segment ve kampanya düzeyine toplanır.

Her çift için:

```
pDoğal   = müşterinin kampanya olmadan koşulu sağlama olasılığı
           (son dönem davranışının sürdüğü varsayımıyla; lognormal harcama / Poisson işlem kuyrukları)
etki     = erişim × tepki skoru × ödül çekiciliği × ulaşılabilirlik × süre faktörü   (0–0,85 ile sınırlı)
pHakKaz  = pDoğal + (1 − pDoğal) × etki
```

Tutarlılık kuralları (testlerle güvence altında):

- **Zor koşul → düşük hak kazanma.** Eşik yükseldikçe hem `pDoğal` hem ulaşılabilirlik düşer.
- **Sabit ödül maliyeti = hak kazanan × ödül.** Yüzdesel, limitli (`E[min(oran × harcama, limit)]`) ve kademeli ödüller kendi beklenen maliyet formülleriyle hesaplanır.
- **Bütçe kısıtı:** Beklenen maliyet bütçeyi aşarsa kampanyanın bütçe dolunca kapanacağı varsayılır; tüm sonuçlar `bütçe / maliyet` oranında ölçeklenir. Bu nedenle sabit bütçede ödül artışı hak kazanan sayısını *azaltabilir*.
- **Tutarlı toplamlar:** KPI kartları, grafikler ve tablolar aynı segment toplamlarından türetilir.
- **Deterministik:** Aynı girdiler her zaman aynı sonucu ve aynı `inputHash` değerini üretir.

### Analitik sınırlamalar

- Ödül çekiciliği ile katılım arasındaki ilişki bir **model varsayımıdır**; kanıtlanmış nedensel etki değildir.
- **Gözlenen kampanya harcaması** (koşulu sağlayanların toplam harcaması) ile **ek ciro** (kampanya olmasaydı gerçekleşmeyecek harcama) ayrı gösterilir. Kampanyasız da hak kazanacak müşterilerin ek cirosu sıfır kabul edilir.
- Ek ciro tahmini, yalnızca kontrol gruplu geçmiş kampanyası olan hedeflerde, yeterli veri kapsamı ve desteklenen parametre aralığında “doğrulanmış” sayılır. Aksi hâlde arayüzde **“Ek ciro tahmini doğrulanmadı”** uyarısı gösterilir ve değer `~` ile işaretlenir.
- Güvenilirlik göstergesi (Yüksek/Orta/Düşük) veri kapsamı, desteklenen aralıklar ve benzer kampanya sayısına dayanan kural tabanlı bir göstergedir. **Varsayım duyarlılığı** (tepki varsayımı ±%25) gösterilir; **istatistiksel güven aralığı üretilmez**.
- Senaryolar yalnızca kullanıcı açık bir optimizasyon hedefi ve kısıt seçtiğinde sıralanır; hiçbir senaryo otomatik olarak “en iyi” ilan edilmez.
- İçgörüler hesaplanan değerlerden açık kurallarla üretilir (her içgörünün “Kural” açıklaması görülebilir); dil modeli kullanılmaz.

Arayüz üç veri katmanını rozetlerle ayırır: **Gözlenen geçmiş veri** · **Demo simülasyonu** · **ML tahmini (planlanan)**.

---

## Sentetik veri

- 4.800 müşteri kaydı (her biri 250 müşteriyi temsil eder → 1,2 milyon) ve 1.200 aday kaydı (her biri 300 adayı temsil eder), sabit tohumla (`20261114`) üretilir.
- Davranışsal segmentler: yüksek değerli aktif, düzenli harcayan, düşük aktiviteli, harcaması azalan, pasif, kartı olup hiç kullanmayan, potansiyel müşteri, başvurusu yarım kalan.
- Öznitelikler: aylık harcama, eğilim, işlem sıklığı, son işlemden bu yana gün, sektör payları, ürün sahipliği/atıl ürün, kampanya katılım geçmişi, kart kullanım payı, veri kapsamı. Bazı öznitelikler kasıtlı olarak eksiktir (veri bulunabilirliği). **Demografik veri kullanılmaz; gerçek kişisel veri yoktur.**
- 10 tamamlanmış sentetik kampanya (tahmin vs. gerçekleşen) ve 7 örnek kampanya / 13 senaryo (6 hedefin tamamı) ilk açılışta yüklenir.

Kampanyalar, senaryolar ve sihirbaz durumu tarayıcının LocalStorage alanında saklanır. **Ayarlar → Demo verisini sıfırla** ile başlangıç durumuna dönülebilir.

---

## Teknoloji

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui tarzı Radix bileşenleri · Lucide · Recharts · React Router · Zustand · Sonner · Vitest
