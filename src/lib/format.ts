import type { MetricFormat } from "@/domain/types";

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat("tr-TR", opts);
const int = nf({ maximumFractionDigits: 0 });
const dec1 = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec2 = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatNumber(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return digits === 0 ? int.format(Math.round(v)) : nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function formatCurrency(v: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(v)) return "—";
  if (opts.compact) return `${formatCompact(v)} TL`;
  return `${int.format(Math.round(v))} TL`;
}

/** Compact Turkish notation: bin, Mn (milyon), Mr (milyar). */
export function formatCompact(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `${dec2.format(v / 1e9)} Mr`;
  if (a >= 1e6) return `${dec1.format(v / 1e6)} Mn`;
  if (a >= 1e4) return `${dec1.format(v / 1e3)} bin`;
  return int.format(Math.round(v));
}

export function formatPercent(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  const body = nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(v) * 100);
  return v < 0 && body.replace(/[0,]/g, "") !== "" ? `−%${body}` : `%${body}`;
}

export function formatRatio(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "—";
  return dec2.format(v);
}

export function formatMetric(v: number, format: MetricFormat, compact = false): string {
  switch (format) {
    case "currency":
      return formatCurrency(v, { compact });
    case "percent":
      return formatPercent(v, v < 0.1 ? 1 : 0);
    case "ratio":
      return formatRatio(v);
    default:
      return compact && Math.abs(v) >= 1e6 ? formatCompact(v) : formatNumber(v);
  }
}

export function formatSignedPercent(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  const s = formatPercent(Math.abs(v), digits);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Parses Turkish-formatted numeric input ("12.500,5" → 12500.5). */
export function parseTrNumber(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
