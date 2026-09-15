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

export const ACCOUNT_LABELS: Record<string, string> = {
  active: "Compte actif",
  pending_verification: "Vérification en attente",
  suspended: "Compte suspendu",
};

/**
 * Normalise un numéro malien au format international 223XXXXXXXX.
 * Retourne null si le numéro n'est pas un mobile malien valide.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "").replace(/^00/, "");
  const local = digits.startsWith("223") ? digits.slice(3) : digits;
  if (!/^[5-9][0-9]{7}$/.test(local)) return null;
  return `223${local}`;
}

export function formatPhone(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!normalized) return raw;
  const local = normalized.slice(3);
  return `+223 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6)}`;
}

/** Identifiant de connexion interne dérivé du numéro (aucun email requis). */
export function phoneToLogin(raw: string): string | null {
  const normalized = normalizePhone(raw);
  return normalized ? `${normalized}@phone.anwkasuku.ml` : null;
}

/** Score de robustesse du mot de passe, de 0 à 4. */
export function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Trop faible", "Faible", "Correct", "Bon", "Excellent"];
  return { score, label: labels[score] ?? "Trop faible" };
}
