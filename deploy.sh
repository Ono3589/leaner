#!/bin/bash
# ============================================================
# Leaner — veröffentlichen
#
#   ./deploy.sh              Version hochzählen und pushen
#   ./deploy.sh "Nachricht"  dasselbe mit eigener Commit-Nachricht
#
# Zählt die Versionsnummer an allen drei Stellen hoch, die
# zusammenpassen müssen, und lädt anschließend alles hoch.
# Damit kann keine Datei mehr vergessen werden — genau der
# Fehler, der uns beim Einrichten Stunden gekostet hat.
# ============================================================

set -e
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "Hier ist noch kein Git-Repository."
  echo "Einmalig einrichten — siehe SETUP.md, Abschnitt \"Änderungen veröffentlichen\"."
  exit 1
fi

# --- Aktuelle Version aus sw.js lesen und um eins erhöhen ---
CURRENT=$(perl -ne 'print $1 if /leaner-v(\d+)/' sw.js)
if [ -z "$CURRENT" ]; then
  echo "Konnte die Version in sw.js nicht finden."
  exit 1
fi
NEXT=$((CURRENT + 1))
TODAY=$(date +%d.%m.%Y)

echo "Version $CURRENT  ->  $NEXT"

# --- An allen drei Stellen setzen ---
# perl statt sed, weil sed auf macOS und Linux unterschiedlich funktioniert
perl -pi -e "s/\?v=\d+/?v=$NEXT/g"                            index.html
perl -pi -e "s/const BUILD = '\d+ · [^']*'/const BUILD = '$NEXT · $TODAY'/" app.js
perl -pi -e "s/leaner-v\d+/leaner-v$NEXT/"                    sw.js

# --- Kontrolle: hat alles gegriffen? ---
COUNT=$(grep -c "?v=$NEXT" index.html || true)
echo "index.html: $COUNT Verweise auf Version $NEXT"
grep -q "leaner-v$NEXT" sw.js   || { echo "sw.js wurde nicht angepasst"; exit 1; }
grep -q "BUILD = '$NEXT" app.js || { echo "app.js wurde nicht angepasst"; exit 1; }

# --- Warnen, wenn die Konfiguration noch Platzhalter enthält ---
if grep -q "HIER_DEIN" config.js; then
  echo
  echo "Achtung: config.js enthält noch Platzhalter."
  echo "Ohne echte Werte gibt es in der App keinen Login und keinen Sync."
  read -p "Trotzdem hochladen? [j/N] " -n 1 -r
  echo
  [[ $REPLY =~ ^[jJyY]$ ]] || exit 1
fi

# --- Hochladen ---
MSG="${1:-Version $NEXT}"
git add -A
if git diff --cached --quiet; then
  echo "Keine Änderungen zum Hochladen."
  exit 0
fi
git commit -m "$MSG"
git push

echo
echo "Fertig. Version $NEXT ist unterwegs."
echo "In etwa einer Minute unter deiner Pages-Adresse."
echo "Auf dem iPhone die App komplett schließen und neu öffnen."
echo "Im Profil ganz unten muss dann Version $NEXT stehen."
