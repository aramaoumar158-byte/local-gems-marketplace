import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, HOME_FOR_ROLE } from "@/hooks/useAuth";

export function PublicHeader() {
  const { role, profile } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
          <a href="#explorer" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Explorer</a>
          <a href="#boutiques" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Boutiques</a>
          <Link to="/auth" search={{ mode: "signup", role: "seller" }} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Vendre sur ANW KA SUKU</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Rechercher"><Search /></Button>
          <Button variant="ghost" size="icon" aria-label="Panier"><ShoppingBag /></Button>
          {role ? (
            <Button asChild variant="soft" className="hidden sm:inline-flex">
              <Link to={HOME_FOR_ROLE[role] as "/client"}>{profile?.full_name?.split(" ")[0] || "Mon espace"}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "login" }}>Connexion</Link></Button>
              <Button asChild variant="gold"><Link to="/auth" search={{ mode: "signup" }}>Créer un compte</Link></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu"><Menu /></Button>
        </div>
      </div>
    </header>
  );
}