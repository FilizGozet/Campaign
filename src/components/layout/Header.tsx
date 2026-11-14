import { Link, useMatches, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Menu, Plus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CrumbHandle {
  crumb?: string;
  parent?: { label: string; to: string };
}

function Breadcrumbs() {
  const matches = useMatches();
  const last = matches[matches.length - 1];
  const handle = (last?.handle ?? {}) as CrumbHandle;
  const isHome = last?.pathname === "/";
  return (
    <nav aria-label="Sayfa yolu" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link to="/" className="text-ink-soft hover:text-ink">Ana sayfa</Link>
      {!isHome && handle.parent && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-ink-soft/50" />
          <Link to={handle.parent.to} className="truncate text-ink-soft hover:text-ink">{handle.parent.label}</Link>
        </>
      )}
      {!isHome && handle.crumb && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-ink-soft/50" />
          <span className="truncate font-medium text-ink" aria-current="page">{handle.crumb}</span>
        </>
      )}
    </nav>
  );
}

function Notifications() {
  const { items, markAllRead, markRead, clear } = useNotificationStore();
  const navigate = useNavigate();
  const unread = items.filter((i) => !i.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Bildirimler${unread ? ` (${unread} okunmamış)` : ""}`} className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Bildirimler</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={!unread}>Tümünü okundu say</Button>
            <Button variant="ghost" size="sm" onClick={clear} disabled={!items.length}>Temizle</Button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-soft">Yeni bildirim yok.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.href) navigate(n.href);
                }}
                className={cn("flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-brand-50/50", !n.read && "bg-brand-50/30")}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-ink-soft/70">{formatDateTime(n.at)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { userName, userRole } = useSettingsStore();
  const navigate = useNavigate();
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-white/85 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobile} aria-label="Menüyü aç">
        <Menu className="h-5 w-5" />
      </Button>
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/kampanya/yeni")}>
          <Plus /> Yeni kampanya
        </Button>
        <Notifications />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" aria-label="Kullanıcı menüsü">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-xs font-semibold text-white">{initials}</span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-[13px] font-medium text-ink">{userName}</span>
                <span className="block text-[11px] text-ink-soft">{userRole}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/ayarlar")}><User /> Profil</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/ayarlar")}><Settings /> Ayarlar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => toast.info("Demo ortamında oturum kapatma devre dışıdır.")}><LogOut /> Oturumu kapat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
