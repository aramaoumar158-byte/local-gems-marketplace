import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="ANW KA SUKU — Accueil">
      <span className={cn("grid size-10 place-items-center rounded-xl font-display text-sm font-extrabold", inverse ? "bg-gold-gradient text-gold-foreground" : "bg-brand text-primary-foreground")}>AK</span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <strong className={cn("font-display text-base font-extrabold", inverse && "text-sidebar-foreground")}>ANW KA SUKU</strong>
          <span className={cn("mt-1 text-[9px] font-bold uppercase tracking-[0.15em]", inverse ? "text-sidebar-foreground/60" : "text-muted-foreground")}>Le marché qui nous rassemble</span>
        </span>
      )}
    </Link>
  );
}