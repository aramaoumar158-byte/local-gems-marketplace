import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  is_featured: boolean;
  created_at: string;
  store_id: string | null;
  seller_id: string | null;
  category_id: string | null;
  stores: { id: string; store_name: string; slug: string | null; city: string | null } | null;
  categories: { id: string; name: string; slug: string | null; emoji: string | null } | null;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  position: number;
};

export type StoreSummary = {
  id: string;
  store_name: string;
  slug: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
  rating: number;
  is_featured: boolean;
};

export type StoreProfile = StoreSummary & {
  phone: string | null;
  banner_url: string | null;
};

const CATALOG_SELECT =
  "id,name,description,price,stock,images,is_featured,created_at,store_id,seller_id,category_id, stores(id,store_name,slug,city), categories(id,name,slug,emoji)";

export function toCardData(product: CatalogRow): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    category: product.categories?.name ?? "Produit",
    store: product.stores?.store_name ?? "Boutique",
    storeSlug: product.stores?.slug ?? null,
    storeId: product.store_id,
    sellerId: product.seller_id,
    city: product.stores?.city ?? "—",
    price: Number(product.price ?? 0),
    image: product.images?.[0] ?? "",
    emoji: product.categories?.emoji ?? null,
  };
}

export function useCatalog() {
  return useQuery({
    queryKey: ["public-catalog"],
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select(CATALOG_SELECT)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["public-featured-products"],
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select(CATALOG_SELECT)
        .eq("status", "active")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("categories")
        .select("id,name,slug,emoji,position")
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

export function usePublicStores(featuredOnly = false) {
  return useQuery({
    queryKey: ["public-stores", featuredOnly],
    queryFn: async () => {
      let query = db
        .from("stores")
        .select("id,store_name,slug,description,city,logo_url,rating,is_featured")
        .eq("status", "approved")
        .order("rating", { ascending: false })
        .limit(12);
      if (featuredOnly) query = query.eq("is_featured", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StoreSummary[];
    },
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useStoreBySlug(key: string) {
  return useQuery({
    queryKey: ["public-store", key],
    enabled: Boolean(key),
    queryFn: async () => {
      const { data, error } = await db
        .from("stores")
        .select("id,store_name,slug,description,city,phone,logo_url,banner_url,rating")
        .eq(UUID_PATTERN.test(key) ? "id" : "slug", key)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as StoreProfile | null;
    },
  });
}

export function useStoreProducts(storeId: string | null) {
  return useQuery({
    queryKey: ["public-store-products", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select(CATALOG_SELECT)
        .eq("status", "active")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["public-product", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select(CATALOG_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CatalogRow | null;
    },
  });
}

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-ids", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await db
        .from("favorites")
        .select("product_id")
        .eq("user_id", user?.id);
      if (error) throw error;
      return (data ?? []).map((row: any) => row.product_id as string);
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("AUTH_REQUIRED");
      if (isFavorite) {
        const { error } = await db
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.isFavorite ? "Retiré des favoris" : "Ajouté aux favoris");
      void queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["client-favorites"] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        toast.error("Connectez-vous pour enregistrer vos favoris.", {
          action: {
            label: "Se connecter",
            onClick: () => {
              window.location.href = "/auth";
            },
          },
        });
        return;
      }
      toast.error("Action impossible pour le moment. Réessayez.");
    },
  });
}

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: ProductCardData[];
  columns?: 3 | 4;
}) {
  const favorites = useFavoriteIds();
  const toggle = useToggleFavorite();
  const favoriteIds = new Set(favorites.data ?? []);
  return (
    <div
      className={
        columns === 3
          ? "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3"
          : "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
      }
    >
      {products.map((product) => {
        const isFavorite = product.id ? favoriteIds.has(product.id) : false;
        return (
          <ProductCard
            key={product.id ?? `${product.name}-${product.price}`}
            product={product}
            isFavorite={isFavorite}
            onToggleFavorite={() => {
              if (product.id) toggle.mutate({ productId: product.id, isFavorite });
            }}
          />
        );
      })}
    </div>
  );
}

export function StoreCard({ store }: { store: StoreSummary }) {
  const href = store.slug ?? store.id;
  return (
    <Link
      to="/boutique/$slug"
      params={{ slug: href }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-primary">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.store_name} className="size-full object-cover" />
          ) : (
            <StoreIcon className="size-6" />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-bold">{store.store_name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {store.city ?? "Mali"}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-gold/15 px-2 py-1 text-xs font-bold text-gold">
          <BadgeCheck className="size-3.5" /> {Number(store.rating ?? 0).toFixed(1)}
        </span>
      </div>
      <p className="line-clamp-2 px-4 pb-4 text-sm text-muted-foreground">
        {store.description ?? "Boutique vérifiée sur ANW KA SUKU."}
      </p>
    </Link>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <Brand inverse />
          <p className="mt-3 text-sm text-ink-foreground/60">
            La plateforme digitale qui connecte fabricants, vendeurs et clients.
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-ink-foreground/70">
          <Link to="/explorer" className="hover:text-ink-foreground">
            Explorer
          </Link>
          <Link to="/conditions" className="hover:text-ink-foreground">
            Conditions
          </Link>
          <Link to="/confidentialite" className="hover:text-ink-foreground">
            Confidentialité
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "seller" }}
            className="hover:text-ink-foreground"
          >
            Devenir vendeur
          </Link>
        </nav>
        <p className="text-xs text-ink-foreground/50">
          ANW KA SUKU · Mali — les paiements en ligne ne sont pas encore activés.
        </p>
      </div>
    </footer>
  );
}
