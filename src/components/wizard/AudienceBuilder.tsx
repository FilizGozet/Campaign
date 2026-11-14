import { useMemo, useState } from "react";
import { RotateCcw, Users, CheckCircle2 } from "lucide-react";
import type { ActivityStatus, AudienceFilters, AudienceSelection, ProductType, SpendBand, SpendingCategory, TxBand } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/common/Field";
import { InfoTip } from "@/components/common/InfoTip";
import { ACTIVITY_LABELS, CATEGORY_LABELS, GLOSSARY, PRODUCT_LABELS, SPEND_BAND_LABELS, TX_BAND_LABELS } from "@/domain/labels";
import { attributeAvailability, matchesFilters } from "@/data/audiences";
import { getPopulation } from "@/data/population";
import { formatNumber, formatPercent } from "@/lib/format";

function CheckGroup<T extends string>({ options, value, onChange, idPrefix }: { options: Record<T, string>; value: T[] | undefined; onChange: (v: T[]) => void; idPrefix: string }) {
  const v = value ?? [];
  return (
    <div className="space-y-2">
      {(Object.keys(options) as T[]).map((k) => (
        <div key={k} className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-${k}`}
            checked={v.includes(k)}
            onCheckedChange={(c) => onChange(c ? [...v, k] : v.filter((x) => x !== k))}
          />
          <Label htmlFor={`${idPrefix}-${k}`} className="text-[13px] font-normal text-ink-soft">
            {options[k]}
          </Label>
        </div>
      ))}
    </div>
  );
}

const EMPTY: AudienceFilters = {};

export function AudienceBuilder({ current, onApply }: { current: AudienceSelection | null; onApply: (s: AudienceSelection) => void }) {
  const initial = current?.mode === "custom" ? current : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [filters, setFilters] = useState<AudienceFilters>(initial?.filters ?? EMPTY);
  const set = (patch: Partial<AudienceFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const avail = attributeAvailability();

  const count = useMemo(() => getPopulation().reduce((a, c) => (matchesFilters(c, filters) ? a + c.weight : a), 0), [filters]);
  const activeCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v && v !== "any" && v !== "none")).length;
  const applied = current?.mode === "custom" && JSON.stringify(current.filters) === JSON.stringify(filters) && current.name === (name || "Özel kitle");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Yeni kitle oluştur</CardTitle>
          <CardDescription>Davranışsal filtreleri birleştirerek özel bir kitle tanımlayın. Tüm filtreler isteğe bağlıdır.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY)} disabled={!activeCount}>
          <RotateCcw /> Filtreleri temizle
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Harcama davranışı" tooltip="Son 3 aylık ortalama aylık kart harcaması. Pasif müşterilerde pasiflik öncesi ortalama kullanılır.">
            <CheckGroup idPrefix="spend" options={SPEND_BAND_LABELS} value={filters.spendBands} onChange={(v) => set({ spendBands: v as SpendBand[] })} />
          </Field>
          <Field label="İşlem sayısı" tooltip="Aylık ortalama kart işlem adedi.">
            <CheckGroup idPrefix="tx" options={TX_BAND_LABELS} value={filters.txBands} onChange={(v) => set({ txBands: v as TxBand[] })} />
          </Field>
          <Field label="Müşteri aktivitesi">
            <CheckGroup idPrefix="act" options={ACTIVITY_LABELS} value={filters.activity} onChange={(v) => set({ activity: v as ActivityStatus[] })} />
          </Field>
          <Field label="Ürün sahipliği">
            <div className="space-y-2">
              <Select value={filters.ownsProduct ?? "any"} onValueChange={(v) => set({ ownsProduct: v as ProductType | "any" })}>
                <SelectTrigger aria-label="Sahip olduğu ürün">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Sahip olduğu ürün: fark etmez</SelectItem>
                  {(Object.keys(PRODUCT_LABELS) as ProductType[]).map((p) => (
                    <SelectItem key={p} value={p}>Sahip: {PRODUCT_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.doesNotOwnProduct ?? "none"} onValueChange={(v) => set({ doesNotOwnProduct: v as ProductType | "none" })}>
                <SelectTrigger aria-label="Sahip olmadığı ürün">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sahip olmadığı ürün: fark etmez</SelectItem>
                  {(Object.keys(PRODUCT_LABELS) as ProductType[]).map((p) => (
                    <SelectItem key={p} value={p}>Sahip değil: {PRODUCT_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field label="Önceki kampanya katılımı">
            <Select value={filters.pastParticipation ?? "any"} onValueChange={(v) => set({ pastParticipation: v as AudienceFilters["pastParticipation"] })}>
              <SelectTrigger aria-label="Önceki kampanya katılımı">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Fark etmez</SelectItem>
                <SelectItem value="participated">Son 12 ayda katılmış</SelectItem>
                <SelectItem value="never">Son 12 ayda hiç katılmamış</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Kart kullanım davranışı"
            tooltip={GLOSSARY.shareOfWallet}
            hint={`Veri kapsamı: müşterilerin ${formatPercent(avail.cardUsageShare)}'i`}
          >
            <Select value={filters.cardUsage ?? "any"} onValueChange={(v) => set({ cardUsage: v as AudienceFilters["cardUsage"] })}>
              <SelectTrigger aria-label="Kart kullanım davranışı">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Fark etmez</SelectItem>
                <SelectItem value="low">Düşük kullanım payı (&lt; %35)</SelectItem>
                <SelectItem value="high">Yüksek kullanım payı (≥ %60)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Harcama kategorisi" hint={`Veri kapsamı: müşterilerin ${formatPercent(avail.categoryShares)}'i`} tooltip="Seçilen sektörde harcamasının en az %10'unu yapan müşteriler.">
            <Select value={filters.activeInCategory ?? "any"} onValueChange={(v) => set({ activeInCategory: v as SpendingCategory | "any" })}>
              <SelectTrigger aria-label="Harcama kategorisi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Fark etmez</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as SpendingCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]} sektöründe aktif</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Asgari veri kapsamı" tooltip="Kayıtlarında belirtilen orandan az alan dolu olan müşterileri hariç tutar.">
            <Select value={String(filters.minDataCoverage ?? 0)} onValueChange={(v) => set({ minDataCoverage: Number(v) || undefined })}>
              <SelectTrigger aria-label="Asgari veri kapsamı">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sınır yok</SelectItem>
                <SelectItem value="0.66">En az %66</SelectItem>
                <SelectItem value="0.83">En az %83</SelectItem>
                <SelectItem value="1">Tam kapsam</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kitle adı" htmlFor="aud-name">
            <Input id="aud-name" value={name} maxLength={60} placeholder="Örn. Düşük kullanım payı, market aktif" onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-brand-50/60 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="tabular text-lg font-semibold">{formatNumber(count)} müşteri</div>
              <div className="flex items-center gap-1 text-xs text-ink-soft">
                {activeCount} filtre etkin <InfoTip content="Kampanya hedefinin uygunluk kuralları (örn. aktif müşteri şartı) simülasyonda ayrıca uygulanır." />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {applied && (
              <Badge variant="success">
                <CheckCircle2 /> Seçili kitle
              </Badge>
            )}
            <Button disabled={count === 0} onClick={() => onApply({ mode: "custom", name: name.trim() || "Özel kitle", filters })}>
              Bu kitleyi kullan
            </Button>
          </div>
        </div>
        {count === 0 && <p className="text-sm text-danger">Bu filtre kombinasyonuyla eşleşen müşteri yok. Filtreleri gevşetin.</p>}
      </CardContent>
    </Card>
  );
}
