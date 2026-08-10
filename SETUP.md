# Leaner scharf schalten

Von der lokalen Datei zur echten App auf deinem iPhone: eigene Adresse im Netz,
Konto mit Login, Fortschritt synchron zwischen iPhone und MacBook, und ein Coach,
der wirklich mit KI antwortet.

**Zeitbedarf:** etwa eine Stunde, verteilt auf sieben Schritte.
**Kosten:** GitHub Pages und Supabase sind im kostenlosen Umfang ausreichend.
Nur der AI-Coach kostet — Anthropic rechnet nach Nutzung ab, für deinen
Eigengebrauch sind das typischerweise wenige Euro im Monat.

Der Code ist fertig. Was hier steht, sind nur die Stellen, an denen du dich
anmelden oder etwas einfügen musst — das mache ich bewusst nicht für dich.

---

## Was am Ende wo läuft

| Baustein | Wo | Wofür |
|---|---|---|
| Die App selbst | GitHub Pages | HTML, CSS, JS — die Dateien, die dein iPhone lädt |
| Konto und Datenbank | Supabase | Login per Code, dein Fortschritt, Sync zwischen Geräten |
| AI-Coach | Supabase Edge Function | Ruft Claude auf. Hier liegt der API-Key, sicher vor dem Browser |

Der wichtigste Punkt daran: Der Anthropic-API-Key liegt **niemals** im Frontend.
Alles, was der Browser lädt, kann jeder auslesen — und dann auf deine Rechnung
Anfragen stellen. Deshalb der Umweg über die Edge Function.

---

## Schritt 1 — Code auf GitHub

Ein Repository, aus dem GitHub Pages später direkt ausliefert.

1. Auf [github.com/new](https://github.com/new) ein Repository anlegen.
   Name zum Beispiel `leaner`. **Public**, denn GitHub Pages ist für private
   Repositories kostenpflichtig. Kein Problem: In diesem Projekt liegen keine Secrets.
2. Kein README, kein .gitignore, keine Lizenz ankreuzen — beides ist schon da.
3. Auf der Seite danach **uploading an existing file** klicken.
4. Den kompletten Inhalt des Ordners `leaner` ins Browserfenster ziehen.
   Wichtig: den **Inhalt**, nicht den Ordner selbst.
5. Unten **Commit changes**.

Wenn du lieber im Terminal arbeitest:

```bash
cd ~/Documents/Privatprojekte/leaner
git init && git add -A && git commit -m "Leaner"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/leaner.git
git push -u origin main
```

---

## Schritt 2 — GitHub Pages einschalten

1. Im Repository auf **Settings**, links auf **Pages**.
2. Bei *Source*: **Deploy from a branch**.
3. Branch **main**, Ordner **/ (root)**. **Save**.
4. Ein bis zwei Minuten warten, dann steht oben deine Adresse:
   `https://DEIN-NAME.github.io/leaner/`

Ruf sie einmal auf. Die App startet und zeigt den Login — der funktioniert noch
nicht, das kommt jetzt.

---

## Schritt 3 — Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) mit deinem GitHub-Konto anmelden.
2. **New project**. Name `leaner`, Region **Frankfurt (eu-central-1)** — kurze Wege,
   und deine Daten bleiben in der EU.
3. Ein Datenbank-Passwort wird verlangt. Lass es von deinem Passwortmanager
   erzeugen und dort speichern. Du brauchst es im Alltag nicht.
4. Zwei bis drei Minuten warten, bis das Projekt bereitsteht.

Dann die beiden Werte holen: **Project Settings → API**

- **Project URL** — sieht aus wie `https://abcdefgh.supabase.co`
- **anon public** key — ein langer Text, beginnt mit `eyJ`

Beide in `config.js` eintragen:

```js
const CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi…',
  CLOUD: true
};
```

Diese zwei Werte dürfen öffentlich sein. Der anon key sagt nur „diese Anfrage
kommt aus der App". Was jemand damit tatsächlich sehen darf, entscheiden die
Regeln aus Schritt 4.

> Der **service_role** key im selben Menü darf dagegen nirgendwo hin außer in
> Supabase selbst. Der hebelt alle Regeln aus.

---

## Schritt 4 — Tabellen und Sicherheitsregeln

1. In Supabase links auf **SQL Editor**, dann **New query**.
2. Den kompletten Inhalt von `supabase/schema.sql` hineinkopieren.
3. **Run**.

Das legt drei Tabellen an und schaltet Row Level Security ein: Jede Zeile gehört
genau einem Konto, und die Regeln lassen nur Zugriff auf die eigene Zeile zu.
Selbst wer den öffentlichen anon key nimmt und direkt gegen die API geht, kommt
an keine fremden Daten.

Die dritte Tabelle ist eine Nutzungsbremse für den Coach — maximal 60 Anfragen
pro Tag und Konto. Falls sich irgendwo eine Schleife einschleicht, treibt sie
dir nicht die Rechnung hoch.

---

## Schritt 5 — Login auf Zahlencode umstellen

Supabase verschickt standardmäßig einen Link. Auf dem iPhone öffnet ein Link
aber Safari und nicht deine installierte App — du wärst wieder draußen.
Deshalb ein sechsstelliger Code zum Abtippen.

1. **Authentication → Emails** (je nach Ansicht unter *Email Templates*).
2. Vorlage **Magic Link** öffnen.
3. Den Inhalt ersetzen durch:

```html
<h2>Dein Code für Leaner</h2>
<p>Gib diesen Code in der App ein:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:600">{{ .Token }}</p>
<p>Der Code gilt eine Stunde. Wenn du ihn nicht angefordert hast, ignorier diese Mail.</p>
```

Entscheidend ist `{{ .Token }}` — das ist der Code. Sobald der drinsteht,
verschickt Supabase ihn statt eines Links.

4. Speichern.

> Der eingebaute Mailversand von Supabase ist auf wenige Mails pro Stunde
> begrenzt. Für dich allein reicht das. Wenn später mehr Leute die App nutzen,
> unter *Authentication → SMTP Settings* einen eigenen Versand eintragen
> (Resend, Postmark oder ähnlich).

**Jetzt testbar:** `config.js` mit den echten Werten zu GitHub hochladen,
eine Minute warten, deine Pages-Adresse aufrufen. E-Mail eintragen, Code aus
dem Postfach abtippen — du bist drin, und dein Fortschritt liegt ab sofort in
deinem Konto. Der Coach antwortet noch nach Regeln, das ist Schritt 6 und 7.

---

## Schritt 6 — Anthropic-API-Key

1. Auf [console.anthropic.com](https://console.anthropic.com) ein Konto anlegen.
2. Unter **Billing** ein Guthaben einrichten. Fang klein an, 5 $ reichen zum
   Ausprobieren lange.
3. Unter **API Keys** einen Key erstellen. Er wird **einmal** angezeigt —
   direkt in deinen Passwortmanager.
4. Zurück in Supabase: **Edge Functions → Secrets** (je nach Ansicht unter
   *Project Settings → Edge Functions*). **Add new secret**:

   - Name: `ANTHROPIC_API_KEY`
   - Value: dein Key

Der Key liegt damit ausschließlich auf dem Server. Er taucht in keiner Datei
auf, die dein Browser lädt.

---

## Schritt 7 — Coach-Funktion veröffentlichen

**Über die Oberfläche:**

1. In Supabase links auf **Edge Functions**, dann **Deploy a new function** →
   *via Editor*.
2. Name exakt `coach` — die App ruft genau diesen Namen auf.
3. Den kompletten Inhalt von `supabase/functions/coach/index.ts` einfügen.
4. **Deploy**.

**Über das Terminal**, falls dir das lieber ist:

```bash
cd ~/Documents/Privatprojekte/leaner
npx supabase login
npx supabase link --project-ref DEIN-PROJECT-REF
npx supabase functions deploy coach
```

Den `project-ref` findest du in der Project URL: `https://REF.supabase.co`.

Danach in der App eine Frage an den Coach stellen. Die Antwort sollte jetzt
merklich persönlicher ausfallen und deinen Streak und Fortschritt kennen.
Falls nicht: In Supabase unter **Edge Functions → coach → Logs** steht, woran es lag.

---

## Aufs iPhone holen

1. Deine Pages-Adresse in **Safari** öffnen. Nicht Chrome — nur Safari kann
   auf iOS zum Home-Bildschirm hinzufügen.
2. **Teilen → Zum Home-Bildschirm → Hinzufügen**.
3. Ab jetzt startet Leaner im Vollbild, ohne Adressleiste, mit eigenem Icon.

Auf dem MacBook: dieselbe Adresse in Safari, **Ablage → Zum Dock hinzufügen**.
Anmelden mit derselben E-Mail — der Fortschritt ist derselbe.

Zusammengeführt wird dabei nicht stur nach „wer zuletzt geschrieben hat".
XP und Zähler nehmen jeweils den höheren Wert, Badges werden vereinigt, und
die Tagesliste nur dann, wenn beide Geräte vom selben Tag sprechen. Wer abends
auf dem iPhone abhakt und morgens den Mac aufklappt, verliert nichts.

---

## Wenn du etwas änderst

1. Datei lokal bearbeiten und speichern.
2. Zu GitHub hochladen (Drag-and-drop oder `git push`).
3. Etwa eine Minute warten.
4. Auf dem iPhone die App **komplett schließen** (App-Umschalter, hochwischen)
   und neu öffnen. Sonst bedient dich der Service Worker aus dem Zwischenspeicher.

Bei größeren Änderungen an CSS oder JS die Zeile `const CACHE = 'leaner-v3'`
in `sw.js` hochzählen. Das erzwingt einen frischen Zwischenspeicher.

---

## Was nie ins Repository gehört

- Der **service_role** key aus Supabase
- Der **Anthropic-API-Key**
- Das Datenbank-Passwort

Alle drei leben ausschließlich in Supabase beziehungsweise in deinem
Passwortmanager. In `config.js` stehen nur die beiden öffentlichen Werte,
und das ist so vorgesehen.

Falls doch mal einer davon in einem Commit landet: Key sofort in der jeweiligen
Konsole zurückziehen und neu erzeugen. Aus der Git-Historie zu löschen reicht
nicht — er gilt als kompromittiert, sobald er einmal veröffentlicht war.

---

## Was danach möglich wird

Mit Konto und Backend sind Dinge erreichbar, die vorher nicht gingen:

- **Push-Erinnerungen.** Seit iOS 16.4 können Web-Apps auf dem Home-Bildschirm
  Mitteilungen schicken — in Safari-Tabs weiterhin nicht. Braucht VAPID-Schlüssel
  und einen zeitgesteuerten Job in Supabase.
- **Wochenrückblick**, den der Coach aus deinen echten Daten schreibt.
- **Rezepte aus der Datenbank** statt aus `data.js`, mit Einkaufsliste.
- **Body Doubling**: gemeinsame Timer-Sitzungen über Supabase Realtime.

Sag Bescheid, was davon als Nächstes dran ist.

---

## Quellen

- [Do Progressive Web Apps Work on iOS? The Complete Guide for 2026](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
