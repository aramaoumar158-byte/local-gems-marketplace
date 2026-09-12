import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";

export async function requireRole(required: AppRole) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const list = (roles ?? []).map((item) => item.role);
  const actual = list.includes("admin") ? "admin" : list.includes("seller") ? "seller" : "client";
  if (actual !== required) throw redirect({ to: actual === "admin" ? "/admin" : actual === "seller" ? "/seller" : "/client" });
}