#!/bin/bash
# Genera informe HTML + KMZ + GPX/KML/CSV de un vuelo DJI a partir de su .SRT (y su .MP4).
# Uso:  ./generar.sh  ruta/al/vuelo.SRT  [ruta/al/vuelo.MP4]
#   - Si no se indica el MP4, se busca uno con el mismo nombre junto al SRT.
#   - Sin MP4 solo se generan GPX/KML/CSV (el informe y el KMZ necesitan el vídeo).
set -e

PRJ="$(cd "$(dirname "$0")" && pwd)"
SRT="$1"
if [ -z "$SRT" ] || [ ! -f "$SRT" ]; then
  echo "Uso: ./generar.sh  vuelo.SRT  [vuelo.MP4]"; exit 1
fi
BASE="$(basename "$SRT")"; BASE="${BASE%.*}"          # nombre sin extensión
MP4="$2"
[ -z "$MP4" ] && MP4="${SRT%.*}.MP4"                   # deducir MP4 hermano
[ -f "$MP4" ] || MP4="${SRT%.*}.mp4"

export SRT MP4 BASE
export WORK="$PRJ/trabajo/$BASE"
export OUT="$PRJ/outputs/$BASE"
export ASSETS="$PRJ/assets"
export TEMPLATE="$PRJ/src/report_template.html"
export CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$WORK" "$OUT"

echo "▶ Vuelo: $BASE"
echo "· Telemetría…";  python3 "$PRJ/src/extract.py"
echo "· GPX/KML/CSV…"; python3 "$PRJ/src/exports.py"

if [ -f "$MP4" ]; then
  echo "· Satélite…";  python3 "$PRJ/src/satellite.py"
  echo "· Fotogramas…"; python3 "$PRJ/src/frames.py"
  echo "· Informe HTML…"; python3 "$PRJ/src/report.py"
  echo "· Google Earth (KMZ)…"; python3 "$PRJ/src/kmz.py"
else
  echo "⚠ No se encontró el MP4 ($MP4): omito informe y KMZ (solo GPX/KML/CSV)."
fi

echo ""
echo "✅ Listo. Archivos en: outputs/$BASE/"
ls -lh "$OUT" | tail -n +2 | awk '{print "   "$9"  ("$5")"}'
