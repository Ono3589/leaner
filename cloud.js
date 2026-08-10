/* ============================================================
   Leaner — Cloud: Login, Sync, Coach
   Kapselt alles, was mit dem Backend zu tun hat. Der Rest der App
   redet nur über diese Funktionen mit Supabase.

   Grundhaltung: Die App muss auch ohne Netz funktionieren.
   localStorage bleibt die Wahrheit für den Moment, die Cloud ist
   die Wahrheit über Geräte hinweg.
   ============================================================ */

const Cloud = {
  sb: null,
  user: null,
  online: () => navigator.onLine,

  /* ---------- Start ---------- */

  init() {
    if (!CONFIG.READY || !window.supabase) return false;
    this.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return true;
  },

  async session() {
    if (!this.sb) return null;
    const { data } = await this.sb.auth.getSession();
    this.user = data.session ? data.session.user : null;
    return data.session;
  },

  /* ---------- Login mit Passwort ----------
     Verschickt keine Mail und braucht deshalb keinen eigenen
     Mailversand. Voraussetzung: In Supabase muss "Confirm email"
     ausgeschaltet sein, sonst wartet die Registrierung auf eine
     Bestätigungsmail. */

  async signUpPassword(email, password) {
    const { data, error } = await this.sb.auth.signUp({
      email: email.trim(),
      password
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error(
        'Supabase wartet auf eine Bestätigungsmail. Schalte unter ' +
        'Authentication → Sign In / Providers → Email die Option "Confirm email" aus.'
      );
    }
    this.user = data.user;
    return data.user;
  },

  async signInPassword(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    this.user = data.user;
    return data.user;
  },

  /* ---------- Login per Code ----------
     Bewusst kein Magic Link: Ein Link öffnet auf dem iPhone Safari
     und nicht die installierte App. Ein Code lässt sich einfach
     abtippen und man bleibt in der App.
     Braucht eigenen SMTP-Versand — siehe SETUP.md, Schritt 5b. */

  async requestCode(email) {
    const { error } = await this.sb.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true }
    });
    if (error) throw error;
  },

  async verifyCode(email, code) {
    const { data, error } = await this.sb.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email'
    });
    if (error) throw error;
    this.user = data.user;
    return data.user;
  },

  async signOut() {
    if (this.sb) await this.sb.auth.signOut();
    this.user = null;
  },

  /* ---------- Zustand laden und speichern ---------- */

  async pull() {
    if (!this.sb || !this.user) return null;
    const { data, error } = await this.sb
      .from('app_state')
      .select('state, updated_at')
      .eq('user_id', this.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async push(state) {
    if (!this.sb || !this.user) return;
    const { error } = await this.sb
      .from('app_state')
      .upsert({
        user_id: this.user.id,
        state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) throw error;
  },

  /* ---------- Coach ----------
     Ruft die Edge Function auf. Der Anthropic-Key liegt dort als
     Secret und verlässt den Server nie. */

  async coach(messages, context) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const { data, error } = await this.sb.functions.invoke('coach', {
      body: { messages, context }
    });
    if (error) throw await describeFnError(error);
    if (!data || !data.reply) throw new Error('Antwort war leer');
    return data.reply;
  },

  /* ---------- Selbsttest ----------
     Prüft die Kette Schritt für Schritt und sagt, wo sie reißt.
     Ergebnis: Liste aus { ok, label, detail }. */

  async diagnose() {
    const steps = [];
    const add = (ok, label, detail) => steps.push({ ok, label, detail });

    add(CONFIG.READY, 'Konfiguration',
      CONFIG.READY ? CONFIG.SUPABASE_URL : 'SUPABASE_URL oder SUPABASE_KEY fehlt in config.js');

    add(!!window.supabase, 'Supabase-Bibliothek geladen',
      window.supabase ? 'ok' : 'Das CDN war nicht erreichbar — bist du offline?');

    add(!!this.sb, 'Verbindung aufgebaut', this.sb ? 'ok' : 'Client konnte nicht erstellt werden');
    if (!this.sb) return steps;

    try {
      const { data } = await this.sb.auth.getSession();
      add(!!data.session, 'Angemeldet',
        data.session ? data.session.user.email : 'Keine gültige Sitzung');
      if (!data.session) return steps;
    } catch (e) {
      add(false, 'Angemeldet', e.message);
      return steps;
    }

    try {
      await this.pull();
      add(true, 'Datenbank lesen', 'ok');
    } catch (e) {
      add(false, 'Datenbank lesen', dbHint(e));
      return steps;
    }

    try {
      const row = await this.pull();
      await this.push(row && row.state ? row.state : {});
      add(true, 'Datenbank schreiben', 'ok');
    } catch (e) {
      add(false, 'Datenbank schreiben', dbHint(e));
    }

    try {
      const { data, error } = await this.sb.functions.invoke('coach', {
        body: {
          messages: [{ role: 'me', text: 'Test. Antworte nur mit dem Wort ok.' }],
          context: { level: 1 }
        }
      });
      if (error) throw await describeFnError(error);
      add(!!(data && data.reply), 'Coach antwortet',
        data && data.reply ? data.reply.slice(0, 120) : 'Antwort war leer');
    } catch (e) {
      add(false, 'Coach antwortet', e.message);
    }

    return steps;
  }
};

/* Supabase verpackt Fehler der Edge Function so, dass die eigentliche
   Meldung im Response-Body steckt. Hier wird sie herausgeholt — sonst
   steht überall nur "Edge Function returned a non-2xx status code". */
async function describeFnError(error) {
  const res = error && error.context;
  if (res && typeof res.json === 'function') {
    try {
      const body = await res.clone().json();
      const msg = body.error || body.message;
      if (msg) return new Error(`${msg} (HTTP ${res.status})`);
    } catch (e) { /* kein JSON */ }
  }
  if (res && res.status === 404) {
    return new Error('Funktion "coach" nicht gefunden — sie ist noch nicht veröffentlicht (Schritt 7)');
  }
  if (res && res.status === 401) {
    return new Error('Funktion hat die Anmeldung abgelehnt (HTTP 401)');
  }
  if (res && res.status === 500) {
    return new Error('Funktion abgestürzt — meistens fehlt das Secret ANTHROPIC_API_KEY (Schritt 6)');
  }
  return new Error(error && error.message ? error.message : 'unbekannter Fehler');
}

function dbHint(e) {
  const m = (e && e.message ? e.message : '').toLowerCase();
  if (m.includes('does not exist') || m.includes('schema cache')) {
    return 'Tabelle fehlt — schema.sql wurde noch nicht ausgeführt (Schritt 4)';
  }
  if (m.includes('row-level security') || m.includes('policy')) {
    return 'Sicherheitsregeln greifen nicht — schema.sql nochmal komplett ausführen';
  }
  return e.message;
}

/* ============================================================
   Zusammenführen von zwei Ständen

   Ein reines "der neuere gewinnt" wäre hier falsch: Wer abends
   auf dem iPhone drei Quests abhakt und morgens den Mac öffnet,
   soll den Fortschritt nicht verlieren, nur weil das andere Gerät
   zuletzt geschrieben hat.

   Deshalb feldweise:
   - Zähler und XP  → der höhere Wert gewinnt
   - Listen         → Vereinigung, ohne Duplikate
   - Tagesliste     → nur zusammenführen, wenn es derselbe Tag ist
   - Einstellungen  → vom zuletzt geschriebenen Stand
   ============================================================ */

const MAX_FIELDS = [
  'xpTotal', 'streak', 'bestStreak', 'totalDone', 'cooked', 'fasts',
  'mindful', 'workouts', 'perfectDays', 'comebacks', 'coachAsks', 'recipesViewed'
];
const UNION_FIELDS = ['unlocked'];
const NEWER_FIELDS = ['gentleMode', 'reduceMotion', 'fastProtocol', 'freezes'];

function mergeState(local, remote, remoteNewer) {
  if (!remote) return local;
  const out = { ...local };

  MAX_FIELDS.forEach((k) => {
    out[k] = Math.max(Number(local[k]) || 0, Number(remote[k]) || 0);
  });

  UNION_FIELDS.forEach((k) => {
    out[k] = Array.from(new Set([...(local[k] || []), ...(remote[k] || [])]));
  });

  NEWER_FIELDS.forEach((k) => {
    out[k] = remoteNewer && remote[k] !== undefined ? remote[k] : local[k];
  });

  // Tagesliste nur zusammenführen, wenn beide vom selben Tag sind
  if (local.todayKey && local.todayKey === remote.todayKey) {
    out.doneToday = Array.from(new Set([...(local.doneToday || []), ...(remote.doneToday || [])]));
    out.fxDailyBonus = !!(local.fxDailyBonus || remote.fxDailyBonus);
  } else if (remoteNewer && remote.todayKey) {
    out.todayKey = remote.todayKey;
    out.doneToday = remote.doneToday || [];
    out.fxDailyBonus = !!remote.fxDailyBonus;
  }

  // Ein laufender Fasten-Timer gewinnt gegen keinen laufenden
  out.fastStart = local.fastStart || remote.fastStart || null;

  // Streak-Tage: der spätere Tag zählt
  out.lastActiveDay = laterDay(local.lastActiveDay, remote.lastActiveDay);
  out.lastStreakDay = laterDay(local.lastStreakDay, remote.lastStreakDay);

  // Chatverlauf: der längere gewinnt, das ist praktisch immer der aktuellere
  const lc = (local.chat || []).length, rc = (remote.chat || []).length;
  out.chat = rc > lc ? remote.chat : local.chat;

  return out;
}

function laterDay(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}
