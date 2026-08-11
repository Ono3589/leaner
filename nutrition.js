/* ============================================================
   Leaner — Nährwerte, Nutri-Score, Kalorienbedarf

   Zwei getrennte Themen in einer Datei, weil sie zusammengehören:
   was steckt im Essen, und wie viel brauchst du davon.
   ============================================================ */

/* ------------------------------------------------------------
   1) NÄHRWERTE EINES REZEPTS

   Zutaten werden in Gramm addiert. Der Nutri-Score bezieht sich
   immer auf 100 g des fertigen Gerichts — deshalb wird am Ende
   auf 100 g heruntergerechnet.

   Wasserverlust beim Kochen wird bewusst ignoriert. Ihn zu
   schätzen brächte Scheingenauigkeit; für die Einordnung
   "eher A oder eher D" spielt er keine entscheidende Rolle.
------------------------------------------------------------ */

const NUTRIENT_KEYS = ['kcal', 'p', 'ch', 'z', 'f', 'sf', 'b', 's'];

function recipeNutrition(items) {
  const total = { g: 0, kcal: 0, p: 0, ch: 0, z: 0, f: 0, sf: 0, b: 0, s: 0, fvlG: 0 };
  let addedFatG = 0, redMeatG = 0, beverageG = 0;

  (items || []).forEach((it) => {
    // foodById löst auch eigene Zutaten und übernommene Produkte auf
    const food = foodById(it.id) || it.food;
    if (!food) return;
    const g = Number(it.g) || 0;
    const k = g / 100;

    total.g += g;
    NUTRIENT_KEYS.forEach((key) => { total[key] += (Number(food[key]) || 0) * k; });
    total.fvlG += g * ((Number(food.fvl) || 0) / 100);

    if (food.addedFat) addedFatG += g;
    if (food.redMeat) redMeatG += g;
    if (food.beverage) beverageG += g;
  });

  if (total.g === 0) return null;

  const per100 = { g: 100 };
  NUTRIENT_KEYS.forEach((key) => { per100[key] = total[key] * 100 / total.g; });
  per100.fvl = total.fvlG * 100 / total.g;

  return {
    total,
    per100,
    // Kategorie fürs Scoring — Mehrheitsprinzip, absichtlich simpel
    category: addedFatG / total.g > 0.5 ? 'fat'
            : beverageG / total.g > 0.8 ? 'beverage'
            : redMeatG / total.g > 0.3 ? 'redMeat'
            : 'general'
  };
}

/* ------------------------------------------------------------
   2) NUTRI-SCORE (Fassung von 2023)

   Bewertet 100 g anhand von vier ungünstigen Größen (Energie,
   Zucker, gesättigte Fette, Salz) gegen drei günstige
   (Obst/Gemüse/Hülsenfrüchte/Nüsse, Ballaststoffe, Eiweiß).

   Die Besonderheit: Ab 11 negativen Punkten zählt Eiweiß nicht
   mehr mit. Sonst könnten sehr salzige, sehr fette Produkte ihre
   Bewertung über den Eiweißgehalt schönrechnen.

   Wichtig zur Einordnung: Der Nutri-Score ist für verpackte
   Produkte gemacht und vergleicht innerhalb einer Kategorie.
   Bei einem selbst gekochten Gericht ist er eine Orientierung,
   kein Urteil. Ein Olivenöl-lastiges Dressing bekommt ein D und
   ist trotzdem nicht ungesund.
------------------------------------------------------------ */

// Schwellen: Punkt n wird vergeben, sobald der Wert die n-te Schwelle überschreitet
const NS = {
  energy:  [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugar:   [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  satFat:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  salt:    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0,
            2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0],
  fibre:   [3.0, 4.1, 5.2, 6.3, 7.4],
  protein: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],

  // Getränke haben eigene, strengere Maßstäbe
  bevEnergy: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390],
  bevSugar:  [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11],
  bevProtein:[1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],

  // Für Öle und Fette: Anteil gesättigter Fette am Gesamtfett in Prozent
  fatRatio: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]
};

function pointsFor(value, thresholds) {
  let p = 0;
  for (const t of thresholds) { if (value > t) p++; else break; }
  return p;
}

function fvlPoints(percent, beverage) {
  if (beverage) return percent > 80 ? 6 : percent > 60 ? 4 : percent > 40 ? 2 : 0;
  return percent > 80 ? 5 : percent > 60 ? 2 : percent > 40 ? 1 : 0;
}

/* per100: { kcal, p, ch, z, f, sf, b, s, fvl }
   category: 'general' | 'fat' | 'beverage' | 'redMeat' | 'cheese' */
function nutriScore(per100, category = 'general', opts = {}) {
  if (!per100) return null;
  const kJ = per100.kcal * 4.184;
  const bev = category === 'beverage';

  /* --- Negative Punkte --- */
  let nEnergy, nSat;
  if (category === 'fat') {
    // Bei Ölen zählt das Verhältnis, nicht die absolute Menge —
    // sonst bekämen Olivenöl und Kokosöl dieselbe Bewertung.
    const ratio = per100.f > 0 ? (per100.sf / per100.f) * 100 : 0;
    nSat = pointsFor(ratio, NS.fatRatio);
    nEnergy = pointsFor(per100.sf * 37, [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200]);
  } else {
    nEnergy = pointsFor(kJ, bev ? NS.bevEnergy : NS.energy);
    nSat = pointsFor(per100.sf, NS.satFat);
  }

  const nSugar = pointsFor(per100.z, bev ? NS.bevSugar : NS.sugar);
  const nSalt = pointsFor(per100.s, NS.salt);
  const sweetener = bev && opts.sweetener ? 4 : 0;

  const N = nEnergy + nSugar + nSat + nSalt + sweetener;

  /* --- Positive Punkte --- */
  const pFvl = fvlPoints(per100.fvl || 0, bev);
  const pFibre = pointsFor(per100.b, NS.fibre);
  let pProtein = bev
    ? pointsFor(per100.p, NS.bevProtein)
    : pointsFor(per100.p, NS.protein);
  if (category === 'redMeat') pProtein = Math.min(pProtein, 2);

  const P = pFvl + pFibre + pProtein;

  /* --- Zusammenführen --- */
  let score;
  if (category === 'cheese' || bev) {
    score = N - P;                              // Eiweiß zählt hier immer
  } else if (category === 'fat') {
    score = N < 7 ? N - P : N - pFvl - pFibre;  // strengere Grenze bei Fetten
  } else {
    score = N < 11 ? N - P : N - pFvl - pFibre; // Eiweiß fällt bei hohem N raus
  }

  /* --- Buchstabe --- */
  let grade;
  if (bev) {
    grade = opts.water ? 'A' : score <= 2 ? 'B' : score <= 6 ? 'C' : score <= 9 ? 'D' : 'E';
  } else if (category === 'fat') {
    grade = score < -5 ? 'A' : score < 3 ? 'B' : score < 11 ? 'C' : score < 19 ? 'D' : 'E';
  } else {
    grade = score < 1 ? 'A' : score < 3 ? 'B' : score < 11 ? 'C' : score < 19 ? 'D' : 'E';
  }

  return {
    grade, score, N, P, category,
    detail: {
      energie: nEnergy, zucker: nSugar, gesFett: nSat, salz: nSalt,
      obstGemuese: pFvl, ballaststoffe: pFibre, eiweiss: pProtein,
      eiweissGezaehlt: !(N >= (category === 'fat' ? 7 : 11)) || category === 'cheese' || bev
    }
  };
}

/* Was würde den Score verbessern? Konkret statt allgemein. */
function nutriTips(per100, result) {
  if (!result) return [];
  const tips = [];
  const d = result.detail;

  if (d.salz >= 4) tips.push('Salz ist der größte Hebel hier — weniger Salz, Sojasauce oder Brühe.');
  if (d.gesFett >= 4) tips.push('Gesättigte Fette senken: weniger Butter, Sahne oder Käse, dafür Olivenöl.');
  if (d.zucker >= 4) tips.push('Zucker senken oder durch Obst ersetzen.');
  if (d.obstGemuese < 2) tips.push('Mehr Gemüse oder Hülsenfrüchte — das ist der schnellste Weg nach oben.');
  if (d.ballaststoffe < 2) tips.push('Ballaststoffe fehlen: Vollkorn statt hell, oder Hülsenfrüchte dazu.');
  if (!d.eiweissGezaehlt) tips.push('Der Eiweißgehalt zählt hier nicht mit, weil die negativen Punkte zu hoch sind. Erst Salz, Fett oder Zucker senken.');
  if (!tips.length) tips.push('Nährwertseitig gibt es hier wenig zu verbessern.');
  return tips;
}

const GRADE_LABEL = {
  A: 'sehr günstige Nährwerte',
  B: 'günstige Nährwerte',
  C: 'mittlere Nährwerte',
  D: 'weniger günstige Nährwerte',
  E: 'ungünstige Nährwerte'
};

/* ------------------------------------------------------------
   3) KALORIENBEDARF

   Grundumsatz nach Mifflin-St Jeor — die Formel, die bei
   gesunden Erwachsenen am zuverlässigsten trifft. Mal einem
   Aktivitätsfaktor ergibt das den Gesamtumsatz.

   Alles hier sind Schätzungen mit einer Streuung von gut zehn
   Prozent. Aussagekräftiger als jede Formel ist, wie sich dein
   Gewicht über zwei bis drei Wochen tatsächlich entwickelt.
------------------------------------------------------------ */

const ACTIVITY = [
  { id: 'sitzend',  pal: 1.2,   label: 'Überwiegend sitzend', desc: 'Büro, kaum Sport' },
  { id: 'leicht',   pal: 1.375, label: 'Leicht aktiv',        desc: 'Etwas Bewegung, 1–2× Sport pro Woche' },
  { id: 'maessig',  pal: 1.55,  label: 'Mäßig aktiv',         desc: '3–4× Sport pro Woche' },
  { id: 'aktiv',    pal: 1.725, label: 'Aktiv',               desc: '5–6× Sport oder körperliche Arbeit' },
  { id: 'sehr',     pal: 1.9,   label: 'Sehr aktiv',          desc: 'Tägliches Training oder schwere Arbeit' }
];

function bmr({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'w' ? base - 161 : base + 5);
}

function tdee(profile) {
  const b = bmr(profile);
  if (!b) return null;
  const act = ACTIVITY.find((a) => a.id === profile.activity) || ACTIVITY[1];
  return Math.round(b * act.pal);
}

function bmi({ weightKg, heightCm }) {
  if (!weightKg || !heightCm) return null;
  return weightKg / Math.pow(heightCm / 100, 2);
}

/* ------------------------------------------------------------
   Defizit — mit Grenzen, die nicht verhandelbar sind

   - Nie unter den Grundumsatz. Darunter wird zu wenig gegessen,
     um den Körper überhaupt zu versorgen.
   - Höchstens 500 kcal oder 20 % des Gesamtumsatzes, je nachdem
     was kleiner ist. Größere Defizite halten die wenigsten durch,
     kosten überproportional Muskelmasse und schlagen bei ADHS
     zusätzlich auf Konzentration und Impulskontrolle.
   - Ab einem BMI unter 20 wird kein Defizit mehr empfohlen.
------------------------------------------------------------ */

function deficitAdvice(profile) {
  const t = tdee(profile);
  const b = bmr(profile);
  const bodyMass = bmi(profile);
  if (!t || !b) return null;

  const hardCap = Math.max(0, t - b);                       // nie unter Grundumsatz
  const softCap = Math.min(500, Math.round(t * 0.2 / 10) * 10);
  const maxDeficit = Math.min(hardCap, softCap);

  let recommended = Math.min(maxDeficit, 350);
  let tone = 'normal';
  let note = 'Rund 350 kcal unter deinem Bedarf. Das ergibt etwa 0,3 kg pro Woche — langsam genug, dass du es nicht merkst, und schnell genug, dass es sich lohnt.';

  if (bodyMass !== null && bodyMass < 18.5) {
    recommended = 0; tone = 'warn';
    note = 'Dein BMI liegt unter 18,5. Ein Defizit ist hier nicht angebracht — sprich das bitte ärztlich ab, bevor du weniger isst.';
  } else if (bodyMass !== null && bodyMass < 20) {
    recommended = 0; tone = 'warn';
    note = 'Dein BMI liegt im unteren Normalbereich. Abnehmen bringt hier gesundheitlich wenig. Wenn es dir um die Körperzusammensetzung geht, ist Krafttraining bei etwa gleichbleibenden Kalorien der bessere Weg.';
  } else if (bodyMass !== null && bodyMass >= 30) {
    recommended = maxDeficit;
    note = 'Bei deinem Ausgangsgewicht ist auch ein größeres Defizit gut vertretbar. Ich habe die Obergrenze gesetzt — geh gern niedriger, wenn sich das leichter anfühlt.';
  }

  return {
    bmr: b, tdee: t, bmi: bodyMass,
    maxDeficit, recommended, tone, note,
    weeklyKg: (d) => (d * 7) / 7700   // 7700 kcal entsprechen etwa einem Kilo Fettgewebe
  };
}

function targetKcal(profile) {
  const t = tdee(profile);
  if (!t) return null;
  const b = bmr(profile);
  const deficit = Math.max(0, Math.min(Number(profile.deficit) || 0, t - b));
  return Math.round(t - deficit);
}

/* Eiweiß-, Fett- und Kohlenhydratziele.
   Eiweiß nach Körpergewicht statt nach Prozent — das ist die
   Größe, auf die es tatsächlich ankommt. */
function macroTargets(profile) {
  const kcal = targetKcal(profile);
  if (!kcal || !profile.weightKg) return null;
  const protein = Math.round(profile.weightKg * 1.6);
  const fat = Math.round(profile.weightKg * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}
