import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/conditions")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — ANW KA SUKU" },
      { name: "description", content: "Les règles d'utilisation de la plateforme ANW KA SUKU pour les clients, vendeurs et fabricants." },
      { property: "og:title", content: "Conditions d'utilisation — ANW KA SUKU" },
      { property: "og:description", content: "Règles d'utilisation de la plateforme ANW KA SUKU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/conditions" }],
  }),
  component: LegalPage,
});

const sections = [
  {
    title: "1. Objet",
    body: "ANW KA SUKU est une plateforme qui met en relation des fabricants, des vendeurs et des clients. Ces conditions encadrent l'utilisation du site et des espaces personnels.",
  },
  {
    title: "2. Compte et numéro de téléphone",
    body: "Le numéro de téléphone malien est l'identifiant principal du compte. Un numéro ne peut être associé qu'à un seul compte. Vous êtes responsable de la confidentialité de votre mot de passe.",
  },
  {
    title: "3. Vérification",
    body: "Un compte reste au statut « vérification en attente » tant que le numéro de téléphone n'a pas été confirmé. Certaines fonctionnalités peuvent être limitées durant cette période.",
  },
  {
    title: "4. Obligations des vendeurs",
    body: "Les vendeurs et fabricants s'engagent à publier des informations exactes sur leurs produits, leurs prix et leurs délais, et à respecter la législation en vigueur au Mali.",
  },
  {
    title: "5. Suspension",
    body: "ANW KA SUKU peut suspendre un compte en cas de fraude, de contenu illicite ou de manquement grave à ces conditions. Un compte suspendu ne peut plus vendre ni commander.",
  },
  {
    title: "6. Paiements",
    body: "Les moyens de paiement en ligne ne sont pas encore activés. Les montants affichés sur la plateforme sont indicatifs tant que les services de paiement officiels ne sont pas connectés.",
  },
  {
    title: "7. Contact",
    body: "Pour toute question relative à ces conditions, contactez l'équipe ANW KA SUKU depuis votre espace personnel.",
  },
];

function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <Button asChild variant="ghost">
          <Link to="/auth" search={{ mode: "signup" }}>
            <ArrowLeft /> Retour
          </Link>
        </Button>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Conditions d'utilisation</h1>
        <p className="mt-3 text-muted-foreground">
          Version de travail, à faire relire par un conseil juridique avant l'ouverture publique de la plateforme.
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
