import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { Insight } from "@/engine/insights";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TONE = {
  positive: { Icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  warning: { Icon: AlertTriangle, cls: "text-amber-700 bg-amber-50" },
  neutral: { Icon: Lightbulb, cls: "text-brand-600 bg-brand-50" },
  info: { Icon: Info, cls: "text-sky-600 bg-sky-50" },
} as const;

export function InsightList({ insights, empty = "Bu senaryo için öne çıkan bir bulgu yok.", dense }: { insights: Insight[]; empty?: string; dense?: boolean }) {
  if (!insights.length) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className={cn("space-y-3", dense && "space-y-2")}>
      {insights.map((i) => {
        const t = TONE[i.tone];
        return (
          <li key={i.id} className="flex gap-3">
            <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", t.cls)}>
              <t.Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-ink">{i.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{i.detail}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="mt-1 text-[11px] font-medium text-brand-600 hover:underline">Kural</button>
                </TooltipTrigger>
                <TooltipContent>{i.rule}</TooltipContent>
              </Tooltip>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
