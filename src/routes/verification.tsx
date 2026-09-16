import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, MessageSquare, ShieldCheck, Store } from "lucide-react";
import { useEffect } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, HOME_FOR_ROLE } from "@/hooks/useAuth";
import { formatPhone } from "@/lib/format";

export const Route = createFileRoute("/verification")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
  },
  head: () => ({
    meta: [
      { title: "Vérification du compte — ANW KA SUKU" },
      { name: "description", content: "Vérifiez votre numéro de téléphone pour activer votre compte ANW KA SUKU." },
      { property: "og:title", content: "Vérification du compte — ANW KA SUKU" },
      { property: "og:description", content: "Étape de vérification avant l'accès à votre espace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  const { profile, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.status === "suspended") void navigate({ to: "/compte-suspendu" });
  }, [loading, profile, navigate]);

  const seller = role === "seller";

  return (
    <div className="min-h-screen bg-mesh">
      <header className="mx-auto flex h-20 max-w-7xl items-center px-4 sm:px-6">
        <Brand />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border bg-card p-6 shadow-float sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
            <ShieldCheck className="size-4" /> Étape de vérification
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">Votre compte est créé</h1>
          <p className="mt-3 text-muted-foreground">
            Nous avons enregistré le numéro{" "}
            <strong className="text-foreground">{profile?.phone ? formatPhone(profile.phone) : "—"}</strong>. La
            vérification par code SMS s'activera dès qu'un opérateur d'envoi de SMS sera connecté à la plateforme.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-success" />
              <div>
                <p className="font-bold">Compte enregistré</p>
                <p className="text-sm text-muted-foreground">Nom, numéro de téléphone et mot de passe sécurisé.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-dashed bg-card p-4">
              <MessageSquare className="mt-0.5 size-5 text-warning" />
              <div>
                <p className="font-bold">Vérification du numéro par SMS</p>
                <p className="text-sm text-muted-foreground">
                  En attente de la configuration d'un service d'envoi de SMS. Tant qu'elle n'est pas faite, votre compte
                  reste au statut « vérification en attente ».
                </p>
              </div>
            </div>
            {seller && (
              <div className="flex items-start gap-3 rounded-xl border border-dashed bg-card p-4">
                <Store className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-bold">Configuration de votre boutique</p>
                  <p className="text-sm text-muted-foreground">
                    Dernière étape : renseignez le nom, la ville et la description de votre boutique.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="hero"
            size="lg"
            className="mt-7 w-full"
            disabled={loading || !role}
            onClick={() => {
              if (!role) return;
              if (role === "seller") void navigate({ to: "/seller/$", params: { _splat: "boutique" } });
              else void navigate({ to: HOME_FOR_ROLE[role] as "/client" });
            }}
          >
            {seller ? "Configurer ma boutique" : "Accéder à mon espace"}
          </Button>
        </div>
      </main>
    </div>
  );
}
