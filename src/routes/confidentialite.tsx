import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — ANW KA SUKU" },
      { name: "description", content: "Comment ANW KA SUKU collecte, utilise et protège les données de ses utilisateurs." },
      { property: "og:title", content: "Politique de confidentialité — ANW KA SUKU" },
      { property: "og:description", content: "Protection des données des clients, vendeurs et fabricants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/confidentialite" }],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "1. Données collectées",
    body: "Nom complet, numéro de téléphone, adresse email facultative, ville, et les informations liées à vos boutiques, produits et commandes.",
  },
  {
    title: "2. Mot de passe",
    body: "Les mots de passe ne sont jamais stockés en clair. Ils sont gérés et chiffrés par le service d'authentification sécurisé de la plateforme.",
  },
  {
    title: "3. Utilisation",
    body: "Vos données servent à créer votre compte, afficher vos boutiques et produits, traiter vos commandes et sécuriser la plateforme. Elles ne sont pas vendues à des tiers.",
  },
  {
    title: "4. Visibilité",
    body: "Un client ne voit que ses propres données. Un vendeur voit sa boutique, ses produits et les commandes le concernant. Seule l'administration accède à l'ensemble des données.",
  },
  {
    title: "5. Conservation",
    body: "Les données sont conservées tant que le compte est actif. Une demande de suppression peut être adressée à l'équipe ANW KA SUKU.",
  },
  {
    title: "6. Vos droits",
    body: "Vous pouvez consulter et corriger vos informations personnelles depuis votre profil à tout moment.",
  },
];

function PrivacyPage() {
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
        <h1 className="text-3xl font-extrabold sm:text-4xl">Politique de confidentialité</h1>
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
