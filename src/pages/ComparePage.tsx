import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { ComparisonView, scenarioLetter } from "@/components/comparison/ComparisonView";
import { ScenarioPicker } from "@/components/comparison/ScenarioPicker";
import { useScenarioStore } from "@/store/scenarioStore";
import { downloadText, markCompared } from "@/services/campaignActions";
import { comparisonMetricsFor } from "@/engine/insights";
import { displayMetric } from "@/components/results/metricDisplay";
import { describeConditions } from "@/engine/conditions";
import { toast } from "sonner";

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const scenarios = useScenarioStore((s) => s.scenarios);
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const selected = useMemo(() => ids.map((id) => scenarios.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s), [ids.join(","), scenarios]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pickerOpen, setPickerOpen] = useState(selected.length < 2);
  const setIds = (next: string[]) => setParams(next.length ? { ids: next.join(",") } : {}, { replace: true });

  useEffect(() => {
    if (selected.length >= 2) markCompared(selected);
  }, [selected]);

  const exportCsv = () => {
    const metrics = comparisonMetricsFor(selected);
    const header = ["Metrik", ...selected.map((s, i) => `${scenarioLetter(i)} - ${s.name}`)];
    const rows = [
      ["Kurgu", ...selected.map((s) => describeConditions(s.conditions))],
      ...metrics.map((m) => [m.label, ...selected.map((s) => { const v = displayMetric(s.result, m); return `${v.unvalidated ? "~" : ""}${v.text}`; })]),
    ];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadText("senaryo-karsilastirma.csv", "﻿" + csv + "\n\"Not: Demo simülasyon değerleridir.\"", "text/csv");
    toast.success("Karşılaştırma CSV olarak indirildi");
  };

  return (
    <div>
      <PageHeader
        title="Senaryo Karşılaştırması"
        description="Seçili senaryoların metrik farklarını, bütçe kullanımını ve segment düzeyindeki farklarını inceleyin."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/senaryolar")}>Kütüphaneye dön</Button>
            <Button variant="outline" disabled={selected.length < 2} onClick={exportCsv}><Download /> CSV indir</Button>
          </>
        }
      />
      <Card className="mb-6">
        <CardHeader className="cursor-pointer flex-row items-center justify-between space-y-0" onClick={() => setPickerOpen((o) => !o)}>
          <CardTitle>Senaryo seçimi ({selected.length})</CardTitle>
          <Button variant="ghost" size="sm" aria-expanded={pickerOpen}>{pickerOpen ? <><ChevronUp /> Gizle</> : <><ChevronDown /> Değiştir</>}</Button>
        </CardHeader>
        {pickerOpen && (
          <CardContent>
            <ScenarioPicker scenarios={scenarios} selected={selected.map((s) => s.id)} onChange={setIds} preferObjective={selected[0]?.objective ?? null} />
          </CardContent>
        )}
      </Card>
      {selected.length < 2 ? (
        <EmptyState icon={<GitCompare className="h-6 w-6" />} title="En az iki senaryo seçin" description="Karşılaştırma için yukarıdaki listeden 2–4 senaryo işaretleyin." />
      ) : (
        <ComparisonView scenarios={selected} onRemove={(id) => setIds(selected.map((s) => s.id).filter((x) => x !== id))} />
      )}
    </div>
  );
}
