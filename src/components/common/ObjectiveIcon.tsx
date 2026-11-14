import { PackagePlus, Repeat, RotateCcw, ShoppingBasket, TrendingUp, UserPlus } from "lucide-react";
import type { CampaignObjective } from "@/domain/types";
import { getObjective } from "@/domain/objectives";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS = { TrendingUp, RotateCcw, ShoppingBasket, PackagePlus, UserPlus, Repeat };

export function ObjectiveIcon({ objective, className }: { objective: CampaignObjective; className?: string }) {
  const Icon = ICONS[getObjective(objective).icon];
  return <Icon className={className} />;
}

export function ObjectiveBadge({ objective, className }: { objective: CampaignObjective; className?: string }) {
  return (
    <Badge variant="default" className={cn("gap-1", className)}>
      <ObjectiveIcon objective={objective} /> {getObjective(objective).shortName}
    </Badge>
  );
}

export function ObjectiveTile({ objective, className }: { objective: CampaignObjective; className?: string }) {
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600", className)}>
      <ObjectiveIcon objective={objective} className="h-5 w-5" />
    </div>
  );
}
