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

  /* ---------- Eigene Rezepte ----------
     Liegen seit dem Umzug als eigene Zeilen statt als JSON-Block
     im Zustand. Nach außen sehen sie aus wie die mitgelieferten
     Rezepte, damit die Oberfläche nicht unterscheiden muss. */

  async listRecipes() {
    if (!this.sb || !this.user) return [];
    const { data, error } = await this.sb
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToRecipe);
  },

  async saveRecipe(recipe, computed) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const row = {
      user_id: this.user.id,
      name: recipe.name,
      hook: recipe.hook || '',
      minutes: recipe.minutes || 15,
      portions: recipe.portions || 1,
      items: recipe.items || [],
      steps: recipe.steps || [],
      kcal: computed ? Math.round(computed.perPortion.kcal) : null,
      protein: computed ? Math.round(computed.perPortion.p) : null,
      grade: computed && computed.score ? computed.score.grade : null,
      photo: recipe.photo || null,
      updated_at: new Date().toISOString()
    };
    // Bestehende Rezepte tragen bereits eine uuid aus der Datenbank
    if (recipe.id && /^[0-9a-f-]{36}$/i.test(recipe.id)) row.id = recipe.id;

    const { data, error } = await this.sb
      .from('recipes').upsert(row).select().single();
    if (error) throw error;
    return rowToRecipe(data);
  },

  async deleteRecipe(id) {
    if (!this.sb || !this.user) return;
    const { error } = await this.sb.from('recipes').delete().eq('id', id);
    if (error) throw error;
  },

  /* Einmaliger Umzug der Rezepte aus dem alten JSON-Block.
     legacy_id verhindert Dubletten, falls das zweimal läuft. */
  async migrateRecipes(list, computeFn) {
    if (!this.sb || !this.user || !list || !list.length) return 0;
    const rows = list.map((r) => {
      const c = computeFn ? computeFn(r) : null;
      return {
        user_id: this.user.id,
        name: r.name,
        hook: r.hook || '',
        minutes: r.minutes || 15,
        portions: r.portions || 1,
        items: r.items || [],
        steps: r.steps || [],
        kcal: c ? Math.round(c.perPortion.kcal) : null,
        protein: c ? Math.round(c.perPortion.p) : null,
        grade: c && c.score ? c.score.grade : null,
        legacy_id: r.id
      };
    });
    const { error } = await this.sb
      .from('recipes')
      .upsert(rows, { onConflict: 'user_id,legacy_id', ignoreDuplicates: true });
    if (error) throw error;
    return rows.length;
  },

  /* ---------- Eigene Zutaten ---------- */

  async listCustomFoods() {
    if (!this.sb || !this.user) return [];
    const { data, error } = await this.sb.from('custom_foods').select('*').order('name');
    if (error) throw error;
    return (data || []).map(rowToFood);
  },

  async saveCustomFood(food) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const row = {
      user_id: this.user.id,
      name: food.n,
      category: food.c || 'Eigene',
      kcal: food.kcal || 0, protein: food.p || 0, carbs: food.ch || 0,
      sugar: food.z || 0, fat: food.f || 0, sat_fat: food.sf || 0,
      fibre: food.b || 0, salt: food.s || 0, fvl: food.fvl || 0,
      barcode: food.barcode || null,
      photo_url: food.photo || null,
      source: food.source || 'eigen'
    };
    const { data, error } = await this.sb
      .from('custom_foods')
      .upsert(row, { onConflict: row.barcode ? 'user_id,barcode' : undefined })
      .select().single();
    if (error) throw error;
    return rowToFood(data);
  },

  async deleteCustomFood(id) {
    if (!this.sb || !this.user) return;
    const { error } = await this.sb.from('custom_foods').delete().eq('id', id);
    if (error) throw error;
  },

  /* ---------- Bilder ----------
     Der Bucket "photos" ist privat. Jede Datei liegt unter der
     eigenen Kennung, und die Zugriffsregeln lassen nur diesen
     Ordner zu — auch mit dem öffentlichen Schlüssel kommt niemand
     an fremde Bilder. */

  async uploadPhoto(blob, kind, ext) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'webp'}`;
    const path = `${this.user.id}/${kind || 'misc'}/${name}`;
    const { error } = await this.sb.storage
      .from('photos')
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    return path;
  },

  async signPhoto(path, seconds = 3600) {
    if (!this.sb || !this.user) return null;
    const { data, error } = await this.sb.storage
      .from('photos').createSignedUrl(path, seconds);
    if (error) throw error;
    return data ? data.signedUrl : null;
  },

  async removePhoto(path) {
    if (!this.sb || !this.user || !path || /^https?:/.test(path)) return;
    await this.sb.storage.from('photos').remove([path]);
  },

  /* ---------- Fortschrittsfotos ---------- */

  async listProgressPhotos() {
    if (!this.sb || !this.user) return [];
    const { data, error } = await this.sb
      .from('progress_photos').select('*').order('taken_on', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addProgressPhoto(path, weightKg, note) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const { data, error } = await this.sb.from('progress_photos').insert({
      user_id: this.user.id,
      path,
      weight_kg: weightKg || null,
      note: note || null
    }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteProgressPhoto(id, path) {
    if (!this.sb || !this.user) return;
    await this.removePhoto(path);
    const { error } = await this.sb.from('progress_photos').delete().eq('id', id);
    if (error) throw error;
  },

  /* ---------- Erinnerungen ---------- */

  async saveSubscription(sub, label) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const j = sub.toJSON();
    const { error } = await this.sb.from('push_subscriptions').upsert({
      user_id: this.user.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      label: label || null,
      failures: 0
    }, { onConflict: 'endpoint' });
    if (error) throw error;
  },

  async removeSubscription(endpoint) {
    if (!this.sb || !this.user) return;
    await this.sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
  },

  async getNotifyPrefs() {
    if (!this.sb || !this.user) return null;
    const { data, error } = await this.sb
      .from('notify_prefs').select('*').eq('user_id', this.user.id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveNotifyPrefs(prefs) {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const { data, error } = await this.sb.from('notify_prefs').upsert({
      user_id: this.user.id,
      ...prefs,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    return data;
  },

  async testNotification() {
    if (!this.sb || !this.user) throw new Error('nicht angemeldet');
    const { data, error } = await this.sb.functions.invoke('notify', { body: { mode: 'test' } });
    if (error) throw await describeFnError(error);
    return data;
  },

  /* ---------- Produktsuche ---------- */

  async searchProducts(query) {
    if (!this.sb || !this.user) return [];
    const { data, error } = await this.sb.functions.invoke('foodsearch', { body: { q: query } });
    if (error) throw await describeFnError(error);
    return (data && data.products) || [];
  },

  async productByBarcode(barcode) {
    if (!this.sb || !this.user) return null;
    const { data, error } = await this.sb.functions.invoke('foodsearch', { body: { barcode } });
    if (error) throw await describeFnError(error);
    return data && data.products && data.products[0] ? data.products[0] : null;
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
      add(true, 'Fortschritt lesen', 'ok');
    } catch (e) {
      add(false, 'Fortschritt lesen', dbHint(e, 'schema.sql'));
      return steps;
    }

    try {
      const row = await this.pull();
      await this.push(row && row.state ? row.state : {});
      add(true, 'Fortschritt speichern', 'ok');
    } catch (e) {
      add(false, 'Fortschritt speichern', dbHint(e, 'schema.sql'));
    }

    /* Ab hier wird jeder Punkt einzeln geprüft und nicht abgebrochen —
       so sieht man auf einen Blick, was fehlt und was schon läuft. */

    for (const [table, label, file] of [
      ['recipes', 'Tabelle Rezepte', 'schema-2.sql'],
      ['custom_foods', 'Tabelle eigene Zutaten', 'schema-2.sql'],
      ['progress_photos', 'Tabelle Fortschrittsfotos', 'schema-3.sql']
    ]) {
      try {
        const { error } = await this.sb.from(table).select('id').limit(1);
        if (error) throw error;
        add(true, label, 'ok');
      } catch (e) {
        add(false, label, dbHint(e, file));
      }
    }

    // Speicherbereich wirklich ausprobieren: hochladen, Link erzeugen, aufräumen
    try {
      const png = Uint8Array.from(atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ), (c) => c.charCodeAt(0));
      const path = `${this.user.id}/test/diag-${Date.now()}.png`;

      const up = await this.sb.storage.from('photos')
        .upload(path, new Blob([png], { type: 'image/png' }), { contentType: 'image/png' });
      if (up.error) throw up.error;

      const signed = await this.sb.storage.from('photos').createSignedUrl(path, 60);
      if (signed.error) throw signed.error;

      await this.sb.storage.from('photos').remove([path]);
      add(true, 'Bildspeicher', 'Hochladen, Anzeigen und Löschen funktionieren');
    } catch (e) {
      add(false, 'Bildspeicher', storageHint(e));
    }

    // Edge Functions
    try {
      const { data, error } = await this.sb.functions.invoke('foodsearch', { body: { q: 'haferflocken' } });
      if (error) throw await describeFnError(error);
      const n = (data && data.products) ? data.products.length : 0;
      add(n > 0, 'Produktsuche',
        n > 0 ? `${n} Treffer für "haferflocken"` : 'Erreichbar, aber ohne Treffer');
    } catch (e) {
      add(false, 'Produktsuche', e.message);
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

/* Datenbankzeilen in die Formen übersetzen, die der Rest der App
   ohnehin kennt — so muss die Oberfläche nichts über Tabellen wissen. */

function rowToRecipe(row) {
  return {
    id: row.id,
    name: row.name,
    hook: row.hook || '',
    minutes: row.minutes,
    portions: row.portions,
    items: row.items || [],
    steps: row.steps || [],
    photo: row.photo || null,
    icon: 'bowl',
    tags: ['Eigenes'],
    own: true
  };
}

function rowToFood(row) {
  return {
    id: 'cf:' + row.id,
    dbId: row.id,
    n: row.name,
    c: row.category || 'Eigene',
    kcal: Number(row.kcal), p: Number(row.protein), ch: Number(row.carbs),
    z: Number(row.sugar), f: Number(row.fat), sf: Number(row.sat_fat),
    b: Number(row.fibre), s: Number(row.salt), fvl: Number(row.fvl),
    barcode: row.barcode || null,
    photo: row.photo_url || null,
    source: row.source || 'eigen'
  };
}

/* Supabase verpackt Fehler der Edge Function so, dass die eigentliche
   Meldung im Response-Body steckt. Hier wird sie herausgeholt — sonst
   steht überall nur "Edge Function returned a non-2xx status code". */
async function describeFnError(error) {
  const res = error && error.context;

  /* Kommt gar keine Antwort zurück, ist die Funktion nicht erreichbar.
     Der Browser bricht dann schon vor der Antwort ab — meist weil es
     die Funktion unter diesem Namen nicht gibt. */
  const raw = (error && error.message ? error.message : '').toLowerCase();
  if (!res || raw.includes('failed to send a request') || raw.includes('failed to fetch')) {
    return new Error(
      'Funktion nicht erreichbar. Sie ist vermutlich noch nicht veröffentlicht — ' +
      'in Supabase unter Edge Functions nachsehen, ob sie dort steht (SETUP.md, Schritt 7 und 8).'
    );
  }

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

function dbHint(e, file) {
  const m = (e && e.message ? e.message : '').toLowerCase();
  const f = file || 'schema.sql';
  if (m.includes('does not exist') || m.includes('schema cache') || m.includes('not find the table')) {
    return `Tabelle fehlt — ${f} wurde noch nicht im SQL Editor ausgeführt`;
  }
  if (m.includes('row-level security') || m.includes('policy')) {
    return `Sicherheitsregeln greifen nicht — ${f} nochmal komplett ausführen`;
  }
  return e.message;
}

function storageHint(e) {
  const m = (e && e.message ? e.message : '').toLowerCase();
  if (m.includes('bucket not found') || m.includes('not found')) {
    return 'Der Bereich "photos" fehlt — schema-3.sql wurde noch nicht ausgeführt';
  }
  if (m.includes('row-level security') || m.includes('policy') || m.includes('unauthorized')) {
    return 'Die Zugriffsregeln fehlen. In schema-3.sql sind das die vier create-policy-Blöcke — ' +
           'manche Projekte lassen sie im SQL Editor nicht zu. Dann unter Storage → photos → Policies ' +
           'von Hand anlegen, jeweils mit der Bedingung (storage.foldername(name))[1] = auth.uid()::text';
  }
  if (m.includes('mime') || m.includes('content type')) {
    return 'Der Dateityp wird nicht angenommen — bei Storage → photos die erlaubten Typen prüfen';
  }
  if (m.includes('exceeded') || m.includes('too large')) {
    return 'Datei zu groß für die eingestellte Grenze';
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

  // Körperdaten: vom zuletzt geschriebenen Stand
  out.profile = remoteNewer && remote.profile ? remote.profile : (local.profile || remote.profile);

  // Eigene Rezepte: vereinigen, bei gleicher id gewinnt der neuere Stand
  const byId = new Map();
  (remoteNewer ? (local.myRecipes || []) : (remote.myRecipes || [])).forEach((r) => byId.set(r.id, r));
  (remoteNewer ? (remote.myRecipes || []) : (local.myRecipes || [])).forEach((r) => byId.set(r.id, r));
  out.myRecipes = Array.from(byId.values());

  // Tagebuch: Tag für Tag zusammenführen, Einträge über ihre eid entdoppeln
  out.diary = {};
  const days = new Set([...Object.keys(local.diary || {}), ...Object.keys(remote.diary || {})]);
  days.forEach((day) => {
    const seen = new Set();
    out.diary[day] = [...((local.diary || {})[day] || []), ...((remote.diary || {})[day] || [])]
      .filter((e) => {
        const key = e.eid || (e.name + e.kcal + e.meal);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  });

  return out;
}

function laterDay(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}
