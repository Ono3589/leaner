/* ============================================================
   Leaner — Edge Function "foodsearch"

   Sucht Produkte bei Open Food Facts und gibt sie in dem Format
   zurück, das die App ohnehin verwendet.

   Warum das nicht direkt im Browser passiert:
   1. Open Food Facts bittet darum, sich mit einer App-Kennung im
      User-Agent zu melden. Genau dieses Feld darf ein Browser
      nicht setzen.
   2. Die Ratelimits sind eng — zehn Suchanfragen pro Minute.
      Beim Tippen wäre das sofort erreicht. Hier liegt ein
      gemeinsamer Zwischenspeicher davor.
   3. CORS wird damit gegenstandslos.

   Aufrufe:
     { q: "haferflocken" }        Volltextsuche
     { barcode: "4000540001112" } einzelnes Produkt
   ============================================================ */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const CLIENT_KEY =
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY =
  Deno.env.get('SUPABASE_SECRET_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Open Food Facts bittet um die Form AppName/Version (Kontakt)
const UA = 'Leaner/1.0 (https://ono3589.github.io/leaner)';

const CACHE_DAYS = 30;
const DAILY_LIMIT = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/* ---------- Umrechnung ins Format der App ----------
   Open Food Facts liefert je nach Produkt unterschiedlich
   vollständige Daten. Fehlt die Energie, ist der Eintrag für uns
   wertlos — solche Produkte fliegen raus, statt mit Nullen in der
   Nährwertrechnung zu landen. */

type Off = Record<string, unknown>;

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function mapProduct(p: Off): Off | null {
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  // Auf Vorhandensein prüfen, nicht auf einen Wert über null — sonst
  // fielen Wasser, Kaffee und alle kalorienfreien Getränke heraus.
  const hasEnergy = n['energy-kcal_100g'] !== undefined || n['energy_100g'] !== undefined;
  if (!hasEnergy) return null;

  let kcal = num(n['energy-kcal_100g']);
  if (!kcal && num(n['energy_100g'])) kcal = num(n['energy_100g']) / 4.184;

  const name = String(p.product_name_de || p.product_name || '').trim();
  if (!name) return null;

  const brand = String(p.brands || '').split(',')[0].trim();
  const tags = (p.categories_tags ?? []) as string[];
  const isBeverage = tags.some((t) => t.includes('beverages') || t.includes('getranke'));
  const isWater = tags.some((t) => t.includes('waters') || t.includes('mineral-water'));

  // Salz kann fehlen, Natrium aber vorhanden sein — 1 g Natrium sind 2,5 g Salz
  let salt = num(n['salt_100g']);
  if (!salt && num(n['sodium_100g'])) salt = num(n['sodium_100g']) * 2.5;

  return {
    id: 'off:' + String(p.code ?? ''),
    barcode: String(p.code ?? ''),
    n: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    c: 'Produkt',
    kcal: Math.round(kcal * 10) / 10,
    p: num(n['proteins_100g']),
    ch: num(n['carbohydrates_100g']),
    z: num(n['sugars_100g']),
    f: num(n['fat_100g']),
    sf: num(n['saturated-fat_100g']),
    b: num(n['fiber_100g']),
    s: Math.round(salt * 100) / 100,
    fvl: num(n['fruits-vegetables-nuts-estimate-from-ingredients_100g']),
    // Kleines Vorschaubild reicht — die Liste zeigt es in 40 Pixeln
    photo: (p.image_front_thumb_url || p.image_front_small_url || p.image_thumb_url || null) as string | null,
    beverage: isBeverage || undefined,
    water: isWater || undefined,
    offGrade: p.nutrition_grades ? String(p.nutrition_grades).toUpperCase() : null,
    source: 'openfoodfacts'
  };
}

const FIELDS = [
  'code', 'product_name', 'product_name_de', 'brands',
  'categories_tags', 'nutrition_grades', 'nutriments',
  'image_front_thumb_url', 'image_front_small_url', 'image_thumb_url'
].join(',');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  try {
    /* 1) Angemeldet? */
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'nicht angemeldet' }, 401);

    const sb = createClient(SUPABASE_URL, CLIENT_KEY, {
      global: { headers: { Authorization: auth } }
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'nicht angemeldet' }, 401);

    /* 2) Anfrage lesen */
    const body = await req.json().catch(() => ({}));
    const q = String(body.q ?? '').trim().toLowerCase();
    const barcode = String(body.barcode ?? '').replace(/\D/g, '');
    if (!q && !barcode) return json({ error: 'nichts zu suchen' }, 400);
    if (q && q.length < 3) return json({ products: [] });

    const key = barcode ? 'b:' + barcode : 'q:' + q;

    /* 3) Zwischenspeicher — mit erhöhten Rechten, weil off_cache
          für Clients gesperrt ist */
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: cached } = await admin
      .from('off_cache')
      .select('payload, fetched_at')
      .eq('key', key)
      .maybeSingle();

    if (cached) {
      const ageDays = (Date.now() - new Date(cached.fetched_at as string).getTime()) / 86400000;
      if (ageDays < CACHE_DAYS) {
        return json({ products: cached.payload, cached: true });
      }
    }

    /* 4) Tageslimit erst prüfen, wenn wirklich nach außen gegangen wird */
    const { data: allowed } = await sb.rpc('bump_usage', { p_kind: 'foodsearch', p_limit: DAILY_LIMIT });
    if (allowed === false) {
      return json({ products: [], limit: true });
    }

    /* 5) Open Food Facts fragen
          Achtung: Volltextsuche gibt es nur in der älteren
          Schnittstelle, Barcode-Abruf nur in v2. */
    const url = barcode
      ? `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${FIELDS}`
      : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
      console.error('Open Food Facts antwortet mit', res.status);
      return json({ products: [], upstream: res.status }, 200);
    }

    const data = await res.json();
    const raw: Off[] = barcode
      ? (data.status === 1 && data.product ? [data.product] : [])
      : ((data.products ?? []) as Off[]);

    const products = raw
      .map(mapProduct)
      .filter(Boolean)
      .slice(0, 12);

    /* 6) Merken — auch leere Ergebnisse, sonst fragen wir bei jedem
          Tastendruck erneut nach demselben Nichts */
    await admin.from('off_cache').upsert({
      key, payload: products, fetched_at: new Date().toISOString()
    }, { onConflict: 'key' });

    return json({ products });

  } catch (e) {
    console.error(e);
    return json({ products: [], error: 'Suche nicht erreichbar' }, 200);
  }
});
