# Leaner

Gesunde Ernährung und gesunder Lifestyle — gebaut für ADHS-Gehirne.
Progressive Web App: läuft auf iPhone und MacBook aus derselben Codebase, ohne Build-Schritt und ohne Developer Account.

**Status:** klickbarer Prototyp mit echter Gamification-Logik. Daten liegen lokal im Browser (`localStorage`), kein Backend.

---

## Zwei Betriebsarten

**Lokal.** Solange in `config.js` keine Supabase-Werte stehen, läuft alles im Browser:
kein Konto, kein Netz nötig, Fortschritt in `localStorage`, Coach nach Regeln.
Gut zum Weiterentwickeln.

**Mit Konto.** Sobald die Werte drin sind: Login per Zahlencode, Fortschritt synchron
zwischen iPhone und MacBook, Coach antwortet per KI. Wie das eingerichtet wird, steht
Schritt für Schritt in **[SETUP.md](SETUP.md)**.

Die App merkt selbst, welcher Fall vorliegt. Fällt das Backend aus oder ist kein Netz da,
arbeitet sie lokal weiter und synchronisiert später nach.

---

## Starten

### MacBook

Doppelklick auf `index.html` reicht zum Durchklicken.

Für den vollen PWA-Modus (Service Worker, Offline, Installieren) braucht es einen lokalen Server:

```bash
cd ~/Documents/Privatprojekte/leaner
python3 -m http.server 8080
```

Dann `http://localhost:8080` in Safari oder Chrome öffnen.
In Safari: **Ablage → Zum Dock hinzufügen** — die App läuft danach als eigenes Fenster.

### iPhone

Mac und iPhone im selben WLAN. Auf dem Mac die lokale IP holen:

```bash
ipconfig getifaddr en0
```

Auf dem iPhone `http://<diese-IP>:8080` in Safari öffnen → **Teilen → Zum Home-Bildschirm**.
Danach startet Leaner im Vollbild, mit eigenem Icon, ohne Safari-Leiste.

---

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | App-Shell, Sheet-Container. Marke und Tab-Bar werden aus dem Icon-Set gebaut |
| `styles.css` | Design-System: Farbtokens für Hell und Dunkel, Komponenten, Safe-Area, Reduced-Motion |
| `icons.js` | Das komplette Icon-Set als Pfaddaten plus `icon('name')` |
| `foods.js` | Zutaten-Datenbank mit Nährwerten pro 100 g plus Suche |
| `nutrition.js` | Nutri-Score, Grundumsatz, Bedarf, Defizitgrenzen |
| `data.js` | Sämtliche Inhalte — Rezepte, Mindfulness, Bewegung, Fasten, Quests, Badges, Coach-Regeln |
| `app.js` | State, Gamification, Router, alle fünf Screens, Timer, Login-Gate |
| `config.js` | Die zwei öffentlichen Supabase-Werte. Ohne sie läuft alles rein lokal |
| `cloud.js` | Login, Sync und Coach-Aufruf — alles, was mit dem Backend redet |
| `supabase/schema.sql` | Tabellen und Sicherheitsregeln, einmal im SQL Editor ausführen |
| `dishes.js` | 75 fertige Gerichte mit typischer Portionsgröße |
| `photos.js` | Fotos auswählen, verkleinern, hochladen, anzeigen |
| `supabase/schema-2.sql` | Nachtrag: Rezepte, eigene Zutaten, Produktcache |
| `supabase/schema-3.sql` | Nachtrag: Bildspeicher und Fortschrittsfotos |
| `supabase/schema-4.sql` | Nachtrag: Erinnerungen und Zeitsteuerung |
| `avatar.js` | Der Coach als Punktraster |
| `notify.js` | Erinnerungen erlauben und abonnieren |
| `supabase/functions/coach/` | Der AI-Coach als Edge Function. Hier lebt der API-Key |
| `supabase/functions/foodsearch/` | Produktsuche über Open Food Facts, mit Zwischenspeicher |
| `deploy.sh` | Version hochzählen und veröffentlichen, in einem Befehl |
| `sw.js` | Service Worker, Netzwerk zuerst mit Cache als Rückfall |
| `manifest.json` | PWA-Metadaten |
| `brand/mark.svg` | Nur das Zeichen |
| `brand/logo.svg` | Zeichen und Wortmarke |
| `icons/icon.svg` | App-Icon |
| `tools/make-icons.html` | Erzeugt PNG-Icons aus dem SVG (einmalig, per Klick) |

Bewusst kein Framework und kein Build-Schritt: Datei speichern, Seite neu laden, fertig.

---

## Marke

**Das Zeichen** ist ein einziger Strich: das kleine „l" kippt am Fuß nach rechts und läuft nach oben aus. Buchstabe und Aufwärtskurve in einer Bewegung. Keine Fläche, keine zweite Form, kein Verlauf — damit funktioniert es bei 16 px genauso wie auf einem Plakat.

**Die Wortmarke** ist kleingeschrieben, eng gesetzt (`letter-spacing: -1.4`), Systemschrift in Semibold. Kleinschreibung, weil die App zurückhaltend auftreten soll.

Beide Dateien nutzen `currentColor` und funktionieren dadurch auf hellem und dunklem Grund ohne zweite Version. Die Wortmarke ist als `<text>` gesetzt und damit editierbar — für Druck oder fremde Systeme vorher in Pfade umwandeln.

---

## Icons

Ein einziges Set in `icons.js`: 24×24 Raster, nur Konturen, gleiche Strichstärke, runde Enden. Keine Emoji, keine gefüllten Flächen, keine Zweitfarben.

```js
icon('flame')            // <svg class="ic">…</svg>
icon('leaf', 'ic-lg')    // größere Variante
```

Neues Icon: Pfad in `ICONS` eintragen, überall per Name nutzen. Mehrere Pfade in einem Icon werden mit `|` getrennt. Größe und Strichstärke kommen aus dem CSS (`.ic`), nicht aus der Pfaddefinition — dadurch bleibt alles konsistent.

---

## Farbe

Hell und dunkel folgen automatisch der System-Einstellung (`prefers-color-scheme`). Vier gedämpfte Bereichsfarben tragen jeweils eine Bedeutung:

| Token | Bereich |
|---|---|
| `--food` | Ernährung, zugleich `--accent` für Fortschritt und Primäraktionen |
| `--move` | Bewegung |
| `--mind` | Mindfulness |
| `--fast` | Fasten |

Alles andere ist Graustufe. Farbe erscheint nur dort, wo sie etwas unterscheidet — nicht als Dekoration. Ringe und Konfetti lesen ihre Farben zur Laufzeit aus diesen Variablen und passen sich beiden Modi ohne Sonderfall an.

---

## Die fünf Screens

**Heute** — Fortschrittsring, fünf Tages-Quests, Kalorienstand des Tages, Level-Fortschritt, vier Schnellstart-Kacheln.
**Essen** — zwei Bereiche: **Tagebuch** mit Mahlzeiten und Makros, **Rezepte** mit Nutri-Score. Eigene Rezepte lassen sich anlegen; Nährwerte und Score entstehen automatisch aus den Zutaten.
**Fokus** — Fasten-Timer (überlebt Reload und App-Neustart), Atemübungen mit animiertem Orb, Bewegungs-Timer.
**Coach** — Chat mit Vorschlagschips, kontextbewusst zum eigenen Fortschritt.
**Profil** — Level, Statistiken, 16 Badges, Einstellungen.

---

## ADHS-Designentscheidungen

Diese Punkte sind keine Kosmetik — sie sind der Grund, warum die App anders aussieht als die üblichen Tracker.

- **Fünf Quests, drei zählen.** Lange Listen führen zu Vermeidung. Der Streak-Tag ist nach drei erledigten Dingen sicher, der Rest ist Bonus statt Versagen.
- **Streak-Schutz statt Streak-Tod.** Ein verpasster Tag verbraucht automatisch einen Schutz. Alle 7 Streak-Tage kommt einer zurück, maximal zwei. Der Abbruch nach einem einzelnen schlechten Tag ist der häufigste Ausstiegsgrund.
- **Kein Kalorienzählen.** Tägliche Dateneingabe ohne unmittelbares Feedback wird selten länger als zwei Wochen durchgehalten. Rezepte sind stattdessen nach Zeit, Protein und **Abwasch** sortiert.
- **Aufwand ist die Leitwährung.** Jedes Rezept zeigt Minuten und Anzahl Spülgänge. Reibung ist der eigentliche Gegner.
- **„Geht auch an schlechten Tagen".** Jedes Rezept hat eine Notfallvariante. Etwas essen schlägt perfekt essen.
- **Sofortfeedback bei jeder Aktion.** Konfetti, Haptik, Toast, Ring-Animation — innerhalb von 100 ms.
- **Keine roten Warnfarben, kein Shaming.** Verpasste Ziele werden neutral dargestellt.
- **Sanfter Modus** und **Weniger Animation** sind abschaltbar, `prefers-reduced-motion` wird respektiert.
- **Timer mit Zeitstempel statt Zähler.** Der Fasten-Timer läuft weiter, auch wenn die App geschlossen wird — Vergessen soll den Fortschritt nicht kosten.

---

## Woher die Zutaten kommen

Drei Quellen, in dieser Reihenfolge durchsucht:

1. **Eigene Zutaten** aus deinem Konto — selbst angelegt oder aus einem Produkt
   übernommen. Stehen bewusst ganz oben: Wer eine angelegt hat, meint meistens genau die.
2. **Die mitgelieferte Liste** in `foods.js`, rund 200 Grundzutaten. Liegt im Code,
   ist damit sofort da und funktioniert offline.
3. **Open Food Facts** — Millionen europäischer Produkte, nachgereicht nach einer
   kurzen Tippause.

Wird ein Produkt übernommen, landet es dauerhaft in deinen eigenen Zutaten. Damit
lassen sich Rezepte auch später und ohne Netz auflösen — die Nährwerte hängen nicht
an einem fremden Dienst.

Die Suche läuft über eine Edge Function, nicht direkt aus dem Browser. Zwei Gründe:
Open Food Facts bittet um eine Kennung im User-Agent, die ein Browser nicht setzen
darf, und erlaubt nur zehn Suchanfragen pro Minute. Ein gemeinsamer Zwischenspeicher
hält Ergebnisse 30 Tage.

**Barcode-Scannen fehlt bewusst.** Safari unterstützt die dafür nötige Schnittstelle
bis heute nicht, auf dem iPhone würde es still fehlschlagen. Nachrüstbar über eine
WebAssembly-Bibliothek, wenn die Textsuche zu mühsam wird.

---

## Nutri-Score

Umgesetzt ist die Fassung von 2023, wie sie seit dem 31. Dezember 2023 gilt.
Bewertet werden 100 g des fertigen Gerichts: Energie, Zucker, gesättigte Fette und
Salz zählen dagegen, Obst und Gemüse, Ballaststoffe und Eiweiß dafür. Ab elf
negativen Punkten fällt das Eiweiß aus der Rechnung — sonst könnten sehr salzige
oder sehr fette Gerichte ihre Note über den Eiweißgehalt schönrechnen.

Eigene Grenzwerte gelten für Öle und Fette (Verhältnis gesättigter Fette zum
Gesamtfett statt absoluter Menge), für Getränke und für rotes Fleisch.

Die Rechnung ist gegen zwölf bekannte Produkte geprüft — Wasser, Cola, Orangensaft,
Olivenöl, Kokosöl, Vollmilch, Brokkoli, Haferflocken, Chips, Salami, Gouda,
Vollkornbrot. Alle treffen die erwartete Note.

**Was er nicht ist:** ein Urteil über eine Mahlzeit. Der Nutri-Score wurde für
verpackte Produkte entwickelt und vergleicht innerhalb einer Produktgruppe. Ein
Gericht mit viel Olivenöl, Nüssen oder Käse bekommt systematisch eine schlechtere
Note, ohne deshalb ungesund zu sein. In der App steht deshalb überall dabei,
wie die Note zustande kommt und was sie aussagt.

---

## Kalorienbedarf

Grundumsatz nach **Mifflin-St Jeor**, multipliziert mit einem Aktivitätsfaktor
zwischen 1,2 und 1,9. Daraus ergibt sich der Gesamtbedarf, davon abgezogen das
eingestellte Defizit.

Die Grenzen sind fest verdrahtet und lassen sich in der Oberfläche nicht
überschreiben:

- **Nie unter den Grundumsatz.** Der Regler endet dort, wo das Ziel den
  Grundumsatz erreichen würde.
- **Höchstens 500 kcal** oder 20 Prozent des Gesamtbedarfs, je nachdem was
  kleiner ist.
- **Ab einem BMI unter 20** wird kein Defizit empfohlen, sondern Krafttraining
  bei etwa gleichbleibenden Kalorien.
- Bei einem BMI unter 18,5 weist die App auf ärztliche Abklärung hin.

Der Coach kennt diese Zahlen und darf sie einordnen, unterliegt aber denselben
Grenzen — sie stehen in seiner Systemanweisung.

Eiweiß- und Fettziele werden nach Körpergewicht abgeleitet (1,6 g beziehungsweise
0,9 g pro Kilo), die Kohlenhydrate ergeben sich aus dem Rest.

---

## Gamification-System

```
Level 1 → 2:   100 XP
Level 2 → 3:   125 XP
Level n → n+1: vorheriger Bedarf × 1,25 (auf 5 gerundet)
```

XP-Vergabe: Quest 5–25 · Atemübung 10–25 · Bewegung 8–80 · Rezept gekocht 30 · Fasten 20–40 · perfekter Tag +50 Bonus.

16 Badges, davon einer (`Comeback`) bewusst für den Wiedereinstieg nach einem Abbruch.

---

## Nächste Schritte

**Kurzfristig**
- PNG-Icons erzeugen (`tools/make-icons.html`)
- Mehr Rezepte in `data.js` — das Array ist die einzige Stelle, die dafür angefasst werden muss
- Einkaufsliste aus ausgewählten Rezepten
- Wochenansicht mit Streak-Kalender

**Weiter gedacht**
- Push-Erinnerungen: auf iOS nur für Web-Apps auf dem Home-Bildschirm möglich, braucht VAPID-Schlüssel und einen zeitgesteuerten Job in Supabase
- Wochenrückblick, den der Coach aus den echten Daten schreibt
- Rezepte aus der Datenbank statt aus `data.js`, mit Einkaufsliste
- HealthKit-Anbindung: dafür wäre ein Wechsel auf Capacitor oder Swift nötig
- Body Doubling: gemeinsame Timer-Sessions über Supabase Realtime

---

## Rechtliches

Leaner ersetzt keine ärztliche, ernährungstherapeutische oder psychotherapeutische Beratung.
Fasten ist bei Essstörungen in der Vorgeschichte, Schwangerschaft, Diabetes und einigen Medikationen nicht geeignet.
Zu ADHS-Medikation gibt die App bewusst keine Empfehlungen.

Ohne Konto bleiben alle Daten lokal auf dem Gerät. Mit Konto liegen sie in deinem
eigenen Supabase-Projekt, abgesichert durch Row Level Security — jede Zeile gehört
genau einem Konto und ist für niemanden sonst lesbar. Kein Tracking, keine Dritten.
