# Análisis de vuelos DJI — versión web

Web estática que genera el informe del vuelo **en el propio navegador**: no hay backend
ni se sube nada a ningún servidor. Complementa a la app portable de escritorio (que sigue igual).

## Qué hace

Sueltas el `.SRT` del vuelo (y opcionalmente el `.MP4`) y produce al instante:

- Portada con las cifras del vuelo.
- Ocho momentos clave (con fotogramas reales si añades el vídeo).
- Recorrido sobre imagen de satélite (Esri World Imagery) coloreado por altura.
- Gráficas interactivas: altitud, velocidad, distancia, ISO/temperatura de color.
- Orientación de la cámara (gimbal): inclinación estimada desde el cuaternión `pp_current`.
- Descarga de GPX / KML / CSV.

Todo el procesado ocurre en el cliente:

- **SRT** → parseo y cálculos (`js/srt.js`, puerto fiel de `src/extract.py`).
- **Satélite** → teselas Esri pedidas desde el navegador (`js/satmap.js`).
- **Fotogramas** → se recortan del MP4 con `<video>` + `<canvas>` (`js/frames.js`); el vídeo nunca sale del equipo.

## Probar en local

```bash
cd web
python3 -m http.server 8777
# abrir http://localhost:8777
```

(Hace falta servirlo por HTTP, no `file://`, porque usa módulos ES y `fetch` de teselas.)

## Desplegar (estático, gratis)

No hay build: se sube la carpeta `web/` tal cual.

- **Cloudflare Pages / Netlify**: arrastra la carpeta `web/` o conéctalo al repo (directorio raíz `web`, sin comando de build).
- **GitHub Pages**: publica el contenido de `web/` (rama `gh-pages` o carpeta `/web` en Settings → Pages).

## Notas

- La extracción de fotogramas depende de que el navegador sepa decodificar el códec del MP4
  (H.264 va en todos; HEVC/H.265 solo en algunos). Sin vídeo, el informe sale igual pero sin fotogramas.
- Las teselas de Esri World Imagery se usan solo para visualización, igual que en la app de escritorio.
