/* ============================================================
   Leaner — Edge Function "coach"

   Warum das serverseitig laufen muss: Der Anthropic-API-Key darf
   nicht ins Frontend. Alles, was im Browser liegt, kann jeder
   auslesen — und dann auf deine Rechnung Anfragen stellen.
   Hier liegt der Key als Supabase-Secret und verlässt den Server nie.

   Ablauf:
   1. Prüfen, ob die Anfrage von einem angemeldeten Nutzer kommt
   2. Tageslimit prüfen (Schutz vor Endlosschleifen und Rechnungen)
   3. Anfrage mit dem Fortschritt des Nutzers anreichern
   4. Claude aufrufen und die Antwort zurückgeben
   ============================================================ */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;

// Supabase stellt je nach Projektalter den einen oder anderen Namen bereit.
const CLIENT_KEY =
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY')!;

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 900;
const DAILY_LIMIT = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM = `Du bist der Coach in der App "Leaner". Die App verbindet gesunde Ernährung,
Fasten, Bewegung und Mindfulness und ist für Menschen mit ADHS gebaut.

Deine Haltung:
- Kurz und konkret. Zwei bis fünf Sätze, oder eine kurze Liste. Keine Vorträge.
- Duze den Nutzer. Schreib auf Deutsch, außer er schreibt in einer anderen Sprache.
- Keine Moral, kein Shaming, keine Motivationssprüche. Er weiß selbst, was gut wäre —
  das Problem ist die Umsetzung, nicht das Wissen.
- Nimm ADHS ernst: Reibung senken, Entscheidungen reduzieren, an bestehende
  Gewohnheiten andocken, Neuheitseffekt einplanen. "Streng dich mehr an" ist nie die Antwort.
- Wenn er auslässt oder abbricht: normalisieren, kleinsten nächsten Schritt anbieten.
- Nutze seinen Fortschritt aus dem Kontext, wenn er zur Frage passt. Zähl ihn nicht
  unaufgefordert auf.

Zu Kalorien und Defizit:
Die App rechnet Grundumsatz und Bedarf nach Mifflin-St Jeor und zeigt sie im Kontext.
Über diese konkreten Zahlen darfst du sprechen und ein Defizit in einem Bereich
einordnen. Dabei gelten feste Grenzen, die du nie unterschreitest:
- Nie ein Ziel unterhalb des Grundumsatzes.
- Höchstens rund 500 kcal Defizit, oder 20 Prozent des Gesamtbedarfs.
- Bei einem BMI unter 20 empfiehlst du kein Defizit, sondern Krafttraining bei
  etwa gleichbleibenden Kalorien.
- Weise darauf hin, dass die Formel etwa zehn Prozent streut und die tatsächliche
  Gewichtsentwicklung über zwei bis drei Wochen aussagekräftiger ist.
Wenn keine Körperdaten im Kontext stehen, rechne nichts aus, sondern verweise
auf Profil → Dein Körper.

Zum Nutri-Score:
Die App bewertet Rezepte nach dem Nutri-Score in der Fassung von 2023, bezogen
auf 100 g. Ordne ihn richtig ein: Er vergleicht ähnliche Produkte und ist keine
Aussage über die Qualität einer ganzen Mahlzeit. Öl-, nuss- und käsehaltige
Gerichte schneiden systematisch schlechter ab, ohne deshalb ungesund zu sein.

Grenzen, die du nicht überschreitest:
- Keine Empfehlungen zu ADHS-Medikation, Dosierung oder Absetzen. Verweise an die
  behandelnde Ärztin oder den Arzt. Das Praktische drumherum darfst du besprechen.
- Bei Anzeichen einer Essstörung: nicht mitspielen, keine Restriktion vorschlagen,
  freundlich auf professionelle Unterstützung hinweisen.
- Fasten nicht empfehlen bei Schwangerschaft, Diabetes, Essstörungen in der
  Vorgeschichte. Im Zweifel ärztlich abklären lassen.
- Du bist kein Arzt und keine Therapeutin. Sag das, wenn es relevant wird, aber
  nicht in jeder Nachricht.

Format: Klartext. **Fett** für Hervorhebungen. Für Aufzählungen <ul><li>…</li></ul>.
Keine Überschriften, keine Emoji.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  try {
    if (!ANTHROPIC_KEY) return json({ error: 'ANTHROPIC_API_KEY fehlt' }, 500);

    // 1) Angemeldet?
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'nicht angemeldet' }, 401);

    const sb = createClient(SUPABASE_URL, CLIENT_KEY, {
      global: { headers: { Authorization: auth } }
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'nicht angemeldet' }, 401);

    // 2) Tageslimit
    const { data: allowed, error: limitErr } = await sb.rpc('bump_coach_usage', { p_limit: DAILY_LIMIT });
    if (limitErr) console.error('Limit-Prüfung fehlgeschlagen:', limitErr.message);
    if (allowed === false) {
      return json({
        reply: 'Für heute ist mein Tageslimit erreicht. Morgen bin ich wieder da — bis dahin ' +
               'findest du im Fokus- und Essen-Tab alles, was du für heute brauchst.'
      });
    }

    // 3) Anfrage lesen
    const { messages = [], context = {} } = await req.json();
    const history = (Array.isArray(messages) ? messages : [])
      .slice(-12)
      .map((m: { role: string; text: string }) => ({
        role: m.role === 'me' ? 'user' : 'assistant',
        content: String(m.text ?? '').slice(0, 4000)
      }))
      .filter((m: { content: string }) => m.content.length > 0);

    if (!history.length || history[history.length - 1].role !== 'user') {
      return json({ error: 'keine Frage erhalten' }, 400);
    }

    const ctx = [
      `Level ${context.level ?? 1}`,
      `${context.xpTotal ?? 0} XP gesamt`,
      `aktueller Streak ${context.streak ?? 0} Tage, Rekord ${context.bestStreak ?? 0}`,
      `heute erledigt: ${context.doneToday ?? 0} von 5`,
      `Fastenprotokoll ${context.fastProtocol ?? 'unbekannt'}${context.fasting ? ', läuft gerade' : ''}`,
      `bisher ${context.cooked ?? 0}× gekocht, ${context.workouts ?? 0}× bewegt, ${context.mindful ?? 0}× Mindfulness`,
      `Ortszeit ${context.localTime ?? 'unbekannt'}`,
      context.tdee
        ? `Grundumsatz ${context.bmr} kcal, Gesamtbedarf ${context.tdee} kcal, BMI ${context.bmi}, ` +
          `eingestelltes Defizit ${context.deficit} kcal, Tagesziel ${context.targetKcal} kcal`
        : 'keine Körperdaten hinterlegt',
      `heute gegessen ${context.eatenToday ?? 0} kcal mit ${context.proteinToday ?? 0} g Eiweiß`
    ].join(' · ');

    // 4) Claude
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: `${SYSTEM}\n\nStand des Nutzers gerade: ${ctx}`,
        messages: history
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Anthropic-Fehler', res.status, detail);
      return json({ error: 'Coach nicht erreichbar', status: res.status }, 502);
    }

    const data = await res.json();
    const reply = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim();

    return json({ reply: reply || 'Da ist nichts angekommen. Frag nochmal.' });

  } catch (e) {
    console.error(e);
    return json({ error: 'unerwarteter Fehler' }, 500);
  }
});
