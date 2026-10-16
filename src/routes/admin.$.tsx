import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin-pages";
import { requireRole } from "@/lib/auth-guard";
export const Route = createFileRoute("/admin/$")({ ssr: false, beforeLoad: () => requireRole("admin"), component: () => <AdminPage slug={Route.useParams()._splat ?? ""} /> });