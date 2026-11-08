import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Mail, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendEmailCode, verifyEmailCode } from "@/lib/email-verification";
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
      { name: "description", content: "Confirmez votre adresse email pour activer votre compte ANW KA SUKU." },
      { property: "og:title", content: "Vérification du compte — ANW KA SUKU" },
      { property: "og:description", content: "Étape de vérification avant l'accès à votre espace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationPage,
});

/** Saisie de l'adresse email, puis du code à 6 chiffres reçu par email. */
function EmailVerification({ initialEmail, onDone }: { initialEmail: string; onDone: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    const res = await sendEmailCode(email.trim());
    setBusy(false);
    if (res.ok) {
      setStep("code");
      setCode("");
      setInfo(res.message);
      setWait(res.retryAfter ?? 60);
    } else {
      setError(res.message);
      if (res.status === 429 && res.retryAfter) setWait(res.retryAfter);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await verifyEmailCode(code.trim());
    setBusy(false);
    if (res.ok) {
      toast.success(res.message);
      onDone();
    } else {
      setError(res.message);
    }
  }

  return (
    <div className="rounded-xl border border-dashed bg-card p-4">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 size-5 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Vérification de votre email</p>
          {step === "email" ? (
            <form onSubmit={send} className="mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nous envoyons un code à 6 chiffres à cette adresse. Vérifiez qu'elle est correcte.
              </p>
              <div>
                <Label htmlFor="verify-email">Adresse email</Label>
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-12"
                  placeholder="vous@exemple.com"
                />
              </div>
              <Button type="submit" variant="hero" disabled={busy || wait > 0 || !email.trim()}>
                {busy ? "Envoi…" : wait > 0 ? `Patientez ${wait} s` : "Recevoir mon code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Code envoyé à <strong className="text-foreground">{email.trim()}</strong>. Il est valable 10 minutes.
              </p>
              <div>
                <Label htmlFor="verify-code">Code à 6 chiffres</Label>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1.5 h-14 text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="······"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="hero" disabled={busy || code.length !== 6}>
                  {busy ? "Vérification…" : "Valider"}
                </Button>
                <Button type="button" variant="ghost" disabled={busy || wait > 0} onClick={() => void send()}>
                  {wait > 0 ? `Renvoyer le code (${wait} s)` : "Renvoyer le code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setInfo("");
                  }}
                >
                  Changer d'adresse
                </Button>
              </div>
            </form>
          )}
          {info && !error && (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {info}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationPage() {
  const { profile, role, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const verified = profile?.status === "active";

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
            <strong className="text-foreground">{profile?.phone ? formatPhone(profile.phone) : "—"}</strong>.{" "}
            {verified
              ? "Votre compte est vérifié et actif."
              : "Pour activer votre compte, confirmez votre adresse email avec le code que nous vous envoyons. Tant que ce n'est pas fait, vous pouvez parcourir le catalogue, mais pas commander ni publier."}
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-success" />
              <div>
                <p className="font-bold">Compte enregistré</p>
                <p className="text-sm text-muted-foreground">Nom, numéro de téléphone et mot de passe sécurisé.</p>
              </div>
            </div>
            {verified ? (
              <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4">
                <CheckCircle2 className="mt-0.5 size-5 text-success" />
                <div>
                  <p className="font-bold">Email vérifié</p>
                  <p className="text-sm text-muted-foreground">Votre compte est actif.</p>
                </div>
              </div>
            ) : (
              <EmailVerification
                key={profile?.id ?? "none"}
                initialEmail={profile?.email ?? ""}
                onDone={() => void refresh()}
              />
            )}
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
