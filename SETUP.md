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

Dann die beiden Werte holen:

**Project URL** — unter *Project Settings → Data API*.
Sieht aus wie `https://abcdefgh.supabase.co`.

> Nur diese Adresse, **ohne** `/rest/v1/` am Ende. Wenn du sie irgendwo mit
> angehängtem Pfad kopierst: alles ab `/rest` weglassen. Die Bibliothek hängt
> sich den Rest selbst an.

**Publishable key** — unter *Project Settings → API Keys*.
Beginnt mit `sb_publishable_`.

> Falls du nach einem „anon key" suchst: den gibt es unter dem Namen nicht mehr.
> Supabase hat ihn 2025 in **Publishable key** umbenannt, der alte wird bis Ende
> 2026 abgeschaltet. Ältere Projekte zeigen beide nebeneinander — nimm dann den
> mit `sb_publishable_`. Wenn noch keiner da ist: **Create new API keys** klicken.

Beide in `config.js` eintragen:

```js
const CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_KEY: 'sb_publishable_…',
  CLOUD: true
};
```

Diese zwei Werte dürfen öffentlich sein. Der Publishable key sagt nur „diese
Anfrage kommt aus der App". Was jemand damit tatsächlich sehen darf, entscheiden
die Regeln aus Schritt 4.

> Der **Secret key** (`sb_secret_…`, früher `service_role`) im selben Menü darf
> dagegen nirgendwo hin außer in Supabase selbst. Der hebelt alle Regeln aus.

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

## Schritt 5 — Anmeldung einschalten

Die App ist auf **E-Mail und Passwort** eingestellt. Der Grund ist praktischer
Natur: Supabase verschickt dabei keine einzige Mail, also brauchst du weder
eigenen Mailversand noch angepasste Vorlagen.

Der naheliegende Weg — ein Link per Mail — funktioniert auf dem iPhone ohnehin
nicht gut: Ein Link öffnet Safari und nicht deine installierte App, und die
beiden teilen sich keine Anmeldung. Und seit Juni 2026 lässt Supabase bei neuen
Projekten die Mailvorlagen nur noch mit eigenem SMTP-Versand anpassen.

Eine einzige Einstellung ist nötig:

1. **Authentication → Sign In / Providers → Email**
2. **Confirm email** ausschalten.
3. Speichern.

Ohne diesen Schritt wartet die Registrierung auf eine Bestätigungsmail, die
mangels Mailversand nie ankommt.

> Warum das hier vertretbar ist: Die Bestätigungsmail soll normalerweise
> verhindern, dass jemand ein Konto auf eine fremde Adresse anlegt. Bei einer
> App, die nur du benutzt, gibt es niemanden, dem das schaden könnte. Sobald
> andere Leute dazukommen, schaltest du sie wieder ein — dann brauchst du
> ohnehin den Mailversand aus Schritt 5b.

**Jetzt testbar:** `config.js` mit deinen echten Werten zu GitHub hochladen,
eine Minute warten, deine Pages-Adresse aufrufen. Unten auf *Konto anlegen*,
E-Mail eintragen, Passwort vom Passwortmanager erzeugen lassen — du bist drin.
Dein Fortschritt liegt ab sofort in deinem Konto. Der Coach antwortet noch nach
Regeln, das kommt in Schritt 6 und 7.

---

## Schritt 5b — Optional: Code per Mail statt Passwort

Erst relevant, wenn du kein Passwort willst, Erinnerungsmails planst oder
weitere Leute die App nutzen sollen. Sonst überspringen.

**Eigenen Mailversand einrichten.** Der eingebaute Versand von Supabase ist auf
2 Mails pro Stunde begrenzt und liefert nur an Adressen aus deinem eigenen Team.
Dein STRATO-Postfach löst beides — du brauchst kein weiteres Konto.

1. Bei STRATO im Kundenbereich ein Postfach anlegen, zum Beispiel
   `leaner@deine-domain.de`. Ein eigenes Postfach ist besser als deine
   Hauptadresse: Du kannst das Passwort jederzeit tauschen, ohne dass dein
   privater Mailverkehr betroffen ist.
2. In Supabase unter **Project Settings → Authentication → SMTP Settings**
   den eigenen Versand einschalten und eintragen:

| Feld | Wert |
|---|---|
| Host | `smtp.strato.de` |
| Port | `465` |
| Username | die vollständige Adresse, z. B. `leaner@deine-domain.de` |
| Password | das Passwort **dieses Postfachs** (nicht dein STRATO-Kundenpasswort) |
| Sender email | dieselbe Adresse wie der Username |
| Sender name | `Leaner` |

3. Speichern, dann unter **Authentication → Rate Limits** das Limit für
   E-Mails hochsetzen. Nach dem Umstellen auf eigenen Versand steht es
   zunächst bei 30 pro Stunde.

**Wenn es nicht durchgeht:**

- Port `587` statt `465` versuchen. STRATO nennt 465 als Standard für
  Mailprogramme, manche Serverdienste kommen mit 587 besser klar.
- Absenderadresse muss exakt dem Postfach entsprechen, sonst weist STRATO
  die Mail ab.
- Frisch angelegte STRATO-Postfächer stehen 30 Tage im Probestatus und dürfen
  maximal 100 Mails pro Stunde verschicken. Für Login-Codes ist das reichlich.
- Landen Mails im Spam: bei STRATO prüfen, ob für die Domain **DKIM** aktiv ist.
  SPF ist bei STRATO-gehosteten Domains in der Regel schon gesetzt.

**Danach die Vorlage umstellen.** Unter **Authentication → Emails** die Vorlage
*Magic Link or OTP* öffnen und ersetzen durch:

```html
<h2>Dein Code für Leaner</h2>
<p>Gib diesen Code in der App ein:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:600">{{ .Token }}</p>
<p>Der Code gilt eine Stunde. Wenn du ihn nicht angefordert hast, ignorier diese Mail.</p>
```

Entscheidend ist `{{ .Token }}`: Steht dort `{{ .ConfirmationURL }}`, verschickt
Supabase einen Link — mit `{{ .Token }}` einen Zahlencode.

**Zuletzt in `config.js`** umstellen:

```js
AUTH_MODE: 'code'
```

Die App zeigt dann statt der Passwortmaske die Codeeingabe. Ob dein Projekt
sechs oder acht Ziffern verschickt, steht unter *Authentication → Emails*; die
App nimmt beides an.

---

## Schritt 6 — Anthropic-API-Key

> **Ein Claude-Pro-Abo hilft hier nicht.** Das Abo gilt für die Claude-Apps und
> Claude Code, nicht für API-Zugriffe aus eigenen Anwendungen. Abo und API sind
> getrennte Systeme mit getrennter Abrechnung — du brauchst zusätzlich ein
> API-Guthaben. Ärgerlich, aber daran führt kein Weg vorbei.

1. Auf [console.anthropic.com](https://console.anthropic.com) ein Konto anlegen.
   Dieselbe E-Mail wie beim Abo geht, es bleiben trotzdem getrennte Konten.
2. Unter **Billing** ein Guthaben einrichten. Fang klein an, 5 $ reichen lange.

   Zur Einordnung: Eine Coach-Antwort kostet ungefähr einen Cent. Bei zehn
   Fragen am Tag sind das rund 3 $ im Monat — realistisch deutlich weniger,
   weil man einen Coach nicht täglich zehnmal fragt. Wer das noch drücken will,
   ändert in `supabase/functions/coach/index.ts` die Zeile
   `const MODEL = 'claude-sonnet-5'` auf `'claude-haiku-4-5-20251001'`.
   Spürbar günstiger, spürbar knapper in den Antworten.
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

## Schritt 8 — Rezepte, eigene Zutaten und Produktsuche

Diese beiden Schritte kamen später dazu. Ohne sie läuft die App weiter,
eigene Rezepte bleiben dann aber im alten JSON-Block und die Produktsuche
liefert nichts.

**Tabellen anlegen.** In Supabase → **SQL Editor** → **New query** →
kompletten Inhalt von `supabase/schema-2.sql` einfügen → **Run**.

Das legt drei Tabellen an: `recipes` für deine Rezepte, `custom_foods` für
eigene und übernommene Zutaten, `off_cache` als Zwischenspeicher für
Produktdaten. Alle mit Row Level Security, `off_cache` sogar ganz ohne
Client-Zugriff — dort schreibt nur die Edge Function.

Beim ersten Start nach dem Update wandern vorhandene eigene Rezepte
selbsttätig in die neue Tabelle. Doppelte Einträge sind ausgeschlossen,
auch wenn der Umzug mehrfach anläuft.

**Produktsuche veröffentlichen.** In Supabase → **Edge Functions** →
**Deploy a new function** → *via Editor*, Name exakt `foodsearch`, den Inhalt
von `supabase/functions/foodsearch/index.ts` einfügen → **Deploy**.

Oder im Terminal:

```bash
npx supabase functions deploy foodsearch
```

Ein zusätzliches Secret braucht es nicht — die Funktion nutzt die Schlüssel,
die Supabase ohnehin bereitstellt. Falls der Zwischenspeicher nicht greift,
steht der Grund unter **Edge Functions → foodsearch → Logs**.

> **Warum die Suche über den Server läuft:** Open Food Facts bittet darum,
> dass sich Anwendungen im User-Agent zu erkennen geben — genau dieses Feld
> darf ein Browser nicht setzen. Außerdem sind dort nur zehn Suchanfragen pro
> Minute erlaubt, was beim Tippen sofort erreicht wäre. Der gemeinsame
> Zwischenspeicher hält Ergebnisse 30 Tage.

---

## Schritt 9 — Fotos

**Tabellen und Speicherort anlegen.** SQL Editor → Inhalt von
`supabase/schema-3.sql` → **Run**.

Das legt den Speicherbereich `photos` an, hängt Bildspalten an die
bestehenden Tabellen und erstellt `progress_photos`.

Der Speicherbereich ist **privat**. Jede Datei liegt unter deiner
Kennung, und die Zugriffsregeln vergleichen den ersten Ordnernamen mit
der angemeldeten Kennung. Angezeigt werden Bilder über Links, die eine
Stunde gelten und die App bei Bedarf erzeugt. Selbst wer den
öffentlichen Schlüssel hat, kommt an keine fremden Fotos.

**Prüfen:** Unter **Storage** muss jetzt ein Bereich `photos` stehen,
mit *Public* auf *off* und einer Größenbegrenzung von 5 MB.

Danach in der App: Rezept anlegen → **Foto aufnehmen oder auswählen**.
Nach dem Speichern erscheint kurz die Dateigröße — bei einem
iPhone-Foto sollten dort um die 130 KB stehen. Steht dort deutlich
mehr, hat das Verkleinern nicht gegriffen.

> Der kostenlose Speicher bei Supabase liegt bei 1 GB. Bei rund 130 KB
> pro Bild sind das etwa siebentausend Fotos.

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

## Änderungen veröffentlichen

Drag-and-drop im Browser funktioniert, hat aber zwei Tücken: Man vergisst leicht
eine Datei, und die Versionsnummer muss man von Hand an drei Stellen hochzählen.
Beides hat uns beim Einrichten Stunden gekostet.

Deshalb einmal Git einrichten — danach ist Veröffentlichen ein Befehl.

### Einmalige Einrichtung

**Weg A — mit GitHub Desktop, ohne Terminal**

1. [GitHub Desktop](https://desktop.github.com) laden und mit deinem Konto anmelden.
2. **File → Add Local Repository** → den Ordner `leaner` auswählen.
   Falls „not a git repository" erscheint: auf **create a repository** klicken.
3. **Publish repository** → Name `leaner`, Haken bei *Keep this code private*
   **entfernen** (GitHub Pages braucht ein öffentliches Repository im Gratistarif).

Ab dann: Änderungen erscheinen links in der Liste, unten eine kurze Beschreibung
eintippen, **Commit to main**, dann **Push origin**.

**Weg B — im Terminal**

```bash
# Einmalig: GitHub-Anmeldung über den Browser
brew install gh
gh auth login          # "GitHub.com" → "HTTPS" → im Browser bestätigen

cd ~/Documents/Privatprojekte/leaner
git init
git add -A
git commit -m "Leaner"
git branch -M main
git remote add origin https://github.com/ono3589/leaner.git
git push -u origin main
chmod +x deploy.sh
```

`gh auth login` bestätigt die Anmeldung im Browser — du musst nirgends ein
Passwort oder einen Token abtippen.

### Danach: veröffentlichen

```bash
./deploy.sh
```

Das Skript zählt die Versionsnummer in `index.html`, `app.js` und `sw.js`
gemeinsam hoch, prüft, ob das überall gegriffen hat, warnt wenn `config.js`
noch Platzhalter enthält, und lädt alles hoch. Mit eigener Beschreibung:

```bash
./deploy.sh "Rezept-Editor und Nutri-Score"
```

Danach etwa eine Minute warten, auf dem iPhone die App komplett schließen
(App-Umschalter, hochwischen) und neu öffnen. Unten im Profil muss die neue
Versionsnummer stehen. Steht dort eine andere, hilft
**Profil → Zwischenspeicher leeren**.

> **Warum die Versionsnummer nötig ist:** GitHub Pages erlaubt Browsern, Dateien
> zehn Minuten zu behalten. Ohne das `?v=` lädt dein Browser trotz Neuladen die
> alte `app.js` oder `config.js` — und du suchst einen Fehler, den es längst
> nicht mehr gibt.

### Wenn du doch von Hand hochlädst

Dann müssen **alle** geänderten Dateien mit, und die Versionsnummer muss an allen
drei Stellen dieselbe sein. Eine vergessene Datei ist der häufigste Grund dafür,
dass eine Änderung scheinbar nichts bewirkt.

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
