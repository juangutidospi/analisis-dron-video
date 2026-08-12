// Extracción de fotogramas del MP4 en el propio navegador con <video> + <canvas>.
// El vídeo nunca sale del equipo: se lee con un object URL local y se descarta al terminar.

/**
 * Extrae fotogramas JPEG (dataURL) en los tiempos dados de un archivo de vídeo.
 * @param {File} file archivo MP4/MOV
 * @param {number[]} times segundos a capturar
 * @param {(p:number)=>void} onProgress 0..1
 * @param {number} maxW ancho máximo de salida
 * @param {number} quality calidad JPEG (0..1)
 * @param {string} type tipo MIME de salida ('image/jpeg' | 'image/png')
 * @returns {Promise<string[]>} dataURLs alineados con `times`
 */
export async function grabFrames(file, times, onProgress = () => {}, maxW = 1600, quality = 0.9, type = 'image/jpeg') {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await once(v, 'loadedmetadata');
    // algunos navegadores necesitan un play/pause para poder hacer seek fiable
    try { await v.play(); v.pause(); } catch (_) {}
    const scale = Math.min(1, maxW / (v.videoWidth || maxW));
    const cw = Math.round((v.videoWidth || maxW) * scale), ch = Math.round((v.videoHeight || maxW * 9 / 16) * scale);
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const out = [];
    for (let i = 0; i < times.length; i++) {
      const t = Math.max(0, Math.min((v.duration || 1e9) - 0.05, times[i]));
      await seek(v, t);
      ctx.drawImage(v, 0, 0, cw, ch);
      out.push(canvas.toDataURL(type, quality));
      onProgress((i + 1) / times.length);
    }
    return out;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

/**
 * Extrae un solo fotograma a resolución nativa del vídeo, sin pérdidas (PNG),
 * para descargar en la máxima calidad posible (limitada por el propio códec del vídeo).
 * @param {File} file @param {number} secs @returns {Promise<string>} dataURL PNG
 */
export async function grabFullFrame(file, secs) {
  const [url] = await grabFrames(file, [secs], () => {}, 1e9, 1, 'image/png');
  return url;
}

function once(target, ev) {
  return new Promise((res, rej) => {
    const ok = () => { cleanup(); res(); };
    const err = () => { cleanup(); rej(new Error('No se pudo leer el vídeo (¿códec no soportado por el navegador?).')); };
    const cleanup = () => { target.removeEventListener(ev, ok); target.removeEventListener('error', err); };
    target.addEventListener(ev, ok, { once: true }); target.addEventListener('error', err, { once: true });
  });
}

function seek(v, t) {
  return new Promise((res, rej) => {
    let done = false;
    const ok = () => { if (done) return; done = true; v.removeEventListener('seeked', ok); res(); };
    v.addEventListener('seeked', ok);
    // salvavidas por si 'seeked' no dispara
    const to = setTimeout(ok, 1500);
    v.currentTime = t;
    const clear = () => clearTimeout(to);
    v.addEventListener('seeked', clear, { once: true });
  });
}
