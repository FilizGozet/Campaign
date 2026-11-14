import type { TooltipProps } from "recharts";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Shared tooltip shell: text uses ink tokens, colour swatch carries identity. */
export function TooltipCard({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-[180px] rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-lift">
      {title && <div className="mb-1.5 font-semibold text-ink">{title}</div>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-soft">
              {r.color && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className="tabular font-medium text-ink">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function makeTooltip(format: (v: number, name: string) => string) {
  return function RechartsTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
      <TooltipCard
        title={String(payload[0]?.payload?.tooltipTitle ?? label ?? "")}
        rows={payload.map((p) => ({
          label: String(p.name),
          value: format(Number(p.value), String(p.name)),
          color: (p.color as string) || (p.payload?.fill as string),
        }))}
      />
    );
  };
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
