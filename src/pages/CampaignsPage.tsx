import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, Copy, Eye, FolderKanban, MoreHorizontal, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Campaign, CampaignObjective, CampaignStatus } from "@/domain/types";
import { OBJECTIVES } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ObjectiveTile } from "@/components/common/ObjectiveIcon";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useCampaignStore } from "@/store/campaignStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { getObjective } from "@/domain/objectives";
import { STATUS_LABELS } from "@/domain/labels";
import { selectionLabel } from "@/data/audiences";
import { deleteScenario } from "@/services/campaignActions";
import { formatDate } from "@/lib/format";

type Sort = "newest" | "oldest" | "name";

export function useCampaignActions() {
  const navigate = useNavigate();
  const { duplicate, setStatus, remove } = useCampaignStore();
  return {
    edit: (c: Campaign) => navigate(`/kampanya/yeni?kampanya=${c.id}`),
    duplicate: (c: Campaign) => {
      const copy = duplicate(c.id);
      if (copy) toast.success("Kampanya kopyalandı", { description: `“${copy.name}” taslak olarak oluşturuldu.` });
      return copy;
    },
    toggleArchive: (c: Campaign) => {
      const next: CampaignStatus = c.status === "arsivlendi" ? (c.scenarioIds.length ? "simule_edildi" : "taslak") : "arsivlendi";
      setStatus(c.id, next);
      toast.success(next === "arsivlendi" ? "Kampanya arşivlendi" : "Kampanya arşivden çıkarıldı");
    },
    remove: (c: Campaign) => {
      c.scenarioIds.forEach((id) => deleteScenario(id));
      remove(c.id);
      toast.success("Kampanya silindi");
    },
  };
}

export default function CampaignsPage() {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const scenarios = useScenarioStore((s) => s.scenarios);
  const navigate = useNavigate();
  const actions = useCampaignActions();
  const [q, setQ] = useState("");
  const [objective, setObjective] = useState<CampaignObjective | "all">("all");
  const [status, setStatus] = useState<CampaignStatus | "all" | "active">("active");
  const [sort, setSort] = useState<Sort>("newest");
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return campaigns
      .filter((c) => !term || c.name.toLocaleLowerCase("tr").includes(term) || c.category.toLocaleLowerCase("tr").includes(term))
      .filter((c) => objective === "all" || c.objective === objective)
      .filter((c) => (status === "all" ? true : status === "active" ? c.status !== "arsivlendi" : c.status === status))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "tr") : sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  }, [campaigns, q, objective, status, sort]);

  const filtersActive = q || objective !== "all" || status !== "active";

  return (
    <div>
      <PageHeader
        title="Kampanyalarım"
        description="Taslak, simüle edilmiş ve karşılaştırılmış kampanyalarınız. Bu platform kampanya yayınlamaz; yalnızca karar desteği sağlar."
        actions={
          <Button onClick={() => navigate("/kampanya/yeni?yeni=1")}>
            <Plus /> Yeni kampanya
          </Button>
        }
      />
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kampanya adı veya kategori ara" className="pl-9" aria-label="Kampanya ara" />
          </div>
          <Select value={objective} onValueChange={(v) => setObjective(v as CampaignObjective | "all")}>
            <SelectTrigger className="lg:w-[220px]" aria-label="Hedef filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm hedefler</SelectItem>
              {OBJECTIVES.map((o) => (
                <SelectItem key={o} value={o}>{getObjective(o).shortName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus | "all" | "active")}>
            <SelectTrigger className="lg:w-[200px]" aria-label="Durum filtresi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Arşiv dışı</SelectItem>
              <SelectItem value="all">Tüm durumlar</SelectItem>
              {(Object.keys(STATUS_LABELS) as CampaignStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="lg:w-[190px]" aria-label="Sıralama">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">En yeni oluşturulan</SelectItem>
              <SelectItem value="oldest">En eski oluşturulan</SelectItem>
              <SelectItem value="name">Ada göre (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title={filtersActive ? "Filtrelerle eşleşen kampanya yok" : "Henüz kampanya yok"}
          description={filtersActive ? "Arama veya filtreleri değiştirerek tekrar deneyin." : "İlk kampanya simülasyonunuzu oluşturarak başlayın."}
          action={
            filtersActive ? (
              <Button variant="outline" onClick={() => { setQ(""); setObjective("all"); setStatus("active"); }}>Filtreleri temizle</Button>
            ) : (
              <Button onClick={() => navigate("/kampanya/yeni?yeni=1")}><Plus /> Yeni kampanya</Button>
            )
          }
        />
      ) : (
        <Card className="px-2 py-1">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Kampanya</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Hedef kitle</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Senaryo</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead className="w-12"><span className="sr-only">İşlemler</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const count = scenarios.filter((s) => s.campaignId === c.id).length;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/kampanyalar/${c.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ObjectiveTile objective={c.objective} className="h-9 w-9" />
                        <div className="min-w-0">
                          <Link to={`/kampanyalar/${c.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:text-brand-700">
                            {c.name}
                          </Link>
                          <div className="text-xs text-ink-soft">{c.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px]">{getObjective(c.objective).shortName}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-[13px] text-ink-soft">{selectionLabel(c.audience, c.conditions)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="tabular text-right">{count}</TableCell>
                    <TableCell className="text-[13px] text-ink-soft">{formatDate(c.createdAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`${c.name} işlemleri`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onSelect={() => navigate(`/kampanyalar/${c.id}`)}><Eye /> Detayları görüntüle</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => actions.edit(c)} disabled={c.status === "arsivlendi"}><PencilLine /> {c.status === "taslak" ? "Taslağı düzenle" : "Düzenle ve yeniden simüle et"}</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => actions.duplicate(c)}><Copy /> Kopyala</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => actions.toggleArchive(c)}>{c.status === "arsivlendi" ? <><ArchiveRestore /> Arşivden çıkar</> : <><Archive /> Arşivle</>}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setToDelete(c)}><Trash2 /> Sil</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <p className="mt-3 text-xs text-ink-soft">{rows.length} kampanya listeleniyor · toplam {campaigns.length}</p>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Kampanya silinsin mi?"
        description={toDelete ? `“${toDelete.name}” ve bağlı ${toDelete.scenarioIds.length} senaryo kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ""}
        confirmLabel="Kalıcı olarak sil"
        destructive
        onConfirm={() => toDelete && actions.remove(toDelete)}
      />
    </div>
  );
}
