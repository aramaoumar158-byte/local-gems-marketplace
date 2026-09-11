export function fcfa(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);
}

export function dateFr(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const ORDER_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const STORE_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  suspended: "Suspendue",
};

/** Normalise un numéro malien et construit l'identifiant de connexion interne. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, "").replace(/^\+/, "");
}

export function phoneToLogin(raw: string): string {
  return `${normalizePhone(raw)}@phone.sandu.ml`;
}
