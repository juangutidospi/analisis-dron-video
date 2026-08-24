// Grabador MP4 para el sobrevuelo 3D: codifica una secuencia de fotogramas con
// WebCodecs (H.264) y los empaqueta con el muxer MP4 estándar (mismo que el
// export del vídeo del dron), así el resultado es compatible con iOS/QuickTime.
// El componente 3D renderiza cada frame a un <canvas> y lo pasa a `encode()`.

import { createMp4 } from './mp4-muxer.js';

/** @returns {boolean} true si el navegador puede generar el vídeo (WebCodecs). */
export function canExportVideo() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

/**
 * Crea un grabador incremental: se le pasa un canvas por fotograma y al final
 * devuelve el MP4 como Blob. Los timestamps se derivan de `fps` (frames a ritmo
 * constante), independientes de lo que tarde en codificar cada uno.
 * @param {{width:number, height:number, fps?:number, bitrate?:number}} o
 */
export function createMp4Recorder({ width, height, fps = 30, bitrate }) {
  if (!canExportVideo()) throw new Error('WebCodecs no disponible');
  const W = width, H = height;
  const muxer = createMp4({ width: W, height: H });
  let needDesc = true, err = null, idx = 0;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { err = e; },
  });
  encoder.configure({
    codec: H > 1080 ? 'avc1.640033' : 'avc1.640028',
    width: W, height: H, bitrate: bitrate || 10_000_000,
    framerate: fps, latencyMode: 'realtime', avc: { format: 'avc' },
  });
  const usPerFrame = 1e6 / fps;

  return {
    /** Codifica un fotograma desde `canvas`. Un keyframe cada ~2 s. */
    async encode(canvas) {
      if (err) throw err;
      const frame = new VideoFrame(canvas, { timestamp: Math.round(idx * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: idx % (fps * 2) === 0 });
      frame.close(); idx++;
      // deja respirar al codificador si se acumula la cola (evita picos de memoria)
      if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
    },
    /** Vacía el codificador y devuelve el MP4 como Blob. */
    async finish() { await encoder.flush(); encoder.close(); if (err) throw err; return muxer.finalize(); },
    /** Aborta sin producir salida. */
    cancel() { try { encoder.close(); } catch { /* ya cerrado */ } },
    get frames() { return idx; },
  };
}
