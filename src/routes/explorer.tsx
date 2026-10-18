import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Package, Search, X } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import {
  ProductGrid,
  PublicFooter,
  toCardData,
  useCatalog,
  useCategories,
} from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/explorer")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Explorer les produits — ANW KA SUKU" },
      {
        name: "description",
        content:
          "Parcourez les créations des fabricants, artisans et vendeurs du Mali : poterie, bogolan, meubles, décoration et produits locaux.",
      },
      { property: "og:title", content: "Explorer les produits — ANW KA SUKU" },
      {
        property: "og:description",
        content: "Le catalogue des fabricants et vendeurs du Mali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/explorer" }],
  }),
  component: ExplorerPage,
});

function bodySearch(term: string, category?: string | undefined) {
  const next: { q?: string; cat?: string } = {};
  const clean = term.trim();
  if (clean) next.q = clean;
  if (category) next.cat = category;
  return next;
}

function ExplorerPage() {
  const { q, cat } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const catalog = useCatalog();
  const categories = useCategories();

  const activeCategory = (categories.data ?? []).find((item) => item.slug === cat) ?? null;
  const needle = (q ?? "").trim().toLowerCase();

  const rows = (catalog.data ?? []).filter((row) => {
    if (activeCategory && row.category_id !== activeCategory.id) return false;
    if (!needle) return true;
    return `${row.name} ${row.categories?.name ?? ""} ${row.stores?.store_name ?? ""} ${
      row.stores?.city ?? ""
    }`
      .toLowerCase()
      .includes(needle);
  });
  const cards = rows.map(toCardData);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/explorer", search: bodySearch(term, cat) });
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Catalogue</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          {activeCategory ? activeCategory.name : "Tout un savoir-faire à découvrir"}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {cards.length
            ? `${cards.length} produit${cards.length > 1 ? "s" : ""} disponible${
                cards.length > 1 ? "s" : ""
              } auprès de nos fabricants et vendeurs.`
            : "Découvrez les créations publiées par les fabricants et vendeurs du Mali."}
        </p>

        <form
          onSubmit={submit}
          className="mt-6 flex items-center gap-2 rounded-xl border bg-card p-2"
        >
          <Search className="ml-2 size-5 shrink-0 text-muted-foreground" />
          <input
            aria-label="Rechercher un produit"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Produit, boutique ou ville…"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none sm:text-base"
          />
          {term && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Effacer la recherche"
              onClick={() => {
                setTerm("");
                void navigate({ to: "/explorer", search: bodySearch("", cat) });
              }}
            >
              <X />
            </Button>
          )}
          <Button type="submit" variant="hero" className="hidden sm:inline-flex">
            Rechercher
          </Button>
        </form>

        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          <Link
            to="/explorer"
            search={bodySearch(term)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
              !activeCategory
                ? "border-primary bg-primary-soft text-primary-deep"
                : "bg-card hover:border-primary/30",
            )}
          >
            Tout
          </Link>
          {(categories.data ?? []).map((category) => (
            <Link
              key={category.id}
              to="/explorer"
              search={bodySearch(term, category.slug)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
                activeCategory?.id === category.id
                  ? "border-primary bg-primary-soft text-primary-deep"
                  : "bg-card hover:border-primary/30",
              )}
            >
              {category.emoji ? `${category.emoji} ` : ""}
              {category.name}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          {catalog.isPending ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Chargement du catalogue…
            </p>
          ) : cards.length ? (
            <ProductGrid products={cards} />
          ) : (
            <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-card">
              <Package className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-bold">
                {needle || activeCategory ? "Aucun résultat" : "Aucun produit pour le moment"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {needle || activeCategory
                  ? "Essayez un autre mot-clé ou changez de catégorie."
                  : "Le catalogue se remplit au fil des publications de nos vendeurs. Revenez bientôt."}
              </p>
              {(needle || activeCategory) && (
                <Button asChild variant="soft" className="mt-5">
                  <Link to="/explorer" search={{}}>
                    Voir tout le catalogue
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
