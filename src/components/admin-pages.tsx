/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BadgeCheck, Ban, Bell, CircleDollarSign, Eye, EyeOff, Flag, Lock, Package, RotateCcw, Search, ShieldAlert, ShieldCheck, ShoppingBag, Star, Store, Trash2, TrendingUp, UserCheck, Users, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, MetricCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { compact, fcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminAuditLog } from "@/components/admin-audit-log";

const db = supabase as any;

/* ---------------- helpers ---------------- */
const dfr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const STATUS_FR: Record<string, string> = {
  active: "Actif", pending_verification: "Vérification", suspended: "Suspendu", pending: "En attente", approved: "Validée", rejected: "Rejeté",
  draft: "Brouillon", hidden: "Masqué", removed: "Supprimé", pending_review: "À modérer", published: "Publié",
  confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée", processing: "En traitement", completed: "Terminé",
  failed: "Échoué", succeeded: "Réussi", refunded: "Remboursé", settled: "Réglée", resolved: "Résolu", dismissed: "Classé", paid: "Payé", unpaid: "Non payé", in_transit: "En livraison",
};
function Pill({ s }: { s: string }) {
  const tone = ["active", "approved", "delivered", "completed", "succeeded", "settled", "resolved", "paid", "published"].includes(s) ? "bg-success/10 text-success"
    : ["suspended", "rejected", "failed", "cancelled", "removed", "refunded"].includes(s) ? "bg-destructive/10 text-destructive"
    : ["pending", "pending_verification", "processing", "pending_review", "unpaid"].includes(s) ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", tone)}>{STATUS_FR[s] ?? s}</span>;
}
function useRows(key: string, fn: () => Promise<any>) {
  return useQuery({ queryKey: ["admin", key], queryFn: async () => { const { data, error } = await fn(); if (error) throw error; return (data ?? []) as any[]; } });
}
function useAction() {
  const qc = useQueryClient();
  return async (action: string, target_type: string, target_id: string, value?: string) => {
    const { error } = await db.rpc("admin_action", { _action: action, _target_type: target_type, _target_id: target_id, _value: value ?? null, _note: null });
    if (error) { toast.error(error.message); return; }
    toast.success("Action enregistrée dans le journal d'audit");
    void qc.invalidateQueries({ queryKey: ["admin"] });
  };
}
function Panel({ title, kicker, right, children }: { title: string; kicker?: string; right?: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-4 shadow-card sm:p-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div>{kicker && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{kicker}</p>}<h2 className="text-base font-bold sm:text-lg">{title}</h2></div>{right}</div>{children}</section>;
}
function Demo() { return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Démo</span>; }

type Col = { h: string; c: (r: any) => ReactNode; hide?: boolean };
function DataTable({ rows, cols, search, filters, actions, empty = "Aucun élément" }: { rows: any[]; cols: Col[]; search?: (r: any) => string; filters?: { label: string; get: (r: any) => string; options: string[] }; actions?: (r: any) => ReactNode; empty?: string }) {
  const initialQ = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "";
  const [q, setQ] = useState(initialQ);
  const [f, setF] = useState("all");
  const list = rows.filter((r) => (!q || (search?.(r) ?? "").toLowerCase().includes(q.toLowerCase())) && (f === "all" || filters?.get(r) === f));
  return <div className="overflow-hidden rounded-xl border bg-card shadow-card">
    <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
      {search && <label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>}
      {filters && <select value={f} onChange={(e) => setF(e.target.value)} className="h-11 rounded-lg border bg-background px-3 text-sm"><option value="all">{filters.label} : tous</option>{filters.options.map((o) => <option key={o} value={o}>{STATUS_FR[o] ?? o}</option>)}</select>}
      <span className="text-xs font-semibold text-muted-foreground sm:ml-auto">{list.length} résultat(s)</span>
    </div>
    {/* desktop */}
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-secondary text-[11px] uppercase tracking-wide text-muted-foreground"><tr>{cols.map((c) => <th key={c.h} className="px-4 py-3 font-bold">{c.h}</th>)}{actions && <th className="px-4 py-3 text-right font-bold">Actions</th>}</tr></thead>
      <tbody>{list.map((r, i) => <tr key={r.id ?? i} className="border-t hover:bg-secondary/40">{cols.map((c) => <td key={c.h} className="px-4 py-3 align-middle">{c.c(r)}</td>)}{actions && <td className="px-4 py-3"><div className="flex justify-end gap-1.5">{actions(r)}</div></td>}</tr>)}</tbody></table></div>
    {/* mobile cards */}
    <div className="divide-y md:hidden">{list.map((r, i) => <div key={r.id ?? i} className="space-y-1.5 p-4">{cols.filter((c) => !c.hide).map((c) => <div key={c.h} className="flex justify-between gap-3 text-sm"><span className="text-xs font-semibold text-muted-foreground">{c.h}</span><span className="text-right">{c.c(r)}</span></div>)}{actions && <div className="flex flex-wrap gap-1.5 pt-2">{actions(r)}</div>}</div>)}</div>
    {!list.length && <p className="p-10 text-center text-sm text-muted-foreground">{empty}</p>}
  </div>;
}
const Act = ({ icon: I, label, onClick, tone }: { icon: typeof Ban; label: string; onClick: () => void; tone?: "danger" | "ok" }) =>
  <Button size="sm" variant="outline" onClick={onClick} className={cn("h-9", tone === "danger" && "text-destructive hover:text-destructive", tone === "ok" && "text-success hover:text-success")}><I className="size-3.5" />{label}</Button>;

/* ---------------- périodes ---------------- */
const PERIODS = [["1", "Aujourd'hui"], ["7", "7 jours"], ["30", "30 jours"], ["90", "3 mois"], ["365", "12 mois"], ["custom", "Personnalisée"]] as const;
function bucket(rows: any[], days: number, from: Date, val: (r: any) => number) {
  const monthly = days > 90; const map = new Map<string, number>();
  const step = monthly ? 30 : days > 30 ? 7 : 1; const n = Math.max(1, Math.ceil(days / step));
  for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.now() - i * step * 864e5); map.set(monthly ? d.toLocaleDateString("fr-FR", { month: "short" }) : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), 0); }
  rows.filter((r) => new Date(r.created_at) >= from).forEach((r) => { const d = new Date(r.created_at); const k = monthly ? d.toLocaleDateString("fr-FR", { month: "short" }) : (() => { const idx = Math.floor((Date.now() - d.getTime()) / (step * 864e5)); const b = new Date(Date.now() - idx * step * 864e5); return b.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); })(); if (map.has(k)) map.set(k, (map.get(k) ?? 0) + val(r)); });
  return [...map].map(([d, v]) => ({ d, v }));
}

/* ---------------- dashboard ---------------- */
function Dashboard() {
  const [p, setP] = useState<string>("30");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const profiles = useRows("profiles", () => db.from("profiles").select("id,created_at,status"));
  const roles = useRows("roles", () => db.from("user_roles").select("user_id,role,created_at"));
  const stores = useRows("stores", () => db.from("stores").select("id,status,created_at"));
  const products = useRows("products", () => db.from("products").select("id,status,created_at"));
  const orders = useRows("orders", () => db.from("orders").select("id,total_amount,commission_amount,status,created_at").order("created_at"));
  const coms = useRows("commissions", () => db.from("commissions").select("commission_amount,created_at"));
  const pays = useRows("payments", () => db.from("payments").select("id,created_at"));
  const wds = useRows("withdrawals", () => db.from("withdrawals").select("status,amount"));
  const reps = useRows("reports", () => db.from("reports").select("status"));

  const days = p === "custom" && from ? Math.max(1, Math.ceil(((to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()) / 864e5)) : Number(p === "custom" ? 30 : p);
  const start = p === "custom" && from ? new Date(from) : new Date(Date.now() - days * 864e5);
  const end = p === "custom" && to ? new Date(to + "T23:59:59") : new Date();
  const inP = (r: any) => { const d = new Date(r.created_at); return d >= start && d <= end; };

  const o = (orders.data ?? []).filter(inP).filter((x) => x.status !== "cancelled");
  const rl = roles.data ?? [];
  const k = {
    users: profiles.data?.length ?? 0, clients: rl.filter((r) => r.role === "client").length, sellers: rl.filter((r) => r.role === "seller").length,
    stores: stores.data?.length ?? 0, products: products.data?.length ?? 0, orders: o.length,
    volume: o.reduce((s, x) => s + Number(x.total_amount), 0), coms: (coms.data ?? []).filter(inP).reduce((s, x) => s + Number(x.commission_amount), 0),
    tx: (pays.data ?? []).filter(inP).length, wd: (wds.data ?? []).filter((w) => w.status === "pending").length, rep: (reps.data ?? []).filter((r) => r.status === "pending").length,
  };
  const sales = bucket(o, days, start, (r) => Number(r.total_amount));
  const ordersC = bucket(o, days, start, () => 1);
  const revenue = bucket((coms.data ?? []), days, start, (r) => Number(r.commission_amount));
  const usersC = bucket(profiles.data ?? [], days, start, () => 1);
  const sellersC = bucket(rl.filter((r) => r.role === "seller"), days, start, () => 1);
  const prodC = bucket(products.data ?? [], days, start, () => 1);

  return <DashboardShell role="admin" title="Centre de contrôle">
    <div className="rounded-xl bg-brand p-5 text-primary-foreground shadow-float sm:p-6"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/60">ANW KA SUKU · Super Admin</p><h2 className="mt-1 text-2xl font-bold">Pilotage de la marketplace</h2><p className="mt-1 text-sm text-primary-foreground/70">{k.wd} retrait(s) et {k.rep} signalement(s) attendent une décision.</p></div>
      <div className="flex flex-wrap gap-1.5">{PERIODS.map(([v, l]) => <button key={v} onClick={() => setP(v)} className={cn("h-9 rounded-lg px-3 text-xs font-bold transition", p === v ? "bg-gold-gradient text-ink" : "bg-primary-foreground/10 hover:bg-primary-foreground/20")}>{l}</button>)}</div></div>
      {p === "custom" && <div className="mt-4 flex flex-wrap gap-2 text-sm"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg bg-background px-3 text-foreground" /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg bg-background px-3 text-foreground" /></div>}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
      <MetricCard label="Utilisateurs" value={compact(k.users)} note="Comptes réels" icon={Users} />
      <MetricCard label="Clients" value={compact(k.clients)} note="Rôle client" icon={UserCheck} accent />
      <MetricCard label="Vendeurs" value={compact(k.sellers)} note="Fabricants" icon={Store} />
      <MetricCard label="Boutiques" value={compact(k.stores)} note="Toutes statuts" icon={Store} accent />
      <MetricCard label="Produits" value={compact(k.products)} note="Catalogue" icon={Package} />
      <MetricCard label="Commandes" value={compact(k.orders)} note="Sur la période" icon={ShoppingBag} accent />
      <MetricCard label="Volume des ventes" value={fcfa(k.volume)} note="Hors annulées" icon={TrendingUp} />
      <MetricCard label="Revenus plateforme" value={fcfa(k.coms)} note="Commissions 10 %" icon={CircleDollarSign} accent />
      <MetricCard label="Commissions" value={fcfa(k.coms)} note="Estimées" icon={CircleDollarSign} />
      <MetricCard label="Transactions" value={compact(k.tx)} note="Paiements enregistrés" icon={WalletCards} accent />
      <MetricCard label="Retraits en attente" value={String(k.wd)} note="À traiter" icon={WalletCards} />
      <MetricCard label="Signalements" value={String(k.rep)} note="En attente" icon={Flag} accent />
    </div>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <Chart title="Évolution des ventes" kind="area" data={sales} money />
      <Chart title="Revenus & commissions" kind="bar" data={revenue} money gold />
      <Chart title="Commandes" kind="line" data={ordersC} />
      <Chart title="Nouveaux utilisateurs" kind="bar" data={usersC} />
      <Chart title="Nouveaux vendeurs" kind="line" data={sellersC} gold />
      <Chart title="Nouveaux produits" kind="bar" data={prodC} />
    </div>
    <p className="mt-4 text-xs text-muted-foreground">Les commandes, paiements et commissions affichés sont des données de démonstration tant qu'aucun prestataire de paiement n'est connecté.</p>
  </DashboardShell>;
}
function Chart({ title, data, kind, money, gold }: { title: string; data: { d: string; v: number }[]; kind: "area" | "bar" | "line"; money?: boolean; gold?: boolean }) {
  const color = gold ? "var(--gold)" : "var(--primary)";
  const fmt = (v: number) => (money ? compact(v) : String(v));
  const common = <><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="d" axisLine={false} tickLine={false} fontSize={11} minTickGap={16} /><YAxis axisLine={false} tickLine={false} fontSize={11} width={44} tickFormatter={fmt} /><Tooltip formatter={(v: number) => (money ? fcfa(v) : v)} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)" }} /></>;
  return <Panel title={title} kicker="Analyse"><div className="h-56">
    <ResponsiveContainer width="100%" height="100%">{kind === "area" ? <AreaChart data={data}>{common}<Area dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} /></AreaChart> : kind === "bar" ? <BarChart data={data}>{common}<Bar dataKey="v" fill={color} radius={[5, 5, 0, 0]} /></BarChart> : <LineChart data={data}>{common}<Line dataKey="v" stroke={color} strokeWidth={2.5} dot={false} /></LineChart>}</ResponsiveContainer>
  </div></Panel>;
}

/* ---------------- utilisateurs ---------------- */
function UsersPage({ only }: { only?: "seller" }) {
  const act = useAction();
  const [sel, setSel] = useState<any>(null);
  const profiles = useRows("profiles-full", () => db.from("profiles").select("*").order("created_at", { ascending: false }));
  const roles = useRows("roles", () => db.from("user_roles").select("user_id,role"));
  const stores = useRows("stores-full", () => db.from("stores").select("*"));
  const roleOf = (id: string) => { const r = (roles.data ?? []).filter((x) => x.user_id === id).map((x) => x.role); return r.includes("super_admin") ? "super_admin" : r.includes("admin") ? "admin" : r.includes("seller") ? "seller" : "client"; };
  const ROLE_FR: Record<string, string> = { client: "Client", seller: "Vendeur", admin: "Admin", super_admin: "Super Admin" };
  let rows = (profiles.data ?? []).map((p) => ({ ...p, role: roleOf(p.id), store: (stores.data ?? []).find((s) => s.owner_id === p.id) }));
  if (only) rows = rows.filter((r) => r.role === "seller");
  return <DashboardShell role="admin" title={only ? "Vendeurs / Fabricants" : "Utilisateurs"}>
    <DataTable rows={rows} search={(r) => `${r.full_name} ${r.phone} ${r.email}`} filters={{ label: "Statut", get: (r) => r.status, options: ["active", "pending_verification", "suspended"] }}
      cols={[
        { h: "Nom", c: (r) => <span className="font-bold">{r.full_name || "Sans nom"}</span> },
        { h: "Téléphone", c: (r) => r.phone ? `+${r.phone}` : "—" },
        { h: "Email", c: (r) => r.email ?? "—", hide: true },
        ...(only ? [{ h: "Boutique", c: (r: any) => r.store?.store_name ?? <span className="text-muted-foreground">Non configurée</span> }] : [{ h: "Rôle", c: (r: any) => <span className="text-xs font-bold">{ROLE_FR[r.role]}</span> }]),
        { h: "Inscription", c: (r) => dfr(r.created_at) },
        { h: "Dernière activité", c: (r) => dfr(r.last_active_at ?? r.updated_at), hide: true },
        { h: "Statut", c: (r) => <Pill s={r.status} /> },
      ]}
      actions={(r) => <>
        <Act icon={Eye} label="Profil" onClick={() => setSel(r)} />
        {r.role !== "admin" && r.role !== "super_admin" && (r.status === "suspended"
          ? <Act icon={RotateCcw} label="Réactiver" tone="ok" onClick={() => act("USER_REACTIVATED", "user", r.id)} />
          : <Act icon={Ban} label="Suspendre" tone="danger" onClick={() => confirm(`Suspendre ${r.full_name} ?`) && act("USER_SUSPENDED", "user", r.id)} />)}
        {only && r.store && r.store.status !== "approved" && <Act icon={BadgeCheck} label="Valider boutique" tone="ok" onClick={() => act("STORE_APPROVED", "store", r.store.id)} />}
      </>} />
    {sel && <UserDrawer user={sel} onClose={() => setSel(null)} />}
  </DashboardShell>;
}
function UserDrawer({ user, onClose }: { user: any; onClose: () => void }) {
  const orders = useRows(`orders-of-${user.id}`, () => db.from("orders").select("id,reference,total_amount,status,created_at").or(`customer_id.eq.${user.id},seller_id.eq.${user.id}`).limit(20));
  const log = useRows(`log-of-${user.id}`, () => db.from("admin_audit_log").select("*").eq("target_id", user.id).order("created_at", { ascending: false }));
  const products = useRows(`prod-of-${user.id}`, () => db.from("products").select("id,name,price,status").eq("seller_id", user.id));
  return <><div className="fixed inset-0 z-50 bg-ink/50" onClick={onClose} /><aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-background p-5 shadow-float">
    <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Profil utilisateur</p><h2 className="mt-1 text-xl font-bold">{user.full_name || "Sans nom"}</h2><p className="text-sm text-muted-foreground">{user.phone ? `+${user.phone}` : ""} {user.email ? `· ${user.email}` : ""}</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer"><X /></Button></div>
    <div className="mt-4 flex flex-wrap gap-2"><Pill s={user.status} /><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">Téléphone {user.phone_verified ? "vérifié" : "non vérifié"}</span></div>
    {user.store && <Section title="Boutique"><p className="font-bold">{user.store.store_name}</p><p className="text-sm text-muted-foreground">{user.store.city} · <Pill s={user.store.status} /></p></Section>}
    {!!products.data?.length && <Section title={`Produits (${products.data.length})`}>{products.data.map((p) => <div key={p.id} className="flex justify-between py-1 text-sm"><span>{p.name}</span><span>{fcfa(p.price)}</span></div>)}</Section>}
    <Section title="Commandes associées">{orders.data?.length ? orders.data.map((o) => <div key={o.id} className="flex justify-between py-1 text-sm"><span className="font-semibold">{o.reference}</span><span>{fcfa(o.total_amount)}</span></div>) : <p className="text-sm text-muted-foreground">Aucune commande.</p>}</Section>
    <Section title="Historique administratif">{log.data?.length ? log.data.map((l) => <div key={l.id} className="py-1 text-sm"><span className="font-mono text-xs font-bold">{l.action}</span> <span className="text-muted-foreground">· {dfr(l.created_at)}</span></div>) : <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>}</Section>
  </aside></>;
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => <div className="mt-5 rounded-xl border p-4"><h3 className="mb-2 text-sm font-bold">{title}</h3>{children}</div>;

/* ---------------- boutiques ---------------- */
function StoresPage() {
  const act = useAction();
  const stores = useRows("stores-full", () => db.from("stores").select("*").order("created_at", { ascending: false }));
  const profiles = useRows("profiles-full", () => db.from("profiles").select("id,full_name"));
  const products = useRows("products-full", () => db.from("products").select("id,store_id,seller_id,name,price,status,is_featured,category_id,created_at"));
  const orders = useRows("orders", () => db.from("orders").select("id,store_id,total_amount,status,created_at"));
  const rows = (stores.data ?? []).map((s) => {
    const os = (orders.data ?? []).filter((o) => o.store_id === s.id && o.status !== "cancelled");
    return { ...s, owner: (profiles.data ?? []).find((p) => p.id === s.owner_id)?.full_name ?? (s.is_demo ? "Fabricant démo" : "—"), nProducts: (products.data ?? []).filter((p) => p.store_id === s.id).length, nOrders: os.length, volume: os.reduce((t, o) => t + Number(o.total_amount), 0) };
  });
  return <DashboardShell role="admin" title="Boutiques">
    <DataTable rows={rows} search={(r) => `${r.store_name} ${r.city} ${r.owner}`} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "approved", "suspended", "rejected"] }}
      cols={[
        { h: "Boutique", c: (r) => <span className="flex items-center gap-2 font-bold">{r.store_name}{r.is_featured && <Star className="size-3.5 fill-gold text-gold" />}{r.is_demo && <Demo />}</span> },
        { h: "Propriétaire", c: (r) => r.owner },
        { h: "Produits", c: (r) => r.nProducts }, { h: "Commandes", c: (r) => r.nOrders, hide: true },
        { h: "Ventes", c: (r) => fcfa(r.volume) }, { h: "Création", c: (r) => dfr(r.created_at), hide: true },
        { h: "Statut", c: (r) => <Pill s={r.status} /> },
      ]}
      actions={(r) => <>
        {r.status !== "approved" && <Act icon={BadgeCheck} label={r.status === "suspended" ? "Réactiver" : "Valider"} tone="ok" onClick={() => act(r.status === "suspended" ? "STORE_REACTIVATED" : "STORE_APPROVED", "store", r.id)} />}
        {r.status === "pending" && <Act icon={X} label="Rejeter" tone="danger" onClick={() => act("STORE_REJECTED", "store", r.id)} />}
        {r.status === "approved" && <Act icon={Ban} label="Suspendre" tone="danger" onClick={() => confirm("Suspendre cette boutique ?") && act("STORE_SUSPENDED", "store", r.id)} />}
        <Act icon={Star} label={r.is_featured ? "Retirer" : "En avant"} onClick={() => act("STORE_FEATURED", "store", r.id)} />
      </>} />
  </DashboardShell>;
}

/* ---------------- produits ---------------- */
function ProductsPage() {
  const act = useAction();
  const [cat, setCat] = useState("all"); const [store, setStore] = useState("all");
  const products = useRows("products-full", () => db.from("products").select("id,store_id,seller_id,name,price,status,is_featured,category_id,created_at,is_demo").order("created_at", { ascending: false }));
  const cats = useRows("categories", () => db.from("categories").select("*").order("position"));
  const stores = useRows("stores-full", () => db.from("stores").select("*"));
  const rows = (products.data ?? []).filter((p) => (cat === "all" || p.category_id === cat) && (store === "all" || p.store_id === store))
    .map((p) => ({ ...p, cat: (cats.data ?? []).find((c) => c.id === p.category_id)?.name ?? "—", store: (stores.data ?? []).find((s) => s.id === p.store_id)?.store_name ?? "—" }));
  return <DashboardShell role="admin" title="Produits & modération">
    <div className="mb-3 flex flex-wrap gap-2"><select value={cat} onChange={(e) => setCat(e.target.value)} className="h-11 rounded-lg border bg-card px-3 text-sm"><option value="all">Toutes les catégories</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={store} onChange={(e) => setStore(e.target.value)} className="h-11 rounded-lg border bg-card px-3 text-sm"><option value="all">Tous les vendeurs</option>{(stores.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}</select></div>
    <DataTable rows={rows} search={(r) => `${r.name} ${r.store}`} filters={{ label: "Statut", get: (r) => r.status, options: ["draft", "pending_review", "active", "hidden", "removed"] }}
      cols={[
        { h: "Produit", c: (r) => <span className="flex items-center gap-2 font-bold">{r.name}{r.is_featured && <Star className="size-3.5 fill-gold text-gold" />}</span> },
        { h: "Catégorie", c: (r) => r.cat }, { h: "Vendeur", c: (r) => r.store }, { h: "Prix", c: (r) => fcfa(r.price) },
        { h: "Statut", c: (r) => <Pill s={r.status === "active" ? "published" : r.status} /> },
      ]}
      actions={(r) => <>
        {r.status !== "active" && <Act icon={BadgeCheck} label="Publier" tone="ok" onClick={() => act("PRODUCT_APPROVED", "product", r.id)} />}
        {r.status === "active" && <Act icon={EyeOff} label="Masquer" onClick={() => act("PRODUCT_HIDDEN", "product", r.id)} />}
        <Act icon={Star} label={r.is_featured ? "Retirer" : "En avant"} onClick={() => act("PRODUCT_FEATURED", "product", r.id)} />
        {r.status !== "removed" && <Act icon={Trash2} label="Retirer" tone="danger" onClick={() => confirm("Retirer ce produit du catalogue ?") && act("PRODUCT_REMOVED", "product", r.id)} />}
      </>} />
  </DashboardShell>;
}

/* ---------------- commandes ---------------- */
function OrdersPage() {
  const act = useAction(); const [sel, setSel] = useState<any>(null);
  const orders = useRows("orders-full", () => db.from("orders").select("*").order("created_at", { ascending: false }).limit(300));
  const stores = useRows("stores-full", () => db.from("stores").select("*"));
  const profiles = useRows("profiles-full", () => db.from("profiles").select("id,full_name"));
  const name = (id: string | null) => (profiles.data ?? []).find((p) => p.id === id)?.full_name;
  const rows = (orders.data ?? []).map((o) => ({ ...o, client: name(o.customer_id) ?? "Client démo", seller: (stores.data ?? []).find((s) => s.id === o.store_id)?.store_name ?? "—" }));
  return <DashboardShell role="admin" title="Commandes">
    <DataTable rows={rows} search={(r) => `${r.reference} ${r.client} ${r.seller}`} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "confirmed", "shipped", "delivered", "cancelled"] }}
      cols={[
        { h: "N°", c: (r) => <span className="font-mono text-xs font-bold">{r.reference}</span> }, { h: "Client", c: (r) => r.client }, { h: "Vendeur", c: (r) => r.seller },
        { h: "Montant", c: (r) => <b>{fcfa(r.total_amount)}</b> }, { h: "Statut", c: (r) => <Pill s={r.status} /> },
        { h: "Date", c: (r) => dfr(r.created_at), hide: true }, { h: "Paiement", c: (r) => <Pill s={r.payment_status} />, hide: true }, { h: "Livraison", c: (r) => <Pill s={r.delivery_status} />, hide: true },
      ]}
      actions={(r) => <Act icon={Eye} label="Détail" onClick={() => setSel(r)} />} />
    {sel && <><div className="fixed inset-0 z-50 bg-ink/50" onClick={() => setSel(null)} /><aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-background p-5 shadow-float">
      <div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Commande</p><h2 className="font-mono text-xl font-bold">{sel.reference}</h2></div><Button variant="ghost" size="icon" onClick={() => setSel(null)} aria-label="Fermer"><X /></Button></div>
      <Section title="Résumé">{[["Client", sel.client], ["Vendeur", sel.seller], ["Montant", fcfa(sel.total_amount)], ["Commission (10 %)", fcfa(sel.commission_amount)], ["Montant vendeur", fcfa(Number(sel.total_amount) - Number(sel.commission_amount))], ["Livraison", sel.delivery_address ?? "—"], ["Date", dfr(sel.created_at)]].map(([a, b]) => <div key={a} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{a}</span><span className="font-semibold">{b}</span></div>)}</Section>
      <Section title="Changer le statut (audité)"><p className="mb-2 text-xs text-muted-foreground">Toute modification est tracée dans le journal d'audit.</p><div className="flex flex-wrap gap-1.5">{["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => <Button key={s} size="sm" variant={sel.status === s ? "hero" : "outline"} onClick={async () => { if (!confirm(`Passer la commande à « ${STATUS_FR[s]} » ?`)) return; await act("ORDER_STATUS_CHANGED", "order", sel.id, s); setSel({ ...sel, status: s }); }}>{STATUS_FR[s]}</Button>)}</div></Section>
    </aside></>}
  </DashboardShell>;
}

/* ---------------- finances ---------------- */
function TransactionsPage() {
  const pays = useRows("payments-full", () => db.from("payments").select("*").order("created_at", { ascending: false }).limit(300));
  const total = (pays.data ?? []).filter((p) => p.status === "succeeded").reduce((s, p) => s + Number(p.amount), 0);
  return <DashboardShell role="admin" title="Transactions & paiements">
    <FinanceNotice />
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><MetricCard label="Paiements réussis" value={fcfa(total)} note="Démonstration" icon={CircleDollarSign} /><MetricCard label="Transactions" value={String(pays.data?.length ?? 0)} note="Identifiant unique chacune" icon={WalletCards} accent /><MetricCard label="En attente" value={String((pays.data ?? []).filter((p) => p.status === "pending").length)} note="À rapprocher" icon={AlertTriangle} /></div>
    <DataTable rows={pays.data ?? []} search={(r) => `${r.reference} ${r.provider}`} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "succeeded", "refunded", "failed"] }}
      cols={[{ h: "Référence", c: (r) => <span className="font-mono text-xs font-bold">{r.reference}</span> }, { h: "Prestataire", c: (r) => (r.provider ?? "—").replace("_", " ") }, { h: "Montant", c: (r) => <b>{fcfa(r.amount)}</b> }, { h: "Date", c: (r) => dfr(r.created_at) }, { h: "Statut", c: (r) => <Pill s={r.status} /> }]} />
  </DashboardShell>;
}
function CommissionsPage() {
  const coms = useRows("commissions-full", () => db.from("commissions").select("*").order("created_at", { ascending: false }).limit(300));
  const c = coms.data ?? []; const sum = (k: string) => c.reduce((s, x) => s + Number(x[k]), 0);
  return <DashboardShell role="admin" title="Commissions">
    <FinanceNotice />
    <div className="mb-4 rounded-xl border bg-card p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Règle de calcul</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg bg-secondary p-3">Produit vendu<br /><b className="text-lg">10 000 FCFA</b></div><div className="rounded-lg bg-gold/10 p-3">Commission ANW KA SUKU (10 %)<br /><b className="text-lg">1 000 FCFA</b></div><div className="rounded-lg bg-primary-soft p-3">Montant vendeur<br /><b className="text-lg">9 000 FCFA</b></div></div></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><MetricCard label="Volume brut" value={fcfa(sum("gross_amount"))} note="Démonstration" icon={TrendingUp} /><MetricCard label="Revenus plateforme" value={fcfa(sum("commission_amount"))} note="Commissions" icon={CircleDollarSign} accent /><MetricCard label="Dû aux vendeurs" value={fcfa(sum("seller_amount"))} note="Après commission" icon={Store} /></div>
    <DataTable rows={c} search={(r) => r.reference} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "settled"] }}
      cols={[{ h: "Référence", c: (r) => <span className="font-mono text-xs font-bold">{r.reference}</span> }, { h: "Brut", c: (r) => fcfa(r.gross_amount) }, { h: "Taux", c: (r) => `${r.rate} %` }, { h: "Commission", c: (r) => <b>{fcfa(r.commission_amount)}</b> }, { h: "Vendeur", c: (r) => fcfa(r.seller_amount) }, { h: "Statut", c: (r) => <Pill s={r.status} /> }]} />
  </DashboardShell>;
}
function WithdrawalsPage() {
  const act = useAction();
  const wds = useRows("withdrawals-full", () => db.from("withdrawals").select("*").order("created_at", { ascending: false }));
  return <DashboardShell role="admin" title="Retraits">
    <FinanceNotice />
    <DataTable rows={wds.data ?? []} search={(r) => `${r.reference} ${r.seller_label}`} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "processing", "completed", "rejected", "failed"] }}
      cols={[{ h: "Vendeur", c: (r) => <span className="font-bold">{r.seller_label ?? "—"}</span> }, { h: "Montant", c: (r) => <b>{fcfa(r.amount)}</b> }, { h: "Méthode", c: (r) => r.method }, { h: "Date", c: (r) => dfr(r.created_at) }, { h: "Réf. transaction", c: (r) => <span className="font-mono text-xs">{r.transaction_reference ?? r.reference}</span>, hide: true }, { h: "Statut", c: (r) => <Pill s={r.status} /> }]}
      actions={(r) => r.status === "pending" ? <><Act icon={BadgeCheck} label="Approuver" tone="ok" onClick={() => confirm(`Approuver ${fcfa(r.amount)} ?`) && act("WITHDRAWAL_APPROVED", "withdrawal", r.id)} /><Act icon={X} label="Rejeter" tone="danger" onClick={() => act("WITHDRAWAL_REJECTED", "withdrawal", r.id)} /></> : r.status === "processing" ? <Act icon={AlertTriangle} label="Marquer échoué" tone="danger" onClick={() => act("WITHDRAWAL_FAILED", "withdrawal", r.id)} /> : <span className="text-xs text-muted-foreground">Traité</span>} />
    <p className="mt-3 text-xs text-muted-foreground">« Approuver » passe le retrait en traitement. Le statut « Terminé » sera confirmé uniquement par le prestataire Mobile Money une fois connecté.</p>
  </DashboardShell>;
}
const FinanceNotice = () => <div className="mb-4 flex gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm"><Lock className="mt-0.5 size-4 shrink-0 text-gold" /><p><b>Aucun argent réel n'est traité.</b> Les montants sont des données de démonstration. Les soldes seront calculés à partir d'un journal immuable : aucun solde ne peut être modifié directement.</p></div>;

/* ---------------- signalements & sécurité ---------------- */
function ReportsPage() {
  const act = useAction();
  const reps = useRows("reports-full", () => db.from("reports").select("*").order("created_at", { ascending: false }));
  const TYPE: Record<string, string> = { product: "Produit", store: "Boutique", user: "Compte", activity: "Activité" };
  return <DashboardShell role="admin" title="Signalements">
    <DataTable rows={reps.data ?? []} search={(r) => `${r.target_label} ${r.reason}`} filters={{ label: "Statut", get: (r) => r.status, options: ["pending", "resolved", "dismissed"] }}
      cols={[{ h: "Type", c: (r) => <span className="text-xs font-bold uppercase">{TYPE[r.target_type] ?? r.target_type}</span> }, { h: "Cible", c: (r) => <span className="font-bold">{r.target_label}</span> }, { h: "Motif", c: (r) => r.reason }, { h: "Gravité", c: (r) => <span className={cn("text-xs font-bold", r.severity === "high" ? "text-destructive" : r.severity === "medium" ? "text-gold" : "text-muted-foreground")}>{r.severity === "high" ? "Élevée" : r.severity === "medium" ? "Moyenne" : "Faible"}</span> }, { h: "Date", c: (r) => dfr(r.created_at), hide: true }, { h: "Statut", c: (r) => <Pill s={r.status} /> }]}
      actions={(r) => r.status === "pending" ? <><Act icon={BadgeCheck} label="Résolu" tone="ok" onClick={() => act("REPORT_RESOLVED", "report", r.id)} /><Act icon={X} label="Classer" onClick={() => act("REPORT_DISMISSED", "report", r.id)} /></> : null} />
  </DashboardShell>;
}
function SecurityPage() {
  const log = useRows("audit", () => db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200));
  const reps = useRows("reports-full", () => db.from("reports").select("*"));
  const attempts = (log.data ?? []).filter((l) => l.action === "UNAUTHORIZED_ATTEMPT");
  const pend = (t: string) => (reps.data ?? []).filter((r) => r.target_type === t && r.status === "pending").length;
  return <DashboardShell role="admin" title="Sécurité & audit">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><MetricCard label="Comptes signalés" value={String(pend("user"))} note="En attente" icon={Users} /><MetricCard label="Produits signalés" value={String(pend("product"))} note="En attente" icon={Package} accent /><MetricCard label="Boutiques signalées" value={String(pend("store"))} note="En attente" icon={Store} /><MetricCard label="Activités suspectes" value={String(pend("activity"))} note="À examiner" icon={ShieldAlert} accent /><MetricCard label="Accès refusés" value={String(attempts.length)} note="Tentatives tracées" icon={Lock} /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2"><Panel title="Journal d'audit administratif" kicker="Historique immuable">
        <AdminAuditLog />
      </Panel></div>
      <Panel title="Vie privée des messages" kicker="Politique">
        <div className="space-y-3 text-sm"><p className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-success" />Les conversations Client ↔ Vendeur ne sont pas accessibles librement par l'administration.</p><p>L'accès exceptionnel est réservé aux cas de signalement, sécurité, fraude, litige ou obligation légale.</p><p>Chaque consultation sera justifiée et enregistrée dans le journal d'audit.</p><Button variant="outline" className="w-full" disabled><Lock /> Accès exceptionnel (procédure à venir)</Button></div>
      </Panel>
    </div>
  </DashboardShell>;
}

/* ---------------- catégories ---------------- */
function CategoriesPage() {
  const act = useAction(); const qc = useQueryClient();
  const cats = useRows("categories", () => db.from("categories").select("*").order("position"));
  const [form, setForm] = useState<{ id: string | null; name: string; emoji: string; position: number }>({ id: null, name: "", emoji: "", position: 0 });
  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  async function save() {
    if (form.name.trim().length < 2) { toast.error("Nom trop court"); return; }
    const { error } = await db.rpc("admin_upsert_category", { _id: form.id, _name: form.name.trim(), _slug: slugify(form.name), _emoji: form.emoji || null, _position: form.position });
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Catégorie modifiée" : "Catégorie créée"); setForm({ id: null, name: "", emoji: "", position: 0 }); void qc.invalidateQueries({ queryKey: ["admin"] });
  }
  return <DashboardShell role="admin" title="Catégories">
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title={form.id ? "Modifier la catégorie" : "Nouvelle catégorie"} kicker="Catalogue">
        <div className="space-y-3"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Poterie" maxLength={60} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" /><div className="flex gap-2"><input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="Icône (emoji)" maxLength={4} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" /><input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} placeholder="Ordre" className="h-11 w-24 rounded-lg border bg-background px-3 text-sm" /></div><div className="flex gap-2"><Button variant="hero" onClick={save} className="flex-1">{form.id ? "Enregistrer" : "Créer"}</Button>{form.id && <Button variant="outline" onClick={() => setForm({ id: null, name: "", emoji: "", position: 0 })}>Annuler</Button>}</div></div>
      </Panel>
      <div className="lg:col-span-2"><DataTable rows={cats.data ?? []} search={(r) => r.name}
        cols={[{ h: "Ordre", c: (r) => r.position }, { h: "Catégorie", c: (r) => <span className="font-bold">{r.emoji} {r.name}</span> }, { h: "Slug", c: (r) => <span className="font-mono text-xs">{r.slug}</span>, hide: true }, { h: "Statut", c: (r) => <Pill s={r.is_active ? "active" : "hidden"} /> }]}
        actions={(r) => <><Act icon={Eye} label="Modifier" onClick={() => setForm({ id: r.id, name: r.name, emoji: r.emoji ?? "", position: r.position })} /><Act icon={r.is_active ? EyeOff : RotateCcw} label={r.is_active ? "Désactiver" : "Activer"} onClick={() => act("CATEGORY_TOGGLED", "category", r.id)} /></>} /></div>
    </div>
  </DashboardShell>;
}

/* ---------------- notifications ---------------- */
function NotificationsPage() {
  const act = useAction();
  const n = useRows("notifications", () => db.from("notifications").select("*").eq("audience", "admin").order("created_at", { ascending: false }));
  const ICON: Record<string, typeof Bell> = { new_seller: Users, store_review: Store, product_review: Package, withdrawal: WalletCards, report: Flag, payment_issue: CircleDollarSign, suspicious: ShieldAlert };
  return <DashboardShell role="admin" title="Notifications">
    <div className="space-y-2">{(n.data ?? []).map((x) => { const I = ICON[x.kind] ?? Bell; return <div key={x.id} className={cn("flex items-start gap-3 rounded-xl border bg-card p-4 shadow-card", !x.read_at && "border-l-4 border-l-gold")}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><I className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-bold">{x.title} {x.is_demo && <Demo />}</p><p className="text-sm text-muted-foreground">{x.body}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(x.created_at).toLocaleString("fr-FR")}</p></div>{!x.read_at && <Button size="sm" variant="ghost" onClick={() => act("NOTIFICATION_READ", "notification", x.id)}>Marquer lu</Button>}</div>; })}
      {!n.data?.length && <p className="p-10 text-center text-sm text-muted-foreground">Aucune notification.</p>}</div>
  </DashboardShell>;
}

/* ---------------- paramètres ---------------- */
function SettingsPage() {
  const qc = useQueryClient();
  const s = useRows("settings", () => db.from("platform_settings").select("*").order("key"));
  const LABEL: Record<string, string> = { commission_rate: "Taux de commission (%)", min_withdrawal: "Retrait minimum (FCFA)", platform_name: "Nom de la plateforme", currency: "Devise", notify_new_seller: "Notifier les nouveaux vendeurs" };
  const [edit, setEdit] = useState<Record<string, string>>({});
  async function save(key: string) {
    let v: any = edit[key]; try { v = JSON.parse(v); } catch { /* string */ }
    const { error } = await db.rpc("admin_update_setting", { _key: key, _value: v });
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètre enregistré et audité"); void qc.invalidateQueries({ queryKey: ["admin"] });
  }
  const groups = useMemo(() => [["Paramètres financiers", (s.data ?? []).filter((x) => x.is_sensitive)], ["Paramètres généraux", (s.data ?? []).filter((x) => !x.is_sensitive)]] as const, [s.data]);
  return <DashboardShell role="admin" title="Paramètres">
    <div className="grid gap-4 lg:grid-cols-2">{groups.map(([g, list]) => <Panel key={g} title={g} kicker={g.includes("financ") ? "Protégé par permission" : "Plateforme"} right={g.includes("financ") ? <Lock className="size-4 text-gold" /> : undefined}>
      <div className="space-y-3">{list.map((x: any) => <div key={x.key} className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="flex-1 text-sm font-semibold">{LABEL[x.key] ?? x.key}</label><input defaultValue={typeof x.value === "string" ? x.value : JSON.stringify(x.value)} onChange={(e) => setEdit({ ...edit, [x.key]: e.target.value })} className="h-10 rounded-lg border bg-background px-3 text-sm sm:w-48" /><Button size="sm" variant="outline" disabled={edit[x.key] === undefined} onClick={() => save(x.key)}>Enregistrer</Button></div>)}</div>
    </Panel>)}
      <Panel title="Paiements & Mobile Money" kicker="À connecter"><p className="text-sm text-muted-foreground">Orange Money, Moov Money, Wave et cartes bancaires seront activés après signature avec un prestataire de paiement agréé. Aucune clé n'est configurée.</p></Panel>
      <Panel title="Sécurité & administrateurs" kicker="RBAC"><p className="text-sm text-muted-foreground">Rôles internes : <b>super_admin</b> (accès complet) et <b>admin</b> (permissions granulaires, ex. <span className="font-mono">finance.settings</span>). Les rôles ne s'attribuent qu'en interne, jamais depuis l'application.</p></Panel>
    </div>
  </DashboardShell>;
}

/* ---------------- routeur ---------------- */
export function AdminPage({ slug = "" }: { slug?: string }) {
  switch (slug.replace(/\/$/, "")) {
    case "": case "dashboard": return <Dashboard />;
    case "users": return <UsersPage />;
    case "sellers": return <UsersPage only="seller" />;
    case "stores": return <StoresPage />;
    case "products": return <ProductsPage />;
    case "orders": return <OrdersPage />;
    case "transactions": return <TransactionsPage />;
    case "commissions": return <CommissionsPage />;
    case "withdrawals": return <WithdrawalsPage />;
    case "reports": return <ReportsPage />;
    case "security": return <SecurityPage />;
    case "categories": return <CategoriesPage />;
    case "notifications": return <NotificationsPage />;
    case "settings": return <SettingsPage />;
    default: return <DashboardShell role="admin" title="Page introuvable"><p className="text-sm text-muted-foreground">Cette section d'administration n'existe pas.</p></DashboardShell>;
  }
}
