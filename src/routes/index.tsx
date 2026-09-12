import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Building2, ChevronRight, Search, ShieldCheck, Sparkles, Store, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import heroImage from "@/assets/anw-ka-suku-hero.jpg";
import potteryImage from "@/assets/product-poterie.jpg";
import bagImage from "@/assets/product-sac.jpg";
import furnitureImage from "@/assets/product-meuble.jpg";
import lampImage from "@/assets/product-lampe.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ANW KA SUKU — Le marché qui nous rassemble" },
      { name: "description", content: "Découvrez et achetez les créations de fabricants, artisans et vendeurs du Mali sur ANW KA SUKU." },
      { property: "og:title", content: "ANW KA SUKU — Marketplace du Mali" },
      { property: "og:description", content: "Fabricants, vendeurs et clients réunis sur une plateforme moderne et sécurisée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const products: ProductCardData[] = [
  { name: "Jarre en terre cuite", category: "Poterie", store: "Terre & Feu", city: "Ségou", price: 12500, image: potteryImage },
  { name: "Sac contemporain bogolan", category: "Accessoires", store: "Bogolan de Sikasso", city: "Sikasso", price: 9500, image: bagImage },
  { name: "Tabouret sculpté", category: "Meubles", store: "Menuiserie Sankara", city: "Bamako", price: 28000, image: furnitureImage },
  { name: "Lampe en calebasse", category: "Décoration", store: "Maison Déco Niger", city: "Mopti", price: 17500, image: lampImage },
];

const categories = [
  ["🧵", "Artisanat"], ["🏺", "Poterie"], ["👗", "Vêtements"], ["🪑", "Meubles"],
  ["🌾", "Produits locaux"], ["🖼️", "Décoration"], ["👜", "Accessoires"],
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main>
        <section className="relative min-h-[570px] overflow-hidden bg-ink lg:min-h-[650px]">
          <img src={heroImage} alt="Fabricants maliens présentant leurs créations sur ANW KA SUKU" width={1600} height={1000} fetchPriority="high" className="absolute inset-0 size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent" />
          <div className="relative mx-auto flex min-h-[570px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:min-h-[650px] lg:px-8">
            <div className="max-w-2xl text-ink-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 bg-ink/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"><Sparkles className="size-3.5 text-gold" /> Le commerce local entre dans une nouvelle ère</span>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">Les talents d'ici.<br /><span className="text-gold">Le marché de demain.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-ink-foreground/80 sm:text-lg">ANW KA SUKU connecte les fabricants, vendeurs et clients. Créez votre boutique, faites découvrir vos produits et développez votre activité.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="gold" size="xl"><Link to="/auth" search={{ mode: "signup", role: "seller" }}>Ouvrir ma boutique <ArrowRight /></Link></Button>
                <Button asChild variant="outline" size="xl" className="border-ink-foreground/25 bg-ink/40 text-ink-foreground hover:bg-ink"><a href="#explorer">Explorer les produits</a></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-5 text-xs font-semibold text-ink-foreground/75">
                <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold" /> Boutiques vérifiées</span>
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Accès sécurisé</span>
                <span className="flex items-center gap-2"><Users className="size-4 text-gold" /> Fait pour le Mali</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-8 max-w-5xl px-4 sm:px-6">
          <div className="flex rounded-2xl border bg-card p-2 shadow-float">
            <Search className="ml-3 mt-3 size-5 shrink-0 text-muted-foreground" />
            <input aria-label="Rechercher" placeholder="Que recherchez-vous ?" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none sm:text-base" />
            <Button variant="hero" size="lg" className="hidden sm:inline-flex">Rechercher</Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" id="explorer">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Explorer</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Tout un savoir-faire à découvrir</h2></div>
            <Button variant="ghost" className="hidden sm:inline-flex">Toutes les catégories <ChevronRight /></Button>
          </div>
          <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2">
            {categories.map(([emoji, name]) => <button key={name} className="flex min-w-28 shrink-0 flex-col items-center gap-2 rounded-xl border bg-card px-4 py-5 text-sm font-bold shadow-card transition hover:border-primary/30 hover:bg-primary-soft"><span className="text-2xl">{emoji}</span>{name}</button>)}
          </div>
          <div className="mt-12 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Sélection du moment</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Produits à la une</h2></div><Button variant="ghost" className="hidden sm:inline-flex">Voir tout <ChevronRight /></Button></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.name} product={product} />)}</div>
        </section>

        <section className="bg-secondary" id="boutiques">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Pour les fabricants et vendeurs</p><h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Votre savoir-faire mérite une grande vitrine.</h2><p className="mt-4 max-w-lg text-muted-foreground">En quelques étapes, créez votre boutique, publiez vos produits et suivez votre activité depuis un espace professionnel simple.</p><Button asChild variant="hero" size="lg" className="mt-6"><Link to="/auth" search={{ mode: "signup", role: "seller" }}>Créer ma boutique <ArrowRight /></Link></Button></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[{ icon: Store, n: "01", title: "Créez", text: "Votre boutique digitale" }, { icon: Building2, n: "02", title: "Publiez", text: "Vos produits facilement" }, { icon: TrendingUp, n: "03", title: "Développez", text: "Vos ventes et revenus" }].map((x) => <div key={x.n} className="rounded-xl border bg-card p-5 shadow-card"><span className="text-xs font-extrabold text-gold">{x.n}</span><x.icon className="mt-6 size-7 text-primary" /><h3 className="mt-4 font-bold">{x.title}</h3><p className="mt-1 text-sm text-muted-foreground">{x.text}</p></div>)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-ink text-ink-foreground"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><strong className="font-display text-xl">ANW KA SUKU</strong><p className="mt-1 text-sm text-ink-foreground/60">La plateforme digitale qui connecte fabricants, vendeurs et clients.</p></div><p className="text-xs text-ink-foreground/50">Données présentées à titre de démonstration · Mali</p></div></footer>
    </div>
  );
}