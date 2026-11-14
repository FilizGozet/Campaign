import { useState } from "react";
import { Database, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import { Field } from "@/components/common/Field";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useSettingsStore } from "@/store/settingsStore";
import { useScenarioStore } from "@/store/scenarioStore";
import { useCampaignStore } from "@/store/campaignStore";
import { resetDemoData } from "@/store/reset";
import { predictionService } from "@/services/prediction";
import { ENGINE_VERSION } from "@/engine/simulate";
import { CUSTOMER_RECORDS, CUSTOMER_WEIGHT, POPULATION_SEED, PROSPECT_RECORDS, PROSPECT_WEIGHT } from "@/data/population";
import { formatNumber } from "@/lib/format";

export default function SettingsPage() {
  const s = useSettingsStore();
  const scenarioCount = useScenarioStore((x) => x.scenarios.length);
  const campaignCount = useCampaignStore((x) => x.campaigns.length);
  const [name, setName] = useState(s.userName);
  const [role, setRole] = useState(s.userRole);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Ayarlar" description="Profil, simülasyon tercihleri ve demo verisi yönetimi." />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-brand-600" /> Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return toast.error("Ad soyad boş olamaz.");
                s.set({ userName: name.trim(), userRole: role.trim() || "Kampanya Yöneticisi" });
                toast.success("Profil güncellendi");
              }}
            >
              <Field label="Ad soyad" htmlFor="set-name"><Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
              <Field label="Rol" htmlFor="set-role"><Input id="set-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} /></Field>
              <Button type="submit">Kaydet</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simülasyon tercihleri</CardTitle>
            <CardDescription>Etkin tahmin servisi: {predictionService.label} · {ENGINE_VERSION}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <Label htmlFor="latency" className="cursor-pointer">
                Gerçekçi servis gecikmesi
                <span className="mt-0.5 block text-xs font-normal text-ink-soft">Gerçek bir tahmin API'sini taklit etmek için sonuçları ~350 ms gecikmeyle döndürür (yükleme durumlarını gösterir).</span>
              </Label>
              <Switch id="latency" checked={s.simulateLatency} onCheckedChange={(v) => s.set({ simulateLatency: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4 text-brand-600" /> Demo verisi</CardTitle>
            <CardDescription>Tüm veriler sentetiktir ve yalnızca bu tarayıcıda (LocalStorage) saklanır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-brand-50/50 p-3"><dt className="text-xs text-ink-soft">Sentetik müşteri</dt><dd className="tabular font-semibold">{formatNumber(CUSTOMER_RECORDS * CUSTOMER_WEIGHT)} ({formatNumber(CUSTOMER_RECORDS)} kayıt)</dd></div>
              <div className="rounded-lg bg-brand-50/50 p-3"><dt className="text-xs text-ink-soft">Sentetik aday müşteri</dt><dd className="tabular font-semibold">{formatNumber(PROSPECT_RECORDS * PROSPECT_WEIGHT)} ({formatNumber(PROSPECT_RECORDS)} kayıt)</dd></div>
              <div className="rounded-lg bg-brand-50/50 p-3"><dt className="text-xs text-ink-soft">Kayıtlı kampanya / senaryo</dt><dd className="tabular font-semibold">{campaignCount} / {scenarioCount}</dd></div>
              <div className="rounded-lg bg-brand-50/50 p-3"><dt className="text-xs text-ink-soft">Popülasyon tohumu (seed)</dt><dd className="tabular font-semibold">{POPULATION_SEED}</dd></div>
            </dl>
            <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">Demo verisini sıfırla</div>
                <div className="text-xs text-ink-soft">Kampanyalar ve senaryolar örnek veriye döndürülür; sihirbaz temizlenir.</div>
              </div>
              <Button variant="destructive" onClick={() => setConfirm(true)}><RotateCcw /> Sıfırla</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Demo verisi sıfırlansın mı?"
        description="Oluşturduğunuz tüm kampanya ve senaryolar silinir, örnek veriler geri yüklenir. Bu işlem geri alınamaz."
        confirmLabel="Verileri sıfırla"
        destructive
        onConfirm={() => {
          resetDemoData();
          toast.success("Demo verisi sıfırlandı");
        }}
      />
    </div>
  );
}
