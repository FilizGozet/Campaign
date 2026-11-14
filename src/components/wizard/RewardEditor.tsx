import { Plus, Trash2 } from "lucide-react";
import type { RewardMechanism, RewardType } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Field, NumberInput, Segmented } from "@/components/common/Field";
import { REWARD_TYPE_HINTS, REWARD_TYPE_LABELS } from "@/domain/labels";
import { defaultReward } from "@/engine/conditions";

export function RewardEditor({
  value,
  onChange,
  allowed,
  error,
  spendLabel = "Dönem harcaması",
}: {
  value: RewardMechanism;
  onChange: (r: RewardMechanism) => void;
  allowed: RewardType[];
  error?: string;
  spendLabel?: string;
}) {
  return (
    <div className="space-y-4">
      <Field label="Ödül mekanizması" tooltip={REWARD_TYPE_HINTS[value.type]}>
        <Segmented
          ariaLabel="Ödül mekanizması"
          value={value.type}
          onChange={(t) => onChange(defaultReward(t, value))}
          options={allowed.map((t) => ({ value: t, label: REWARD_TYPE_LABELS[t] }))}
        />
      </Field>
      {value.type === "fixed" && (
        <Field label="Bonus tutarı" tooltip="Koşulu sağlayan her müşteriye verilecek sabit bonus." className="max-w-xs">
          <NumberInput value={value.amount} min={0} max={100000} suffix="TL" onChange={(amount) => onChange({ ...value, amount })} ariaLabel="Bonus tutarı" />
        </Field>
      )}
      {value.type === "percentage" && (
        <Field label="İade oranı" tooltip="Kampanya kapsamındaki harcamanın iade edilecek yüzdesi. Üst limit olmadığı için maliyet harcamayla doğrusal artar." className="max-w-xs">
          <NumberInput value={value.rate * 100} decimals={1} min={0} max={50} suffix="%" onChange={(v) => onChange({ ...value, rate: v / 100 })} ariaLabel="İade oranı" />
        </Field>
      )}
      {value.type === "capped" && (
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <Field label="İade oranı">
            <NumberInput value={value.rate * 100} decimals={1} min={0} max={50} suffix="%" onChange={(v) => onChange({ ...value, rate: v / 100 })} ariaLabel="İade oranı" />
          </Field>
          <Field label="Müşteri başı üst limit" tooltip="Bir müşterinin kazanabileceği en yüksek iade tutarı.">
            <NumberInput value={value.cap} min={0} max={100000} suffix="TL" onChange={(cap) => onChange({ ...value, cap })} ariaLabel="Üst limit" />
          </Field>
        </div>
      )}
      {value.type === "tiered" && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-[12px] font-medium text-ink-soft">
            <span>{spendLabel} eşiği</span>
            <span>Ödül</span>
            <span />
          </div>
          {value.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2">
              <NumberInput
                value={t.minSpend}
                min={0}
                suffix="TL"
                ariaLabel={`Kademe ${i + 1} eşiği`}
                onChange={(minSpend) => onChange({ ...value, tiers: value.tiers.map((x, j) => (j === i ? { ...x, minSpend } : x)) })}
              />
              <NumberInput
                value={t.reward}
                min={0}
                suffix="TL"
                ariaLabel={`Kademe ${i + 1} ödülü`}
                onChange={(reward) => onChange({ ...value, tiers: value.tiers.map((x, j) => (j === i ? { ...x, reward } : x)) })}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Kademe ${i + 1}'i sil`}
                disabled={value.tiers.length <= 2}
                onClick={() => onChange({ ...value, tiers: value.tiers.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={value.tiers.length >= 5}
            onClick={() => {
              const last = value.tiers.at(-1) ?? { minSpend: 1000, reward: 50 };
              onChange({ ...value, tiers: [...value.tiers, { minSpend: Math.round(last.minSpend * 1.6), reward: Math.round(last.reward * 1.6) }] });
            }}
          >
            <Plus /> Kademe ekle
          </Button>
          <p className="text-xs text-ink-soft">Müşteri, ulaştığı en yüksek kademenin ödülünü alır. En fazla 5 kademe.</p>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
