import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  maxReached,
  canVisit,
  onSelect,
}: {
  steps: readonly string[];
  current: number;
  maxReached: number;
  canVisit: (i: number) => boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <nav aria-label="Kampanya adımları" className="rounded-2xl border border-border/70 bg-white p-2 shadow-card">
      <ol className="flex items-stretch overflow-x-auto scrollbar-thin">
        {steps.map((label, i) => {
          const done = i < current || (i <= maxReached && i !== current && i < maxReached);
          const active = i === current;
          const enabled = canVisit(i);
          return (
            <li key={label} className="flex min-w-[150px] flex-1 items-center">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  active && "bg-brand-50",
                  enabled && !active && "hover:bg-brand-50/50",
                  !enabled && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all",
                    active && "bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-4 ring-brand-100",
                    done && !active && "bg-brand-100 text-brand-700",
                    !done && !active && "border border-border bg-white text-ink-soft",
                  )}
                >
                  {done && !active ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[10.5px] font-semibold uppercase tracking-wide", active ? "text-brand-600" : "text-ink-soft/70")}>
                    Adım {i + 1}
                  </span>
                  <span className={cn("block truncate text-[13px] font-medium", active ? "text-ink" : done ? "text-ink" : "text-ink-soft")}>{label}</span>
                </span>
              </button>
              {i < steps.length - 1 && <span className={cn("mx-1 hidden h-px w-6 shrink-0 md:block", i < current ? "bg-brand-300" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
