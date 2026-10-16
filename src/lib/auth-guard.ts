import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";

const HOME: Record<AppRole, "/client" | "/seller" | "/admin"> = {
  client: "/client",
  seller: "/seller",
  admin: "/admin",
};

/**
 * Garde d'accès par rôle. La sécurité réelle est assurée par les règles
 * d'accès de la base (RLS) ; cette garde protège l'affichage des écrans.
 */
export async function requireRole(required: AppRole) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle(),
  ]);

  if (profile?.status === "suspended") throw redirect({ to: "/compte-suspendu" });

  const list = (roles ?? []).map((item) => item.role);
  const actual: AppRole = (list.includes("admin") || (list as string[]).includes("super_admin"))
    ? "admin"
    : list.includes("seller")
      ? "seller"
      : "client";

  if (actual !== required) throw redirect({ to: HOME[actual] });
}
