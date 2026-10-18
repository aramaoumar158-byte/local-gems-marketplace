import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Store as StoreIcon,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PublicHeader } from "@/components/public-header";
import {
  PublicFooter,
  useFavoriteIds,
  useProduct,
  useToggleFavorite,
} from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { fcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produit/$id")({
  head: () => ({
    meta: [
      { title: "Fiche produit — ANW KA SUKU" },
      {
        name: "description",
        content: "Découvrez ce produit d'un fabricant ou vendeur malien sur ANW KA SUKU.",
      },
      { property: "og:title", content: "Fiche produit — ANW KA SUKU" },
      { property: "og:description", content: "Le marché des fabricants et vendeurs du Mali." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const product = useProduct(id);
  const favorites = useFavoriteIds();
  const toggle = useToggleFavorite();
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const data = product.data;
  const isFavorite = data ? (favorites.data ?? []).includes(data.id) : false;

  if (product.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <p className="py-24 text-center text-sm text-muted-foreground">Chargement du produit…</p>
        <PublicFooter />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <Package className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold">Produit introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Ce produit n'est plus disponible ou a été retiré par son vendeur.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/explorer" search={{}}>
              Explorer le catalogue
            </Link>
          </Button>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const images = data.images;
  const activeImage = images[imageIndex] ?? null;
  const inStock = data.stock > 0;

  function addToCart() {
    cart.add(
      {
        productId: data!.id,
        name: data!.name,
        price: Number(data!.price ?? 0),
        image: data!.images[0] ?? null,
        storeId: data!.store_id,
        storeName: data!.stores?.store_name ?? null,
        sellerId: data!.seller_id,
      },
      quantity,
    );
    toast.success(`${quantity} × ${data!.name} ajouté au panier`);
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" className="mb-4 -ml-2">
          <Link to="/explorer" search={{}}>
            <ArrowLeft /> Retour au catalogue
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-2xl border bg-secondary">
              <div className="aspect-square w-full">
                <ProductThumb image={activeImage} emoji={data.categories?.emoji} name={data.name} />
              </div>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    aria-label={`Voir l'image ${index + 1}`}
                    className={cn(
                      "size-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                      index === imageIndex ? "border-primary" : "border-transparent opacity-70",
                    )}
                  >
                    <img src={image} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {data.categories &&
              (data.categories.slug ? (
                <Link
                  to="/explorer"
                  search={{ cat: data.categories.slug }}
                  className="text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
                >
                  {data.categories.name}
                </Link>
              ) : (
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {data.categories.name}
                </span>
              ))}
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{data.name}</h1>

            {data.stores && (
              <Link
                to="/boutique/$slug"
                params={{ slug: data.stores.slug ?? data.stores.id }}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
              >
                <StoreIcon className="size-4" /> {data.stores.store_name}
                {data.stores.city ? <span>· {data.stores.city}</span> : null}
                <BadgeCheck className="size-4 text-gold" />
              </Link>
            )}

            <p className="mt-5 text-3xl font-extrabold text-primary-deep">{fcfa(data.price)}</p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                inStock ? "text-success" : "text-destructive",
              )}
            >
              {inStock
                ? `En stock (${data.stock} disponible${data.stock > 1 ? "s" : ""})`
                : "Rupture de stock"}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Diminuer la quantité"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus />
                </Button>
                <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Augmenter la quantité"
                  onClick={() =>
                    setQuantity((value) => Math.min(Math.max(1, data.stock), value + 1))
                  }
                >
                  <Plus />
                </Button>
              </div>
              <Button variant="hero" size="lg" disabled={!inStock} onClick={addToCart}>
                Ajouter au panier
              </Button>
              <Button
                variant="outline"
                size="lg"
                aria-pressed={isFavorite}
                onClick={() => toggle.mutate({ productId: data.id, isFavorite })}
              >
                <Heart className={cn(isFavorite && "fill-destructive text-destructive")} />
                {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              </Button>
            </div>

            {data.description && (
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Description
                </h2>
                <p className="mt-2 leading-7 text-muted-foreground">{data.description}</p>
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold">Livraison locale</p>
                  <p className="text-xs text-muted-foreground">
                    Coordonnée avec le vendeur après commande.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold">Vendeur vérifié</p>
                  <p className="text-xs text-muted-foreground">
                    Boutique contrôlée par l'équipe ANW KA SUKU.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
