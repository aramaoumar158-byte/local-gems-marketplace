import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/compte-suspendu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Compte suspendu — ANW KA SUKU" },
      { name: "description", content: "Votre compte ANW KA SUKU est temporairement suspendu." },
      { property: "og:title", content: "Compte suspendu — ANW KA SUKU" },
      { property: "og:description", content: "Accès temporairement restreint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center bg-mesh px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-float">
        <Brand className="justify-center" />
        <span className="mx-auto mt-6 grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Compte suspendu</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Votre compte est temporairement suspendu. Vous ne pouvez plus vendre, commander ni publier de produits.
          Contactez l'équipe ANW KA SUKU pour rétablir votre accès.
        </p>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={async () => {
            await signOut();
            void navigate({ to: "/auth", search: { mode: "login" } });
          }}
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
