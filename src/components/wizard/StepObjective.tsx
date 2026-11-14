import { Check, Target } from "lucide-react";
import type { CampaignObjective } from "@/domain/types";
import { OBJECTIVES } from "@/domain/types";
import { getObjective } from "@/domain/objectives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { ObjectiveIcon } from "@/components/common/ObjectiveIcon";
import { InfoTip } from "@/components/common/InfoTip";
import { useWizardStore } from "@/store/wizardStore";
import { comparableCampaignCount } from "@/data/historical";
import { cn } from "@/lib/utils";

export const CAMPAIGN_CATEGORIES = ["Kredi Kartı", "Banka Kartı", "Sektörel", "Dijital Bankacılık", "Ürün", "Genel"];

function ObjectiveCard({ objective, selected, onSelect }: { objective: CampaignObjective; selected: boolean; onSelect: () => void }) {
  const def = getObjective(objective);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border bg-white p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        selected ? "border-brand-500 shadow-lift ring-4 ring-brand-100" : "border-border/80 shadow-card hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            selected ? "bg-gradient-to-br from-brand-600 to-brand-400 text-white" : "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
          )}
        >
          <ObjectiveIcon objective={objective} className="h-5 w-5" />
        </div>
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white",
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
        </span>
      </div>
      <div className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-brand-600">Hedef {def.code}</div>
      <h3 className="mt-1 text-[15px] font-semibold leading-snug text-ink">{def.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{def.description}</p>
    </button>
  );
}

export function StepObjective() {
  const { objective, name, category, setObjective, setMeta } = useWizardStore();
  const def = objective ? getObjective(objective) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div role="radiogroup" aria-label="Kampanya hedefi" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {OBJECTIVES.map((o) => (
            <ObjectiveCard key={o} objective={o} selected={objective === o} onSelect={() => setObjective(o)} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Kampanya bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Kampanya adı (isteğe bağlı)" htmlFor="campaign-name" hint="Boş bırakılırsa hedefe göre otomatik ad verilir.">
              <Input id="campaign-name" value={name} maxLength={80} placeholder="Örn. Yılsonu Harcama Artışı" onChange={(e) => setMeta({ name: e.target.value })} />
            </Field>
            <Field label="Kategori (isteğe bağlı)">
              <Select value={category || undefined} onValueChange={(v) => setMeta({ category: v })}>
                <SelectTrigger aria-label="Kategori">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#2A2458] to-[#1E1B38] p-5 text-white">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
              <Target className="h-3.5 w-3.5" /> Bağlamsal özet
            </div>
            <div className="mt-2 text-[15px] font-semibold leading-snug">{def ? def.title : "Henüz hedef seçilmedi"}</div>
            {def && <p className="mt-1.5 text-xs leading-relaxed text-white/70">Örnek kurgu: “{def.example}”</p>}
          </div>
          <CardContent className="space-y-5 pt-5">
            {def ? (
              <>
                <div>
                  <div className="mb-2 text-xs font-semibold text-ink">Bu hedef için ana göstergeler</div>
                  <ul className="space-y-2">
                    {def.primaryKpis.map((k) => (
                      <li key={k.key} className="flex items-center justify-between gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-[13px]">
                        <span className="text-ink">{k.label}</span>
                        <InfoTip content={k.tooltip} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold text-ink">Yanıt aranan sorular</div>
                  <ul className="space-y-1.5 text-[13px] text-ink-soft">
                    {def.focusQuestions.map((q) => (
                      <li key={q} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400" /> {q}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border p-3 text-xs text-ink-soft">
                  Bu hedef için <span className="font-semibold text-ink">{comparableCampaignCount(def.id)}</span> tamamlanmış benzer kampanya (sentetik) bulunuyor. Sonraki adımlardaki kitle seçenekleri, koşullar ve göstergeler bu hedefe göre uyarlanır.
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Kampanya hedefini seçtiğinizde ilgili hedef kitleler, kampanya koşulları ve tahmin göstergeleri burada özetlenir.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
