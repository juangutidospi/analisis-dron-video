#!/bin/bash
# Construye la app de escritorio portable (.app) con PyInstaller.
# Requiere el entorno .venv con pillow, imageio-ffmpeg y pyinstaller.
set -e
PRJ="$(cd "$(dirname "$0")" && pwd)"
cd "$PRJ"
source .venv/bin/activate

FFMPEG="$(python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
echo "ffmpeg a incrustar: $FFMPEG"

rm -rf build dist "Análisis Dron.spec"

pyinstaller --noconfirm --clean --windowed \
  --name "Analisis Dron" \
  --paths src \
  --add-data "assets:assets" \
  --add-data "src/report_template.html:." \
  --add-binary "$FFMPEG:." \
  --hidden-import common --hidden-import extract --hidden-import exports \
  --hidden-import satellite --hidden-import frames --hidden-import report \
  --hidden-import kmz --hidden-import pipeline \
  --hidden-import PIL.Image --hidden-import PIL.ImageDraw \
  --hidden-import xml.dom.minidom --hidden-import xml.parsers.expat \
  --hidden-import csv --hidden-import zipfile --hidden-import base64 \
  --osx-bundle-identifier "com.juangutidospi.analisisdron" \
  src/app.py

echo ""
echo "✅ App creada en: dist/Analisis Dron.app"
