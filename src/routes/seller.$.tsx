import { createFileRoute } from "@tanstack/react-router";
import { SellerPage } from "@/components/role-pages";
import { requireRole } from "@/lib/auth-guard";
export const Route = createFileRoute("/seller/$")({ ssr: false, beforeLoad: () => requireRole("seller"), component: () => <SellerPage slug={Route.useParams()._splat ?? ""} /> });