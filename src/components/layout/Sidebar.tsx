import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Library,
  PlusCircle,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/kampanya/yeni", label: "Yeni Kampanya", icon: PlusCircle },
  { to: "/kampanyalar", label: "Kampanyalarım", icon: FolderKanban },
  { to: "/simulasyon", label: "Simülasyon Stüdyosu", icon: FlaskConical },
  { to: "/senaryolar", label: "Senaryo Kütüphanesi", icon: Library },
  { to: "/sonuclar", label: "Gerçekleşen Sonuçlar", icon: BarChart3 },
  { to: "/model", label: "Model Performansı", icon: Gauge },
];

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 shadow-lg shadow-brand-900/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l5-6 4 3 7-9" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-white">Campaign Intelligence</div>
          <div className="text-[11px] font-medium tracking-wide text-sidebar-muted">STUDIO</div>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed }: { item: (typeof NAV)[number]; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          isActive ? "bg-sidebar-active text-white" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white",
          collapsed && "justify-center px-0",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />}
          <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-brand-300" : "")} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarBody({ collapsed, onToggleCollapse, showClose, onClose }: { collapsed: boolean; onToggleCollapse?: () => void; showClose?: boolean; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Logo collapsed={collapsed} />
        {showClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-white" aria-label="Menüyü kapat">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Ana menü">
        {!collapsed && <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-muted/70">Çalışma Alanı</div>}
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/5 px-3 py-3">
        <NavItem item={{ to: "/ayarlar", label: "Ayarlar", icon: Settings }} collapsed={collapsed} />
        {!collapsed && (
          <div className="mx-1 mt-3 rounded-lg bg-white/5 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> DEMO ORTAMI
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-sidebar-muted">Tüm veriler sentetiktir. Tahminler doğrulanmış ML çıktısı değildir.</p>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn("mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] text-sidebar-muted hover:bg-sidebar-hover hover:text-white", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed && "Daralt"}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: Props) {
  return (
    <>
      <aside className={cn("hidden shrink-0 transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-[252px]")}>
        <SidebarBody collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#17172F]/50" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-[260px] animate-in slide-in-from-left">
            <SidebarBody collapsed={false} showClose onClose={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
