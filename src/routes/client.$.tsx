import { createFileRoute } from "@tanstack/react-router";
import { ClientPage } from "@/components/role-pages";
import { requireRole } from "@/lib/auth-guard";
export const Route = createFileRoute("/client/$")({ ssr: false, beforeLoad: () => requireRole("client"), component: () => <ClientPage slug={Route.useParams()._splat ?? ""} /> });