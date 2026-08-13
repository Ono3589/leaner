/* ============================================================
   Leaner — Edge Function "notify"

   Verschickt die Erinnerungen. Zwei Betriebsarten:

     { mode: 'due' }   vom zeitgesteuerten Job, alle 15 Minuten.
                       Braucht den Kopf x-notify-secret.
     { mode: 'test' }  aus der App heraus, schickt sofort eine
                       Nachricht an die eigenen Geräte.

   Die Haltung dahinter ist wichtiger als die Technik: Eine
   Erinnerung, die nervt, wird abgeschaltet — und dann ist auch
   die hilfreiche weg. Deshalb gilt hier durchgehend:

   - Höchstens zwei Nachrichten am Tag, unabhängig von den
     Einstellungen.
   - Was schon erledigt ist, wird nicht erinnert. Wer morgens
     bereits drei Dinge abgehakt hat, bekommt abends nichts.
   - Keine Vorwürfe. Kein "Du hast heute noch nichts getan."
   - Ruhezeiten werden eingehalten.
   ============================================================ */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPush } from './webpush.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const CLIENT_KEY =
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY =
  Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:leaner@example.com';
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';

const DAILY_MAX = 2;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/* ------------------------------------------------------------
   Texte

   Kurz, konkret, als Angebot formuliert. Nie im Befehlston, nie
   mit Zahlen, die man verpasst hat.
------------------------------------------------------------ */

function morningText(offen: number) {
  const varianten = [
    { title: 'Guten Morgen', body: `Drei Dinge reichen heute. ${offen} stehen bereit.` },
    { title: 'Guten Morgen', body: 'Ein Glas Wasser wäre ein Anfang. 30 Sekunden.' },
    { title: 'Guten Morgen', body: 'Deine fünf für heute stehen. Drei davon zählen.' }
  ];
  return varianten[Math.floor(Math.random() * varianten.length)];
}

function eveningText() {
  const varianten = [
    { title: 'Küche zu?', body: 'Wenn du magst — ab jetzt nichts mehr. Der Rest ist morgen.' },
    { title: 'Feierabend', body: 'Guter Zeitpunkt, die Küche zuzumachen.' },
    { title: 'Küche zu?', body: 'Nur ein Hinweis, keine Ansage.' }
  ];
  return varianten[Math.floor(Math.random() * varianten.length)];
}

function weeklyText(tage: number, gekocht: number) {
  if (tage === 0) {
    return { title: 'Wochenrückblick', body: 'Diese Woche war nichts los. Auch gut — Montag ist ein neuer Anlauf.' };
  }
  return {
    title: 'Wochenrückblick',
    body: `${tage} aktive Tage, ${gekocht}× gekocht. Tipp rein für die Einordnung.`
  };
}

/* ------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: 'VAPID-Schlüssel fehlen als Secret in Supabase' }, 500);
  }
  const vapid = { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE };

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode ?? 'due');

  /* ---------- Testversand aus der App ---------- */
  if (mode === 'test') {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'nicht angemeldet' }, 401);

    const sb = createClient(SUPABASE_URL, CLIENT_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return json({ error: 'nicht angemeldet' }, 401);

    const r = await sendTo(admin, u.user.id, {
      title: 'Test',
      body: 'Wenn du das liest, funktionieren die Erinnerungen.',
      tag: 'test',
      url: '/#profile'
    }, vapid);
    // Fehler mit zurückgeben — sonst steht in der App nur "kein Gerät erreicht"
    return json({ sent: r.ok, geraete: r.total, fehler: r.errors });
  }

  /* ---------- Regulärer Lauf ---------- */
  if (NOTIFY_SECRET && req.headers.get('x-notify-secret') !== NOTIFY_SECRET) {
    return json({ error: 'nicht berechtigt' }, 403);
  }

  const { data: prefs, error } = await admin.from('notify_prefs').select('*');
  if (error) return json({ error: error.message }, 500);

  let verschickt = 0;
  const heute = new Date();

  for (const p of prefs ?? []) {
    try {
      // Ortszeit des Nutzers, nicht Serverzeit
      const local = new Date(heute.toLocaleString('en-US', { timeZone: p.timezone || 'Europe/Berlin' }));
      const minutes = local.getHours() * 60 + local.getMinutes();
      const weekday = local.getDay();                       // 0 = Sonntag
      const day = local.toISOString().slice(0, 10);

      if (inQuiet(minutes, p.quiet_from, p.quiet_to)) continue;

      // Tagesobergrenze
      const { count } = await admin.from('notify_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', p.user_id).eq('day', day).neq('kind', 'test');
      if ((count ?? 0) >= DAILY_MAX) continue;

      const kind = dueKind(minutes, weekday, p);
      if (!kind) continue;

      // Schon verschickt? Der eindeutige Index fängt es zusätzlich ab.
      const { data: schon } = await admin.from('notify_log')
        .select('id').eq('user_id', p.user_id).eq('kind', kind).eq('day', day).maybeSingle();
      if (schon) continue;

      const msg = await buildMessage(admin, p.user_id, kind);
      if (!msg) continue;                                   // nichts zu sagen — dann schweigen

      const r = await sendTo(admin, p.user_id, msg, vapid);
      if (r.ok > 0) {
        await admin.from('notify_log').insert({ user_id: p.user_id, kind, day });
        verschickt += r.ok;
      }
    } catch (e) {
      console.error('Nutzer übersprungen:', p.user_id, (e as Error).message);
    }
  }

  return json({ verschickt });
});

/* ---------- Welche Erinnerung ist gerade dran? ----------
   15 Minuten Toleranz, passend zum Takt des Jobs. */
function dueKind(minutes: number, weekday: number, p: Record<string, unknown>) {
  const at = (t: string) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const treffer = (t: string) => {
    const d = minutes - at(t);
    return d >= 0 && d < 15;
  };

  if (p.weekly && weekday === 0 && treffer('18:00')) return 'weekly';
  if (p.morning && treffer(String(p.morning_at))) return 'morning';
  if (p.evening && treffer(String(p.evening_at))) return 'evening';
  return null;
}

function inQuiet(minutes: number, from: string, to: string) {
  const at = (t: string) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const a = at(from), b = at(to);
  return a < b ? (minutes >= a && minutes < b) : (minutes >= a || minutes < b);
}

/* ---------- Inhalt aus dem echten Stand bauen ----------
   Gibt null zurück, wenn es nichts zu erinnern gibt. Schweigen
   ist hier die bessere Nachricht. */
async function buildMessage(admin: ReturnType<typeof createClient>, userId: string, kind: string) {
  const { data } = await admin.from('app_state').select('state').eq('user_id', userId).maybeSingle();
  const s = (data?.state ?? {}) as Record<string, unknown>;
  const doneToday = Array.isArray(s.doneToday) ? s.doneToday.length : 0;

  if (kind === 'morning') {
    if (doneToday >= 3) return null;                        // läuft schon, nicht stören
    return { ...morningText(5 - doneToday), tag: 'morning', url: '/#home' };
  }

  if (kind === 'evening') {
    // Wer heute gar nichts erfasst hat, snackt vermutlich auch
    // nicht in der App — dann bringt der Hinweis nichts.
    const diary = (s.diary ?? {}) as Record<string, unknown[]>;
    const heute = Object.keys(diary).sort().pop();
    const eintraege = heute ? (diary[heute] ?? []).length : 0;
    if (eintraege === 0 && doneToday === 0) return null;
    return { ...eveningText(), tag: 'evening', url: '/#food' };
  }

  if (kind === 'weekly') {
    const streak = Number(s.streak ?? 0);
    const cooked = Number(s.cooked ?? 0);
    return { ...weeklyText(Math.min(streak, 7), cooked), tag: 'weekly', url: '/#coach' };
  }

  return null;
}

/* ---------- Verschicken ----------
   Abgelaufene Abos werden entfernt. Ein Endpunkt, der 404 oder
   410 meldet, gehört zu einer deinstallierten App. */
async function sendTo(
  admin: ReturnType<typeof createClient>,
  userId: string,
  msg: { title: string; body: string; tag?: string; url?: string },
  vapid: { subject: string; publicKey: string; privateKey: string }
) {
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', userId);
  if (!subs || !subs.length) return { ok: 0, total: 0, errors: ['kein Gerät angemeldet'] };

  let ok = 0;
  const errors: string[] = [];

  for (const s of subs) {
    try {
      const res = await sendPush(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
        vapid
      );

      if (res.ok || res.status === 201) {
        ok++;
        continue;
      }

      const detail = (await res.text().catch(() => '')).slice(0, 160);
      errors.push(`${s.label ?? 'Gerät'}: HTTP ${res.status} ${detail}`);
      console.error('Push abgelehnt', res.status, detail);

      // 404 und 410 heißen: Abo gibt es nicht mehr, App wurde entfernt
      if (res.status === 404 || res.status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id);
      } else {
        await admin.from('push_subscriptions')
          .update({ failures: (s.failures ?? 0) + 1 }).eq('id', s.id);
      }
    } catch (e) {
      errors.push(`${s.label ?? 'Gerät'}: ${(e as Error).message}`);
      console.error('Versand fehlgeschlagen', (e as Error).message);
    }
  }

  return { ok, total: subs.length, errors };
}
