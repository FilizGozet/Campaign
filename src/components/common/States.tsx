import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageLoader() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Yükleniyor">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", count >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[118px]" />
      ))}
    </div>
  );
}

export function InlineLoader({ label = "Hesaplanıyor…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" /> {label}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-white/60 px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Bir sorun oluştu", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Tekrar dene
        </Button>
      )}
    </div>
  );
}
