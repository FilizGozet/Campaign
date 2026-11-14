import { Database, FlaskConical, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type DataSource = "observed" | "demo" | "ml";

const META: Record<DataSource, { label: string; tip: string; variant: "info" | "warning" | "default"; Icon: typeof Database }> = {
  observed: {
    label: "Gözlenen geçmiş veri (sentetik örnek)",
    tip: "Tamamlanmış kampanyalarda ölçülen sonuçlar. Bu prototipte gerçek müşteri verisi yerine sentetik örnekler kullanılmaktadır.",
    variant: "info",
    Icon: Database,
  },
  demo: {
    label: "Demo simülasyonu",
    tip: "Sentetik veri üzerinde çalışan, belgelenmiş kural tabanlı hesaplama. Eğitilmiş bir makine öğrenmesi tahmini değildir ve finansal karar için doğrulanmamıştır.",
    variant: "warning",
    Icon: FlaskConical,
  },
  ml: {
    label: "ML tahmini (planlanan)",
    tip: "Gelecekte gerçek geçmiş verilerle eğitilecek model tahminleri. Bu sürümde etkin değildir.",
    variant: "default",
    Icon: Sparkles,
  },
};

export function DataSourceBadge({ source, short }: { source: DataSource; short?: boolean }) {
  const m = META[source];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex focus-visible:outline-none">
          <Badge variant={m.variant}>
            <m.Icon /> {short ? m.label.split(" (")[0] : m.label}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.tip}</TooltipContent>
    </Tooltip>
  );
}
