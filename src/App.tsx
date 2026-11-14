import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoader } from "@/components/common/States";
import { RouteError } from "@/components/common/RouteError";
import "@/store/settingsStore";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const NewCampaignPage = lazy(() => import("@/pages/NewCampaignPage"));
const CampaignsPage = lazy(() => import("@/pages/CampaignsPage"));
const CampaignDetailPage = lazy(() => import("@/pages/CampaignDetailPage"));
const StudioPage = lazy(() => import("@/pages/StudioPage"));
const ScenarioLibraryPage = lazy(() => import("@/pages/ScenarioLibraryPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const ActualsPage = lazy(() => import("@/pages/ActualsPage"));
const ModelPerformancePage = lazy(() => import("@/pages/ModelPerformancePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const s = (el: JSX.Element) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: s(<DashboardPage />), handle: { crumb: "Dashboard" } },
      { path: "kampanya/yeni", element: s(<NewCampaignPage />), handle: { crumb: "Yeni Kampanya" } },
      { path: "kampanyalar", element: s(<CampaignsPage />), handle: { crumb: "Kampanyalarım" } },
      { path: "kampanyalar/:id", element: s(<CampaignDetailPage />), handle: { crumb: "Kampanya Detayı", parent: { label: "Kampanyalarım", to: "/kampanyalar" } } },
      { path: "simulasyon", element: s(<StudioPage />), handle: { crumb: "Simülasyon Stüdyosu" } },
      { path: "senaryolar", element: s(<ScenarioLibraryPage />), handle: { crumb: "Senaryo Kütüphanesi" } },
      { path: "senaryolar/karsilastir", element: s(<ComparePage />), handle: { crumb: "Karşılaştırma", parent: { label: "Senaryo Kütüphanesi", to: "/senaryolar" } } },
      { path: "sonuclar", element: s(<ActualsPage />), handle: { crumb: "Gerçekleşen Sonuçlar" } },
      { path: "model", element: s(<ModelPerformancePage />), handle: { crumb: "Model Performansı" } },
      { path: "ayarlar", element: s(<SettingsPage />), handle: { crumb: "Ayarlar" } },
      { path: "*", element: s(<NotFoundPage />), handle: { crumb: "Sayfa bulunamadı" } },
    ],
  },
], {
  future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true },
});

export default function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: "inherit" } }} />
    </TooltipProvider>
  );
}
