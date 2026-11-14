import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, Copy, FlaskConical, GitCompare, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ObjectiveBadge } from "@/components/common/ObjectiveIcon";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiGrid } from "@/components/results/KpiGrid";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { useCampaignStore } from "@/store/campaignStore";
import { useScenarioStore, MAX_COMPARE } from "@/store/scenarioStore";
import { describeConditions, keyConditionChips } from "@/engine/conditions";
import { selectionLabel } from "@/data/audiences";
import { getObjective } from "@/domain/objectives";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { useCampaignActions } from "./CampaignsPage";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const campaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === id));
  const allScenarios = useScenarioStore((s) => s.scenarios);
  const scenarios = useMemo(() => allScenarios.filter((s) => s.campaignId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [allScenarios, id]);
  const actions = useCampaignActions();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!campaign) {
    return (
      <EmptyState
        title="Kampanya bulunamadı"
        description="Bu kampanya silinmiş veya bağlantı hatalı olabilir."
        action={<Button asChild><Link to="/kampanyalar">Kampanyalarım'a dön</Link></Button>}
      />
    );
  }
  const latest = scenarios.at(-1);
  const def = getObjective(campaign.objective);
  const toggle = (sid: string) => setSelected((s) => (s.includes(sid) ? s.filter((x) => x !== sid) : s.length < MAX_COMPARE ? [...s, sid] : s));

  return (
    <div>
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <ObjectiveBadge objective={campaign.objective} />
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-ink-soft">{campaign.category} · {campaign.owner}</span>
          </div>
        }
        title={campaign.name}
        description={`Oluşturulma: ${formatDate(campaign.createdAt)} · Son güncelleme: ${formatDateTime(campaign.updatedAt)}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 /> Sil</Button>
            <Button variant="outline" onClick={() => actions.toggleArchive(campaign)}>
              {campaign.status === "arsivlendi" ? <><ArchiveRestore /> Arşivden çıkar</> : <><Archive /> Arşivle</>}
            </Button>
            <Button variant="outline" onClick={() => { const c = actions.duplicate(campaign); if (c) navigate(`/kampanyalar/${c.id}`); }}><Copy /> Kopyala</Button>
            <Button onClick={() => actions.edit(campaign)} disabled={campaign.status === "arsivlendi"}><PencilLine /> {campaign.status === "taslak" ? "Taslağı düzenle" : "Düzenle"}</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Kampanya kurgusu</CardTitle>
            <CardDescription>{def.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.conditions ? (
              <>
                <p className="rounded-lg bg-brand-50/60 p-4 text-[14px] leading-relaxed">“{describeConditions(campaign.conditions)}”</p>
                <div className="flex flex-wrap gap-1.5">
                  {keyConditionChips(campaign.conditions).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Kampanya koşulları henüz tanımlanmadı.</p>
            )}
            <div className="text-[13px] text-ink-soft">Hedef kitle: <span className="font-medium text-ink">{selectionLabel(campaign.audience, campaign.conditions)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Durum akışı</CardTitle>
            <CardDescription>Platform kampanya yayınlamaz.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-[13px]">
              {(["taslak", "simule_edildi", "karsilastirildi"] as const).map((s, i) => {
                const order = ["taslak", "simule_edildi", "karsilastirildi"];
                const reached = campaign.status !== "arsivlendi" && order.indexOf(campaign.status) >= i;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${reached ? "bg-brand-600 text-white" : "bg-slate-100 text-ink-soft"}`}>{i + 1}</span>
                    <span className={reached ? "font-medium" : "text-ink-soft"}>{["Taslak oluşturuldu", "Simülasyon çalıştırıldı ve kaydedildi", "Senaryolar karşılaştırıldı"][i]}</span>
                  </li>
                );
              })}
              {campaign.status === "arsivlendi" && <li className="text-xs text-ink-soft">Bu kampanya arşivlenmiştir.</li>}
            </ol>
          </CardContent>
        </Card>
      </div>

      {latest && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">Son senaryo sonuçları — {latest.name}</h2>
            <DataSourceBadge source="demo" />
          </div>
          <KpiGrid result={latest.result} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Kaydedilmiş senaryolar</CardTitle>
            <CardDescription>Karşılaştırmak için en fazla {MAX_COMPARE} senaryo seçin.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => actions.edit(campaign)} disabled={campaign.status === "arsivlendi"}><Plus /> Yeni senaryo</Button>
            <Button size="sm" disabled={selected.length < 2} onClick={() => navigate(`/senaryolar/karsilastir?ids=${selected.join(",")}`)}>
              <GitCompare /> Karşılaştır ({selected.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {scenarios.length === 0 ? (
            <EmptyState
              className="m-3"
              icon={<FlaskConical className="h-6 w-6" />}
              title="Bu kampanya için kayıtlı senaryo yok"
              description="Kampanyayı düzenleyip simülasyonu çalıştırın ve sonucu senaryo olarak kaydedin."
              action={<Button onClick={() => actions.edit(campaign)} disabled={campaign.status === "arsivlendi"}>Simülasyonu başlat</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10"><span className="sr-only">Seç</span></TableHead>
                  <TableHead>Senaryo</TableHead>
                  <TableHead className="text-right">{def.qualifiedLabel}</TableHead>
                  <TableHead className="text-right">Oran</TableHead>
                  <TableHead className="text-right">Maliyet</TableHead>
                  <TableHead className="text-right">Bütçe kullanımı</TableHead>
                  <TableHead>Kaydedilme</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} disabled={!selected.includes(s.id) && selected.length >= MAX_COMPARE} aria-label={`${s.name} seç`} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="line-clamp-1 text-xs text-ink-soft">{describeConditions(s.conditions)}</div>
                    </TableCell>
                    <TableCell className="tabular text-right">{formatNumber(s.result.qualifiedCustomers)}</TableCell>
                    <TableCell className="tabular text-right">{formatPercent(s.result.qualificationRate, 1)}</TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(s.result.totalCost, { compact: true })}</TableCell>
                    <TableCell className="tabular text-right">{formatPercent(s.result.budgetUtilization)}</TableCell>
                    <TableCell className="text-xs text-ink-soft">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/kampanya/yeni?senaryo=${s.id}&adim=3`)}>Aç</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Kampanya silinsin mi?"
        description={`“${campaign.name}” ve bağlı ${scenarios.length} senaryo kalıcı olarak silinecek.`}
        confirmLabel="Kalıcı olarak sil"
        destructive
        onConfirm={() => {
          actions.remove(campaign);
          navigate("/kampanyalar");
        }}
      />
    </div>
  );
}
