import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Plus, Store as StoreIcon } from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { fcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  id?: string;
  name: string;
  category: string;
  store: string;
  storeSlug?: string | null;
  storeId?: string | null;
  sellerId?: string | null;
  city: string;
  price: number;
  image: string;
  emoji?: string | null;
};

export function ProductThumb({
  image,
  emoji,
  name,
  className,
}: {
  image?: string | null | undefined;
  emoji?: string | null | undefined;
  name: string;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        loading="lazy"
        width={800}
        height={800}
        className={cn("size-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid size-full place-items-center bg-gradient-to-br from-primary-soft via-card to-secondary",
        className,
      )}
      role="img"
      aria-label={name}
    >
      <span className="text-4xl" aria-hidden>
        {emoji ?? "🛍️"}
      </span>
    </div>
  );
}

function DetailLink({
  product,
  className,
  children,
}: {
  product: ProductCardData;
  className: string;
  children: ReactNode;
}) {
  if (!product.id) return <div className={className}>{children}</div>;
  return (
    <Link to="/produit/$id" params={{ id: product.id }} className={className}>
      {children}
    </Link>
  );
}

export function ProductCard({
  product,
  isFavorite = false,
  onToggleFavorite,
}: {
  product: ProductCardData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const cart = useCart();

  function addToCart() {
    cart.add({
      productId: product.id ?? `${product.name}-${product.price}`,
      name: product.name,
      price: product.price,
      image: product.image || null,
      storeId: product.storeId ?? null,
      storeName: product.store,
      sellerId: product.sellerId ?? null,
    });
    toast.success(`${product.name} ajouté au panier`);
  }

  return (
    <article className="group overflow-hidden rounded-xl border bg-card shadow-card transition-transform duration-200 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <DetailLink product={product} className="block size-full">
          <div className="size-full transition-transform duration-500 group-hover:scale-105">
            <ProductThumb image={product.image} emoji={product.emoji} name={product.name} />
          </div>
        </DetailLink>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-2 rounded-full bg-card/90"
          aria-label={
            isFavorite
              ? `Retirer ${product.name} des favoris`
              : `Ajouter ${product.name} aux favoris`
          }
          aria-pressed={isFavorite}
          disabled={!onToggleFavorite}
          onClick={onToggleFavorite}
        >
          <Heart className={cn(isFavorite && "fill-destructive text-destructive")} />
        </Button>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          {product.category}
        </p>
        <DetailLink product={product} className="block">
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold hover:text-primary sm:text-base">
            {product.name}
          </h3>
        </DetailLink>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {product.storeSlug ? (
            <Link
              to="/boutique/$slug"
              params={{ slug: product.storeSlug }}
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              <StoreIcon className="size-3" /> {product.store}
            </Link>
          ) : (
            <>
              <StoreIcon className="size-3" /> {product.store}
            </>
          )}
          <span aria-hidden>·</span>
          <MapPin className="size-3" /> {product.city}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <strong className="text-sm text-foreground sm:text-base">{fcfa(product.price)}</strong>
          <Button
            size="icon"
            variant="gold"
            className="size-9"
            aria-label={`Ajouter ${product.name} au panier`}
            onClick={addToCart}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </article>
  );
}
