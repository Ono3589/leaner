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
    this.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
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

  /* ---------- Login per 6-stelligem Code ----------
     Bewusst kein Magic Link: Ein Link öffnet auf dem iPhone Safari
     und nicht die installierte App. Ein Code lässt sich einfach
     abtippen und man bleibt in der App. */

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
    if (error) throw error;
    if (!data || !data.reply) throw new Error('leere Antwort');
    return data.reply;
  }
};

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
