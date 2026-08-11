# Análisis de vuelos DJI

Genera, a partir del archivo `.SRT` de telemetría de un vuelo DJI (y su `.MP4`),
un paquete completo de análisis:

- **Informe HTML** cinematográfico y autónomo (funciona sin conexión, en móvil y
  escritorio): portada con foto real, resumen, galería de momentos clave con
  fotogramas del vídeo, **mapa de satélite real** con el recorrido, gráficas
  interactivas (táctiles), tira de evolución de la luz y tema claro/oscuro.
- **KMZ** para Google Earth: vuelo animado en 3D, muros de altitud, puntos clave
  con el fotograma del vídeo y tarjetas estilizadas.
- **GPX** enriquecido (velocidad, rumbo y waypoints) para Strava/Garmin.
- **KML** simple del recorrido.
- **CSV** con todos los fotogramas y sus datos.

## Uso

```bash
./generar.sh  "ruta/al/vuelo.SRT"  ["ruta/al/vuelo.MP4"]
```

- Si no indicas el `.MP4`, se busca uno con el mismo nombre junto al `.SRT`.
- Sin `.MP4` solo se generan GPX/KML/CSV (el informe y el KMZ necesitan el vídeo).
- Los resultados aparecen en **`outputs/<nombre-del-vuelo>/`** (una carpeta por vuelo).

Ejemplo:

```bash
./generar.sh "/Users/tu/Desktop/videos dron/DJI_20260809192425_0132_D.SRT"
```

Puedes cambiar el título del informe con la variable `TITULO`:

```bash
TITULO="Vuelo sobre el Duero" ./generar.sh vuelo.SRT
```

## Requisitos (macOS)

Ya vienen en el sistema o se instalan una vez:

- **Python 3** (incluido en macOS)
- **ffmpeg** — extrae fotogramas del vídeo (`brew install ffmpeg`)
- **Google Chrome** — une las teselas de satélite y renderiza el sparkline
- **curl** y **sips** (incluidos en macOS)

## Retocar el diseño

- **Informe:** edita `src/report_template.html` (estilos, textos, secciones) y
  vuelve a ejecutar `generar.sh`.
- **KMZ:** edita `src/kmz.py`.
- Los iconos del KMZ están en `assets/iconos/` (no hace falta regenerarlos).

## Estructura

```
analisis-dron/
├── generar.sh              ← comando principal
├── README.md
├── assets/iconos/          ← iconos del KMZ (estáticos)
├── src/
│   ├── common.py           ← utilidades y puntos clave del vuelo
│   ├── extract.py          ← SRT → telemetría (data.json)
│   ├── frames.py           ← MP4 → fotogramas + portada + sparkline
│   ├── satellite.py        ← descarga la imagen de satélite (Esri)
│   ├── report.py           ← informe HTML
│   ├── report_template.html
│   ├── kmz.py              ← Google Earth (KMZ)
│   └── exports.py          ← GPX / KML / CSV
├── trabajo/                ← archivos intermedios por vuelo (se pueden borrar)
└── outputs/<vuelo>/         ← resultados finales (una carpeta por vuelo)
```

## Notas

- La imagen de satélite usa **Esri World Imagery** (gratuita, sin clave). Se
  descarga al generar y se incrusta en el informe, que sigue siendo un único
  archivo autónomo.
- Las horas del `.SRT` son locales (CEST, UTC+2); en el GPX se convierten a UTC.
- El GPS del DJI se refresca ~cada 0,5 s: velocidades y distancias se calculan en
  esas ventanas para evitar el ruido del receptor.
