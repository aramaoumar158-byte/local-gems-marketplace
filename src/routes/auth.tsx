import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Phone, ShieldCheck, Store, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { normalizePhone, passwordStrength } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).catch("login"),
  role: z.enum(["client", "seller"]).optional(),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Saisissez votre nom complet.").max(100),
  phone: z
    .string()
    .trim()
    .refine((value) => normalizePhone(value) !== null, "Numéro malien invalide. Exemple : +223 70 00 00 00."),
  email: z.string().trim().email("Adresse email invalide.").max(255).optional().or(z.literal("")),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(72),
  role: z.enum(["client", "seller"]),
  terms: z.literal(true, { message: "Vous devez accepter les conditions d'utilisation." }),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Connexion et inscription — ANW KA SUKU" },
      { name: "description", content: "Créez votre compte ANW KA SUKU ou connectez-vous avec votre numéro de téléphone malien." },
      { property: "og:title", content: "Rejoignez ANW KA SUKU" },
      { property: "og:description", content: "La plateforme digitale des fabricants, vendeurs et clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { signIn, signUp, role, loading } = useAuth();
  const [mode, setMode] = useState(search.mode);
  const [chosenRole, setChosenRole] = useState<"client" | "seller">(search.role ?? "client");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const strength = passwordStrength(password);

  useEffect(() => {
    if (!loading && role) void navigate({ to: "/verification" });
  }, [loading, role, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") ?? "");

    if (mode === "login") {
      const result = await signIn({ phone, password });
      setError(result.error ?? "");
    } else {
      const parsed = signupSchema.safeParse({
        fullName: form.get("fullName"),
        phone,
        email: form.get("email"),
        password,
        role: chosenRole,
        terms,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Vérifiez les informations saisies.");
      } else {
        const result = await signUp({
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          email: parsed.data.email || undefined,
          password: parsed.data.password,
          role: parsed.data.role,
        });
        setError(result.error ?? "");
      }
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-mesh">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft /> Accueil
          </Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <section className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
            <ShieldCheck className="size-4" /> Simple, professionnel et sécurisé
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight">
            Votre activité.
            <br />
            <span className="text-primary">Votre avenir.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            ANW KA SUKU vous donne les outils pour découvrir, vendre et développer le commerce local.
          </p>
          <div className="mt-8 space-y-4">
            {[
              "Accédez à des produits et boutiques locales",
              "Créez une boutique digitale professionnelle",
              "Suivez vos commandes et votre activité",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 font-semibold">
                <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">
                  <Check className="size-4" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-float sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">ANW KA SUKU</p>
            <h2 className="mt-2 text-2xl font-bold">
              {mode === "signup" ? "Rejoignez la plateforme" : "Heureux de vous revoir"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Créez votre compte en moins de deux minutes."
                : "Connectez-vous avec votre numéro de téléphone."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-secondary p-1">
            <button
              type="button"
              className={cn("rounded-md py-2.5 text-sm font-bold", mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground")}
              onClick={() => setMode("login")}
            >
              Connexion
            </button>
            <button
              type="button"
              className={cn("rounded-md py-2.5 text-sm font-bold", mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground")}
              onClick={() => setMode("signup")}
            >
              Inscription
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input id="fullName" name="fullName" placeholder="Ex. Awa Traoré" className="mt-1.5 h-12" maxLength={100} required />
                </div>
                <div>
                  <Label>Je souhaite utiliser ANW KA SUKU comme</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { value: "client", label: "Client", icon: UserRound, sub: "Acheter et découvrir" },
                      { value: "seller", label: "Vendeur / Fabricant", icon: Store, sub: "Créer et vendre" },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setChosenRole(option.value as "client" | "seller")}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          chosenRole === option.value ? "border-primary bg-primary-soft" : "bg-card hover:bg-secondary",
                        )}
                      >
                        <option.icon className={cn("size-5", chosenRole === option.value ? "text-primary" : "text-muted-foreground")} />
                        <span className="mt-2 block text-xs font-bold sm:text-sm">{option.label}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">{option.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+223 70 00 00 00" className="h-12 pl-10" required />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Votre numéro malien est votre identifiant de connexion.</p>
            </div>

            {mode === "signup" && (
              <div>
                <Label htmlFor="email">
                  Adresse email <span className="font-normal text-muted-foreground">(facultatif)</span>
                </Label>
                <Input id="email" name="email" type="email" placeholder="vous@exemple.com" className="mt-1.5 h-12" maxLength={255} />
              </div>
            )}

            <div>
              <div className="flex justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {mode === "login" && <span className="text-xs font-semibold text-primary">Mot de passe oublié ?</span>}
              </div>
              <div className="relative mt-1.5">
                <LockKeyhole className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  placeholder="8 caractères minimum"
                  className="h-12 px-10"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-3.5 text-muted-foreground"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mode === "signup" && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1.5" aria-hidden>
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          index < strength.score
                            ? strength.score <= 1
                              ? "bg-destructive"
                              : strength.score === 2
                                ? "bg-warning"
                                : "bg-success"
                            : "bg-secondary",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                    Robustesse : {strength.label}
                  </p>
                </div>
              )}
            </div>

            {mode === "signup" && (
              <label className="flex items-start gap-3 rounded-lg bg-secondary p-3 text-xs leading-5">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                />
                <span>
                  J'accepte les{" "}
                  <Link to="/conditions" className="font-bold text-primary underline">
                    Conditions d'utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link to="/confidentialite" className="font-bold text-primary underline">
                    Politique de confidentialité
                  </Link>{" "}
                  d'ANW KA SUKU.
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Un instant…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
