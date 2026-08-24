// Grabador MP4 para el sobrevuelo 3D: codifica una secuencia de fotogramas con
// WebCodecs (H.264) y los empaqueta con el muxer MP4 estándar (mismo que el
// export del vídeo del dron), así el resultado es compatible con iOS/QuickTime.
// El componente 3D renderiza cada frame a un <canvas> y lo pasa a `encode()`.
//
// Dos grabadores con la misma interfaz (encode/finish/cancel/frames):
//  - createMp4Recorder(): acumula el MP4 en RAM (Blobs) y lo devuelve en finish().
//  - createMp4StreamRecorder(): transmite el MP4 a disco (File System Access) según
//    codifica; en RAM solo queda metadata, así un vuelo largo a 1080p no agota la
//    memoria de la pestaña. finish() no devuelve nada: el fichero ya está en disco.

import { createMp4, createMp4Stream } from './mp4-muxer.js';

/** @returns {boolean} true si el navegador puede generar el vídeo (WebCodecs). */
export function canExportVideo() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

/**
 * Crea y configura el VideoEncoder H.264, redirigiendo cada chunk (y la primera
 * `decoderConfig.description`) a `muxer`. Compartido por ambos grabadores.
 * @param {{width:number,height:number,fps:number,bitrate?:number,muxer:{setDescription:Function,addSample:Function}}} o
 * @returns {{encoder:VideoEncoder, getErr:()=>Error|null}}
 */
// Máximo de fotogramas admitidos en la cola de entrada del codificador. Cada
// VideoFrame encolado retiene una imagen respaldada en GPU/RAM, así que un tope
// bajo mantiene el pico de memoria plano aunque el vuelo dure minutos.
const MAX_QUEUE = 2;

/**
 * Contrapresión REAL: espera hasta que la cola del codificador baje del tope,
 * cediendo el hilo entre comprobaciones. Sin esto, un bucle que codifica más
 * rápido de lo que el encoder consume acumula VideoFrames sin límite y agota la
 * memoria de vídeo (peta la pestaña y arrastra al equipo). Prefiere el evento
 * `dequeue` si el navegador lo expone; si no, sondea con un respiro corto.
 * @param {VideoEncoder} encoder
 */
async function awaitQueue(encoder) {
  while (encoder.encodeQueueSize > MAX_QUEUE) {
    await new Promise((r) => {
      let done = false;
      const finish = () => { if (done) return; done = true; encoder.removeEventListener?.('dequeue', finish); clearTimeout(tid); r(); };
      encoder.addEventListener?.('dequeue', finish, { once: true });
      const tid = setTimeout(finish, 8); // red de seguridad si no hay evento `dequeue`
    });
  }
}

function buildEncoder({ width, height, fps, bitrate, muxer }) {
  let needDesc = true, err = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { err = e; },
  });
  encoder.configure({
    codec: height > 1080 ? 'avc1.640033' : 'avc1.640028',
    width, height, bitrate: bitrate || 10_000_000,
    // modo 'quality': el codificador analiza y reparte los bits con más criterio
    // (a diferencia de 'realtime', pensado para videollamadas), así el mismo aspecto
    // cabe en menos bitrate → menos peso a igual calidad. La contrapresión de la cola
    // absorbe que codifique algo más lento.
    framerate: fps, latencyMode: 'quality', avc: { format: 'avc' },
  });
  return { encoder, getErr: () => err };
}

/**
 * Grabador incremental que acumula el MP4 en RAM. Los timestamps se derivan de
 * `fps` (frames a ritmo constante), independientes de lo que tarde en codificar
 * cada uno. finish() devuelve el MP4 como Blob.
 * @param {{width:number, height:number, fps?:number, bitrate?:number}} o
 */
export function createMp4Recorder({ width, height, fps = 30, bitrate }) {
  if (!canExportVideo()) throw new Error('WebCodecs no disponible');
  const W = width, H = height;
  const muxer = createMp4({ width: W, height: H });
  const { encoder, getErr } = buildEncoder({ width: W, height: H, fps, bitrate, muxer });
  const usPerFrame = 1e6 / fps;
  let idx = 0;

  return {
    /** Codifica un fotograma desde `canvas`. Un keyframe cada ~2 s. */
    async encode(canvas) {
      if (getErr()) throw getErr();
      const frame = new VideoFrame(canvas, { timestamp: Math.round(idx * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: idx % (fps * 2) === 0 });
      frame.close(); idx++;
      // contrapresión real: no seguir hasta que el codificador drene la cola
      await awaitQueue(encoder);
    },
    /** Vacía el codificador y devuelve el MP4 como Blob. */
    async finish() { await encoder.flush(); encoder.close(); if (getErr()) throw getErr(); return muxer.finalize(); },
    /** Aborta sin producir salida. */
    cancel() { try { encoder.close(); } catch { /* ya cerrado */ } },
    get frames() { return idx; },
  };
}

/**
 * Grabador incremental que transmite el MP4 a disco según codifica, vía un `sink`
 * (envoltorio sobre un FileSystemWritableFileStream). En RAM solo queda metadata
 * de las muestras, así que el pico de memoria es plano sin importar la duración.
 * Aplica backpressure: espera a que se vacíe la escritura a disco entre frames.
 * finish() no devuelve nada — al terminar, el fichero ya está escrito y cerrado.
 * @param {{width:number, height:number, fps?:number, bitrate?:number, sink:{write:Function,close:Function}}} o
 */
export function createMp4StreamRecorder({ width, height, fps = 30, bitrate, sink }) {
  if (!canExportVideo()) throw new Error('WebCodecs no disponible');
  const W = width, H = height;
  const muxer = createMp4Stream({ width: W, height: H, sink });
  const { encoder, getErr } = buildEncoder({ width: W, height: H, fps, bitrate, muxer });
  const usPerFrame = 1e6 / fps;
  let idx = 0;

  return {
    /** Codifica un fotograma desde `canvas` y espera a que la escritura a disco
     *  alcance (backpressure), para no acumular buffers pendientes en RAM. */
    async encode(canvas) {
      if (getErr()) throw getErr();
      const frame = new VideoFrame(canvas, { timestamp: Math.round(idx * usPerFrame), duration: Math.round(usPerFrame) });
      encoder.encode(frame, { keyFrame: idx % (fps * 2) === 0 });
      frame.close(); idx++;
      await awaitQueue(encoder); // contrapresión de la cola de entrada del codificador
      await muxer.drain();       // vacía la cola de escritura a disco antes del siguiente frame
    },
    /** Vacía el codificador, escribe el moov y cierra el fichero en disco. */
    async finish() { await encoder.flush(); encoder.close(); if (getErr()) throw getErr(); await muxer.finalize(); },
    /** Aborta: cierra el codificador y el fichero (queda incompleto, a descartar). */
    async cancel() { try { encoder.close(); } catch { /* ya cerrado */ } try { await muxer.abort(); } catch { /* ignora */ } },
    get frames() { return idx; },
  };
}
