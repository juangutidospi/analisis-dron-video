// Filtros de color para el vídeo (estilo edición móvil). Cada efecto combina:
//  1) una cadena de filtros CSS (color/contraste/saturación…), aplicada en la
//     previsualización al <video> y en la exportación al canvas (ctx.filter);
//  2) una segunda capa opcional de superposiciones (halo de color, degradado,
//     viñeta, grano) que se dibuja sobre el vídeo y bajo el HUD.

/** Presets: filtro CSS + capas de superposición. */
export const FX = {
  none: { filter: '', layers: [] },
  vivid: { filter: 'saturate(1.5) contrast(1.12)', layers: [] },
  sunset: {
    filter: 'sepia(0.3) saturate(1.35) contrast(1.04) brightness(1.04) hue-rotate(-8deg)',
    layers: [{ type: 'gradient', mode: 'soft-light', stops: [[0, 'rgba(255,120,40,0.40)'], [0.55, 'rgba(255,180,90,0.10)'], [1, 'rgba(120,90,160,0.14)']] }],
  },
  warm: { filter: 'sepia(0.18) saturate(1.2) brightness(1.05)', layers: [{ type: 'color', mode: 'soft-light', color: 'rgba(255,170,80,0.14)' }] },
  cool: { filter: 'saturate(1.1) contrast(1.05) hue-rotate(12deg) brightness(1.02)', layers: [{ type: 'color', mode: 'soft-light', color: 'rgba(60,130,255,0.16)' }] },
  sepia: { filter: 'sepia(0.65) contrast(1.05) brightness(1.02)', layers: [{ type: 'vignette', strength: 0.35 }] },
  bw: { filter: 'grayscale(1) contrast(1.14)', layers: [{ type: 'vignette', strength: 0.42 }] },
  vintage: {
    filter: 'sepia(0.4) saturate(0.82) contrast(0.92) brightness(1.08)',
    layers: [{ type: 'gradient', mode: 'soft-light', stops: [[0, 'rgba(255,180,90,0.14)'], [1, 'rgba(70,50,90,0.16)']] }, { type: 'vignette', strength: 0.45 }, { type: 'grain', alpha: 0.09 }],
  },
  drama: { filter: 'contrast(1.35) saturate(1.1) brightness(0.96)', layers: [{ type: 'vignette', strength: 0.5 }] },
};

/** Orden de los efectos para el selector. */
export const FX_KEYS = ['none', 'vivid', 'sunset', 'warm', 'cool', 'sepia', 'bw', 'vintage', 'drama'];

/** Cadena de filtros CSS de un efecto. */
export const fxFilter = (key) => FX[key]?.filter || '';

let _grain;
function grainCanvas() {
  if (_grain) return _grain;
  const s = 128, c = document.createElement('canvas'); c.width = s; c.height = s;
  const g = c.getContext('2d'), id = g.createImageData(s, s);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); _grain = c; return c;
}
let _grainUri;
/** data: URI del patrón de grano, para la previsualización. */
export const grainDataUri = () => (_grainUri || (_grainUri = grainCanvas().toDataURL()));

/** Dibuja la segunda capa de un efecto (halo, degradado, viñeta, grano) en el canvas. */
export function paintFxLayers(ctx, W, H, key) {
  const layers = FX[key]?.layers; if (!layers?.length) return;
  for (const L of layers) {
    ctx.save();
    if (L.type === 'color') { ctx.globalCompositeOperation = L.mode; ctx.fillStyle = L.color; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'gradient') { ctx.globalCompositeOperation = L.mode; const g = ctx.createLinearGradient(0, 0, 0, H); for (const [o, col] of L.stops) g.addColorStop(o, col); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'vignette') { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${L.strength})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else if (L.type === 'grain') { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = L.alpha; const ox = Math.random() * 128 | 0, oy = Math.random() * 128 | 0; ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat'); ctx.translate(-ox, -oy); ctx.fillRect(ox, oy, W, H); }
    ctx.restore();
  }
}
