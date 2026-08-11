#!/bin/bash
# Genera informe HTML + KMZ + GPX/KML/CSV de un vuelo DJI a partir de su .SRT (y su .MP4).
# Uso:  ./generar.sh  ruta/al/vuelo.SRT  [ruta/al/vuelo.MP4]
#   - Si no se indica el MP4, se busca uno con el mismo nombre junto al SRT.
#   - Sin MP4 solo se generan GPX/KML/CSV (el informe y el KMZ necesitan el vídeo).
#   - Resultados en outputs/<nombre-del-vuelo>/
set -e
PRJ="$(cd "$(dirname "$0")" && pwd)"
SRT="$1"
if [ -z "$SRT" ] || [ ! -f "$SRT" ]; then
  echo "Uso: ./generar.sh  vuelo.SRT  [vuelo.MP4]"; exit 1
fi
PY="$PRJ/.venv/bin/python"
if [ ! -x "$PY" ]; then
  echo "Falta el entorno .venv. Créalo con:"
  echo "  python3 -m venv .venv && source .venv/bin/activate && pip install pillow imageio-ffmpeg"
  exit 1
fi
"$PY" "$PRJ/src/pipeline.py" "$SRT" "${2:-}"
