import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Package, Phone, Store as StoreIcon } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import {
  ProductGrid,
  PublicFooter,
  toCardData,
  useStoreBySlug,
  useStoreProducts,
} from "@/components/marketplace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/boutique/$slug")({
  head: () => ({
    meta: [
      { title: "Boutique — ANW KA SUKU" },
      {
        name: "description",
        content:
          "Découvrez les produits d'une boutique de fabricant ou vendeur malien sur ANW KA SUKU.",
      },
      { property: "og:title", content: "Boutique — ANW KA SUKU" },
      { property: "og:description", content: "Les fabricants et vendeurs du Mali réunis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();
  const store = useStoreBySlug(slug);
  const products = useStoreProducts(store.data?.id ?? null);

  if (store.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <p className="py-24 text-center text-sm text-muted-foreground">
          Chargement de la boutique…
        </p>
        <PublicFooter />
      </div>
    );
  }

  const data = store.data;
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <StoreIcon className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold">Boutique introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Cette boutique n'existe pas ou n'est plus disponible.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <a href="/explorer">Explorer le catalogue</a>
          </Button>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const cards = (products.data ?? []).map(toCardData);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main>
        <div className="relative h-40 overflow-hidden bg-brand sm:h-56">
          {data.banner_url ? (
            <img src={data.banner_url} alt="" className="size-full object-cover" />
          ) : null}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="-mt-12 flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-2xl font-extrabold text-primary-deep ring-4 ring-card">
              {data.logo_url ? (
                <img src={data.logo_url} alt={data.store_name} className="size-full object-cover" />
              ) : (
                data.store_name.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold">{data.store_name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {data.city ?? "Mali"}
                </span>
                <span className="flex items-center gap-1 font-semibold text-gold">
                  <BadgeCheck className="size-4" /> {Number(data.rating ?? 0).toFixed(1)}
                </span>
              </p>
              {data.description ? (
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{data.description}</p>
              ) : null}
            </div>
            {data.phone ? (
              <Button asChild variant="soft" className="shrink-0">
                <a href={`tel:${data.phone}`}>
                  <Phone /> {data.phone}
                </a>
              </Button>
            ) : null}
          </div>

          <section className="py-10">
            <h2 className="text-xl font-bold sm:text-2xl">Produits de la boutique</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {cards.length
                ? `${cards.length} produit${cards.length > 1 ? "s" : ""} en vitrine.`
                : "Aucun produit publié pour le moment."}
            </p>
            <div className="mt-6">
              {products.isPending ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Chargement des produits…
                </p>
              ) : cards.length ? (
                <ProductGrid products={cards} />
              ) : (
                <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-card">
                  <Package className="mx-auto size-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-bold">Boutique sans produit</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Cette boutique n'a pas encore publié de produit. Revenez très bientôt.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
