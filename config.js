/* ============================================================
   Leaner — Konfiguration
   Hier trägst du deine beiden Supabase-Werte ein (SETUP.md, Schritt 2).

   Diese Werte dürfen öffentlich sein. Der anon key ist genau dafür
   gemacht: Er sagt nur "diese Anfrage kommt aus der App". Was ein
   Nutzer damit tatsächlich sehen und ändern darf, entscheiden die
   Row-Level-Security-Regeln in supabase/schema.sql.

   Was NIEMALS hierhin gehört: der service_role key und der
   Anthropic-API-Key. Beide leben ausschließlich als Secret in
   Supabase.
   ============================================================ */

const CONFIG = {
  SUPABASE_URL: 'HIER_DEINE_PROJECT_URL',
  SUPABASE_ANON_KEY: 'HIER_DEIN_ANON_KEY',

  // Solange false, läuft die App wie bisher rein lokal —
  // praktisch zum Weiterentwickeln ohne Internet.
  CLOUD: true
};

CONFIG.READY =
  CONFIG.CLOUD &&
  CONFIG.SUPABASE_URL.startsWith('http') &&
  CONFIG.SUPABASE_ANON_KEY.length > 20;
