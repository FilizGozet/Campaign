import type { ReactNode } from "react";
import type { SimulationResult } from "@/domain/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/common/InfoTip";
import { GLOSSARY } from "@/domain/labels";
import { resultInsights } from "@/engine/insights";
import { KpiGrid } from "./KpiGrid";
import { ReliabilityCard } from "./ReliabilityCard";
import { BudgetCard } from "./BudgetCard";
import { InsightList } from "./InsightList";
import { CostDonut, SegmentQualificationChart, SpendingSplit } from "./SegmentCharts";
import { SegmentTable } from "./SegmentTable";

export function ResultsDashboard({ result, summary }: { result: SimulationResult; summary?: ReactNode }) {
  const insights = resultInsights(result);
  const showSpend = result.objective !== "acquisition";
  return (
    <div className="space-y-6">
      <KpiGrid result={result} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Segment bazında beklenen hak kazanım <InfoTip content={GLOSSARY.naturalQualifiers} />
            </CardTitle>
            <CardDescription>Kampanyasız da koşulu sağlaması beklenenler ile kampanyayla ilişkilendirilen ek hak kazananlar ayrıştırılmıştır.</CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentQualificationChart result={result} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Maliyetin segment dağılımı</CardTitle>
            <CardDescription>Beklenen ödül maliyeti</CardDescription>
          </CardHeader>
          <CardContent>
            <CostDonut result={result} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <BudgetCard result={result} />
        {showSpend && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                Harcama ayrıştırması <InfoTip content={GLOSSARY.incremental} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpendingSplit result={result} />
            </CardContent>
          </Card>
        )}
        <ReliabilityCard result={result} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Segment düzeyinde sonuçlar</CardTitle>
            <CardDescription>Tablo ve grafiklerdeki toplamlar segment değerlerinin toplamıdır.</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <SegmentTable result={result} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          {summary}
          <Card>
            <CardHeader>
              <CardTitle>Kural tabanlı içgörüler</CardTitle>
              <CardDescription>Hesaplanan değerlerden açık kurallarla üretilmiştir.</CardDescription>
            </CardHeader>
            <CardContent>
              <InsightList insights={insights} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
