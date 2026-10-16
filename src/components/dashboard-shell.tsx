import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, ChevronRight, CircleDollarSign, Flag, Heart, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Search, Settings, ShieldCheck, ShoppingBag, Store, Tags, Users, WalletCards, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navByRole = {
  client: [
    ["", "Tableau de bord", LayoutDashboard], ["explorer", "Explorer", Search], ["favoris", "Favoris", Heart], ["panier", "Panier", ShoppingBag], ["commandes", "Commandes", Package], ["messages", "Messages", MessageCircle], ["profil", "Mon profil", Settings],
  ],
  seller: [
    ["", "Tableau de bord", LayoutDashboard], ["boutique", "Ma boutique", Store], ["produits", "Mes produits", Package], ["ajouter-produit", "Ajouter un produit", ShoppingBag], ["commandes", "Commandes", Package], ["messages", "Messages", MessageCircle], ["ventes", "Ventes", BarChart3], ["revenus", "Revenus", WalletCards], ["profil", "Profil", Settings],
  ],
  admin: [
    ["", "Dashboard", LayoutDashboard], ["users", "Utilisateurs", Users], ["sellers", "Vendeurs", Store], ["stores", "Boutiques", Store], ["products", "Produits", Package], ["orders", "Commandes", ShoppingBag], ["transactions", "Transactions", CircleDollarSign], ["commissions", "Commissions", BarChart3], ["withdrawals", "Retraits", WalletCards], ["reports", "Signalements", Flag], ["security", "Sécurité", ShieldCheck], ["categories", "Catégories", Tags], ["notifications", "Notifications", Bell], ["settings", "Paramètres", Settings],
  ],
} as const;

const labels = { client: "Espace Client", seller: "Espace Fabricant", admin: "Super Admin" };

export function DashboardShell({ role, title, children }: { role: AppRole; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, signOut } = useAuth();
  const base = `/${role}`;

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5"><Brand inverse /><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer"><X /></Button></div>
      <div className="px-5 py-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">{labels[role]}</p></div>
      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navByRole[role].map(([slug, label, Icon]) => {
          const href = slug ? `${base}/${slug}` : base;
          const active = pathname === href;
          return <a key={label} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition", active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}><Icon className="size-4" />{label}{active && <ChevronRight className="ml-auto size-4" />}</a>;
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3"><Button variant="ghost" className="w-full justify-start text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={async () => { await signOut(); window.location.href = "/auth"; }}><LogOut /> Se déconnecter</Button></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:block">{sidebar}</aside>
      {open && <><div className="fixed inset-0 z-40 bg-ink/60 lg:hidden" onClick={() => setOpen(false)} /><aside className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-72 lg:hidden">{sidebar}</aside></>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></Button>
          <div><p className="text-xs text-muted-foreground">{labels[role]}</p><h1 className="text-lg font-bold">{title}</h1></div>
          <div className="ml-auto flex items-center gap-2">{role === "admin" && <form action="/admin/users" className="hidden md:block"><input name="q" placeholder="Rechercher un utilisateur…" className="h-10 w-64 rounded-lg border bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></form>}<a href={role === "admin" ? "/admin/notifications" : "#"} aria-label="Notifications" className="grid size-10 place-items-center rounded-lg hover:bg-secondary"><Bell className="size-5" /></a><div className="hidden text-right sm:block"><p className="text-xs font-bold">{profile?.full_name || (role === "admin" ? "Administrateur" : "Compte démo")}</p><p className="text-[10px] text-muted-foreground">{labels[role]}</p></div><span className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-deep">{(profile?.full_name || "AK").split(" ").map((x) => x[0]).slice(0,2).join("")}</span></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function MetricCard({ label, value, note, icon: Icon, accent = false }: { label: string; value: string; note: string; icon: typeof Store; accent?: boolean }) {
  return <div className="rounded-xl border bg-card p-5 shadow-card"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div><span className={cn("grid size-10 place-items-center rounded-lg", accent ? "bg-gold/15 text-gold" : "bg-primary-soft text-primary")}><Icon className="size-5" /></span></div><p className="mt-3 text-xs font-semibold text-success">{note}</p></div>;
}