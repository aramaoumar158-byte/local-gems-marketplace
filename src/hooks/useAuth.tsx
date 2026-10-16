import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, phoneToLogin } from "@/lib/format";

export type AppRole = "client" | "seller" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  status: string;
  phone_verified: boolean;
  email_verified: boolean;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (input: {
    fullName: string;
    phone: string;
    email?: string | undefined;
    password: string;
    role: "client" | "seller";
  }) => Promise<{ error: string | null }>;
  signIn: (input: { phone: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export const HOME_FOR_ROLE: Record<AppRole, string> = {
  client: "/client",
  seller: "/seller",
  admin: "/admin",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadIdentity(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((p as Profile) ?? null);
    const roles = (r ?? []).map((x) => x.role as AppRole);
    setRole(
      (roles.includes("admin") || (roles as string[]).includes("super_admin"))
        ? "admin"
        : roles.includes("seller")
          ? "seller"
          : roles.includes("client")
            ? "client"
            : null,
    );
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setTimeout(() => {
        void loadIdentity(nextSession?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadIdentity(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading,
      async signUp({ fullName, phone, email, password, role: chosen }) {
        const login = phoneToLogin(phone);
        const normalized = normalizePhone(phone);
        if (!login || !normalized) {
          return { error: "Numéro malien invalide. Exemple : +223 70 00 00 00." };
        }
        const { error } = await supabase.auth.signUp({
          email: login,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              phone: normalized,
              contact_email: email ?? "",
              role: chosen === "seller" ? "seller" : "client",
            },
          },
        });
        if (error) {
          const message = error.message.toLowerCase();
          if (message.includes("already registered") || message.includes("duplicate") || message.includes("unique")) {
            return { error: "Ce numéro est déjà utilisé. Connectez-vous." };
          }
          if (message.includes("pwned") || message.includes("compromis")) {
            return { error: "Ce mot de passe apparaît dans des fuites de données. Choisissez-en un autre." };
          }
          return { error: error.message };
        }
        return { error: null };
      },
      async signIn({ phone, password }) {
        const login = phoneToLogin(phone);
        if (!login) return { error: "Numéro malien invalide. Exemple : +223 70 00 00 00." };
        const { error } = await supabase.auth.signInWithPassword({ email: login, password });
        if (error) return { error: "Numéro ou mot de passe incorrect." };
        return { error: null };
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
        setRole(null);
      },
      async refresh() {
        await loadIdentity(session?.user?.id);
      },
    }),
    [session, profile, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
