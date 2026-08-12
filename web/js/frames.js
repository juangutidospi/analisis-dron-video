// Extracción de fotogramas del MP4 en el propio navegador con <video> + <canvas>.
// El vídeo nunca sale del equipo: se lee con un object URL local y se descarta al terminar.

/**
 * Extrae fotogramas JPEG (dataURL) en los tiempos dados de un archivo de vídeo.
 * @param {File} file archivo MP4/MOV
 * @param {number[]} times segundos a capturar
 * @param {(p:number)=>void} onProgress 0..1
 * @param {number} maxW ancho máximo de salida
 * @param {number} quality calidad JPEG (0..1)
 * @returns {Promise<string[]>} dataURLs alineados con `times`
 */
export async function grabFrames(file, times, onProgress = () => {}, maxW = 1600, quality = 0.9) {
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
      out.push(canvas.toDataURL('image/jpeg', quality));
      onProgress((i + 1) / times.length);
    }
    return out;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

/**
 * Extrae un solo fotograma a resolución nativa del vídeo como Blob (usa toBlob
 * para evitar cadenas gigantes en 4K). PNG sin pérdidas o JPEG de alta calidad.
 * @param {File} file @param {number} secs
 * @param {string} [type='image/png'] MIME de salida
 * @param {number} [quality] calidad JPEG (0..1); ignorado en PNG
 * @returns {Promise<Blob>}
 */
export async function grabFullFrame(file, secs, type = 'image/png', quality) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await withTimeout(once(v, 'loadedmetadata'), 20000);
    try { await v.play(); v.pause(); } catch (_) {}
    const cw = v.videoWidth, ch = v.videoHeight;
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d').drawImage(v, 0, 0, cw, ch);
    const t = Math.max(0, Math.min((v.duration || 1e9) - 0.05, secs));
    await seek(v, t);
    canvas.getContext('2d').drawImage(v, 0, 0, cw, ch);
    const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
    if (!blob) throw new Error('No se pudo codificar el fotograma.');
    return blob;
  } finally {
    v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
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
