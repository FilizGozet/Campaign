import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/States";

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="h-6 w-6" />}
      title="Sayfa bulunamadı"
      description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
      action={<Button asChild><Link to="/">Dashboard'a dön</Link></Button>}
    />
  );
}
