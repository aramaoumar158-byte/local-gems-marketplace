import { Link } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, HOME_FOR_ROLE } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart";

export function PublicHeader() {
  const { role, profile } = useAuth();
  const cart = useCart();
  const cartHref = role === "client" ? "/client/panier" : "/auth?mode=login";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
          <Link
            to="/explorer"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Explorer
          </Link>
          <Link
            to="/explorer"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Boutiques
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "seller" }}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Vendre sur ANW KA SUKU
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Rechercher un produit">
            <Link to="/explorer">
              <Search />
            </Link>
          </Button>
          <span className="relative">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={cart.count ? `Panier, ${cart.count} article(s)` : "Panier"}
            >
              <a href={cartHref}>
                <ShoppingBag />
              </a>
            </Button>
            {cart.count ? (
              <span className="pointer-events-none absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-ink">
                {cart.count}
              </span>
            ) : null}
          </span>
          {role ? (
            <Button asChild variant="soft" className="hidden sm:inline-flex">
              <Link to={HOME_FOR_ROLE[role] as "/client"}>
                {profile?.full_name?.split(" ")[0] || "Mon espace"}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>
                  Connexion
                </Link>
              </Button>
              <Button asChild variant="gold">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Créer un compte
                </Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
            <Menu />
          </Button>
        </div>
      </div>
    </header>
  );
}
