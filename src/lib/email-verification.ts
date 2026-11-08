import { supabase } from "@/integrations/supabase/client";

export type VerificationReply = { ok: boolean; status: number; message: string; retryAfter?: number };

async function call(payload: Record<string, string>): Promise<VerificationReply> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, status: 401, message: "Session expirée. Reconnectez-vous." };
  try {
    const res = await fetch("/api/email-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    let json: { message?: string; retryAfter?: number } = {};
    try {
      json = await res.json();
    } catch {
      /* réponse sans contenu : on garde le message par défaut */
    }
    return {
      ok: res.ok,
      status: res.status,
      message: json.message ?? (res.ok ? "" : "Une erreur est survenue. Réessayez."),
      retryAfter: json.retryAfter,
    };
  } catch {
    return { ok: false, status: 0, message: "Connexion impossible. Vérifiez votre réseau et réessayez." };
  }
}

export const sendEmailCode = (email: string) => call({ action: "send", email });
export const verifyEmailCode = (code: string) => call({ action: "verify", code });
