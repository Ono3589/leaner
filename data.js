/* ============================================================
   Leaner — Inhalte
   Alles hier ist Prototyp-Content. Später ersetzbar durch API/DB.
   `icon` verweist immer auf einen Namen aus ICONS (icons.js).
   ============================================================ */

const DATA = {};

/* ---------- Rezepte ----------
   ADHS-relevante Felder:
   - steps: max. 5, kurz, imperativ
   - dishes: wie viel Abwasch (Reibungspunkt Nr. 1)
   - lowExec: "Low Executive Function" — geht auch an schlechten Tagen
   - why: warum das Rezept dem ADHS-Alltag hilft
*/
DATA.recipes = [
  {
    id: 'r1', icon: 'bowl', name: 'Protein-Overnight-Oats',
    minutes: 5, kcal: 420, protein: 32, dishes: 1,
    tags: ['Frühstück', 'Meal-Prep', 'Vegetarisch'],
    lowExec: true,
    hook: 'Abends 5 Min — morgens null Entscheidungen.',
    why: 'Protein und Ballaststoffe halten den Blutzucker flach. Weniger Zucker-Crash bedeutet weniger Konzentrationsloch am Vormittag.',
    portions: 1,
    items: [
      { id: 'hafer',      g: 80,  label: '80 g Haferflocken' },
      { id: 'milch_15',   g: 200, label: '200 ml Milch oder Sojadrink' },
      { id: 'protein_p',  g: 30,  label: '30 g Proteinpulver (Vanille)' },
      { id: 'chia',       g: 12,  label: '1 EL Chiasamen' },
      { id: 'beeren',     g: 80,  label: '1 Handvoll Beeren' },
      { id: 'erdnussmus', g: 10,  label: '1 TL Erdnussmus' }
    ],
    steps: ['Alles außer Beeren in ein Glas geben.', 'Umrühren bis es keine trockenen Stellen mehr gibt.', 'Deckel drauf, ab in den Kühlschrank.', 'Morgens Beeren und Erdnussmus obendrauf.'],
    swap: 'Kein Proteinpulver? 150 g Skyr rein.'
  },
  {
    id: 'r2', icon: 'pan', name: '10-Minuten-Shakshuka',
    minutes: 10, kcal: 380, protein: 22, dishes: 1,
    tags: ['One-Pan', 'Abendessen', 'Vegetarisch'],
    lowExec: true,
    hook: 'Eine Pfanne. Fertig. Kein Schneidebrett nötig.',
    why: 'Eier liefern Cholin — Baustein für Acetylcholin, wichtig für Aufmerksamkeit und Gedächtnis.',
    portions: 2,
    items: [
      { id: 'tomate_d',  g: 400, label: '1 Dose gehackte Tomaten' },
      { id: 'ei',        g: 180, label: '3 Eier' },
      { id: 'gewuerz',   g: 5,   label: '1 TL Paprika edelsüß, 1/2 TL Kreuzkümmel' },
      { id: 'feta',      g: 60,  label: 'Feta nach Gefühl' },
      { id: 'olivenoel', g: 15,  label: '1 EL Olivenöl' },
      { id: 'salz',      g: 2,   label: 'Salz' }
    ],
    steps: ['Öl und Gewürze 30 Sekunden in die Pfanne.', 'Tomaten dazu, 4 Minuten köcheln.', 'Drei Mulden formen, Eier hineingeben.', 'Deckel drauf, 4 Minuten. Feta darüber.'],
    swap: 'Mehr Protein: eine Dose Kichererbsen mit hinein.'
  },
  {
    id: 'r3', icon: 'layers', name: 'Bowl-Baukasten',
    minutes: 12, kcal: 520, protein: 38, dishes: 2,
    tags: ['Mittagessen', 'Meal-Prep', 'Flexibel'],
    lowExec: false,
    hook: 'Kein Rezept — eine Formel. Nie wieder Entscheidungslähmung.',
    why: 'Feste Formel statt freier Auswahl. Weniger Entscheidungen bedeuten weniger Reibung und mehr Durchhaltevermögen.',
    portions: 1,
    // Beispielbelegung der Formel — die Nährwerte gelten für genau diese
    // Variante. Tausch die Zutaten, dann rechnet sich alles neu.
    items: [
      { id: 'reis_wk',   g: 200, label: '1 Faust Kohlenhydrate — hier gekochter Reis' },
      { id: 'haehnchen', g: 130, label: '1 Handteller Protein — hier Hähnchenbrust' },
      { id: 'brokkoli',  g: 150, label: '2 Fäuste Gemüse — hier Brokkoli' },
      { id: 'avocado',   g: 50,  label: '1 Daumen Fett — hier Avocado' },
      { id: 'olivenoel', g: 10,  label: 'Olivenöl' },
      { id: 'tahini',    g: 15,  label: '1 Löffel Sauce — hier Tahini' }
    ],
    steps: ['Kohlenhydrate kochen — oder Fertigreis nutzen.', 'Protein anbraten, salzen.', 'Gemüse dazu oder roh in die Schüssel.', 'Fett und Sauce darüber. Fertig.'],
    swap: 'Schlechter Tag? Fertigreis, Räuchertofu, Tiefkühlerbsen. Zählt genauso.'
  },
  {
    id: 'r4', icon: 'cup', name: 'Notfall-Shake',
    minutes: 2, kcal: 340, protein: 30, dishes: 1,
    tags: ['Notfall', 'Frühstück', 'Vegan möglich'],
    lowExec: true,
    hook: 'Für Tage, an denen Kochen keine Option ist.',
    why: 'Etwas essen schlägt perfekt essen. Der Shake verhindert das Nachmittagsloch mit anschließendem Heißhunger.',
    portions: 1,
    items: [
      { id: 'hafermilch', g: 300, label: '300 ml Hafermilch' },
      { id: 'banane',     g: 120, label: '1 Banane, gern tiefgekühlt' },
      { id: 'protein_p',  g: 30,  label: '30 g Proteinpulver' },
      { id: 'mandelmus',  g: 15,  label: '1 EL Mandelmus' },
      { id: 'gewuerz',    g: 1,   label: 'Prise Zimt' }
    ],
    steps: ['Alles in den Mixer.', '40 Sekunden mixen.', 'Trinken. Fertig.'],
    swap: 'Kein Mixer? Shaker und Instant-Haferflocken.'
  },
  {
    id: 'r5', icon: 'pot', name: 'Miso-Nudelsuppe mit Ei',
    minutes: 9, kcal: 450, protein: 24, dishes: 1,
    tags: ['Abendessen', 'One-Pot', 'Comfort'],
    lowExec: true,
    hook: 'Warm, salzig, tröstlich — ohne Lieferdienst.',
    why: 'Warme, salzige Comfort-Food-Reize ohne die Zucker-Fett-Kombination von Fast Food.',
    portions: 1,
    items: [
      { id: 'miso',      g: 18,  label: '1 EL Misopaste' },
      { id: 'wasser',    g: 500, label: '500 ml Wasser' },
      { id: 'soba',      g: 80,  label: '1 Portion Sobanudeln' },
      { id: 'ei',        g: 60,  label: '1 Ei' },
      { id: 'spinat_tk', g: 80,  label: 'Handvoll Blattspinat, TK' },
      { id: 'lauch',     g: 15,  label: 'Frühlingszwiebel' },
      { id: 'sesamoel',  g: 5,   label: 'Sesamöl' }
    ],
    steps: ['Wasser aufkochen, Nudeln hinein.', 'Nach 3 Minuten Ei vorsichtig dazu.', 'Spinat dazu, 2 Minuten.', 'Herd aus, Miso einrühren — nicht mehr kochen.', 'Sesamöl und Frühlingszwiebel darüber.'],
    swap: 'Mehr Protein: Edamame oder Räuchertofu.'
  },
  {
    id: 'r6', icon: 'grid', name: 'Blech-Süßkartoffel und Kichererbsen',
    minutes: 30, kcal: 480, protein: 19, dishes: 1,
    tags: ['Meal-Prep', 'Vegan', 'Ofen'],
    lowExec: true,
    hook: '5 Min Arbeit, 25 Min Ofen. In der Zeit machst du etwas anderes.',
    why: 'Der Ofen arbeitet, du nicht. Passive Wartezeit lässt sich mit einer Bewegungseinheit füllen.',
    portions: 2,
    items: [
      { id: 'suesskart', g: 500, label: '2 Süßkartoffeln, gewürfelt' },
      { id: 'kicher',    g: 240, label: '1 Dose Kichererbsen, abgespült' },
      { id: 'olivenoel', g: 25,  label: '2 EL Olivenöl' },
      { id: 'gewuerz',   g: 6,   label: '1 TL Paprika, 1 TL Kreuzkümmel' },
      { id: 'tahini',    g: 30,  label: 'Tahini für die Sauce' },
      { id: 'zitrone',   g: 15,  label: 'Zitronensaft' }
    ],
    steps: ['Ofen auf 220 °C.', 'Alles auf ein Blech, Öl und Gewürze, mischen.', '25 Minuten backen, einmal wenden.', 'Sauce darüber.'],
    swap: 'Sauce zu aufwendig: Joghurt, Zitrone, Salz.'
  },
  {
    id: 'r7', icon: 'utensils', name: 'Cottage-Cheese-Wrap',
    minutes: 4, kcal: 390, protein: 34, dishes: 0,
    tags: ['Mittagessen', 'Kein Kochen', 'High Protein'],
    lowExec: true,
    hook: 'Null Abwasch. Wirklich null.',
    why: 'Hoher Proteinanteil sättigt lange und dämpft den Impuls, zwei Stunden später Snacks zu suchen.',
    portions: 1,
    items: [
      { id: 'wrap_vk',  g: 60,  label: '1 Vollkorn-Wrap' },
      { id: 'huettenk', g: 150, label: '150 g Hüttenkäse' },
      { id: 'rucola',   g: 25,  label: 'Handvoll Rucola' },
      { id: 'avocado',  g: 70,  label: '1/2 Avocado' },
      { id: 'zitrone',  g: 5,   label: 'Zitrone, Pfeffer, Chiliflocken' }
    ],
    steps: ['Hüttenkäse auf den Wrap streichen.', 'Rest darauflegen, würzen.', 'Rollen, halbieren, essen.'],
    swap: 'Herzhafter: Räucherlachs oder Putenbrust dazu.'
  },
  {
    id: 'r8', icon: 'sparkle', name: 'Schoko-Skyr',
    minutes: 3, kcal: 240, protein: 26, dishes: 1,
    tags: ['Dessert', 'High Protein', 'Heißhunger'],
    lowExec: true,
    hook: 'Für den Abend-Craving — ohne dass er entgleist.',
    why: 'Heißhunger ignorieren funktioniert selten. Ihn mit etwas Proteinreichem bedienen schon.',
    portions: 1,
    items: [
      { id: 'skyr',       g: 200, label: '200 g Skyr' },
      { id: 'kakao',      g: 5,   label: '1 TL Backkakao' },
      { id: 'ahornsirup', g: 7,   label: '1 TL Ahornsirup' },
      { id: 'salz',       g: 0.3, label: 'Prise Salz' },
      { id: 'schoko_d',   g: 10,  label: '10 g dunkle Schokolade, gehackt' }
    ],
    steps: ['Skyr, Kakao, Süße und Salz verrühren.', 'Schokostückchen darüber.', 'Essen. Kein schlechtes Gewissen.'],
    swap: 'Erdnussmus hinein für die Salzig-Süß-Kombination.'
  }
];

DATA.recipeFilters = ['Alle', 'Unter 10 Min', 'High Protein', 'Kein Kochen', 'Meal-Prep', 'Vegan'];

/* ---------- Mindfulness ---------- */
DATA.mindful = [
  { id: 'm1', icon: 'wind', name: 'Box Breathing', minutes: 3, xp: 15,
    desc: '4 Sekunden ein, 4 halten, 4 aus, 4 halten. Beruhigt das Nervensystem in unter 3 Minuten.',
    pattern: [4, 4, 4, 4], cues: ['Einatmen', 'Halten', 'Ausatmen', 'Halten'] },
  { id: 'm2', icon: 'waves', name: 'Physiological Sigh', minutes: 2, xp: 10,
    desc: 'Doppelt einatmen, lang ausatmen. Der schnellste bekannte Weg, akuten Stress zu senken.',
    pattern: [2, 1, 6, 1], cues: ['Einatmen', 'Nochmal kurz ein', 'Lang ausatmen', 'Pause'] },
  { id: 'm3', icon: 'target', name: '5-4-3-2-1 Grounding', minutes: 3, xp: 15,
    desc: '5 Dinge sehen, 4 hören, 3 fühlen, 2 riechen, 1 schmecken. Holt dich aus dem Gedankenkarussell.',
    pattern: null },
  { id: 'm4', icon: 'scan', name: 'Body Scan (Kurzversion)', minutes: 6, xp: 25,
    desc: 'Von den Füßen zum Kopf. Gut vor dem Schlafen, wenn der Kopf noch rennt.',
    pattern: null },
  { id: 'm5', icon: 'utensils', name: 'Achtsam essen — 3 Bissen', minutes: 3, xp: 15,
    desc: 'Nur die ersten drei Bissen bewusst. Kein Perfektionismus, keine ganze Mahlzeit.',
    pattern: null }
];

/* ---------- Bewegung ---------- */
DATA.movement = [
  { id: 'w1', icon: 'bolt', name: 'Bewegungs-Snack', minutes: 4, xp: 15,
    desc: '20 Kniebeugen, 10 Liegestütze, 30 Sekunden Plank. Einmal durch. Fertig.' },
  { id: 'w2', icon: 'sun', name: 'Spaziergang ohne Handy', minutes: 15, xp: 30,
    desc: 'Raus, Tageslicht, keine Kopfhörer. Wirkt auf den Schlafrhythmus stärker als jede App.' },
  { id: 'w3', icon: 'activity', name: 'Mobility-Flow', minutes: 8, xp: 20,
    desc: 'Hüfte, Brustwirbelsäule, Schultern. Gegen den Schreibtischkörper.' },
  { id: 'w4', icon: 'dumbbell', name: 'Kraft-Session', minutes: 40, xp: 80,
    desc: 'Ganzkörper, 4 Übungen, je 3 Sätze. Kraft ist der beste Hebel für Stimmung und Stoffwechsel.' },
  { id: 'w5', icon: 'music', name: 'Tanz-Timer', minutes: 5, xp: 15,
    desc: 'Ein Lied laut aufdrehen und bewegen. Zählt vollwertig — Bewegung ist Bewegung.' },
  { id: 'w6', icon: 'stairs', name: 'Treppen statt Aufzug', minutes: 2, xp: 8,
    desc: 'Der Klassiker. Klein genug, dass keine Ausrede greift.' }
];

/* ---------- Fastenprotokolle ---------- */
DATA.fasting = [
  { id: 'f1', name: '12:12', fastHours: 12, label: 'Einsteiger', desc: 'Abendessen 20 Uhr, Frühstück 8 Uhr. Kaum spürbar.' },
  { id: 'f2', name: '14:10', fastHours: 14, label: 'Sanft', desc: 'Der Sweet Spot für die meisten. Das Frühstück fällt einfach etwas später aus.' },
  { id: 'f3', name: '16:8', fastHours: 16, label: 'Klassisch', desc: 'Das bekannteste Protokoll. Erst starten, wenn 14:10 sich leicht anfühlt.' },
  { id: 'f4', name: 'Küche zu', fastHours: 10, label: 'Nur abends', desc: 'Ab 20 Uhr keine Snacks mehr. Der wirksamste Einzelhebel bei Abend-Snacking.' }
];

/* ---------- Tages-Quests (Pool) ---------- */
DATA.questPool = [
  { id: 'q_water',   icon: 'droplet',   cls: 'i-mind', title: 'Ein großes Glas Wasser',       meta: 'Jetzt sofort · 30 Sekunden', xp: 5 },
  { id: 'q_protein', icon: 'egg',       cls: 'i-food', title: 'Protein zum Frühstück',        meta: 'Stabilisiert den Vormittag', xp: 20 },
  { id: 'q_veg',     icon: 'leaf',      cls: 'i-food', title: 'Gemüse bei einer Mahlzeit',    meta: 'Eine Handvoll reicht', xp: 15 },
  { id: 'q_move',    icon: 'bolt',      cls: 'i-move', title: 'Bewegungs-Snack (4 Min)',      meta: 'Kniebeugen, Liegestütze, Plank', xp: 15 },
  { id: 'q_light',   icon: 'sun',       cls: 'i-move', title: '10 Min Tageslicht',            meta: 'Am besten in der ersten Stunde', xp: 15 },
  { id: 'q_breath',  icon: 'wind',      cls: 'i-mind', title: '3 Min Atemübung',              meta: 'Box Breathing im Fokus-Tab', xp: 15 },
  { id: 'q_kitchen', icon: 'moon',      cls: 'i-fast', title: 'Küche zu ab 20 Uhr',           meta: 'Der stärkste Einzelhebel', xp: 25 },
  { id: 'q_prep',    icon: 'bowl',      cls: 'i-food', title: 'Morgen vorbereiten',           meta: 'Overnight Oats ansetzen', xp: 20 },
  { id: 'q_screen',  icon: 'screenOff', cls: 'i-mind', title: 'Handy weg beim Essen',         meta: 'Nur eine Mahlzeit', xp: 15 },
  { id: 'q_sleep',   icon: 'bed',       cls: 'i-mind', title: 'Bildschirm aus, 30 Min vor Bett', meta: 'Schlaf ist Hebel Nr. 1', xp: 25 }
];

/* ---------- Badges ---------- */
DATA.badges = [
  { id: 'b1',  icon: 'sprout',    name: 'Erster Schritt',    test: (s) => s.totalDone >= 1 },
  { id: 'b2',  icon: 'flame',     name: '3 Tage Streak',     test: (s) => s.bestStreak >= 3 },
  { id: 'b3',  icon: 'bolt',      name: '7 Tage Streak',     test: (s) => s.bestStreak >= 7 },
  { id: 'b4',  icon: 'gem',       name: '30 Tage Streak',    test: (s) => s.bestStreak >= 30 },
  { id: 'b5',  icon: 'pan',       name: 'Erst gekocht',      test: (s) => s.cooked >= 1 },
  { id: 'b6',  icon: 'chef',      name: '10 × gekocht',      test: (s) => s.cooked >= 10 },
  { id: 'b7',  icon: 'hourglass', name: 'Erstes Fasten',     test: (s) => s.fasts >= 1 },
  { id: 'b8',  icon: 'moon',      name: '10 × gefastet',     test: (s) => s.fasts >= 10 },
  { id: 'b9',  icon: 'wind',      name: 'Zur Ruhe gekommen', test: (s) => s.mindful >= 5 },
  { id: 'b10', icon: 'dumbbell',  name: '10 × bewegt',       test: (s) => s.workouts >= 10 },
  { id: 'b11', icon: 'target',    name: 'Perfekter Tag',     test: (s) => s.perfectDays >= 1 },
  { id: 'b12', icon: 'crown',     name: 'Level 10',          test: (s) => s.level >= 10 },
  { id: 'b13', icon: 'shield',    name: 'Comeback',          test: (s) => s.comebacks >= 1 },
  { id: 'b14', icon: 'message',   name: 'Coach gefragt',     test: (s) => s.coachAsks >= 5 },
  { id: 'b15', icon: 'book',      name: '5 Rezepte erkundet', test: (s) => s.recipesViewed >= 5 },
  { id: 'b16', icon: 'rocket',    name: '1000 XP',           test: (s) => s.xpTotal >= 1000 }
];

/* ---------- Level-Namen ---------- */
DATA.levelNames = [
  'Startpunkt', 'Aufgewacht', 'In Bewegung', 'Im Rhythmus', 'Aufgebaut',
  'Verankert', 'Stabil', 'Stark', 'Souverän', 'Mühelos'
];

/* ---------- Coach: Antwortmuster (Prototyp ohne API) ----------
   Wird von app.js benutzt, solange kein Backend angebunden ist.
*/
DATA.coachSuggestions = [
  'Ich habe keine Energie zu kochen',
  'Wie starte ich mit Fasten?',
  'Ich habe meinen Streak verloren',
  'Warum falle ich immer nach 3 Tagen raus?',
  'Was esse ich vor dem Sport?',
  'Abends kann ich nicht aufhören zu snacken'
];

DATA.coachRules = [
  {
    match: /(keine energie|kein bock|erschöpft|müde|kraftlos|kann nicht kochen|zu faul)/i,
    reply: `Dann kochst du heute nicht. Das ist keine Niederlage, das ist Planung.\n\n**Deine drei Optionen für genau jetzt:**\n<ul><li><b>Notfall-Shake</b> — 2 Minuten, ein Gefäß</li><li><b>Cottage-Cheese-Wrap</b> — 4 Minuten, null Abwasch</li><li><b>Fertigreis mit Räuchertofu und TK-Erbsen</b> — 6 Minuten, eine Pfanne</li></ul>\nEtwas essen schlägt perfekt essen. Der Tag zählt trotzdem.`
  },
  {
    match: /(fasten|fasting|16:8|intervall)/i,
    reply: `Fang nicht bei 16:8 an. Fast alle steigen dort aus.\n\n**Woche 1–2:** 12:12. Letzte Mahlzeit 20 Uhr, Frühstück 8 Uhr. Das machst du wahrscheinlich schon fast.\n**Woche 3–4:** 14:10. Frühstück auf 10 Uhr schieben.\n**Danach:** 16:8 — aber nur, wenn 14:10 sich leicht anfühlt.\n\nWichtig bei ADHS: Fasten senkt bei manchen den Fokus, weil Medikation und Blutzucker zusammenspielen. Wenn du merkst, dass du reizbar oder zerstreut wirst, geh eine Stufe zurück. Das ist keine Schwäche, das ist Daten sammeln.`
  },
  {
    match: /(streak.*(verloren|weg|kaputt|gerissen)|von vorne|alles umsonst)/i,
    reply: `Ein gerissener Streak ist ein Zähler, der auf Null springt. Deine Fitness, dein Schlaf, deine Gewohnheiten springen nicht auf Null.\n\nDie einzige Regel, die zählt: **nie zweimal hintereinander auslassen.**\n\nMach jetzt die kleinste Sache auf deiner Liste — ein Glas Wasser, 20 Kniebeugen. Danach ist der Streak wieder bei 1, und das ist genau da, wo jeder lange Streak einmal angefangen hat.`
  },
  {
    match: /(nach.*(3|drei|paar) tage|falle.*raus|halte.*nicht durch|verliere.*interesse|langweilig)/i,
    reply: `Das ist kein Charakterproblem, das ist der Neuheitseffekt. Bei ADHS trägt Motivation aus Neuheit typischerweise 3–10 Tage, dann fällt der Dopamin-Reiz weg — und mit ihm der Antrieb.\n\n**Was dagegen hilft:**\n<ul><li><b>Variation einbauen:</b> nicht dasselbe Frühstück 14 Tage lang, sondern drei rotierende</li><li><b>Reibung senken:</b> was mehr als 2 Minuten Vorbereitung braucht, wird irgendwann ausgelassen</li><li><b>Externe Anker:</b> Gewohnheit an etwas hängen, das ohnehin passiert (Kaffee, Zähneputzen)</li><li><b>Body Doubling:</b> jemanden im Call haben, während du kochst</li></ul>\nUnd: Der Plan muss zu dir passen, nicht umgekehrt.`
  },
  {
    match: /(vor dem sport|pre.?workout|vor dem training)/i,
    reply: `**60–90 Min vorher:** Banane mit einer Handvoll Nüssen, oder Skyr mit Beeren. Kohlenhydrate für die Energie, etwas Protein dazu.\n**15–30 Min vorher:** nur schnelle Kohlenhydrate — Banane, Reiswaffel, Dattel. Fett und Ballaststoffe liegen sonst schwer im Magen.\n**Nüchtern trainieren** geht auch, aber bei intensiven Einheiten sinkt meist die Leistung.\n\nDanach: 20–40 g Protein innerhalb von ein paar Stunden. Kein 30-Minuten-Fenster-Stress, das ist überholt.`
  },
  {
    match: /(abend|nachts|snack|naschen|heißhunger|craving|chips|süßigkeit|schokolade)/i,
    reply: `Abend-Snacking hat bei ADHS meistens einen von drei Auslösern:\n<ul><li><b>Tagsüber zu wenig gegessen</b> — der Körper holt sich das zurück</li><li><b>Medikation lässt nach</b> — der Appetit kommt schlagartig wieder</li><li><b>Reizsuche</b> — der Abend ist unterstimuliert, Essen liefert Dopamin</li></ul>\n**Was funktioniert:**\n<ul><li>Mittags richtig essen, mit Protein. Restriktion tagsüber rächt sich abends.</li><li><b>Küche zu ab 20 Uhr</b> als Regel, nicht als Willenskraft-Übung</li><li>Den Craving bedienen statt bekämpfen: der Schoko-Skyr im Essen-Tab ist genau dafür da</li><li>Hände beschäftigen — Tee, kaltes Wasser, ein Spiel, Zähne putzen</li></ul>`
  },
  {
    match: /(abnehmen|gewicht|kalorien|zunehmen|diät)/i,
    reply: `Kurz und ehrlich: Kalorienzählen funktioniert bei ADHS oft schlecht. Es braucht tägliche Konsistenz bei einer Aufgabe, die kein Feedback und keinen Reiz liefert. Die meisten steigen nach zwei Wochen aus.\n\n**Was stattdessen trägt:**\n<ul><li>Protein bei jeder Mahlzeit — sättigt, ohne dass du rechnen musst</li><li>Immer die gleichen 5–7 Mahlzeiten rotieren</li><li>Küche zu ab einer festen Uhrzeit</li><li>Krafttraining zweimal pro Woche</li></ul>\nZur konkreten Kalorienmenge oder zu Gewichtszielen sage ich dir bewusst nichts Pauschales — das gehört zu jemandem, der deine Situation kennt.`
  },
  {
    match: /(medikament|ritalin|elvanse|methylphenidat|adderall|dosis|appetit weg)/i,
    reply: `Zu deiner Medikation kann ich keine Empfehlung geben — das gehört zu deiner Ärztin oder deinem Arzt.\n\nWas ich beitragen kann, ist das Praktische drumherum: Wenn die Medikation den Appetit dämpft, verschiebt sich die Nahrungsaufnahme oft auf den Abend. Dann hilft es, morgens vor Wirkungseintritt etwas Kalorienreiches zu essen — der Notfall-Shake ist genau dafür gemacht. Und über den Tag verteilt trinken, weil auch das Durstgefühl gedämpft sein kann.`
  },
  {
    match: /(mindful|achtsam|meditation|stress|überfordert|reizüberflut|runterkommen)/i,
    reply: `Klassische Meditation — 20 Minuten stillsitzen — ist für viele ADHS-Gehirne der falsche Einstieg.\n\n**Was besser funktioniert:**\n<ul><li><b>Physiological Sigh</b> — 2 Minuten, wirkt bei akutem Stress am schnellsten</li><li><b>Box Breathing</b> — 3 Minuten mit visuellem Anker im Fokus-Tab</li><li><b>5-4-3-2-1 Grounding</b> — bei Gedankenkarussell</li><li><b>Bewegte Achtsamkeit</b> — Spazieren ohne Kopfhörer zählt genauso</li></ul>\nStart bei 2 Minuten. Nicht bei 20.`
  },
  {
    match: /(meal.?prep|vorkochen|planen|einkauf|einkaufsliste)/i,
    reply: `Meal-Prep scheitert bei ADHS meistens an der Größe des Vorhabens. Drei Stunden Sonntagskochen hält kaum jemand durch.\n\n**Kleinere Version, die trägt:**\n<ul><li><b>Nur eine Komponente</b> vorbereiten: eine große Portion Reis oder Protein. Nicht ganze Mahlzeiten.</li><li><b>Zweimal die Woche</b> statt einmal groß</li><li><b>Doppelte Menge kochen</b>, wenn du sowieso am Herd stehst</li><li><b>Tiefkühlgemüse</b> ohne schlechtes Gewissen — nährstofftechnisch top, null Vorbereitung</li></ul>\nDie Blech-Süßkartoffel im Essen-Tab ist dafür gebaut: 5 Minuten Arbeit, der Ofen macht den Rest.`
  }
];

DATA.coachFallback = `Erzähl mir etwas mehr — was passiert gerade konkret?\n\nIch kann bei diesen Themen am besten helfen:\n<ul><li>Was essen, wenn nichts geht</li><li>Fasten sinnvoll einsteigen</li><li>Streaks und warum sie reißen</li><li>Abend-Snacking</li><li>Bewegung, die tatsächlich stattfindet</li><li>Mindfulness ohne Stillsitzen</li></ul>`;

DATA.coachGreeting = `Hi Onofrio. Ich bin dein Coach.\n\nKeine Vorträge, keine Moral. Sag mir, wo es gerade hakt — oder tipp auf einen der Vorschläge oben.`;
