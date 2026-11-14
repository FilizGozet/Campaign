import type { ReactNode } from "react";
import type {
  AcquisitionConditions,
  CampaignConditions,
  CategoryGrowthConditions,
  Channel,
  ProductAdoptionConditions,
  ProductType,
  ReactivationConditions,
  SpendingCategory,
  SpendingGrowthConditions,
  TransactionFrequencyConditions,
} from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field, NumberInput, Segmented } from "@/components/common/Field";
import { CATEGORY_LABELS, CHANNEL_LABELS, GLOSSARY, PRODUCT_LABELS } from "@/domain/labels";
import { getObjective } from "@/domain/objectives";
import type { FieldErrors } from "@/engine/conditions";
import { RewardEditor } from "./RewardEditor";

type Props<T> = { value: T; onChange: (v: T) => void; errors: FieldErrors };

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SimpleSelect<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Record<T, string>; label: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(options) as T[]).map((k) => (
          <SelectItem key={k} value={k}>{options[k]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SharedFields({ value, onChange, errors, maxDuration = 120 }: Props<CampaignConditions> & { maxDuration?: number }) {
  return (
    <Section title="Süre ve bütçe" description="Bütçe aşıldığında kampanyanın kapanacağı varsayılır; sonuçlar bu kısıta göre hesaplanır.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kampanya süresi" error={errors.durationDays} tooltip="Müşterinin koşulu sağlaması için tanınan süre.">
          <NumberInput value={value.durationDays} min={1} max={maxDuration} suffix="gün" onChange={(durationDays) => onChange({ ...value, durationDays })} invalid={!!errors.durationDays} ariaLabel="Kampanya süresi" />
        </Field>
        <Field label="Toplam bütçe" error={errors.budget} tooltip="Kampanya için ayrılan en yüksek ödül maliyeti.">
          <NumberInput value={value.budget} min={0} suffix="TL" onChange={(budget) => onChange({ ...value, budget })} invalid={!!errors.budget} ariaLabel="Toplam bütçe" />
        </Field>
      </div>
    </Section>
  );
}

function RewardSection({ value, onChange, errors, spendLabel }: Props<CampaignConditions> & { spendLabel?: string }) {
  return (
    <Section title="Ödül" description="Yalnızca seçilen ödül mekanizmasına ait alanlar gösterilir.">
      <RewardEditor value={value.reward} allowed={getObjective(value.objective).allowedRewards} onChange={(reward) => onChange({ ...value, reward })} error={errors.reward} spendLabel={spendLabel} />
    </Section>
  );
}

// A — Spending growth -------------------------------------------------------
export function SpendingGrowthForm({ value, onChange, errors }: Props<SpendingGrowthConditions>) {
  return (
    <>
      <Section title="Harcama hedefi" description="Hedef, tüm müşteriler için sabit veya her müşterinin geçmiş ortalamasına göre dinamik olabilir.">
        <Field label="Hedef tipi" tooltip={GLOSSARY.dynamicTarget}>
          <Segmented
            ariaLabel="Hedef tipi"
            value={value.targetType}
            onChange={(targetType) => onChange({ ...value, targetType })}
            options={[
              { value: "dynamic", label: "Dinamik (kişiselleştirilmiş)", description: "Geçmiş ortalamaya göre % artış" },
              { value: "fixed", label: "Sabit tutar", description: "Herkes için aynı hedef" },
            ]}
          />
        </Field>
        {value.targetType === "dynamic" ? (
          <Field label="Geçmiş ortalamaya göre artış" error={errors.increasePct} className="max-w-xs" tooltip="Son 3 aylık ortalama aylık harcamaya göre istenen artış oranı.">
            <NumberInput value={Math.round(value.increasePct * 1000) / 10} decimals={1} min={0} max={200} suffix="%" onChange={(v) => onChange({ ...value, increasePct: v / 100 })} invalid={!!errors.increasePct} ariaLabel="Artış oranı" />
          </Field>
        ) : (
          <Field label="Sabit hedef tutarı (dönem toplamı)" error={errors.fixedTarget} className="max-w-xs">
            <NumberInput value={value.fixedTarget} min={0} suffix="TL" onChange={(fixedTarget) => onChange({ ...value, fixedTarget })} invalid={!!errors.fixedTarget} ariaLabel="Hedef tutarı" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Geçerli sektör" tooltip="Hedefe yalnızca bu sektördeki harcamalar sayılır.">
            <SimpleSelect label="Geçerli sektör" value={value.eligibleCategory} onChange={(eligibleCategory) => onChange({ ...value, eligibleCategory })} options={{ tum: "Tüm sektörler", ...CATEGORY_LABELS } as Record<SpendingCategory | "tum", string>} />
          </Field>
          <Field label="Geçerli kanal">
            <SimpleSelect label="Geçerli kanal" value={value.channel} onChange={(channel: Channel) => onChange({ ...value, channel })} options={CHANNEL_LABELS} />
          </Field>
        </div>
      </Section>
      <RewardSection value={value} onChange={(v) => onChange(v as SpendingGrowthConditions)} errors={errors} />
      <SharedFields value={value} onChange={(v) => onChange(v as SpendingGrowthConditions)} errors={errors} />
    </>
  );
}

// B — Reactivation ----------------------------------------------------------
export function ReactivationForm({ value, onChange, errors }: Props<ReactivationConditions>) {
  return (
    <>
      <Section title="Aktivasyon koşulu" description="Pasif müşterilerin yeniden kart kullanımına dönmesi için gereken aksiyon.">
        <Field label="Pasiflik süresi" tooltip="Bu süreden uzun süredir işlem yapmayan müşteriler kampanyaya uygundur.">
          <Segmented
            ariaLabel="Pasiflik süresi"
            value={value.inactivityDays}
            onChange={(inactivityDays) => onChange({ ...value, inactivityDays })}
            options={[
              { value: 30, label: "30+ gün" },
              { value: 90, label: "90+ gün" },
              { value: 180, label: "180+ gün" },
            ]}
          />
        </Field>
        <Field label="Aktivasyon şartı">
          <Segmented
            ariaLabel="Aktivasyon şartı"
            value={value.activationCondition}
            onChange={(activationCondition) => onChange({ ...value, activationCondition })}
            options={[
              { value: "first_transaction", label: "İlk uygun işlem" },
              { value: "min_total_spend", label: "Minimum toplam harcama" },
              { value: "tx_count", label: "Gerekli işlem sayısı" },
            ]}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {value.activationCondition === "first_transaction" && (
            <Field label="Minimum işlem tutarı" error={errors.minTxAmount}>
              <NumberInput value={value.minTxAmount} min={0} suffix="TL" onChange={(minTxAmount) => onChange({ ...value, minTxAmount })} invalid={!!errors.minTxAmount} ariaLabel="Minimum işlem tutarı" />
            </Field>
          )}
          {value.activationCondition === "min_total_spend" && (
            <Field label="Minimum toplam harcama" error={errors.minTotalSpend}>
              <NumberInput value={value.minTotalSpend} min={0} suffix="TL" onChange={(minTotalSpend) => onChange({ ...value, minTotalSpend })} invalid={!!errors.minTotalSpend} ariaLabel="Minimum toplam harcama" />
            </Field>
          )}
          {value.activationCondition === "tx_count" && (
            <>
              <Field label="Gerekli işlem sayısı" error={errors.requiredTxCount}>
                <NumberInput value={value.requiredTxCount} min={1} max={50} suffix="adet" onChange={(requiredTxCount) => onChange({ ...value, requiredTxCount })} invalid={!!errors.requiredTxCount} ariaLabel="İşlem sayısı" />
              </Field>
              <Field label="İşlem başına minimum tutar">
                <NumberInput value={value.minTxAmount} min={0} suffix="TL" onChange={(minTxAmount) => onChange({ ...value, minTxAmount })} ariaLabel="İşlem başına minimum tutar" />
              </Field>
            </>
          )}
        </div>
        <p className="rounded-lg bg-brand-50/60 p-3 text-xs text-ink-soft">
          Pasif müşteriler için yüzdesel harcama artışı anlamlı değildir; bu nedenle hedef, ilk işlem veya mutlak harcama koşuluyla tanımlanır.
        </p>
      </Section>
      <RewardSection value={value} onChange={(v) => onChange(v as ReactivationConditions)} errors={errors} />
      <SharedFields value={value} onChange={(v) => onChange(v as ReactivationConditions)} errors={errors} maxDuration={90} />
    </>
  );
}

// C — Category growth -------------------------------------------------------
export function CategoryGrowthForm({ value, onChange, errors }: Props<CategoryGrowthConditions>) {
  return (
    <>
      <Section title="Sektör koşulu">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Harcama sektörü">
            <SimpleSelect label="Harcama sektörü" value={value.category} onChange={(category) => onChange({ ...value, category })} options={CATEGORY_LABELS} />
          </Field>
          <Field label="İş yeri kapsamı" tooltip="Kampanyanın geçerli olduğu iş yerleri. Kapsam daraldıkça uygun harcama azalır.">
            <SimpleSelect
              label="İş yeri kapsamı"
              value={value.merchantScope}
              onChange={(merchantScope) => onChange({ ...value, merchantScope })}
              options={{ tum_isyerleri: "Sektördeki tüm iş yerleri", anlasmali_isyerleri: "Anlaşmalı iş yerleri", secili_markalar: "Seçili markalar" }}
            />
          </Field>
        </div>
        <Field label="Harcama koşulu">
          <Segmented
            ariaLabel="Harcama koşulu"
            value={value.spendCondition}
            onChange={(spendCondition) => onChange({ ...value, spendCondition })}
            options={[
              { value: "total_spend", label: "Toplam harcama" },
              { value: "single_transaction", label: "Tek seferde harcama" },
              { value: "tx_count", label: "İşlem sayısı" },
            ]}
          />
        </Field>
        {value.spendCondition === "tx_count" ? (
          <Field label="Gerekli sektör işlem sayısı" error={errors.requiredTxCount} className="max-w-xs">
            <NumberInput value={value.requiredTxCount} min={1} max={50} suffix="adet" onChange={(requiredTxCount) => onChange({ ...value, requiredTxCount })} invalid={!!errors.requiredTxCount} ariaLabel="İşlem sayısı" />
          </Field>
        ) : (
          <Field label={value.spendCondition === "single_transaction" ? "Minimum tek işlem tutarı" : "Minimum sektör harcaması"} error={errors.minCategorySpend} className="max-w-xs">
            <NumberInput value={value.minCategorySpend} min={0} suffix="TL" onChange={(minCategorySpend) => onChange({ ...value, minCategorySpend })} invalid={!!errors.minCategorySpend} ariaLabel="Minimum sektör harcaması" />
          </Field>
        )}
      </Section>
      <RewardSection value={value} onChange={(v) => onChange(v as CategoryGrowthConditions)} errors={errors} spendLabel="Sektör harcaması" />
      <SharedFields value={value} onChange={(v) => onChange(v as CategoryGrowthConditions)} errors={errors} />
    </>
  );
}

// D — Product adoption ------------------------------------------------------
export function ProductAdoptionForm({ value, onChange, errors }: Props<ProductAdoptionConditions>) {
  return (
    <>
      <Section title="Ürün ve aksiyon">
        <Field label="Ürün tipi" className="max-w-sm">
          <SimpleSelect label="Ürün tipi" value={value.product} onChange={(product: ProductType) => onChange({ ...value, product })} options={PRODUCT_LABELS} />
        </Field>
        <Field label="Ödüllendirilecek müşteri aksiyonu" tooltip="Aksiyon zorlaştıkça dönüşüm olasılığı düşer, ancak ilk kullanım oranı artar.">
          <Segmented
            ariaLabel="Müşteri aksiyonu"
            value={value.requiredAction}
            onChange={(requiredAction) => onChange({ ...value, requiredAction })}
            options={[
              { value: "application", label: "Ürün başvurusu" },
              { value: "activation", label: "Ürün aktivasyonu" },
              { value: "first_usage", label: "İlk kullanım" },
              { value: "first_spend", label: "İlk uygun harcama" },
            ]}
          />
        </Field>
        {value.requiredAction === "first_spend" && (
          <Field label="Gerekli harcama tutarı" error={errors.requiredSpend} className="max-w-xs">
            <NumberInput value={value.requiredSpend} min={0} suffix="TL" onChange={(requiredSpend) => onChange({ ...value, requiredSpend })} invalid={!!errors.requiredSpend} ariaLabel="Gerekli harcama" />
          </Field>
        )}
      </Section>
      <RewardSection value={value} onChange={(v) => onChange(v as ProductAdoptionConditions)} errors={errors} />
      <SharedFields value={value} onChange={(v) => onChange(v as ProductAdoptionConditions)} errors={errors} />
    </>
  );
}

// E — Acquisition -----------------------------------------------------------
export function AcquisitionForm({ value, onChange, errors }: Props<AcquisitionConditions>) {
  return (
    <>
      <Section title="Kazanım koşulu">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kazanım tipi">
            <SimpleSelect
              label="Kazanım tipi"
              value={value.acquisitionType}
              onChange={(acquisitionType) => onChange({ ...value, acquisitionType })}
              options={{ dijital_musteri: "Dijital bankacılık müşterisi", kredi_karti_musterisi: "Kredi kartı müşterisi", maas_musterisi: "Maaş müşterisi" }}
            />
          </Field>
          <Field label="Gerekli kayıt / onboarding aksiyonu">
            <SimpleSelect
              label="Onboarding aksiyonu"
              value={value.onboardingAction}
              onChange={(onboardingAction) => onChange({ ...value, onboardingAction })}
              options={{ mobil_kayit: "Mobil uygulamadan müşteri olma", basvuru_onayi: "Başvurunun onaylanması", kart_aktivasyonu: "Kart aktivasyonu" }}
            />
          </Field>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Switch id="first-tx" checked={value.requireFirstTransaction} onCheckedChange={(requireFirstTransaction) => onChange({ ...value, requireFirstTransaction })} />
          <Label htmlFor="first-tx" className="cursor-pointer">
            İlk işlem şartı
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">Ödül için yeni müşterinin ilk kart işlemini yapması gerekir.</span>
          </Label>
        </div>
        {value.requireFirstTransaction && (
          <Field label="Minimum ilk işlem tutarı" error={errors.minFirstTxAmount} className="max-w-xs">
            <NumberInput value={value.minFirstTxAmount} min={0} suffix="TL" onChange={(minFirstTxAmount) => onChange({ ...value, minFirstTxAmount })} invalid={!!errors.minFirstTxAmount} ariaLabel="Minimum ilk işlem tutarı" />
          </Field>
        )}
      </Section>
      <Section title="Hoş geldin ödülü">
        <RewardEditor value={value.reward} allowed={getObjective("acquisition").allowedRewards} onChange={(reward) => onChange({ ...value, reward })} error={errors.reward} />
      </Section>
      <SharedFields value={value} onChange={(v) => onChange(v as AcquisitionConditions)} errors={errors} />
    </>
  );
}

// F — Transaction frequency -------------------------------------------------
export function TransactionFrequencyForm({ value, onChange, errors }: Props<TransactionFrequencyConditions>) {
  return (
    <>
      <Section title="İşlem sıklığı koşulu">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gerekli işlem sayısı" error={errors.requiredTxCount}>
            <NumberInput value={value.requiredTxCount} min={1} max={60} suffix="adet" onChange={(requiredTxCount) => onChange({ ...value, requiredTxCount })} invalid={!!errors.requiredTxCount} ariaLabel="İşlem sayısı" />
          </Field>
          <Field label="İşlem başına minimum tutar" error={errors.minTxAmount} tooltip="Bu tutarın altındaki işlemler sayılmaz.">
            <NumberInput value={value.minTxAmount} min={0} suffix="TL" onChange={(minTxAmount) => onChange({ ...value, minTxAmount })} invalid={!!errors.minTxAmount} ariaLabel="Minimum işlem tutarı" />
          </Field>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Switch id="diff-days" checked={value.differentDays} onCheckedChange={(differentDays) => onChange({ ...value, differentDays })} />
          <Label htmlFor="diff-days" className="cursor-pointer">
            Farklı günlerde işlem şartı
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">Aynı gün yapılan birden fazla işlem tek işlem sayılır.</span>
          </Label>
        </div>
      </Section>
      <RewardSection value={value} onChange={(v) => onChange(v as TransactionFrequencyConditions)} errors={errors} />
      <SharedFields value={value} onChange={(v) => onChange(v as TransactionFrequencyConditions)} errors={errors} />
    </>
  );
}

export function ConditionsForm({ value, onChange, errors }: Props<CampaignConditions>) {
  switch (value.objective) {
    case "spending_growth":
      return <SpendingGrowthForm value={value} onChange={onChange} errors={errors} />;
    case "reactivation":
      return <ReactivationForm value={value} onChange={onChange} errors={errors} />;
    case "category_growth":
      return <CategoryGrowthForm value={value} onChange={onChange} errors={errors} />;
    case "product_adoption":
      return <ProductAdoptionForm value={value} onChange={onChange} errors={errors} />;
    case "acquisition":
      return <AcquisitionForm value={value} onChange={onChange} errors={errors} />;
    case "transaction_frequency":
      return <TransactionFrequencyForm value={value} onChange={onChange} errors={errors} />;
  }
}
