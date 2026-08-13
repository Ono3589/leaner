/* ============================================================
   Leaner — Konfiguration
   Hier trägst du deine beiden Supabase-Werte ein (SETUP.md, Schritt 3).

   Den Schlüssel findest du unter Project Settings → API Keys als
   "Publishable key". Er beginnt mit sb_publishable_ und ist der
   Nachfolger dessen, was früher "anon key" hieß.

   Diese Werte dürfen öffentlich sein. Der Publishable key ist genau
   dafür gemacht: Er sagt nur "diese Anfrage kommt aus der App". Was
   jemand damit tatsächlich sehen und ändern darf, entscheiden die
   Row-Level-Security-Regeln in supabase/schema.sql.

   Was NIEMALS hierhin gehört: der Secret key (sb_secret_…, früher
   service_role) und der Anthropic-API-Key. Beide leben ausschließlich
   als Secret in Supabase.

   Die URL ist nur die Projektadresse — ohne /rest/v1/ am Ende.
   Den Rest hängt die Bibliothek selbst an.
   ============================================================ */

const CONFIG = {
  SUPABASE_URL: 'https://lasqqdmhsldorvgzbffj.supabase.co',
  SUPABASE_KEY: 'sb_publishable_RcZgnXWXmAfIwGtIBVo2Ng_pUS5yDT1',

  // Solange false, läuft die App wie bisher rein lokal —
  // praktisch zum Weiterentwickeln ohne Internet.
  CLOUD: true,

  /* Anmeldeverfahren
     'password' — E-Mail und Passwort. Supabase verschickt dabei keine
                  einzige Mail, also brauchst du weder eigenen Mailversand
                  noch angepasste Vorlagen. Der schnellste Weg.
     'code'     — sechsstelliger Code per Mail. Braucht eigenen SMTP-Versand
                  (SETUP.md, Schritt 5b). Umstellen ist ein Wort hier. */
  AUTH_MODE: 'code',

  /* Öffentlicher VAPID-Schlüssel für die Erinnerungen.
     Darf öffentlich sein — der private gehört als Secret nach
     Supabase und nirgendwo sonst hin (SETUP.md, Schritt 10). */
  VAPID_PUBLIC_KEY: 'BEa7h1z8I_K-5hTZENJFeKkdUumn-tFUHZc-JPJcS0edHTGPJWFILkSwbnn5aSTPUANcIuq1s_cYXEXTCdAn83Q'
};

// Ein versehentlich mitkopiertes /rest/v1/ ist der häufigste Stolperstein —
// hier wird es einfach abgeschnitten statt kommentarlos zu scheitern.
CONFIG.SUPABASE_URL = CONFIG.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

CONFIG.READY =
  CONFIG.CLOUD &&
  CONFIG.SUPABASE_URL.startsWith('http') &&
  CONFIG.SUPABASE_KEY.length > 20;
