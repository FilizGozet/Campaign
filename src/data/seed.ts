import type { Campaign, CampaignConditions, CampaignObjective, Scenario } from "@/domain/types";
import { defaultConditions } from "@/domain/objectives";
import { makeSeedScenario } from "@/services/scenarioFactory";

/**
 * Example campaigns and scenarios covering all six objectives (synthetic).
 * Generated deterministically on first load and then persisted locally.
 */

const OWNER = "Deniz Arslan";

function cond<O extends CampaignObjective>(o: O, patch: Partial<CampaignConditions> = {}): CampaignConditions {
  return { ...defaultConditions(o), ...patch } as CampaignConditions;
}

export function buildSeed(): { campaigns: Campaign[]; scenarios: Scenario[] } {
  const campaigns: Campaign[] = [];
  const scenarios: Scenario[] = [];

  const add = (
    c: Omit<Campaign, "scenarioIds" | "owner" | "updatedAt"> & { updatedAt?: string },
    scen: { name: string; patch: Partial<CampaignConditions>; note?: string; audienceId?: string }[],
  ) => {
    const ids: string[] = [];
    scen.forEach((s, i) => {
      const audience = s.audienceId ? { mode: "existing" as const, audienceId: s.audienceId } : c.audience!;
      const at = new Date(new Date(c.createdAt).getTime() + (i + 1) * 3600_000).toISOString();
      const sc = makeSeedScenario(
        s.name,
        { objective: c.objective, audience, conditions: cond(c.objective, s.patch) },
        at,
        c.id,
        s.note,
      );
      ids.push(sc.id);
      scenarios.push(sc);
    });
    campaigns.push({ ...c, owner: OWNER, updatedAt: c.updatedAt ?? c.createdAt, scenarioIds: ids });
  };

  add(
    {
      id: "kmp-yilsonu",
      name: "Yılsonu Harcama Artışı",
      category: "Kredi Kartı",
      objective: "spending_growth",
      status: "karsilastirildi",
      createdAt: "2026-11-03T09:20:00.000Z",
      audience: { mode: "existing", audienceId: "sg_regular" },
      conditions: cond("spending_growth"),
    },
    [
      { name: "Senaryo A — %20 hedef, 200 TL", patch: { increasePct: 0.2, reward: { type: "fixed", amount: 200 } }, note: "Geçmiş kampanyaya en yakın kurgu." },
      { name: "Senaryo B — %25 hedef, 150 TL", patch: { increasePct: 0.25, reward: { type: "fixed", amount: 150 } } },
      { name: "Senaryo C — Kademeli ödül", patch: { targetType: "dynamic", increasePct: 0.15, reward: { type: "tiered", tiers: [{ minSpend: 8000, reward: 100 }, { minSpend: 12000, reward: 200 }, { minSpend: 20000, reward: 400 }] } } as Partial<CampaignConditions> },
    ],
  );
  add(
    {
      id: "kmp-geri-donus",
      name: "Pasif Müşteri Geri Dönüş",
      category: "Banka Kartı",
      objective: "reactivation",
      status: "simule_edildi",
      createdAt: "2026-10-28T13:05:00.000Z",
      audience: { mode: "existing", audienceId: "re_90" },
      conditions: cond("reactivation"),
    },
    [
      { name: "İlk işlem 500 TL / 100 TL bonus", patch: {} },
      { name: "İlk işlem 250 TL / 75 TL bonus", patch: { minTxAmount: 250, reward: { type: "fixed", amount: 75 } } },
    ],
  );
  add(
    {
      id: "kmp-akaryakit",
      name: "Akaryakıt Kış Kampanyası",
      category: "Sektörel",
      objective: "category_growth",
      status: "simule_edildi",
      createdAt: "2026-11-06T08:40:00.000Z",
      audience: { mode: "existing", audienceId: "cg_regular" },
      conditions: cond("category_growth"),
    },
    [
      { name: "3.000 TL'ye 150 TL", patch: {} },
      { name: "%5 iade, en fazla 200 TL", patch: { reward: { type: "capped", rate: 0.05, cap: 200 } } },
    ],
  );
  add(
    {
      id: "kmp-kk-aktivasyon",
      name: "Yeni Kart İlk Harcama",
      category: "Kredi Kartı",
      objective: "product_adoption",
      status: "taslak",
      createdAt: "2026-11-10T10:15:00.000Z",
      audience: { mode: "existing", audienceId: "pa_non_owner" },
      conditions: cond("product_adoption"),
    },
    [{ name: "Aktivasyon + 2.000 TL → 300 TL", patch: {} }],
  );
  add(
    {
      id: "kmp-hosgeldin",
      name: "Dijital Hoş Geldin",
      category: "Dijital Bankacılık",
      objective: "acquisition",
      status: "taslak",
      createdAt: "2026-11-12T15:30:00.000Z",
      audience: { mode: "existing", audienceId: "ac_incomplete" },
      conditions: cond("acquisition"),
    },
    [],
  );
  add(
    {
      id: "kmp-5islem",
      name: "Farklı Günlerde 5 İşlem",
      category: "Banka Kartı",
      objective: "transaction_frequency",
      status: "karsilastirildi",
      createdAt: "2026-10-20T11:00:00.000Z",
      audience: { mode: "existing", audienceId: "tf_declining" },
      conditions: cond("transaction_frequency"),
    },
    [
      { name: "5 işlem / 150 TL", patch: {} },
      { name: "4 işlem / 100 TL", patch: { requiredTxCount: 4, reward: { type: "fixed", amount: 100 } } },
      { name: "6 işlem / 200 TL", patch: { requiredTxCount: 6, reward: { type: "fixed", amount: 200 } } },
    ],
  );
  add(
    {
      id: "kmp-yaz-arsiv",
      name: "Yaz Seyahat Harcaması",
      category: "Sektörel",
      objective: "category_growth",
      status: "arsivlendi",
      createdAt: "2026-06-02T09:00:00.000Z",
      audience: { mode: "existing", audienceId: "cg_light" },
      conditions: cond("category_growth", { category: "seyahat", minCategorySpend: 5000, reward: { type: "fixed", amount: 250 } }),
    },
    [{ name: "Seyahat 5.000 TL / 250 TL", patch: { category: "seyahat", minCategorySpend: 5000, reward: { type: "fixed", amount: 250 } } }],
  );
  return { campaigns, scenarios };
}
