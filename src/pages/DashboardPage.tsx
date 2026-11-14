import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Database, FlaskConical, FolderKanban, GitCompare, Library, Plus, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/KpiCard";
import { ObjectiveTile } from "@/components/common/ObjectiveIcon";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { useCampaignStore } from "@/store/campaignStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useSettingsStore } from "@/store/settingsStore";
import { OBJECTIVES, type CampaignStatus } from "@/domain/types";
import { getObjective } from "@/domain/objectives";
import { STATUS_LABELS } from "@/domain/labels";
import { overallErrors } from "@/data/modelPerformance";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { SERIES } from "@/lib/chartTheme";

export default function DashboardPage() {
  const navigate = useNavigate();
  const campaigns = useCampaignStore((s) => s.campaigns);
  const scenarios = useScenarioStore((s) => s.scenarios);
  const userName = useSettingsStore((s) => s.userName);
  const errors = overallErrors();
  const active = campaigns.filter((c) => c.status !== "arsivlendi");
  const recentCampaigns = [...campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentScenarios = [...scenarios].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const byStatus = (["taslak", "simule_edildi", "karsilastirildi", "arsivlendi"] as CampaignStatus[]).map((s) => ({ s, n: campaigns.filter((c) => c.status === s).length }));
  const byObjective = useMemo(() => OBJECTIVES.map((o) => ({ o, n: active.filter((c) => c.objective === o).length })), [active]);
  const maxObj = Math.max(1, ...byObjective.map((x) => x.n));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2A2458] via-[#1E1B38] to-[#2E1A5C] p-6 text-white shadow-lift md:p-8">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[13px] text-brand-200">{greet}, {userName.split(" ")[0]}</div>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">Bu kampanya koşullarını değiştirirsem beklenen sonuçlar nasıl değişir?</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">
              Hedef kitle, ödül, harcama koşulu ve bütçe kombinasyonlarını gerçek kampanyaya çıkmadan önce simüle edin, senaryoları karşılaştırın ve geçmiş tahminlerin isabetini izleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50" onClick={() => navigate("/kampanya/yeni?yeni=1")}>
              <Plus /> Yeni kampanya
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => navigate("/simulasyon")}>
              <FlaskConical /> Simülasyon stüdyosu
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aktif kampanya" icon={<FolderKanban />} value={formatNumber(active.length)} sub={`${campaigns.length - active.length} arşivlenmiş`} highlight />
        <KpiCard label="Kayıtlı senaryo" icon={<Library />} value={formatNumber(scenarios.length)} sub={`${scenarios.filter((s) => s.source === "studio").length} stüdyo anlık görüntüsü`} />
        <KpiCard label="Karşılaştırılan kampanya" icon={<GitCompare />} value={formatNumber(campaigns.filter((c) => c.status === "karsilastirildi").length)} sub="En az iki senaryosu kıyaslanmış" />
        <KpiCard
          label="Hak kazanma tahmini — ort. hata"
          icon={<Target />}
          value={formatPercent(errors.qualification, 1)}
          sub={`${errors.total} tamamlanmış kampanya (sentetik)`}
          tooltip="Gerçekleşen sonuçlarla karşılaştırılan geçmiş kampanyalarda ortalama mutlak yüzde hata."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Son güncellenen kampanyalar</CardTitle>
              <CardDescription>Kampanya kurgusu ve durumu</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/kampanyalar">Tümünü gör <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentCampaigns.length === 0 ? (
              <EmptyState title="Henüz kampanya yok" action={<Button onClick={() => navigate("/kampanya/yeni?yeni=1")}>İlk kampanyayı oluştur</Button>} />
            ) : (
              recentCampaigns.map((c) => (
                <Link key={c.id} to={`/kampanyalar/${c.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-50/50">
                  <ObjectiveTile objective={c.objective} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{c.name}</div>
                    <div className="text-xs text-ink-soft">{getObjective(c.objective).shortName} · {c.scenarioIds.length} senaryo · {formatDate(c.updatedAt)}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kampanya hattı</CardTitle>
            <CardDescription>Duruma ve hedefe göre dağılım</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-4 gap-2 text-center">
              {byStatus.map(({ s, n }) => (
                <div key={s} className="rounded-lg bg-brand-50/50 px-1 py-2.5">
                  <div className="tabular text-lg font-semibold">{n}</div>
                  <div className="text-[10.5px] leading-tight text-ink-soft">{STATUS_LABELS[s]}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              {byObjective.map(({ o, n }) => (
                <div key={o} className="text-xs">
                  <div className="mb-1 flex justify-between">
                    <span className="text-ink">{getObjective(o).shortName}</span>
                    <span className="tabular text-ink-soft">{n}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-brand-50">
                    <div className="h-1.5 rounded-full" style={{ width: `${(n / maxObj) * 100}%`, background: SERIES[0] }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Son kaydedilen senaryolar</CardTitle>
              <CardDescription>Demo simülasyon sonuçları</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/senaryolar">Kütüphane <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {recentScenarios.map((s) => (
              <button key={s.id} onClick={() => navigate(`/kampanya/yeni?senaryo=${s.id}&adim=3`)} className="rounded-xl border border-border p-4 text-left transition-all hover:border-brand-200 hover:shadow-lift">
                <div className="flex items-center gap-2">
                  <ObjectiveTile objective={s.objective} className="h-7 w-7 rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5" />
                  <span className="truncate text-[13px] font-medium">{s.name}</span>
                </div>
                <div className="tabular mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-ink-soft">Hak kazanan</div><div className="font-semibold">{formatNumber(s.result.qualifiedCustomers)}</div></div>
                  <div><div className="text-ink-soft">Maliyet</div><div className="font-semibold">{formatCurrency(s.result.totalCost, { compact: true })}</div></div>
                  <div><div className="text-ink-soft">Bütçe</div><div className="font-semibold">{formatPercent(s.result.budgetUtilization)}</div></div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Veri katmanları</CardTitle>
            <CardDescription>Platformdaki her değer bu üç türden birine aittir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {[
              { Icon: Database, title: "Gözlenen geçmiş metrikler", body: "Tamamlanmış kampanyaların ölçülen sonuçları (bu prototipte sentetik örnekler).", to: "/sonuclar", cls: "bg-sky-50 text-sky-700" },
              { Icon: FlaskConical, title: "Sentetik demo simülasyonları", body: "Belgelenmiş kural tabanlı motor. Doğrulanmış finansal tahmin değildir.", to: "/simulasyon", cls: "bg-amber-50 text-amber-700" },
              { Icon: Sparkles, title: "Gelecekteki ML tahminleri", body: "PredictionService arayüzü üzerinden bağlanacak gerçek model (planlanan).", to: "/model", cls: "bg-brand-50 text-brand-700" },
            ].map(({ Icon, title, body, to, cls }) => (
              <Link key={title} to={to} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-brand-50/40">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-xs leading-relaxed text-ink-soft">{body}</span>
                </span>
              </Link>
            ))}
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-ink-soft">
              <BarChart3 className="h-3.5 w-3.5" /> Platform bir karar destek aracıdır; kampanya yayınlamaz veya karar vermez.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
