import { useEffect, useId, useState, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { InfoTip } from "./InfoTip";
import { cn } from "@/lib/utils";
import { formatNumber, parseTrNumber } from "@/lib/format";

export function Field({
  label,
  tooltip,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  tooltip?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {tooltip && <InfoTip content={tooltip} />}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Numeric input with Turkish thousands formatting and a unit suffix.
 * Commits on blur / Enter so typing is never interrupted by re-formatting.
 */
export function NumberInput({
  value,
  onChange,
  suffix,
  min,
  max,
  decimals = 0,
  id,
  invalid,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  decimals?: number;
  id?: string;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const autoId = useId();
  const [text, setText] = useState(formatNumber(value, decimals));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(Number.isFinite(value) ? formatNumber(value, decimals) : "");
  }, [value, decimals, focused]);

  const commit = () => {
    let n = parseTrNumber(text);
    if (!Number.isFinite(n)) n = 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onChange(decimals ? Number(n.toFixed(decimals)) : Math.round(n));
    setText(formatNumber(n, decimals));
  };

  return (
    <div className={cn("relative", className)}>
      <input
        id={id ?? autoId}
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          "tabular flex h-9 w-full rounded-lg border border-input bg-white px-3 text-sm text-ink shadow-sm focus-visible:border-brand-400 focus-visible:shadow-ring focus-visible:outline-none",
          suffix && "pr-12",
          invalid && "border-danger",
        )}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-soft">{suffix}</span>}
    </div>
  );
}

/** Pill-style single choice control (accessible radiogroup). */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-[13px]",
              active ? "border-brand-500 bg-brand-50 font-medium text-brand-700 shadow-sm" : "border-border bg-white text-ink-soft hover:border-brand-200 hover:text-ink",
            )}
          >
            {o.label}
            {o.description && <span className="mt-0.5 block text-[11px] font-normal text-ink-soft">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
