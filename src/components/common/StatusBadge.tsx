import type { CampaignStatus } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/domain/labels";

const VARIANT: Record<CampaignStatus, "muted" | "default" | "success" | "outline"> = {
  taslak: "muted",
  simule_edildi: "default",
  karsilastirildi: "success",
  arsivlendi: "outline",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant={VARIANT[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
