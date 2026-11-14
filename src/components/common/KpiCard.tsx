import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InfoTip } from "./InfoTip";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  tooltip,
  icon,
  highlight,
  warning,
  className,
  footer,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tooltip?: ReactNode;
  icon?: ReactNode;
  highlight?: boolean;
  warning?: string;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-4 transition-shadow hover:shadow-lift", highlight && "border-brand-200 bg-gradient-to-br from-white to-brand-50/60", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft">
          <span className="line-clamp-2">{label}</span>
          {tooltip && <InfoTip content={tooltip} />}
        </div>
        {icon && <div className="text-brand-500 [&_svg]:h-4 [&_svg]:w-4">{icon}</div>}
      </div>
      <div className="tabular mt-2 text-[24px] font-semibold leading-tight tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-soft">{sub}</div>}
      {warning && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="h-3 w-3" /> {warning}
        </div>
      )}
      {footer}
    </Card>
  );
}
