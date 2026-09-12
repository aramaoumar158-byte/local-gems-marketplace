import { Heart, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fcfa } from "@/lib/format";

export type ProductCardData = {
  name: string;
  category: string;
  store: string;
  city: string;
  price: number;
  image: string;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <article className="group overflow-hidden rounded-xl border bg-card shadow-card transition-transform duration-200 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img src={product.image} alt={product.name} loading="lazy" width={800} height={800} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <Button variant="outline" size="icon" className="absolute right-2 top-2 rounded-full bg-card/90" aria-label={`Ajouter ${product.name} aux favoris`}><Heart /></Button>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{product.category}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold sm:text-base">{product.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {product.store} · {product.city}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <strong className="text-sm text-foreground sm:text-base">{fcfa(product.price)}</strong>
          <Button size="icon" variant="gold" className="size-9" aria-label={`Ajouter ${product.name} au panier`}><Plus /></Button>
        </div>
      </div>
    </article>
  );
}