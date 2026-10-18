import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CircleDollarSign,
  Heart,
  MessageCircle,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, MetricCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { compact, fcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth, type AppRole } from "@/hooks/useAuth";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

/* ---------------- helpers ---------------- */
const STATUS_FR: Record<string, string> = {
  active: "Actif",
  pending_verification: "Vérification",
  suspended: "Suspendu",
  pending: "En attente",
  approved: "Validée",
  rejected: "Rejeté",
  draft: "Brouillon",
  hidden: "Masqué",
  removed: "Supprimé",
  pending_review: "À modérer",
  published: "Publié",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  processing: "En traitement",
  completed: "Terminé",
  failed: "Échoué",
  succeeded: "Réussi",
  refunded: "Remboursé",
  settled: "Réglée",
  resolved: "Résolu",
  dismissed: "Classé",
  paid: "Payé",
  unpaid: "Non payé",
  in_transit: "En livraison",
};
function Pill({ s }: { s: string }) {
  const tone = [
    "active",
    "approved",
    "delivered",
    "completed",
    "succeeded",
    "settled",
    "resolved",
    "paid",
    "published",
  ].includes(s)
    ? "bg-success/10 text-success"
    : ["suspended", "rejected", "failed", "cancelled", "removed", "refunded"].includes(s)
      ? "bg-destructive/10 text-destructive"
      : [
            "pending",
            "pending_verification",
            "processing",
            "pending_review",
            "unpaid",
            "draft",
          ].includes(s)
        ? "bg-gold/15 text-gold"
        : "bg-secondary text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        tone,
      )}
    >
      {STATUS_FR[s] ?? s}
    </span>
  );
}
function useRows(key: string, fn: () => Promise<any>) {
  return useQuery({
    queryKey: [key],
    queryFn: async () => {
      const { data, error } = await fn();
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
function Panel({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          {kicker && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              {kicker}
            </p>
          )}
          <h2 className="text-base font-bold sm:text-lg">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
function EmptyLike({
  title,
  text,
  icon: Icon,
  action,
}: {
  title: string;
  text: string;
  icon: typeof Store;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-14 text-center shadow-card">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
function Chart({
  title,
  data,
  kind,
  money,
  gold,
}: {
  title: string;
  data: { d: string; v: number }[];
  kind: "area" | "bar" | "line";
  money?: boolean;
  gold?: boolean;
}) {
  const color = gold ? "var(--gold)" : "var(--primary)";
  const fmt = (v: number) => (money ? compact(v) : String(v));
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
      <XAxis dataKey="d" axisLine={false} tickLine={false} fontSize={11} minTickGap={16} />
      <YAxis axisLine={false} tickLine={false} fontSize={11} width={44} tickFormatter={fmt} />
      <Tooltip
        formatter={(v: number) => (money ? fcfa(v) : v)}
        contentStyle={{ borderRadius: 10, border: "1px solid var(--border)" }}
      />
    </>
  );
  return (
    <Panel title={title} kicker="Activité">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "area" ? (
            <AreaChart data={data}>
              {common}
              <Area dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          ) : kind === "bar" ? (
            <BarChart data={data}>
              {common}
              <Bar dataKey="v" fill={color} radius={[5, 5, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              {common}
              <Line dataKey="v" stroke={color} strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
/** Regroupe une série d'événements par jour sur les 7 derniers jours (lun→dim). */
function bucketLast7(rows: any[], val: (r: any) => number) {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const now = new Date();
  const startOfWeek = new Date(now);
  const dow = (now.getDay() + 6) % 7; // lundi = 0
  startOfWeek.setDate(now.getDate() - dow);
  startOfWeek.setHours(0, 0, 0, 0);
  const buckets = days.map((d) => ({ d, v: 0 }));
  rows.forEach((r) => {
    const t = new Date(r.created_at).getTime();
    if (t < startOfWeek.getTime()) return;
    const idx = Math.floor((t - startOfWeek.getTime()) / 864e5);
    const bucket = buckets[idx];
    if (bucket) bucket.v += val(r);
  });
  return buckets;
}

/* ---------------- CLIENT ---------------- */
export function ClientPage({ slug = "" }: { slug?: string }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [q, setQ] = useState("");
  const titles: Record<string, string> = {
    explorer: "Explorer les produits",
    favoris: "Mes favoris",
    panier: "Mon panier",
    commandes: "Mes commandes",
    messages: "Mes messages",
    profil: "Mon profil",
  };
  const titleOf = (s: string): string => titles[s] ?? "Tableau de bord";

  // Catalogue public (produits actifs) avec boutique + catégorie jointes.
  const catalog = useRows("client-catalog", () =>
    db
      .from("products")
      .select(
        "id,name,price,images,status,created_at, stores(store_name,city), categories(name,emoji)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(40),
  );
  const favorites = useRows("client-favorites", () =>
    uid
      ? db
          .from("favorites")
          .select(
            "id, product_id, products(id,name,price,images, categories(name,emoji), stores(store_name,city))",
          )
          .eq("user_id", uid)
      : Promise.resolve({ data: [] }),
  );
  const orders = useRows("client-orders", () =>
    uid
      ? db
          .from("orders")
          .select(
            "id,reference,total_amount,status,payment_status,created_at, order_items(product_name,quantity,unit_price)",
          )
          .eq("customer_id", uid)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  );

  const toCard = (p: any) => ({
    name: p.name,
    category: p.categories?.name ?? "Produit",
    store: p.stores?.store_name ?? "Boutique",
    city: p.stores?.city ?? "—",
    price: Number(p.price ?? 0),
    image: p.images?.[0] ?? "/favicon.ico",
  });

  if (slug === "explorer") {
    const needle = q.trim().toLowerCase();
    const items = (catalog.data ?? [])
      .map(toCard)
      .filter(
        (p) =>
          !needle || `${p.name} ${p.category} ${p.store} ${p.city}`.toLowerCase().includes(needle),
      );
    return (
      <DashboardShell role="client" title={titleOf(slug)}>
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit, une boutique, une ville…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        {catalog.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement du catalogue…
          </p>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.name + p.price} product={p} />
            ))}
          </div>
        ) : (
          <EmptyLike
            title={needle ? "Aucun résultat" : "Aucun produit pour le moment"}
            text={
              needle
                ? "Essayez une autre recherche : nom du produit, boutique ou ville."
                : "Le catalogue se remplit au fil des publications de nos vendeurs. Revenez bientôt."
            }
            icon={Package}
          />
        )}
      </DashboardShell>
    );
  }
  if (slug === "favoris") {
    const items = (favorites.data ?? [])
      .filter((f: any) => f.products)
      .map((f: any) => toCard(f.products));
    return (
      <DashboardShell role="client" title={titleOf(slug)}>
        {favorites.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement de vos favoris…
          </p>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {items.map((p) => (
              <ProductCard key={p.name + p.price} product={p} />
            ))}
          </div>
        ) : (
          <EmptyLike
            title="Aucun favori"
            text="Touchez le cœur d'un produit pour l'ajouter à vos favoris."
            icon={Heart}
          />
        )}
      </DashboardShell>
    );
  }
  if (slug === "panier") {
    return (
      <DashboardShell role="client" title={titleOf(slug)}>
        <EmptyLike
          title="Votre panier vous attend"
          text="Les produits ajoutés apparaîtront ici. Explorez les créations de nos fabricants."
          icon={ShoppingBag}
        />
      </DashboardShell>
    );
  }
  if (slug === "messages") {
    return (
      <DashboardShell role="client" title={titleOf(slug)}>
        <EmptyLike
          title="Aucune nouvelle conversation"
          text="Vous pourrez discuter directement avec les vendeurs depuis leurs produits et boutiques."
          icon={MessageCircle}
        />
      </DashboardShell>
    );
  }
  if (slug === "profil") return <ProfileView role="client" />;
  if (slug === "commandes") {
    return (
      <DashboardShell role="client" title={titleOf(slug)}>
        {orders.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement de vos commandes…
          </p>
        ) : (orders.data ?? []).length ? (
          <OrdersTable rows={orders.data ?? []} />
        ) : (
          <EmptyLike
            title="Aucune commande"
            text="Vos commandes apparaîtront ici après votre premier achat."
            icon={ShoppingBag}
          />
        )}
      </DashboardShell>
    );
  }

  // Dashboard
  const o = orders.data ?? [];
  const inProgress = o.filter((x: any) =>
    ["pending", "confirmed", "shipped"].includes(x.status),
  ).length;
  const month = o.filter((x: any) => new Date(x.created_at).getMonth() === new Date().getMonth());
  const spent = month.reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0);
  const favCount = favorites.data?.length ?? 0;
  const sales = bucketLast7(o, () => 1);
  return (
    <DashboardShell role="client" title="Bonjour, bienvenue 👋">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Commandes en cours"
          value={String(inProgress)}
          note="À suivre"
          icon={Package}
        />
        <MetricCard
          label="Produits favoris"
          value={String(favCount)}
          note="Sauvegardés"
          icon={Heart}
          accent
        />
        <MetricCard label="Messages" value="—" note="Messagerie à venir" icon={MessageCircle} />
        <MetricCard
          label="Achats ce mois"
          value={fcfa(spent)}
          note={`${month.length} commande(s)`}
          icon={ShoppingBag}
          accent
        />
      </div>
      <div className="mt-6">
        <Chart title="Vos commandes sur 7 jours" data={sales} kind="bar" />
      </div>
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Pour vous</p>
          <h2 className="mt-1 text-xl font-bold">À découvrir aujourd'hui</h2>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {(catalog.data ?? []).slice(0, 4).map((p: any) => (
          <ProductCard key={p.id} product={toCard(p)} />
        ))}
      </div>
    </DashboardShell>
  );
}

function OrdersTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              {["Référence", "Produits", "Total", "Statut"].map((h) => (
                <th key={h} className="px-5 py-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-5 py-4 font-bold">{r.reference}</td>
                <td className="px-5 py-4">
                  {(r.order_items ?? []).map((i: any) => i.product_name).join(", ") || "—"}
                </td>
                <td className="px-5 py-4 font-bold">{fcfa(r.total_amount)}</td>
                <td className="px-5 py-4">
                  <Pill s={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- SELLER ---------------- */
export function SellerPage({ slug = "" }: { slug?: string }) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const titles: Record<string, string> = {
    boutique: "Ma boutique",
    produits: "Mes produits",
    "ajouter-produit": "Ajouter un produit",
    commandes: "Commandes",
    messages: "Messages",
    ventes: "Mes ventes",
    revenus: "Mes revenus",
    profil: "Profil professionnel",
  };
  const titleOf = (s: string): string => titles[s] ?? "Vue d'ensemble";

  const store = useQuery({
    queryKey: ["seller-store", uid],
    queryFn: async () => {
      if (!uid) return null;
      const { data, error } = await db.from("stores").select("*").eq("owner_id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const products = useRows("seller-products", () =>
    uid
      ? db
          .from("products")
          .select("id,name,price,stock,status,images,created_at, categories(name,emoji)")
          .eq("seller_id", uid)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  );
  const orders = useRows("seller-orders", () =>
    uid
      ? db
          .from("orders")
          .select(
            "id,reference,total_amount,commission_amount,status,created_at, order_items(product_name,quantity)",
          )
          .eq("seller_id", uid)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  );

  const storeRow = store.data;

  async function saveStore(input: { store_name: string; city: string; description: string }) {
    if (!uid) return;
    const payload = {
      owner_id: uid,
      store_name: input.store_name.trim(),
      city: input.city.trim() || null,
      description: input.description.trim() || null,
      status: "pending" as const,
    };
    const { error } = storeRow
      ? await db
          .from("stores")
          .update({
            store_name: payload.store_name,
            city: payload.city,
            description: payload.description,
          })
          .eq("id", storeRow.id)
      : await db.from("stores").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(storeRow ? "Boutique mise à jour" : "Boutique créée — en attente de validation");
    void qc.invalidateQueries({ queryKey: ["seller-store"] });
  }

  async function addProduct(input: {
    name: string;
    price: number;
    stock: number;
    description: string;
    category_id: string | null;
  }) {
    if (!uid) return;
    if (!storeRow) {
      toast.error("Créez d'abord votre boutique.");
      return;
    }
    const { error } = await db.from("products").insert({
      seller_id: uid,
      store_id: storeRow.id,
      name: input.name.trim(),
      price: input.price,
      stock: input.stock,
      description: input.description.trim() || null,
      category_id: input.category_id,
      status: "pending_review",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Produit envoyé — en attente de modération");
    void qc.invalidateQueries({ queryKey: ["seller-products"] });
  }

  if (slug === "boutique") {
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        {store.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement de votre boutique…
          </p>
        ) : storeRow ? (
          <StoreDetail store={storeRow} onEdit={saveStore} />
        ) : (
          <StoreCreate onCreate={saveStore} />
        )}
      </DashboardShell>
    );
  }
  if (slug === "produits") {
    const list = products.data ?? [];
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        <div className="mb-5 flex justify-end">
          <Button asChild variant="hero">
            <a href="/seller/ajouter-produit">
              <Plus /> Ajouter un produit
            </a>
          </Button>
        </div>
        {products.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement de vos produits…
          </p>
        ) : list.length ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Produit", "Catégorie", "Prix", "Stock", "Statut"].map((h) => (
                      <th key={h} className="px-5 py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-5 py-4 font-bold">{p.name}</td>
                      <td className="px-5 py-4">{p.categories?.name ?? "—"}</td>
                      <td className="px-5 py-4 font-bold">{fcfa(p.price)}</td>
                      <td className="px-5 py-4">{p.stock}</td>
                      <td className="px-5 py-4">
                        <Pill s={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyLike
            title="Aucun produit"
            text="Ajoutez votre premier produit pour commencer à vendre."
            icon={Package}
          />
        )}
      </DashboardShell>
    );
  }
  if (slug === "ajouter-produit") {
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        <ProductForm onSubmit={addProduct} hasStore={!!storeRow} />
      </DashboardShell>
    );
  }
  if (slug === "commandes") {
    const list = orders.data ?? [];
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        {orders.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement des commandes…
          </p>
        ) : list.length ? (
          <OrdersTable rows={list} />
        ) : (
          <EmptyLike
            title="Aucune commande"
            text="Les commandes de vos clients apparaîtront ici."
            icon={ShoppingBag}
          />
        )}
      </DashboardShell>
    );
  }
  if (slug === "messages") {
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        <EmptyLike
          title="Messages clients"
          text="Les conversations avec vos clients apparaîtront ici. La messagerie en temps réel sera activée lors d'un prochain sprint."
          icon={MessageCircle}
        />
      </DashboardShell>
    );
  }
  if (slug === "profil") return <ProfileView role="seller" />;

  if (slug === "ventes" || slug === "revenus") {
    const o = (orders.data ?? []).filter((x: any) => x.status !== "cancelled");
    const gross = o.reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0);
    const com = o.reduce((s: number, x: any) => s + Number(x.commission_amount ?? 0), 0);
    const sales = bucketLast7(o, (r: any) => Number(r.total_amount ?? 0));
    return (
      <DashboardShell role="seller" title={titleOf(slug)}>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Ventes brutes"
            value={fcfa(gross)}
            note="Hors annulées"
            icon={TrendingUp}
          />
          <MetricCard
            label="Transactions"
            value={String(o.length)}
            note="Commandes"
            icon={CircleDollarSign}
            accent
          />
          <MetricCard
            label="Revenus nets"
            value={fcfa(gross - com)}
            note="Après commission"
            icon={BarChart3}
          />
        </div>
        <div className="mt-6">
          <Chart title="Vos ventes sur 7 jours" data={sales} kind="area" money />
        </div>
      </DashboardShell>
    );
  }

  // Dashboard
  const o = (orders.data ?? []).filter((x: any) => x.status !== "cancelled");
  const toTreat = o.filter((x: any) => x.status === "pending").length;
  const gross = o.reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0);
  const activeProducts = (products.data ?? []).filter((p: any) => p.status === "active").length;
  const lowStock = (products.data ?? []).filter((p: any) => Number(p.stock) <= 3).length;
  const sales = bucketLast7(o, (r: any) => Number(r.total_amount ?? 0));
  const ordersC = bucketLast7(o, () => 1);
  return (
    <DashboardShell role="seller" title="Vue d'ensemble">
      {!storeRow && (
        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 p-5 text-sm">
          <b>Configurez votre boutique</b> pour apparaître sur la plateforme et recevoir des
          commandes.{" "}
          <a href="/seller/boutique" className="mt-2 inline-block font-bold text-primary underline">
            Créer ma boutique →
          </a>
        </div>
      )}
      <div className="rounded-xl bg-brand p-5 text-primary-foreground shadow-float sm:p-7">
        <p className="text-sm font-semibold text-primary-foreground/70">
          Bonjour, votre boutique progresse
        </p>
        <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold">Une nouvelle semaine, de nouvelles opportunités.</h2>
            <p className="mt-2 text-sm text-primary-foreground/70">
              {toTreat} commande(s) à traiter aujourd'hui.
            </p>
          </div>
          <Button asChild variant="gold">
            <a href="/seller/ajouter-produit">
              <Plus /> Ajouter un produit
            </a>
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventes (cumul)"
          value={fcfa(gross)}
          note="Hors annulées"
          icon={TrendingUp}
        />
        <MetricCard
          label="Commandes"
          value={String(o.length)}
          note={`${toTreat} à traiter`}
          icon={Package}
          accent
        />
        <MetricCard
          label="Produits actifs"
          value={String(activeProducts)}
          note={lowStock ? `${lowStock} stock(s) faible(s)` : "Stocks OK"}
          icon={Store}
        />
        <MetricCard
          label="Boutique"
          value={storeRow ? (STATUS_FR[storeRow.status] ?? storeRow.status) : "Non créée"}
          note={storeRow ? "Statut actuel" : "À configurer"}
          icon={Store}
          accent
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Chart title="Vos ventes sur 7 jours" data={sales} kind="area" money />
        <Chart title="Vos commandes sur 7 jours" data={ordersC} kind="line" />
      </div>
    </DashboardShell>
  );
}

/* ---------------- sous-formulaires ---------------- */
function StoreDetail({
  store,
  onEdit,
}: {
  store: any;
  onEdit: (i: { store_name: string; city: string; description: string }) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-20 place-items-center rounded-xl bg-brand text-2xl font-extrabold text-primary-foreground">
          {(store.store_name ?? "AK").slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-success">
            Boutique enregistrée
          </p>
          <h2 className="mt-1 text-2xl font-bold">{store.store_name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {store.city ?? "Ville non renseignée"} · <Pill s={store.status} />
          </p>
        </div>
      </div>
      {store.description && (
        <p className="mt-4 text-sm text-muted-foreground">{store.description}</p>
      )}
      <StoreCreate initial={store} onCreate={onEdit} compact />
    </div>
  );
}
function StoreCreate({
  initial,
  onCreate,
  compact,
}: {
  initial?: any;
  onCreate: (i: { store_name: string; city: string; description: string }) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <form
      className={cn(compact ? "mt-6" : "rounded-xl border bg-card p-6 shadow-card")}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await onCreate({
          store_name: String(f.get("store_name") ?? ""),
          city: String(f.get("city") ?? ""),
          description: String(f.get("description") ?? ""),
        });
      }}
    >
      {!compact && <h2 className="text-xl font-bold">Créer ma boutique</h2>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-bold">Nom de la boutique</span>
          <input
            name="store_name"
            defaultValue={initial?.store_name ?? ""}
            required
            maxLength={100}
            placeholder="Ex. Atelier Terre & Feu"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label>
          <span className="text-sm font-bold">Ville</span>
          <input
            name="city"
            defaultValue={initial?.city ?? ""}
            maxLength={60}
            placeholder="Ex. Bamako"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="text-sm font-bold">Description</span>
          <textarea
            name="description"
            defaultValue={initial?.description ?? ""}
            maxLength={500}
            placeholder="Présentez votre savoir-faire…"
            className="mt-2 min-h-28 w-full rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="hero">
          {initial ? "Enregistrer" : "Créer ma boutique"}
        </Button>
      </div>
    </form>
  );
}
function ProductForm({
  onSubmit,
  hasStore,
}: {
  onSubmit: (i: {
    name: string;
    price: number;
    stock: number;
    description: string;
    category_id: string | null;
  }) => Promise<void>;
  hasStore: boolean;
}) {
  const cats = useRows("seller-categories", () =>
    db.from("categories").select("id,name,emoji").eq("is_active", true).order("position"),
  );
  return (
    <form
      className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-card sm:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await onSubmit({
          name: String(f.get("name") ?? ""),
          price: Number(f.get("price") ?? 0),
          stock: Number(f.get("stock") ?? 0),
          description: String(f.get("description") ?? ""),
          category_id: (f.get("category_id") as string) || null,
        });
      }}
    >
      {!hasStore && (
        <p className="mb-4 rounded-lg bg-gold/10 p-3 text-sm font-semibold text-gold">
          Créez d'abord votre boutique avant d'ajouter des produits.{" "}
          <a href="/seller/boutique" className="underline">
            Aller à « Ma boutique » →
          </a>
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-bold">Nom du produit</span>
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Ex. Sac bogolan"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label>
          <span className="text-sm font-bold">Prix (FCFA)</span>
          <input
            name="price"
            type="number"
            min={0}
            required
            placeholder="15000"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label>
          <span className="text-sm font-bold">Stock disponible</span>
          <input
            name="stock"
            type="number"
            min={0}
            required
            placeholder="10"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="text-sm font-bold">Catégorie</span>
          <select
            name="category_id"
            className="mt-2 h-12 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">— Aucune —</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-sm font-bold">Description</span>
          <textarea
            name="description"
            maxLength={1000}
            placeholder="Présentez les matériaux, la fabrication et les dimensions…"
            className="mt-2 min-h-32 w-full rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="sm:col-span-2 rounded-lg border border-dashed bg-secondary p-8 text-center text-sm text-muted-foreground">
          <Package className="mx-auto mb-2 size-6" />
          Ajoutez plusieurs photos du produit (à venir)
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="hero" disabled={!hasStore}>
          Publier le produit
        </Button>
      </div>
    </form>
  );
}
function ProfileView({ role }: { role: AppRole }) {
  const { profile } = useAuth();
  return (
    <DashboardShell role={role} title={role === "seller" ? "Profil professionnel" : "Mon profil"}>
      <form className="max-w-2xl rounded-xl border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">Informations personnelles</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["Nom complet", profile?.full_name],
            ["Numéro de téléphone", profile?.phone],
            ["Adresse email", profile?.email],
            ["Ville", profile?.city],
          ].map(([label, value]) => (
            <label key={String(label)}>
              <span className="text-sm font-bold">{label}</span>
              <input
                defaultValue={value ? String(value) : ""}
                placeholder={String(label)}
                className="mt-2 h-12 w-full rounded-lg border bg-background px-3"
              />
            </label>
          ))}
        </div>
        <Button type="button" variant="hero" className="mt-6">
          Enregistrer
        </Button>
      </form>
    </DashboardShell>
  );
}
