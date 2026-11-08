import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const CODE_TTL_MS = 10 * 60 * 1000; // le code est valable 10 minutes
const RESEND_MIN_MS = 60 * 1000; // une minute minimum entre deux envois
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5; // 5 envois par heure et par compte
const MAX_ATTEMPTS = 5; // 5 essais par code
const BRAND = 'ANW KA SUKU';

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send'), email: z.string().trim().email().max(255) }),
  z.object({ action: z.literal('verify'), code: z.string().trim().regex(/^\d{6}$/) }),
]);

type CodeRow = {
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  send_count: number;
  window_started_at: string;
  last_sent_at: string;
};

const noStore = { 'Cache-Control': 'no-store' };
const reply = (message: string, status = 200, extra: Record<string, unknown> = {}) =>
  Response.json({ message, ...extra }, { status, headers: noStore });

/** Code à 6 chiffres tiré au hasard, sans biais (tirage rejeté s'il tombe dans la zone déséquilibrée). */
function randomCode(): string {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while ((buf[0] as number) >= limit);
  return String((buf[0] as number) % 1_000_000).padStart(6, '0');
}

/** Empreinte du code : HMAC-SHA256 avec une clé que seul le serveur connaît. */
async function hashCode(code: string, userId: string, email: string): Promise<string> {
  const secret = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${userId}:${email}:${code}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

class EmailNotConfigured extends Error {}

async function sendEmail(to: string, code: string): Promise<void> {
  const provider = (process.env['EMAIL_PROVIDER'] ?? 'brevo').toLowerCase();
  const apiKey = process.env['EMAIL_API_KEY'];
  const from = process.env['EMAIL_FROM'];
  if (!apiKey || !from) throw new EmailNotConfigured();

  const subject = `Votre code ${BRAND} : ${code}`;
  const text =
    `Bonjour,\n\nVotre code de vérification ${BRAND} est : ${code}\n\n` +
    `Il est valable 10 minutes. Si vous n'avez pas créé de compte, ignorez ce message.\n`;
  const html =
    `<p>Bonjour,</p><p>Votre code de vérification ${BRAND} est :</p>` +
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>` +
    `<p>Il est valable 10 minutes. Si vous n'avez pas créé de compte, ignorez ce message.</p>`;

  let res: Response;
  if (provider === 'resend') {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${BRAND} <${from}>`, to: [to], subject, text, html }),
    });
  } else if (provider === 'brevo') {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: BRAND, email: from }, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
    });
  } else {
    throw new EmailNotConfigured();
  }
  if (!res.ok) throw new Error(`email provider status ${res.status}`);
}

export async function handleEmailVerification(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return reply('Connexion requise.', 401);
  const url = process.env['SUPABASE_URL'];
  const publishable = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !publishable) return reply('Le service est mal configuré.', 500);

  // Qui appelle ? On vérifie le jeton de connexion auprès de Supabase.
  const caller = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: auth },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('apikey', publishable);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data: who, error: authError } = await caller.auth.getUser(auth.slice(7));
  if (authError || !who.user) return reply('Session expirée. Reconnectez-vous.', 401);
  const uid = who.user.id;

  if (Number(request.headers.get('content-length') ?? 0) > 2000) return reply('Demande trop volumineuse.', 400);
  let input: z.infer<typeof body>;
  try {
    input = body.parse(await request.json());
  } catch {
    return reply('Demande invalide.', 400);
  }

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const admin = supabaseAdmin as unknown as SupabaseClient;

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,status,email_verified')
    .eq('id', uid)
    .maybeSingle();
  if (profileError || !profile) return reply('Profil introuvable.', 404);
  if (profile.status === 'suspended') return reply('Ce compte est suspendu.', 403);

  const now = Date.now();
  const { data: existing } = await admin.from('email_verification_codes').select('*').eq('user_id', uid).maybeSingle();
  const row = existing as CodeRow | null;

  // ---------- Envoi du code ----------
  if (input.action === 'send') {
    if (profile.email_verified && profile.status === 'active') return reply('Votre compte est déjà vérifié.', 409);
    const email = input.email.toLowerCase();

    const escaped = email.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', escaped)
      .eq('email_verified', true)
      .neq('id', uid)
      .limit(1);
    if (taken && taken.length > 0) return reply('Cette adresse email est déjà utilisée par un autre compte.', 409);

    let sendCount = 1;
    let windowStarted = new Date(now).toISOString();
    if (row) {
      const sinceLast = now - new Date(row.last_sent_at).getTime();
      if (sinceLast < RESEND_MIN_MS) {
        const wait = Math.ceil((RESEND_MIN_MS - sinceLast) / 1000);
        return reply(`Patientez ${wait} secondes avant de redemander un code.`, 429, { retryAfter: wait });
      }
      const inWindow = now - new Date(row.window_started_at).getTime() < WINDOW_MS;
      if (inWindow) {
        if (row.send_count >= MAX_SENDS_PER_WINDOW) return reply('Trop de codes demandés. Réessayez dans une heure.', 429);
        sendCount = row.send_count + 1;
        windowStarted = row.window_started_at;
      }
    }

    const code = randomCode();
    const { error: saveError } = await admin.from('email_verification_codes').upsert({
      user_id: uid,
      email,
      code_hash: await hashCode(code, uid, email),
      expires_at: new Date(now + CODE_TTL_MS).toISOString(),
      attempts: 0,
      send_count: sendCount,
      window_started_at: windowStarted,
      last_sent_at: new Date(now).toISOString(),
    });
    if (saveError) return reply("Le code n'a pas pu être créé. Réessayez.", 500);

    try {
      await sendEmail(email, code);
    } catch (err) {
      await admin.from('email_verification_codes').delete().eq('user_id', uid);
      if (err instanceof EmailNotConfigured) return reply("L'envoi d'emails n'est pas encore configuré sur la plateforme.", 503);
      console.error('[email-verification] envoi impossible', err instanceof Error ? err.message : 'erreur');
      return reply("L'email n'a pas pu être envoyé. Vérifiez l'adresse et réessayez.", 502);
    }
    return reply('Code envoyé. Consultez votre boîte email, et les courriers indésirables.', 200, { retryAfter: RESEND_MIN_MS / 1000 });
  }

  // ---------- Vérification du code ----------
  if (!row) return reply('Aucun code en attente. Demandez un nouveau code.', 400);
  if (new Date(row.expires_at).getTime() < now) return reply('Ce code a expiré. Demandez un nouveau code.', 400);
  if (row.attempts >= MAX_ATTEMPTS) return reply('Trop d’essais. Demandez un nouveau code.', 429);

  // On compte l'essai avant de comparer, et seulement si personne d'autre ne l'a compté en même temps.
  const { data: counted } = await admin
    .from('email_verification_codes')
    .update({ attempts: row.attempts + 1 })
    .eq('user_id', uid)
    .eq('attempts', row.attempts)
    .select('user_id');
  if (!counted || counted.length === 0) return reply('Réessayez dans un instant.', 409);

  const expected = await hashCode(input.code, uid, row.email);
  if (!sameHash(expected, row.code_hash)) {
    const left = MAX_ATTEMPTS - (row.attempts + 1);
    return reply(left > 0 ? `Code incorrect. ${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}.` : 'Code incorrect. Demandez un nouveau code.', 400);
  }

  await admin.from('email_verification_codes').delete().eq('user_id', uid);
  const { error: emailError } = await admin.from('profiles').update({ email: row.email, email_verified: true }).eq('id', uid).neq('status', 'suspended');
  if (emailError) return reply("La vérification n'a pas pu être enregistrée. Réessayez.", 500);
  // On n'active que les comptes « en attente » : un compte suspendu reste suspendu.
  const { error: statusError } = await admin.from('profiles').update({ status: 'active' }).eq('id', uid).eq('status', 'pending_verification');
  if (statusError) return reply("La vérification n'a pas pu être enregistrée. Réessayez.", 500);
  return reply('Email vérifié. Votre compte est actif.');
}
