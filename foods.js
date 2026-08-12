/* ============================================================
   Leaner — Zutaten-Datenbank

   Alle Werte pro 100 g beziehungsweise 100 ml, im rohen Zustand,
   sofern nicht anders benannt ("gekocht" steht im Namen).

   Felder:
     id    eindeutiger Schlüssel
     n     Name
     c     Kategorie (für Gruppierung in der Suche)
     kcal  Kalorien
     p     Eiweiß (g)
     ch    Kohlenhydrate (g)
     z     davon Zucker (g)
     f     Fett (g)
     sf    davon gesättigt (g)
     b     Ballaststoffe (g)
     s     Salz (g)
     fvl   Anteil Obst/Gemüse/Hülsenfrüchte/Nüsse in Prozent —
           zählt im Nutri-Score positiv. Kartoffeln und Süßkartoffeln
           zählen laut Algorithmus ausdrücklich NICHT dazu.

   Die Werte sind Referenzwerte aus gängigen Nährwerttabellen und
   für die Einordnung gedacht, nicht für medizinische Zwecke.
   Eigene Zutaten lassen sich in der App ergänzen.
   ============================================================ */

const FOODS = [

  /* ---------- Getreide, Beilagen ---------- */
  { id: 'hafer',      n: 'Haferflocken',            c: 'Getreide', kcal: 372, p: 13.5, ch: 58.7, z: 1.2, f: 7.0,  sf: 1.3,  b: 10.0, s: 0.02, fvl: 0 },
  { id: 'reis_w',     n: 'Reis, weiß, roh',         c: 'Getreide', kcal: 349, p: 7.0,  ch: 77.7, z: 0.2, f: 0.6,  sf: 0.2,  b: 1.4,  s: 0.01, fvl: 0 },
  { id: 'reis_wk',    n: 'Reis, weiß, gekocht',     c: 'Getreide', kcal: 124, p: 2.5,  ch: 27.6, z: 0.1, f: 0.2,  sf: 0.1,  b: 0.5,  s: 0.01, fvl: 0 },
  { id: 'reis_v',     n: 'Reis, Vollkorn, roh',     c: 'Getreide', kcal: 344, p: 7.8,  ch: 71.2, z: 0.9, f: 2.2,  sf: 0.5,  b: 3.5,  s: 0.01, fvl: 0 },
  { id: 'quinoa',     n: 'Quinoa, roh',             c: 'Getreide', kcal: 368, p: 14.1, ch: 57.2, z: 4.6, f: 6.1,  sf: 0.7,  b: 7.0,  s: 0.01, fvl: 0 },
  { id: 'couscous',   n: 'Couscous, roh',           c: 'Getreide', kcal: 376, p: 12.8, ch: 72.4, z: 0.6, f: 0.6,  sf: 0.1,  b: 5.0,  s: 0.02, fvl: 0 },
  { id: 'bulgur',     n: 'Bulgur, roh',             c: 'Getreide', kcal: 342, p: 12.3, ch: 63.4, z: 0.4, f: 1.3,  sf: 0.2,  b: 12.5, s: 0.02, fvl: 0 },
  { id: 'nudel',      n: 'Nudeln, roh',             c: 'Getreide', kcal: 359, p: 12.5, ch: 71.2, z: 3.2, f: 1.5,  sf: 0.3,  b: 3.2,  s: 0.02, fvl: 0 },
  { id: 'nudel_v',    n: 'Vollkornnudeln, roh',     c: 'Getreide', kcal: 348, p: 13.4, ch: 62.5, z: 3.0, f: 2.5,  sf: 0.5,  b: 9.0,  s: 0.02, fvl: 0 },
  { id: 'soba',       n: 'Sobanudeln, roh',         c: 'Getreide', kcal: 336, p: 14.4, ch: 66.6, z: 1.6, f: 0.9,  sf: 0.2,  b: 4.0,  s: 0.6,  fvl: 0 },
  { id: 'ramen',      n: 'Ramennudeln, roh',        c: 'Getreide', kcal: 365, p: 11.0, ch: 71.0, z: 1.5, f: 2.5,  sf: 0.6,  b: 3.0,  s: 1.2,  fvl: 0 },
  { id: 'kartoffel',  n: 'Kartoffeln, roh',         c: 'Getreide', kcal: 77,  p: 2.0,  ch: 15.4, z: 0.8, f: 0.1,  sf: 0.0,  b: 2.1,  s: 0.01, fvl: 0 },
  { id: 'suesskart',  n: 'Süßkartoffeln, roh',      c: 'Getreide', kcal: 86,  p: 1.6,  ch: 17.0, z: 4.2, f: 0.1,  sf: 0.0,  b: 3.0,  s: 0.14, fvl: 0 },
  { id: 'polenta',    n: 'Polenta, roh',            c: 'Getreide', kcal: 358, p: 8.1,  ch: 76.9, z: 0.6, f: 1.4,  sf: 0.2,  b: 3.9,  s: 0.02, fvl: 0 },
  { id: 'mehl_405',   n: 'Weizenmehl Type 405',     c: 'Getreide', kcal: 348, p: 10.0, ch: 72.3, z: 1.0, f: 1.0,  sf: 0.2,  b: 3.2,  s: 0.01, fvl: 0 },
  { id: 'mehl_vk',    n: 'Weizenvollkornmehl',      c: 'Getreide', kcal: 331, p: 11.6, ch: 59.6, z: 1.4, f: 2.0,  sf: 0.4,  b: 11.7, s: 0.01, fvl: 0 },

  /* ---------- Brot und Backwaren ---------- */
  { id: 'brot_vk',    n: 'Vollkornbrot',            c: 'Brot',     kcal: 217, p: 7.4,  ch: 36.4, z: 2.7, f: 2.5,  sf: 0.5,  b: 7.4,  s: 1.2,  fvl: 0 },
  { id: 'brot_misch', n: 'Mischbrot',               c: 'Brot',     kcal: 240, p: 7.0,  ch: 46.0, z: 2.0, f: 1.2,  sf: 0.3,  b: 4.2,  s: 1.3,  fvl: 0 },
  { id: 'toast',      n: 'Toastbrot',               c: 'Brot',     kcal: 273, p: 8.0,  ch: 49.0, z: 4.0, f: 4.0,  sf: 0.8,  b: 3.0,  s: 1.1,  fvl: 0 },
  { id: 'broetchen',  n: 'Brötchen',                c: 'Brot',     kcal: 277, p: 9.0,  ch: 55.0, z: 2.5, f: 1.5,  sf: 0.3,  b: 3.0,  s: 1.3,  fvl: 0 },
  { id: 'wrap',       n: 'Weizen-Wrap',             c: 'Brot',     kcal: 300, p: 8.0,  ch: 49.0, z: 2.5, f: 7.5,  sf: 3.0,  b: 3.0,  s: 1.3,  fvl: 0 },
  { id: 'wrap_vk',    n: 'Vollkorn-Wrap',           c: 'Brot',     kcal: 285, p: 9.5,  ch: 42.0, z: 2.0, f: 7.0,  sf: 2.5,  b: 6.5,  s: 1.2,  fvl: 0 },
  { id: 'knaecke',    n: 'Knäckebrot',              c: 'Brot',     kcal: 340, p: 10.0, ch: 62.0, z: 1.5, f: 1.5,  sf: 0.3,  b: 16.0, s: 1.0,  fvl: 0 },
  { id: 'reiswaffel', n: 'Reiswaffel',              c: 'Brot',     kcal: 387, p: 8.0,  ch: 81.0, z: 0.5, f: 3.0,  sf: 0.6,  b: 4.0,  s: 0.3,  fvl: 0 },

  /* ---------- Milchprodukte ---------- */
  { id: 'milch_35',   n: 'Milch 3,5 %',             c: 'Milch',    kcal: 65,  p: 3.4,  ch: 4.8,  z: 4.8, f: 3.5,  sf: 2.2,  b: 0,    s: 0.13, fvl: 0 },
  { id: 'milch_15',   n: 'Milch 1,5 %',             c: 'Milch',    kcal: 47,  p: 3.4,  ch: 4.9,  z: 4.9, f: 1.5,  sf: 0.9,  b: 0,    s: 0.13, fvl: 0 },
  { id: 'hafermilch', n: 'Hafermilch',              c: 'Milch',    kcal: 46,  p: 0.7,  ch: 6.8,  z: 4.0, f: 1.5,  sf: 0.2,  b: 0.8,  s: 0.10, fvl: 0 },
  { id: 'sojamilch',  n: 'Sojadrink, ungesüßt',     c: 'Milch',    kcal: 33,  p: 3.3,  ch: 0.6,  z: 0.5, f: 1.8,  sf: 0.3,  b: 0.6,  s: 0.09, fvl: 0 },
  { id: 'mandelm',    n: 'Mandeldrink, ungesüßt',   c: 'Milch',    kcal: 15,  p: 0.5,  ch: 0.3,  z: 0.2, f: 1.2,  sf: 0.1,  b: 0.3,  s: 0.10, fvl: 0 },
  { id: 'joghurt_35', n: 'Naturjoghurt 3,5 %',      c: 'Milch',    kcal: 68,  p: 3.5,  ch: 4.6,  z: 4.6, f: 3.5,  sf: 2.3,  b: 0,    s: 0.13, fvl: 0 },
  { id: 'joghurt_15', n: 'Naturjoghurt 1,5 %',      c: 'Milch',    kcal: 51,  p: 3.8,  ch: 4.8,  z: 4.8, f: 1.5,  sf: 1.0,  b: 0,    s: 0.13, fvl: 0 },
  { id: 'skyr',       n: 'Skyr',                    c: 'Milch',    kcal: 63,  p: 11.0, ch: 4.0,  z: 4.0, f: 0.2,  sf: 0.1,  b: 0,    s: 0.10, fvl: 0 },
  { id: 'quark_mager',n: 'Magerquark',              c: 'Milch',    kcal: 67,  p: 12.0, ch: 4.1,  z: 4.1, f: 0.3,  sf: 0.2,  b: 0,    s: 0.05, fvl: 0 },
  { id: 'huettenk',   n: 'Hüttenkäse',              c: 'Milch',    kcal: 98,  p: 12.5, ch: 3.0,  z: 3.0, f: 4.3,  sf: 2.8,  b: 0,    s: 0.7,  fvl: 0 },
  { id: 'frischkaese',n: 'Frischkäse Doppelrahm',   c: 'Milch',    kcal: 253, p: 6.5,  ch: 3.5,  z: 3.5, f: 24.0, sf: 16.0, b: 0,    s: 0.8,  fvl: 0 },
  { id: 'feta',       n: 'Feta',                    c: 'Milch',    kcal: 264, p: 14.2, ch: 4.1,  z: 4.1, f: 21.3, sf: 15.0, b: 0,    s: 2.9,  fvl: 0 },
  { id: 'mozzarella', n: 'Mozzarella',              c: 'Milch',    kcal: 254, p: 18.0, ch: 1.5,  z: 1.0, f: 20.0, sf: 12.0, b: 0,    s: 1.3,  fvl: 0 },
  { id: 'gouda',      n: 'Gouda 45 %',              c: 'Milch',    kcal: 356, p: 25.0, ch: 0,    z: 0,   f: 28.0, sf: 18.0, b: 0,    s: 2.0,  fvl: 0 },
  { id: 'parmesan',   n: 'Parmesan',                c: 'Milch',    kcal: 392, p: 33.0, ch: 0,    z: 0,   f: 29.0, sf: 19.0, b: 0,    s: 1.6,  fvl: 0 },
  { id: 'sahne',      n: 'Schlagsahne 30 %',        c: 'Milch',    kcal: 292, p: 2.4,  ch: 3.2,  z: 3.2, f: 30.0, sf: 19.0, b: 0,    s: 0.08, fvl: 0 },
  { id: 'schmand',    n: 'Schmand 24 %',            c: 'Milch',    kcal: 237, p: 2.8,  ch: 3.4,  z: 3.4, f: 24.0, sf: 15.0, b: 0,    s: 0.1,  fvl: 0 },
  { id: 'butter',     n: 'Butter',                  c: 'Fett',     kcal: 741, p: 0.7,  ch: 0.6,  z: 0.6, f: 82.0, sf: 51.0, b: 0,    s: 0.02, fvl: 0 },

  /* ---------- Eier, Fleisch, Fisch ---------- */
  { id: 'ei',         n: 'Hühnerei',                c: 'Protein',  kcal: 137, p: 12.6, ch: 0.7,  z: 0.7, f: 9.3,  sf: 2.8,  b: 0,    s: 0.32, fvl: 0 },
  { id: 'eiweiss',    n: 'Eiklar',                  c: 'Protein',  kcal: 48,  p: 11.1, ch: 0.7,  z: 0.7, f: 0.2,  sf: 0.0,  b: 0,    s: 0.42, fvl: 0 },
  { id: 'haehnchen',  n: 'Hähnchenbrust, roh',      c: 'Protein',  kcal: 107, p: 22.8, ch: 0,    z: 0,   f: 1.4,  sf: 0.4,  b: 0,    s: 0.15, fvl: 0 },
  { id: 'pute',       n: 'Putenbrust, roh',         c: 'Protein',  kcal: 105, p: 24.1, ch: 0,    z: 0,   f: 1.0,  sf: 0.3,  b: 0,    s: 0.15, fvl: 0 },
  { id: 'rind_mager', n: 'Rindfleisch, mager, roh', c: 'Protein',  kcal: 130, p: 21.3, ch: 0,    z: 0,   f: 4.5,  sf: 2.0,  b: 0,    s: 0.15, fvl: 0, redMeat: true },
  { id: 'hack_gem',   n: 'Hackfleisch gemischt',    c: 'Protein',  kcal: 240, p: 18.0, ch: 0,    z: 0,   f: 18.5, sf: 7.5,  b: 0,    s: 0.2,  fvl: 0, redMeat: true },
  { id: 'schwein',    n: 'Schweineschnitzel, roh',  c: 'Protein',  kcal: 108, p: 22.0, ch: 0,    z: 0,   f: 2.0,  sf: 0.8,  b: 0,    s: 0.15, fvl: 0, redMeat: true },
  { id: 'speck',      n: 'Speck',                   c: 'Protein',  kcal: 380, p: 17.0, ch: 0.5,  z: 0.5, f: 34.0, sf: 13.0, b: 0,    s: 3.0,  fvl: 0, redMeat: true },
  { id: 'lachs',      n: 'Lachs, roh',              c: 'Protein',  kcal: 202, p: 20.4, ch: 0,    z: 0,   f: 13.4, sf: 2.5,  b: 0,    s: 0.12, fvl: 0 },
  { id: 'lachs_r',    n: 'Räucherlachs',            c: 'Protein',  kcal: 172, p: 22.0, ch: 0,    z: 0,   f: 9.0,  sf: 1.8,  b: 0,    s: 3.0,  fvl: 0 },
  { id: 'kabeljau',   n: 'Kabeljau, roh',           c: 'Protein',  kcal: 76,  p: 17.4, ch: 0,    z: 0,   f: 0.7,  sf: 0.1,  b: 0,    s: 0.2,  fvl: 0 },
  { id: 'thunfisch',  n: 'Thunfisch in Wasser',     c: 'Protein',  kcal: 108, p: 24.0, ch: 0,    z: 0,   f: 1.0,  sf: 0.3,  b: 0,    s: 0.9,  fvl: 0 },
  { id: 'garnelen',   n: 'Garnelen, roh',           c: 'Protein',  kcal: 87,  p: 18.6, ch: 0.2,  z: 0,   f: 1.2,  sf: 0.3,  b: 0,    s: 0.4,  fvl: 0 },

  /* ---------- Pflanzliches Protein ---------- */
  { id: 'tofu',       n: 'Tofu natur',              c: 'Protein',  kcal: 127, p: 15.0, ch: 1.0,  z: 0.6, f: 7.0,  sf: 1.0,  b: 1.2,  s: 0.02, fvl: 100 },
  { id: 'tofu_r',     n: 'Räuchertofu',             c: 'Protein',  kcal: 176, p: 19.0, ch: 1.5,  z: 0.7, f: 10.0, sf: 1.6,  b: 1.5,  s: 1.4,  fvl: 100 },
  { id: 'tempeh',     n: 'Tempeh',                  c: 'Protein',  kcal: 192, p: 19.0, ch: 7.6,  z: 2.0, f: 11.0, sf: 2.2,  b: 6.0,  s: 0.02, fvl: 100 },
  { id: 'seitan',     n: 'Seitan',                  c: 'Protein',  kcal: 141, p: 25.0, ch: 4.0,  z: 0.5, f: 2.0,  sf: 0.4,  b: 1.0,  s: 1.0,  fvl: 0 },
  { id: 'kicher',     n: 'Kichererbsen, Dose',      c: 'Protein',  kcal: 122, p: 6.7,  ch: 14.5, z: 0.8, f: 2.6,  sf: 0.3,  b: 6.0,  s: 0.4,  fvl: 100 },
  { id: 'linsen_g',   n: 'Linsen, gekocht',         c: 'Protein',  kcal: 116, p: 9.0,  ch: 15.0, z: 1.3, f: 0.4,  sf: 0.1,  b: 7.9,  s: 0.01, fvl: 100 },
  { id: 'linsen_r',   n: 'Rote Linsen, roh',        c: 'Protein',  kcal: 340, p: 24.6, ch: 50.0, z: 2.0, f: 1.5,  sf: 0.3,  b: 11.0, s: 0.02, fvl: 100 },
  { id: 'bohnen_k',   n: 'Kidneybohnen, Dose',      c: 'Protein',  kcal: 105, p: 7.0,  ch: 13.0, z: 1.0, f: 0.5,  sf: 0.1,  b: 7.5,  s: 0.5,  fvl: 100 },
  { id: 'edamame',    n: 'Edamame',                 c: 'Protein',  kcal: 122, p: 11.0, ch: 5.0,  z: 2.2, f: 5.2,  sf: 0.6,  b: 5.2,  s: 0.02, fvl: 100 },
  { id: 'protein_p',  n: 'Proteinpulver Whey',      c: 'Protein',  kcal: 375, p: 78.0, ch: 6.0,  z: 5.0, f: 5.0,  sf: 3.0,  b: 1.0,  s: 0.5,  fvl: 0 },
  { id: 'protein_v',  n: 'Proteinpulver pflanzlich',c: 'Protein',  kcal: 370, p: 75.0, ch: 5.0,  z: 2.0, f: 6.0,  sf: 1.0,  b: 4.0,  s: 0.6,  fvl: 0 },

  /* ---------- Gemüse ---------- */
  { id: 'tomate',     n: 'Tomate',                  c: 'Gemüse',   kcal: 18,  p: 0.9,  ch: 2.6,  z: 2.6, f: 0.2,  sf: 0.0,  b: 1.2,  s: 0.01, fvl: 100 },
  { id: 'tomate_d',   n: 'Tomaten, gehackt, Dose',  c: 'Gemüse',   kcal: 24,  p: 1.2,  ch: 3.6,  z: 3.4, f: 0.2,  sf: 0.0,  b: 1.3,  s: 0.1,  fvl: 100 },
  { id: 'passata',    n: 'Passierte Tomaten',       c: 'Gemüse',   kcal: 33,  p: 1.5,  ch: 5.5,  z: 5.0, f: 0.2,  sf: 0.0,  b: 1.5,  s: 0.1,  fvl: 100 },
  { id: 'tomatenmark',n: 'Tomatenmark',             c: 'Gemüse',   kcal: 82,  p: 4.3,  ch: 12.2, z: 11.0,f: 0.5,  sf: 0.1,  b: 2.8,  s: 0.3,  fvl: 100 },
  { id: 'gurke',      n: 'Gurke',                   c: 'Gemüse',   kcal: 12,  p: 0.6,  ch: 1.8,  z: 1.7, f: 0.2,  sf: 0.0,  b: 0.9,  s: 0.01, fvl: 100 },
  { id: 'paprika',    n: 'Paprika, rot',            c: 'Gemüse',   kcal: 31,  p: 1.0,  ch: 6.0,  z: 4.2, f: 0.3,  sf: 0.1,  b: 2.1,  s: 0.01, fvl: 100 },
  { id: 'zwiebel',    n: 'Zwiebel',                 c: 'Gemüse',   kcal: 40,  p: 1.1,  ch: 9.3,  z: 4.2, f: 0.1,  sf: 0.0,  b: 1.7,  s: 0.01, fvl: 100 },
  { id: 'knoblauch',  n: 'Knoblauch',               c: 'Gemüse',   kcal: 141, p: 6.0,  ch: 28.4, z: 1.0, f: 0.5,  sf: 0.1,  b: 2.1,  s: 0.02, fvl: 100 },
  { id: 'karotte',    n: 'Karotte',                 c: 'Gemüse',   kcal: 41,  p: 0.9,  ch: 9.6,  z: 4.7, f: 0.2,  sf: 0.0,  b: 2.8,  s: 0.07, fvl: 100 },
  { id: 'zucchini',   n: 'Zucchini',                c: 'Gemüse',   kcal: 17,  p: 1.2,  ch: 3.1,  z: 2.5, f: 0.3,  sf: 0.1,  b: 1.0,  s: 0.01, fvl: 100 },
  { id: 'aubergine',  n: 'Aubergine',               c: 'Gemüse',   kcal: 25,  p: 1.0,  ch: 5.9,  z: 3.5, f: 0.2,  sf: 0.0,  b: 3.0,  s: 0.01, fvl: 100 },
  { id: 'brokkoli',   n: 'Brokkoli',                c: 'Gemüse',   kcal: 34,  p: 2.8,  ch: 6.6,  z: 1.7, f: 0.4,  sf: 0.1,  b: 2.6,  s: 0.08, fvl: 100 },
  { id: 'blumenkohl', n: 'Blumenkohl',              c: 'Gemüse',   kcal: 25,  p: 1.9,  ch: 5.0,  z: 1.9, f: 0.3,  sf: 0.1,  b: 2.0,  s: 0.08, fvl: 100 },
  { id: 'spinat',     n: 'Spinat',                  c: 'Gemüse',   kcal: 23,  p: 2.9,  ch: 3.6,  z: 0.4, f: 0.4,  sf: 0.1,  b: 2.2,  s: 0.2,  fvl: 100 },
  { id: 'spinat_tk',  n: 'Blattspinat, TK',         c: 'Gemüse',   kcal: 26,  p: 3.0,  ch: 1.5,  z: 0.5, f: 0.5,  sf: 0.1,  b: 2.5,  s: 0.15, fvl: 100 },
  { id: 'rucola',     n: 'Rucola',                  c: 'Gemüse',   kcal: 25,  p: 2.6,  ch: 3.7,  z: 2.0, f: 0.7,  sf: 0.1,  b: 1.6,  s: 0.07, fvl: 100 },
  { id: 'salat',      n: 'Blattsalat',              c: 'Gemüse',   kcal: 15,  p: 1.4,  ch: 2.9,  z: 0.8, f: 0.2,  sf: 0.0,  b: 1.3,  s: 0.03, fvl: 100 },
  { id: 'champignon', n: 'Champignons',             c: 'Gemüse',   kcal: 22,  p: 3.1,  ch: 3.3,  z: 1.7, f: 0.3,  sf: 0.1,  b: 1.0,  s: 0.01, fvl: 100 },
  { id: 'erbsen_tk',  n: 'Erbsen, TK',              c: 'Gemüse',   kcal: 81,  p: 5.4,  ch: 14.5, z: 5.7, f: 0.4,  sf: 0.1,  b: 5.0,  s: 0.01, fvl: 100 },
  { id: 'mais',       n: 'Mais, Dose',              c: 'Gemüse',   kcal: 86,  p: 3.0,  ch: 16.0, z: 5.0, f: 1.2,  sf: 0.2,  b: 2.5,  s: 0.6,  fvl: 100 },
  { id: 'gem_tk',     n: 'Gemüsemischung, TK',      c: 'Gemüse',   kcal: 45,  p: 2.5,  ch: 6.5,  z: 3.0, f: 0.5,  sf: 0.1,  b: 3.0,  s: 0.05, fvl: 100 },
  { id: 'kohlrabi',   n: 'Kohlrabi',                c: 'Gemüse',   kcal: 27,  p: 1.7,  ch: 6.2,  z: 2.6, f: 0.1,  sf: 0.0,  b: 3.6,  s: 0.02, fvl: 100 },
  { id: 'kuerbis',    n: 'Hokkaidokürbis',          c: 'Gemüse',   kcal: 63,  p: 1.6,  ch: 12.0, z: 5.0, f: 0.5,  sf: 0.1,  b: 2.5,  s: 0.01, fvl: 100 },
  { id: 'lauch',      n: 'Frühlingszwiebel',        c: 'Gemüse',   kcal: 32,  p: 1.8,  ch: 7.3,  z: 2.3, f: 0.2,  sf: 0.0,  b: 2.6,  s: 0.02, fvl: 100 },
  { id: 'avocado',    n: 'Avocado',                 c: 'Gemüse',   kcal: 160, p: 2.0,  ch: 8.5,  z: 0.7, f: 14.7, sf: 2.1,  b: 6.7,  s: 0.02, fvl: 100 },

  /* ---------- Obst ---------- */
  { id: 'banane',     n: 'Banane',                  c: 'Obst',     kcal: 89,  p: 1.1,  ch: 22.8, z: 12.2,f: 0.3,  sf: 0.1,  b: 2.6,  s: 0.00, fvl: 100 },
  { id: 'apfel',      n: 'Apfel',                   c: 'Obst',     kcal: 52,  p: 0.3,  ch: 13.8, z: 10.4,f: 0.2,  sf: 0.0,  b: 2.4,  s: 0.00, fvl: 100 },
  { id: 'beeren',     n: 'Beerenmischung',          c: 'Obst',     kcal: 45,  p: 1.0,  ch: 8.0,  z: 7.0, f: 0.4,  sf: 0.0,  b: 4.0,  s: 0.00, fvl: 100 },
  { id: 'heidelbeere',n: 'Heidelbeeren',            c: 'Obst',     kcal: 57,  p: 0.7,  ch: 14.5, z: 10.0,f: 0.3,  sf: 0.0,  b: 2.4,  s: 0.00, fvl: 100 },
  { id: 'erdbeere',   n: 'Erdbeeren',               c: 'Obst',     kcal: 32,  p: 0.7,  ch: 7.7,  z: 4.9, f: 0.3,  sf: 0.0,  b: 2.0,  s: 0.00, fvl: 100 },
  { id: 'orange',     n: 'Orange',                  c: 'Obst',     kcal: 47,  p: 0.9,  ch: 11.8, z: 9.4, f: 0.1,  sf: 0.0,  b: 2.4,  s: 0.00, fvl: 100 },
  { id: 'zitrone',    n: 'Zitrone',                 c: 'Obst',     kcal: 29,  p: 1.1,  ch: 9.3,  z: 2.5, f: 0.3,  sf: 0.0,  b: 2.8,  s: 0.00, fvl: 100 },
  { id: 'mango',      n: 'Mango',                   c: 'Obst',     kcal: 60,  p: 0.8,  ch: 15.0, z: 13.7,f: 0.4,  sf: 0.1,  b: 1.6,  s: 0.00, fvl: 100 },
  { id: 'dattel',     n: 'Datteln, getrocknet',     c: 'Obst',     kcal: 282, p: 2.5,  ch: 75.0, z: 63.0,f: 0.4,  sf: 0.0,  b: 8.0,  s: 0.00, fvl: 100 },
  { id: 'rosinen',    n: 'Rosinen',                 c: 'Obst',     kcal: 299, p: 3.1,  ch: 79.0, z: 59.0,f: 0.5,  sf: 0.1,  b: 3.7,  s: 0.03, fvl: 100 },

  /* ---------- Nüsse, Samen, Muse ---------- */
  { id: 'mandel',     n: 'Mandeln',                 c: 'Nüsse',    kcal: 579, p: 21.2, ch: 21.6, z: 4.4, f: 49.9, sf: 3.8,  b: 12.5, s: 0.00, fvl: 100 },
  { id: 'walnuss',    n: 'Walnüsse',                c: 'Nüsse',    kcal: 654, p: 15.2, ch: 13.7, z: 2.6, f: 65.2, sf: 6.1,  b: 6.7,  s: 0.00, fvl: 100 },
  { id: 'cashew',     n: 'Cashewkerne',             c: 'Nüsse',    kcal: 553, p: 18.2, ch: 30.2, z: 5.9, f: 43.9, sf: 7.8,  b: 3.3,  s: 0.01, fvl: 100 },
  { id: 'erdnuss',    n: 'Erdnüsse',                c: 'Nüsse',    kcal: 567, p: 25.8, ch: 16.1, z: 4.7, f: 49.2, sf: 6.3,  b: 8.5,  s: 0.02, fvl: 100 },
  { id: 'erdnussmus', n: 'Erdnussmus',              c: 'Nüsse',    kcal: 588, p: 25.0, ch: 20.0, z: 6.0, f: 50.0, sf: 10.0, b: 6.0,  s: 0.05, fvl: 100 },
  { id: 'mandelmus',  n: 'Mandelmus',               c: 'Nüsse',    kcal: 614, p: 21.0, ch: 19.0, z: 4.4, f: 55.5, sf: 4.2,  b: 10.3, s: 0.01, fvl: 100 },
  { id: 'tahini',     n: 'Tahini',                  c: 'Nüsse',    kcal: 595, p: 17.0, ch: 21.2, z: 0.5, f: 53.8, sf: 7.6,  b: 9.3,  s: 0.03, fvl: 100 },
  { id: 'chia',       n: 'Chiasamen',               c: 'Nüsse',    kcal: 486, p: 16.5, ch: 42.1, z: 0,   f: 30.7, sf: 3.3,  b: 34.4, s: 0.04, fvl: 100 },
  { id: 'leinsamen',  n: 'Leinsamen',               c: 'Nüsse',    kcal: 534, p: 18.3, ch: 28.9, z: 1.6, f: 42.2, sf: 3.7,  b: 27.3, s: 0.03, fvl: 100 },
  { id: 'sonnenblume',n: 'Sonnenblumenkerne',       c: 'Nüsse',    kcal: 584, p: 20.8, ch: 20.0, z: 2.6, f: 51.5, sf: 4.5,  b: 8.6,  s: 0.02, fvl: 100 },
  { id: 'sesam',      n: 'Sesam',                   c: 'Nüsse',    kcal: 573, p: 17.7, ch: 23.4, z: 0.3, f: 49.7, sf: 7.0,  b: 11.8, s: 0.03, fvl: 100 },

  /* ---------- Öle und Fette ---------- */
  { id: 'olivenoel',  n: 'Olivenöl',                c: 'Fett',     kcal: 884, p: 0,    ch: 0,    z: 0,   f: 100,  sf: 14.0, b: 0,    s: 0,    fvl: 0, addedFat: true },
  { id: 'rapsoel',    n: 'Rapsöl',                  c: 'Fett',     kcal: 884, p: 0,    ch: 0,    z: 0,   f: 100,  sf: 7.4,  b: 0,    s: 0,    fvl: 0, addedFat: true },
  { id: 'sesamoel',   n: 'Sesamöl',                 c: 'Fett',     kcal: 884, p: 0,    ch: 0,    z: 0,   f: 100,  sf: 14.2, b: 0,    s: 0,    fvl: 0, addedFat: true },
  { id: 'kokosoel',   n: 'Kokosöl',                 c: 'Fett',     kcal: 862, p: 0,    ch: 0,    z: 0,   f: 100,  sf: 87.0, b: 0,    s: 0,    fvl: 0, addedFat: true },
  { id: 'margarine',  n: 'Margarine',               c: 'Fett',     kcal: 720, p: 0.2,  ch: 0.4,  z: 0.4, f: 80.0, sf: 20.0, b: 0,    s: 0.5,  fvl: 0, addedFat: true },

  /* ---------- Süßes, Backzutaten ---------- */
  { id: 'zucker',     n: 'Zucker',                  c: 'Süßes',    kcal: 400, p: 0,    ch: 100,  z: 100, f: 0,    sf: 0,    b: 0,    s: 0,    fvl: 0 },
  { id: 'honig',      n: 'Honig',                   c: 'Süßes',    kcal: 304, p: 0.3,  ch: 82.0, z: 82.0,f: 0,    sf: 0,    b: 0.2,  s: 0.01, fvl: 0 },
  { id: 'ahornsirup', n: 'Ahornsirup',              c: 'Süßes',    kcal: 260, p: 0,    ch: 67.0, z: 60.0,f: 0.1,  sf: 0,    b: 0,    s: 0.03, fvl: 0 },
  { id: 'schoko_d',   n: 'Zartbitterschokolade 70%',c: 'Süßes',    kcal: 598, p: 7.8,  ch: 45.9, z: 24.0,f: 42.6, sf: 24.5, b: 10.9, s: 0.02, fvl: 0 },
  { id: 'schoko_m',   n: 'Vollmilchschokolade',     c: 'Süßes',    kcal: 535, p: 7.6,  ch: 59.4, z: 51.5,f: 29.7, sf: 18.5, b: 3.4,  s: 0.08, fvl: 0 },
  { id: 'kakao',      n: 'Backkakao, entölt',       c: 'Süßes',    kcal: 350, p: 20.0, ch: 12.0, z: 1.0, f: 11.0, sf: 6.5,  b: 30.0, s: 0.05, fvl: 0 },
  { id: 'eis',        n: 'Speiseeis, Vanille',      c: 'Süßes',    kcal: 207, p: 3.5,  ch: 24.0, z: 21.0,f: 11.0, sf: 7.0,  b: 0.7,  s: 0.1,  fvl: 0 },
  { id: 'chips',      n: 'Kartoffelchips',          c: 'Süßes',    kcal: 536, p: 6.6,  ch: 50.0, z: 0.6, f: 34.6, sf: 3.1,  b: 4.4,  s: 1.3,  fvl: 0 },
  { id: 'kekse',      n: 'Butterkekse',             c: 'Süßes',    kcal: 450, p: 6.5,  ch: 73.0, z: 22.0,f: 14.0, sf: 8.0,  b: 2.5,  s: 0.9,  fvl: 0 },

  /* ---------- Saucen, Würzendes ---------- */
  { id: 'miso',       n: 'Misopaste',               c: 'Würze',    kcal: 199, p: 12.8, ch: 21.0, z: 6.2, f: 6.0,  sf: 1.0,  b: 5.4,  s: 10.5, fvl: 0 },
  { id: 'sojasauce',  n: 'Sojasauce',               c: 'Würze',    kcal: 60,  p: 8.1,  ch: 5.6,  z: 1.7, f: 0.1,  sf: 0,    b: 0.8,  s: 16.0, fvl: 0 },
  { id: 'senf',       n: 'Senf',                    c: 'Würze',    kcal: 66,  p: 4.4,  ch: 5.8,  z: 2.9, f: 3.3,  sf: 0.2,  b: 3.3,  s: 3.0,  fvl: 0 },
  { id: 'ketchup',    n: 'Ketchup',                 c: 'Würze',    kcal: 102, p: 1.3,  ch: 24.0, z: 22.0,f: 0.1,  sf: 0,    b: 0.5,  s: 2.0,  fvl: 0 },
  { id: 'mayo',       n: 'Mayonnaise',              c: 'Würze',    kcal: 680, p: 1.0,  ch: 1.5,  z: 1.5, f: 75.0, sf: 6.0,  b: 0,    s: 1.2,  fvl: 0 },
  { id: 'sriracha',   n: 'Sriracha',                c: 'Würze',    kcal: 93,  p: 1.9,  ch: 19.0, z: 15.0,f: 0.9,  sf: 0.1,  b: 2.2,  s: 5.9,  fvl: 0 },
  { id: 'salz',       n: 'Salz',                    c: 'Würze',    kcal: 0,   p: 0,    ch: 0,    z: 0,   f: 0,    sf: 0,    b: 0,    s: 100,  fvl: 0 },
  { id: 'gewuerz',    n: 'Gewürze, gemahlen',       c: 'Würze',    kcal: 280, p: 12.0, ch: 40.0, z: 3.0, f: 8.0,  sf: 1.0,  b: 25.0, s: 0.1,  fvl: 0 },
  { id: 'hefeflocken',n: 'Hefeflocken',             c: 'Würze',    kcal: 340, p: 45.0, ch: 20.0, z: 3.0, f: 5.0,  sf: 0.8,  b: 22.0, s: 0.2,  fvl: 0 },

  /* ---------- Getränke ---------- */
  { id: 'wasser',     n: 'Wasser',                  c: 'Getränke', kcal: 0,   p: 0,    ch: 0,    z: 0,   f: 0,    sf: 0,    b: 0,    s: 0,    fvl: 0, beverage: true, water: true },
  { id: 'kaffee',     n: 'Kaffee, schwarz',         c: 'Getränke', kcal: 2,   p: 0.2,  ch: 0,    z: 0,   f: 0,    sf: 0,    b: 0,    s: 0,    fvl: 0, beverage: true },
  { id: 'tee',        n: 'Tee, ungesüßt',           c: 'Getränke', kcal: 1,   p: 0,    ch: 0.2,  z: 0,   f: 0,    sf: 0,    b: 0,    s: 0,    fvl: 0, beverage: true },
  { id: 'orangensaft',n: 'Orangensaft',             c: 'Getränke', kcal: 45,  p: 0.7,  ch: 10.4, z: 8.4, f: 0.2,  sf: 0,    b: 0.2,  s: 0.00, fvl: 100, beverage: true },
  { id: 'cola',       n: 'Cola',                    c: 'Getränke', kcal: 42,  p: 0,    ch: 10.6, z: 10.6,f: 0,    sf: 0,    b: 0,    s: 0.01, fvl: 0, beverage: true },
  { id: 'bier',       n: 'Bier',                    c: 'Getränke', kcal: 43,  p: 0.5,  ch: 3.6,  z: 0.1, f: 0,    sf: 0,    b: 0,    s: 0.01, fvl: 0, beverage: true },
  { id: 'wein_r',     n: 'Rotwein',                 c: 'Getränke', kcal: 85,  p: 0.1,  ch: 2.6,  z: 0.6, f: 0,    sf: 0,    b: 0,    s: 0.01, fvl: 0, beverage: true }
];

/* ------------------------------------------------------------
   Nachschlagen und Suchen

   Neben der mitgelieferten Liste gibt es zwei weitere Quellen:
   eigene Zutaten aus dem Konto und Produkte aus Open Food Facts.
   Beide werden zur Laufzeit hier registriert, damit Rezepte ihre
   Zutaten unabhängig von der Herkunft auflösen können.
------------------------------------------------------------ */

const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

// id -> Zutat, zur Laufzeit gefüllt (eigene Zutaten, übernommene Produkte)
const EXTRA_FOODS = {};

function registerFoods(list) {
  (list || []).forEach((f) => { if (f && f.id) EXTRA_FOODS[f.id] = f; });
}

function dishList() {
  return typeof DISHES !== 'undefined' ? DISHES : [];
}

function foodById(id) {
  return FOOD_BY_ID[id]
      || EXTRA_FOODS[id]
      || dishList().find((d) => d.id === id)
      || null;
}

/* Sucht über drei Quellen. Sortiert wird zuerst nach Treffergüte
   (Name beginnt mit der Eingabe schlägt Name enthält sie), dann
   nach Herkunft: eigene Zutaten, fertige Gerichte, Grundzutaten.

   Die Reihenfolge ist Absicht. Wer "pizza" tippt, will das Gericht
   und nicht Mehl; wer eine eigene Zutat angelegt hat, meint sie. */
function findFoods(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits = [];
  const scan = (list, rank) => {
    for (const f of list) {
      const name = f.n.toLowerCase();
      if (name.startsWith(q)) hits.push({ f, quality: 0, rank });
      else if (name.includes(q)) hits.push({ f, quality: 1, rank });
    }
  };

  scan(Object.values(EXTRA_FOODS), 0);
  scan(dishList(), 1);
  scan(FOODS, 2);

  hits.sort((a, b) => a.quality - b.quality || a.rank - b.rank);
  return hits.slice(0, limit).map((h) => h.f);
}
