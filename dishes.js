/* ============================================================
   Leaner — Fertige Gerichte

   Zutaten und verpackte Produkte decken den Fall "ich hatte
   Lasagne" nicht ab. Diese Liste schließt die Lücke.

   Felder wie bei den Zutaten, alle Werte pro 100 g. Zusätzlich:
     port     typisches Portionsgewicht in Gramm
     portLbl  wie diese Portion umgangssprachlich heißt

   Die Werte sind Mittelwerte typischer Zubereitungen und streuen
   je nach Rezept erheblich — eine Lasagne kann 130 oder 200 kcal
   pro 100 g haben. Für die Erfassung eines Tages ist das genau
   genug; wer es genauer will, legt das Gericht als eigenes
   Rezept an.
   ============================================================ */

const DISHES = [

  /* ---------- Italienisch ---------- */
  { id: 'd_pizza_marg',  n: 'Pizza Margherita',            port: 400, portLbl: 'ganze Pizza',
    kcal: 250, p: 11,   ch: 30,  z: 3,   f: 9,   sf: 4.5, b: 2,   s: 1.3, fvl: 20 },
  { id: 'd_pizza_sal',   n: 'Pizza Salami',                port: 420, portLbl: 'ganze Pizza',
    kcal: 290, p: 12.5, ch: 29,  z: 3,   f: 13,  sf: 6,   b: 2,   s: 1.6, fvl: 15 },
  { id: 'd_pizza_funghi',n: 'Pizza Funghi',                port: 420, portLbl: 'ganze Pizza',
    kcal: 235, p: 10.5, ch: 29,  z: 3,   f: 8,   sf: 4,   b: 2.3, s: 1.3, fvl: 30 },
  { id: 'd_lasagne',     n: 'Lasagne',                     port: 400, portLbl: 'Portion',
    kcal: 160, p: 9,    ch: 12,  z: 3,   f: 8,   sf: 4,   b: 1.3, s: 0.8, fvl: 25 },
  { id: 'd_bolo',        n: 'Spaghetti Bolognese',         port: 450, portLbl: 'Teller',
    kcal: 145, p: 7.5,  ch: 17,  z: 2.5, f: 4.8, sf: 1.8, b: 1.6, s: 0.6, fvl: 25 },
  { id: 'd_carbonara',   n: 'Spaghetti Carbonara',         port: 400, portLbl: 'Teller',
    kcal: 210, p: 9,    ch: 22,  z: 1.5, f: 9.5, sf: 4.5, b: 1.2, s: 0.9, fvl: 0 },
  { id: 'd_pesto',       n: 'Pasta mit Pesto',             port: 400, portLbl: 'Teller',
    kcal: 215, p: 7,    ch: 24,  z: 1.5, f: 10,  sf: 2.2, b: 1.8, s: 0.7, fvl: 10 },
  { id: 'd_risotto',     n: 'Risotto',                     port: 350, portLbl: 'Teller',
    kcal: 150, p: 4.5,  ch: 20,  z: 1,   f: 5.5, sf: 3,   b: 0.8, s: 0.9, fvl: 10 },
  { id: 'd_caprese',     n: 'Caprese',                     port: 250, portLbl: 'Portion',
    kcal: 165, p: 9,    ch: 3,   z: 2.5, f: 13,  sf: 6.5, b: 0.7, s: 0.6, fvl: 45 },
  { id: 'd_gnocchi',     n: 'Gnocchi mit Tomatensauce',    port: 400, portLbl: 'Teller',
    kcal: 135, p: 4,    ch: 22,  z: 3,   f: 3.5, sf: 1.2, b: 1.8, s: 0.8, fvl: 25 },

  /* ---------- Deutsch, bürgerlich ---------- */
  { id: 'd_schnitzel',   n: 'Schnitzel mit Pommes',        port: 450, portLbl: 'Teller',
    kcal: 245, p: 12,   ch: 22,  z: 0.8, f: 12,  sf: 3,   b: 2,   s: 1.0, fvl: 0 },
  { id: 'd_currywurst',  n: 'Currywurst mit Pommes',       port: 400, portLbl: 'Portion',
    kcal: 240, p: 7.5,  ch: 21,  z: 4,   f: 14,  sf: 4.5, b: 2,   s: 1.4, fvl: 5 },
  { id: 'd_gulasch',     n: 'Gulasch',                     port: 350, portLbl: 'Portion',
    kcal: 130, p: 12,   ch: 4,   z: 2,   f: 7,   sf: 2.7, b: 1,   s: 0.9, fvl: 25 },
  { id: 'd_rouladen',    n: 'Rinderroulade mit Rotkohl',   port: 400, portLbl: 'Teller',
    kcal: 145, p: 12,   ch: 8,   z: 4,   f: 7,   sf: 2.5, b: 2,   s: 1.0, fvl: 30 },
  { id: 'd_kartoffelsup',n: 'Kartoffelsuppe',              port: 400, portLbl: 'Teller',
    kcal: 70,  p: 2.5,  ch: 9,   z: 1.5, f: 2.5, sf: 1,   b: 1.5, s: 0.8, fvl: 30 },
  { id: 'd_linsensuppe', n: 'Linsensuppe',                 port: 400, portLbl: 'Teller',
    kcal: 85,  p: 5,    ch: 11,  z: 1.5, f: 2.2, sf: 0.7, b: 3.5, s: 0.8, fvl: 60 },
  { id: 'd_bratkart',    n: 'Bratkartoffeln mit Ei',       port: 350, portLbl: 'Pfanne',
    kcal: 165, p: 6,    ch: 17,  z: 1,   f: 8,   sf: 2,   b: 2,   s: 0.9, fvl: 0 },
  { id: 'd_kaesespaetz', n: 'Käsespätzle',                 port: 400, portLbl: 'Portion',
    kcal: 235, p: 10,   ch: 22,  z: 2,   f: 12,  sf: 6.5, b: 1.5, s: 1.2, fvl: 5 },
  { id: 'd_maultaschen', n: 'Maultaschen',                 port: 350, portLbl: 'Portion',
    kcal: 195, p: 9,    ch: 20,  z: 1.5, f: 8.5, sf: 3,   b: 1.5, s: 1.1, fvl: 5 },
  { id: 'd_eintopf',     n: 'Gemüseeintopf',               port: 400, portLbl: 'Teller',
    kcal: 65,  p: 3,    ch: 8,   z: 2.5, f: 2,   sf: 0.6, b: 2.5, s: 0.7, fvl: 70 },

  /* ---------- Asiatisch ---------- */
  { id: 'd_padthai',     n: 'Pad Thai',                    port: 400, portLbl: 'Teller',
    kcal: 175, p: 8,    ch: 22,  z: 5,   f: 6,   sf: 1.2, b: 1.5, s: 1.1, fvl: 15 },
  { id: 'd_curry_gruen', n: 'Grünes Curry mit Reis',       port: 450, portLbl: 'Teller',
    kcal: 145, p: 6,    ch: 17,  z: 2.5, f: 6,   sf: 3.5, b: 1.5, s: 0.9, fvl: 25 },
  { id: 'd_butterchick', n: 'Butter Chicken mit Reis',     port: 450, portLbl: 'Teller',
    kcal: 165, p: 9,    ch: 18,  z: 3,   f: 6.5, sf: 3,   b: 1.2, s: 0.9, fvl: 15 },
  { id: 'd_ramen',       n: 'Ramen',                       port: 600, portLbl: 'Schale',
    kcal: 85,  p: 5,    ch: 10,  z: 1,   f: 2.8, sf: 1,   b: 0.8, s: 1.2, fvl: 15 },
  { id: 'd_sushi',       n: 'Sushi, gemischt',             port: 250, portLbl: '10–12 Stück',
    kcal: 150, p: 7,    ch: 25,  z: 4,   f: 2.5, sf: 0.6, b: 1,   s: 1.0, fvl: 10 },
  { id: 'd_poke',        n: 'Poke Bowl',                   port: 450, portLbl: 'Schale',
    kcal: 135, p: 8,    ch: 16,  z: 3,   f: 4,   sf: 0.8, b: 2,   s: 0.8, fvl: 35 },
  { id: 'd_gebr_reis',   n: 'Gebratener Reis',             port: 400, portLbl: 'Teller',
    kcal: 165, p: 6,    ch: 24,  z: 2,   f: 5,   sf: 1,   b: 1.3, s: 1.0, fvl: 20 },
  { id: 'd_fruehlings',  n: 'Frühlingsrollen',             port: 150, portLbl: '3 Stück',
    kcal: 245, p: 5,    ch: 25,  z: 3,   f: 13,  sf: 2.5, b: 2,   s: 1.1, fvl: 30 },

  /* ---------- Fast Food, unterwegs ---------- */
  { id: 'd_doener',      n: 'Döner Kebab',                 port: 350, portLbl: 'Döner',
    kcal: 215, p: 12,   ch: 18,  z: 3,   f: 10,  sf: 3.5, b: 1.8, s: 1.2, fvl: 25 },
  { id: 'd_duerum',      n: 'Dürüm',                       port: 320, portLbl: 'Rolle',
    kcal: 230, p: 12,   ch: 21,  z: 2.5, f: 11,  sf: 3.8, b: 1.8, s: 1.3, fvl: 20 },
  { id: 'd_falafel',     n: 'Falafel-Teller',              port: 400, portLbl: 'Teller',
    kcal: 185, p: 7,    ch: 18,  z: 2.5, f: 9,   sf: 1.3, b: 4.5, s: 1.0, fvl: 45 },
  { id: 'd_burger',      n: 'Cheeseburger',                port: 220, portLbl: 'Burger',
    kcal: 265, p: 13,   ch: 22,  z: 5,   f: 14,  sf: 6,   b: 1.3, s: 1.4, fvl: 5 },
  { id: 'd_burger_big',  n: 'Burger, großer',              port: 320, portLbl: 'Burger',
    kcal: 275, p: 14,   ch: 20,  z: 5,   f: 15,  sf: 6.5, b: 1.5, s: 1.4, fvl: 8 },
  { id: 'd_pommes',      n: 'Pommes frites',               port: 150, portLbl: 'Portion',
    kcal: 290, p: 3.5,  ch: 36,  z: 0.5, f: 14,  sf: 2,   b: 3.5, s: 0.7, fvl: 0 },
  { id: 'd_hotdog',      n: 'Hotdog',                      port: 180, portLbl: 'Stück',
    kcal: 250, p: 10,   ch: 22,  z: 4,   f: 13,  sf: 5,   b: 1.2, s: 1.5, fvl: 3 },
  { id: 'd_wrap_haehn',  n: 'Hähnchen-Wrap',               port: 280, portLbl: 'Wrap',
    kcal: 195, p: 12,   ch: 19,  z: 2.5, f: 7.5, sf: 2.5, b: 2,   s: 1.1, fvl: 20 },
  { id: 'd_sandwich',    n: 'Belegtes Sandwich',           port: 200, portLbl: 'Sandwich',
    kcal: 235, p: 11,   ch: 25,  z: 3,   f: 10,  sf: 3.5, b: 2.2, s: 1.2, fvl: 15 },
  { id: 'd_brezel',      n: 'Laugenbrezel',                port: 90,  portLbl: 'Brezel',
    kcal: 290, p: 9,    ch: 55,  z: 2,   f: 3,   sf: 0.7, b: 3,   s: 2.5, fvl: 0 },
  { id: 'd_leberkaes',   n: 'Leberkäsesemmel',             port: 200, portLbl: 'Semmel',
    kcal: 265, p: 11,   ch: 22,  z: 2,   f: 15,  sf: 6,   b: 1.5, s: 1.8, fvl: 0 },

  /* ---------- Salate ---------- */
  { id: 'd_caesar',      n: 'Caesar Salad',                port: 300, portLbl: 'Schale',
    kcal: 160, p: 8,    ch: 6,   z: 2,   f: 12,  sf: 3,   b: 1.5, s: 1.0, fvl: 45 },
  { id: 'd_griech',      n: 'Griechischer Salat',          port: 300, portLbl: 'Schale',
    kcal: 115, p: 4,    ch: 4.5, z: 3.5, f: 9,   sf: 3.5, b: 1.8, s: 1.0, fvl: 65 },
  { id: 'd_salat_haehn', n: 'Salat mit Hähnchen',          port: 350, portLbl: 'Schale',
    kcal: 110, p: 11,   ch: 4,   z: 3,   f: 5.5, sf: 1.2, b: 1.8, s: 0.7, fvl: 55 },
  { id: 'd_kartoffelsal',n: 'Kartoffelsalat',              port: 200, portLbl: 'Portion',
    kcal: 165, p: 2.5,  ch: 15,  z: 2.5, f: 10,  sf: 1.5, b: 1.8, s: 0.8, fvl: 5 },
  { id: 'd_nudelsalat',  n: 'Nudelsalat',                  port: 250, portLbl: 'Portion',
    kcal: 195, p: 5,    ch: 20,  z: 3,   f: 10,  sf: 1.8, b: 1.5, s: 0.9, fvl: 15 },
  { id: 'd_bowl_veg',    n: 'Veggie Bowl',                 port: 450, portLbl: 'Schale',
    kcal: 130, p: 5.5,  ch: 16,  z: 3,   f: 4.5, sf: 0.8, b: 3.5, s: 0.6, fvl: 55 },

  /* ---------- Frühstück ---------- */
  { id: 'd_ruehrei',     n: 'Rührei mit Brot',             port: 250, portLbl: 'Teller',
    kcal: 195, p: 11,   ch: 15,  z: 1.5, f: 10,  sf: 3.5, b: 1.5, s: 1.0, fvl: 0 },
  { id: 'd_englisch',    n: 'English Breakfast',           port: 400, portLbl: 'Teller',
    kcal: 205, p: 10,   ch: 13,  z: 2.5, f: 12,  sf: 4.5, b: 2,   s: 1.4, fvl: 15 },
  { id: 'd_porridge',    n: 'Porridge',                    port: 350, portLbl: 'Schale',
    kcal: 95,  p: 4,    ch: 14,  z: 3,   f: 2.5, sf: 0.7, b: 2,   s: 0.05, fvl: 10 },
  { id: 'd_muesli',      n: 'Müsli mit Milch',             port: 300, portLbl: 'Schale',
    kcal: 145, p: 5.5,  ch: 21,  z: 7,   f: 4,   sf: 1.2, b: 2.5, s: 0.1, fvl: 15 },
  { id: 'd_croissant',   n: 'Croissant',                   port: 60,  portLbl: 'Stück',
    kcal: 405, p: 8,    ch: 43,  z: 8,   f: 21,  sf: 12,  b: 2.5, s: 1.0, fvl: 0 },
  { id: 'd_pancakes',    n: 'Pancakes mit Sirup',          port: 250, portLbl: 'Portion',
    kcal: 245, p: 6,    ch: 40,  z: 18,  f: 7,   sf: 3,   b: 1.2, s: 0.7, fvl: 0 },
  { id: 'd_brot_kaese',  n: 'Brot mit Käse',               port: 120, portLbl: '2 Scheiben',
    kcal: 260, p: 13,   ch: 25,  z: 2,   f: 12,  sf: 7,   b: 3,   s: 1.6, fvl: 0 },
  { id: 'd_joghurt_obst',n: 'Joghurt mit Obst',            port: 250, portLbl: 'Schale',
    kcal: 85,  p: 4,    ch: 12,  z: 11,  f: 2,   sf: 1.2, b: 1.2, s: 0.1, fvl: 35 },

  /* ---------- Vegetarisch, Hülsenfrüchte ---------- */
  { id: 'd_chili',       n: 'Chili con Carne',             port: 400, portLbl: 'Teller',
    kcal: 120, p: 8.5,  ch: 11,  z: 3,   f: 4,   sf: 1.5, b: 4,   s: 0.8, fvl: 55 },
  { id: 'd_chili_sin',   n: 'Chili sin Carne',             port: 400, portLbl: 'Teller',
    kcal: 100, p: 5.5,  ch: 13,  z: 3,   f: 2.5, sf: 0.4, b: 5,   s: 0.7, fvl: 75 },
  { id: 'd_dal',         n: 'Linsendal',                   port: 350, portLbl: 'Teller',
    kcal: 110, p: 6,    ch: 13,  z: 2,   f: 3.5, sf: 1,   b: 4,   s: 0.7, fvl: 70 },
  { id: 'd_hummus_tel',  n: 'Hummus mit Fladenbrot',       port: 250, portLbl: 'Portion',
    kcal: 230, p: 8,    ch: 25,  z: 1.5, f: 10,  sf: 1.5, b: 4.5, s: 1.0, fvl: 35 },
  { id: 'd_ratatouille', n: 'Ratatouille',                 port: 350, portLbl: 'Portion',
    kcal: 70,  p: 1.8,  ch: 6,   z: 4.5, f: 4,   sf: 0.6, b: 2.5, s: 0.6, fvl: 85 },
  { id: 'd_ofengemuese', n: 'Ofengemüse',                  port: 350, portLbl: 'Blech',
    kcal: 95,  p: 2.5,  ch: 10,  z: 4,   f: 5,   sf: 0.8, b: 3,   s: 0.5, fvl: 80 },
  { id: 'd_shakshuka',   n: 'Shakshuka',                   port: 350, portLbl: 'Pfanne',
    kcal: 105, p: 6,    ch: 5,   z: 4,   f: 7,   sf: 2,   b: 1.5, s: 0.8, fvl: 55 },
  { id: 'd_quiche',      n: 'Quiche',                      port: 200, portLbl: 'Stück',
    kcal: 265, p: 8,    ch: 20,  z: 2,   f: 17,  sf: 8,   b: 1.3, s: 1.0, fvl: 15 },

  /* ---------- Fisch und Fleisch pur ---------- */
  { id: 'd_lachs_gem',   n: 'Lachs mit Gemüse',            port: 350, portLbl: 'Teller',
    kcal: 130, p: 13,   ch: 4,   z: 2.5, f: 7,   sf: 1.4, b: 1.8, s: 0.6, fvl: 45 },
  { id: 'd_fisch_pomm',  n: 'Fisch mit Pommes',            port: 400, portLbl: 'Teller',
    kcal: 230, p: 11,   ch: 24,  z: 0.8, f: 10,  sf: 1.8, b: 2.2, s: 1.0, fvl: 0 },
  { id: 'd_haehn_reis',  n: 'Hähnchen mit Reis und Gemüse',port: 450, portLbl: 'Teller',
    kcal: 130, p: 11,   ch: 15,  z: 1.5, f: 2.8, sf: 0.7, b: 1.5, s: 0.6, fvl: 30 },
  { id: 'd_steak',       n: 'Steak mit Beilage',           port: 400, portLbl: 'Teller',
    kcal: 175, p: 15,   ch: 11,  z: 1,   f: 8,   sf: 3,   b: 1.5, s: 0.8, fvl: 15 },

  /* ---------- Süßes, Gebäck ---------- */
  { id: 'd_kuchen',      n: 'Kuchen, Stück',               port: 110, portLbl: 'Stück',
    kcal: 370, p: 5,    ch: 45,  z: 28,  f: 18,  sf: 9,   b: 1.5, s: 0.5, fvl: 5 },
  { id: 'd_kaesekuchen', n: 'Käsekuchen',                  port: 130, portLbl: 'Stück',
    kcal: 290, p: 7,    ch: 30,  z: 22,  f: 15,  sf: 8,   b: 0.8, s: 0.5, fvl: 0 },
  { id: 'd_apfelstrudel',n: 'Apfelstrudel',                port: 150, portLbl: 'Stück',
    kcal: 240, p: 3,    ch: 34,  z: 20,  f: 10,  sf: 4,   b: 2,   s: 0.4, fvl: 40 },
  { id: 'd_eis_kugel',   n: 'Eis, Kugel',                  port: 60,  portLbl: 'Kugel',
    kcal: 200, p: 3.5,  ch: 24,  z: 21,  f: 10,  sf: 6.5, b: 0.7, s: 0.1, fvl: 5 },
  { id: 'd_tiramisu',    n: 'Tiramisu',                    port: 150, portLbl: 'Portion',
    kcal: 285, p: 5,    ch: 28,  z: 21,  f: 17,  sf: 10,  b: 0.5, s: 0.2, fvl: 0 },
  { id: 'd_donut',       n: 'Donut',                       port: 70,  portLbl: 'Stück',
    kcal: 420, p: 5.5,  ch: 48,  z: 24,  f: 23,  sf: 11,  b: 1.5, s: 0.7, fvl: 0 },

  /* ---------- Snacks ---------- */
  { id: 'd_proteinriegel',n: 'Proteinriegel',              port: 60,  portLbl: 'Riegel',
    kcal: 360, p: 30,   ch: 30,  z: 8,   f: 12,  sf: 6,   b: 6,   s: 0.6, fvl: 5 },
  { id: 'd_muesliriegel',n: 'Müsliriegel',                 port: 30,  portLbl: 'Riegel',
    kcal: 420, p: 6,    ch: 60,  z: 25,  f: 16,  sf: 6,   b: 5,   s: 0.4, fvl: 15 },
  { id: 'd_nussmix',     n: 'Nussmischung',                port: 40,  portLbl: 'Handvoll',
    kcal: 610, p: 20,   ch: 15,  z: 4,   f: 53,  sf: 6,   b: 8,   s: 0.02, fvl: 100 },
  { id: 'd_popcorn',     n: 'Popcorn, gesalzen',           port: 40,  portLbl: 'Schale',
    kcal: 480, p: 8,    ch: 55,  z: 1,   f: 24,  sf: 4,   b: 9,   s: 1.5, fvl: 0 }
];

/* Gerichte in dieselbe Struktur bringen wie Zutaten, damit Suche,
   Rezepte und Tagebuch sie ohne Sonderbehandlung verwenden können. */
DISHES.forEach((d) => {
  d.c = 'Gericht';
  d.isDish = true;
});
