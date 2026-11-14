import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Bilinmeyen hata";
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Uygulamada beklenmeyen bir hata oluştu</h1>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>Sayfayı yenile</Button>
          <Button asChild><Link to="/">Ana sayfaya dön</Link></Button>
        </div>
      </div>
    </div>
  );
}
