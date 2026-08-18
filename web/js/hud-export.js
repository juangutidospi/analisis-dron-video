// Exporta el vídeo con el HUD "quemado" encima, 100% en el navegador.
// Compone cada fotograma (vídeo + HUD) en un canvas. Preferimos WebCodecs +
// muxer MP4 estándar (compatible con iOS, con audio AAC si el navegador y el
// vídeo lo permiten); si no hay WebCodecs, se usa MediaRecorder (webm/mp4
// fragmentado, con audio). Siempre en tiempo real.

import { createMp4 } from './mp4-muxer.js';
import { trailerFade } from './highlights.js';
import { drawTitleCard } from './title-card.js';
import { fxFilter, paintFxLayers } from './video-fx.js';

/** Dimensiones de salida (pares): 16:9 escalado a maxHeight, o 9:16 vertical para redes. */
function outDims(video, maxHeight, vertical) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (vertical) { const H = Math.round(Math.min(1920, vh) / 2) * 2; return { W: Math.round(H * 9 / 16 / 2) * 2, H }; }
  const scale = Math.min(1, maxHeight / vh);
  return { W: Math.round(vw * scale / 2) * 2, H: Math.round(vh * scale / 2) * 2 };
}

/** Pinta el vídeo (16:9 o recorte central en vertical) con el efecto: filtro CSS + segunda capa. */
function paintVideo(ctx, video, W, H, vertical, fx) {
  const f = fxFilter(fx);
  if (f) ctx.filter = f;
  if (vertical) { const dw = H * (video.videoWidth / video.videoHeight); ctx.drawImage(video, (W - dw) / 2, 0, dw, H); }
  else ctx.drawImage(video, 0, 0, W, H);
  if (f) ctx.filter = 'none';
  paintFxLayers(ctx, W, H, fx);
}

/** Elige el mejor método disponible. */
export async function exportHudVideo(opts) {
  if ('VideoEncoder' in window && 'VideoFrame' in window) {
    try { return await exportViaWebCodecs(opts); }
    catch (e) { if (e.name === 'AbortError') throw e; console.warn('WebCodecs falló, se usa MediaRecorder.', e); }
  }
  return exportViaMediaRecorder(opts);
}

/** WebCodecs → MP4 estándar (H.264 + AAC). Compatible con iPhone/QuickTime. */
async function exportViaWebCodecs({ video, draw, cfg, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, onProgress, signal }) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const muxer = createMp4({ width: W, height: H });

  let needDesc = true, encErr = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  encoder.configure({ codec: H > 1080 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: 12_000_000, framerate: 30, latencyMode: 'realtime', avc: { format: 'avc' } });

  await seek(video, 0);
  // Con música propia usamos ese audio; si no, capturamos el audio del vídeo.
  const audioCap = musicBuffer ? null : await setupAudioCapture(video, muxer).catch(() => null);
  let running = true, cancelled = false, idx = 0;
  const dur = video.duration || 0;
  const finish = () => { running = false; try { video.pause(); } catch {} };
  if (signal) signal.addEventListener('abort', () => { cancelled = true; finish(); }, { once: true });

  const useRVFC = 'requestVideoFrameCallback' in video;
  await video.play();
  await new Promise((resolve) => {
    const onFrame = () => {
      if (!running || encErr) { resolve(); return; }
      paintVideo(ctx, video, W, H, vertical, fx);
      draw(ctx, video.currentTime, W, H, cfg);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(video.currentTime * 1e6) });
      encoder.encode(frame, { keyFrame: idx % 60 === 0 });
      frame.close(); idx++;
      onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
      useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
    };
    video.onended = () => { finish(); resolve(); };
    useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
  });
  if (audioCap) await audioCap.stop();
  if (musicBuffer) await encodeMusic(muxer, musicBuffer, video.duration || 0, { volume: musicVolume, start: musicStart }).catch(() => {});
  await encoder.flush(); encoder.close();
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
  if (encErr) throw encErr;
  return muxer.finalize();
}

/**
 * Codifica un AudioBuffer (música cargada o generada) a AAC como pista del
 * muxer: en bucle si es más corto que el vídeo, recortado a su duración, con
 * volumen, punto de inicio (trim) y fundidos de entrada/salida. Offline.
 * @param {{volume?:number, start?:number}} [opts]
 * @returns {Promise<boolean>} true si añadió audio
 */
async function encodeMusic(muxer, audioBuf, durationSec, opts = {}) {
  if (!('AudioEncoder' in window) || !durationSec || !audioBuf) return false;
  const vol = opts.volume ?? 1;
  const SR = audioBuf.sampleRate, CH = Math.min(2, audioBuf.numberOfChannels), srcLen = audioBuf.length;
  const srcCh = []; for (let c = 0; c < CH; c++) srcCh.push(audioBuf.getChannelData(c % audioBuf.numberOfChannels));
  const startS = Math.round((opts.start ?? 0) * SR);   // punto de inicio de la canción
  const totalFrames = Math.ceil(durationSec * SR);
  const fade = Math.min(SR * 0.8, totalFrames * 0.15) | 0; // fundidos ~0,8 s

  let encErr = null, needCfg = true;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      if (needCfg && meta?.decoderConfig?.description) { muxer.setAudioConfig({ sampleRate: SR, channels: CH, description: meta.decoderConfig.description }); needCfg = false; }
      if (needCfg) return;
      const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); muxer.addAudioSample(b, chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  enc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: CH, bitrate: 192_000, aac: { format: 'aac' } });

  const N = 1024;
  for (let off = 0; off < totalFrames && !encErr; off += N) {
    const n = Math.min(N, totalFrames - off);
    const data = new Float32Array(N * CH); // el resto del último bloque queda en silencio
    for (let c = 0; c < CH; c++) {
      const src = srcCh[c];
      for (let j = 0; j < n; j++) {
        const gi = off + j, rem = totalFrames - gi;
        let v = src[(startS + gi) % srcLen] * vol; // trim + bucle + volumen
        if (gi < fade) v *= gi / fade;             // fundido de entrada
        if (rem < fade) v *= rem / fade;           // fundido de salida
        data[c * N + j] = v;
      }
    }
    const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfChannels: CH, numberOfFrames: N, timestamp: Math.round(off / SR * 1e6), data });
    enc.encode(ad); ad.close();
  }
  try { await enc.flush(); } catch {} try { enc.close(); } catch {}
  return !needCfg && !encErr;
}

/**
 * Captura el audio del vídeo y lo codifica a AAC en paralelo, alimentando el
 * muxer. Best-effort: devuelve null si el navegador no soporta la captura o el
 * códec, o si el vídeo no tiene pista de audio.
 * @returns {Promise<{stop:()=>Promise<void>}|null>}
 */
async function setupAudioCapture(video, muxer) {
  if (!('AudioEncoder' in window) || typeof MediaStreamTrackProcessor === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!video._hudAudioCtx) { video._hudAudioCtx = new AC(); video._hudAudioSrc = video._hudAudioCtx.createMediaElementSource(video); }
  const actx = video._hudAudioCtx;
  await actx.resume?.();
  const dest = actx.createMediaStreamDestination();
  video._hudAudioSrc.connect(dest);
  const track = dest.stream.getAudioTracks()[0];
  if (!track) { try { video._hudAudioSrc.disconnect(dest); } catch {} return null; }

  let sr = 0, ch = 0, needCfg = true, encErr = null;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      if (needCfg && meta?.decoderConfig?.description) { muxer.setAudioConfig({ sampleRate: sr, channels: ch, description: meta.decoderConfig.description }); needCfg = false; }
      if (needCfg) return; // sin AudioSpecificConfig no podemos muxear
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addAudioSample(buf, chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });

  const reader = track && new MediaStreamTrackProcessor({ track }).readable.getReader();
  let configured = false;
  const pump = (async () => {
    try {
      while (!encErr) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!configured) {
          sr = value.sampleRate; ch = value.numberOfChannels;
          enc.configure({ codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: ch, bitrate: 128_000, aac: { format: 'aac' } });
          configured = true;
        }
        if (enc.state === 'configured') enc.encode(value);
        value.close();
      }
    } catch { /* fin de la captura */ }
  })();

  return {
    async stop() {
      try { await reader.cancel(); } catch {}
      await pump;
      try { if (enc.state === 'configured') await enc.flush(); } catch {}
      try { enc.close(); } catch {}
      try { video._hudAudioSrc.disconnect(dest); } catch {}
    },
  };
}

/** Efectos de transición disponibles entre tramos del trailer (fundido, zoom, desenfoque). */
export const TRANSITIONS = ['black', 'zoom', 'blur'];

/**
 * Compone un frame aplicando el efecto de transición. `src` es el frame ya
 * pintado (vídeo + HUD); `t` es 0 (sin efecto) → 1 (extremo del corte).
 * @param {CanvasRenderingContext2D} ctx destino
 * @param {CanvasImageSource} src frame base
 * @param {boolean} entering true si entra el clip, false si sale
 */
export function applyTransition(ctx, src, W, H, effect, t, entering) {
  if (t <= 0) { ctx.drawImage(src, 0, 0, W, H); return; }
  switch (effect) {
    case 'white':
      ctx.drawImage(src, 0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,${t})`; ctx.fillRect(0, 0, W, H); break;
    case 'zoom': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const s = 1 + 0.22 * t, dw = W * s, dh = H * s;
      ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, W, H); break;
    }
    case 'slide': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(src, (entering ? W * t : -W * t), 0, W, H); break;
    }
    case 'blur': {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.filter = `blur(${Math.round(t * 16)}px)`; ctx.drawImage(src, 0, 0, W, H); ctx.filter = 'none';
      ctx.fillStyle = `rgba(0,0,0,${t * 0.5})`; ctx.fillRect(0, 0, W, H); break;
    }
    case 'black': default:
      ctx.drawImage(src, 0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${t})`; ctx.fillRect(0, 0, W, H); break;
  }
}

/**
 * Genera un auto-trailer: concatena varios tramos del vídeo (segments) con el
 * HUD quemado y música, en un único MP4 con timestamps continuos. Requiere
 * WebCodecs. El HUD se pinta con el tiempo real de cada tramo; la música cubre
 * la duración total del trailer.
 * @returns {Promise<Blob>}
 */
export async function exportTrailer({ video, draw, cfg, segments, transitions, xf = 0.4, intro, introDur = 3.8, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, onProgress, signal }) {
  if (!('VideoEncoder' in window) || !('VideoFrame' in window)) throw new Error('Tu navegador no soporta la generación del trailer.');
  if (!segments?.length) throw new Error('No hay momentos para el trailer.');
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const muxer = createMp4({ width: W, height: H });

  let needDesc = true, encErr = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (needDesc && meta?.decoderConfig?.description) { muxer.setDescription(meta.decoderConfig.description); needDesc = false; }
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      muxer.addSample(buf, chunk.type === 'key', chunk.timestamp);
    },
    error: (e) => { encErr = e; },
  });
  encoder.configure({ codec: H > 1080 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: 12_000_000, framerate: 30, latencyMode: 'realtime', avc: { format: 'avc' } });

  const introSec = intro ? introDur : 0;
  const total = introSec + (segments.reduce((s, g) => s + (g.end - g.start), 0)) || 1;
  const pool = transitions === undefined ? TRANSITIONS : transitions;
  const XF = pool.length ? xf : 0; // sin efectos permitidos → corte seco
  // un efecto aleatorio por corte (compartido entre la salida de un tramo y la entrada del siguiente)
  const effects = Array.from({ length: segments.length + 1 }, () => (pool.length ? pool[(Math.random() * pool.length) | 0] : 'black'));
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d', { alpha: false });
  let cancelled = false;
  if (signal) signal.addEventListener('abort', () => { cancelled = true; try { video.pause(); } catch {} }, { once: true });
  const useRVFC = 'requestVideoFrameCallback' in video;
  video.muted = true;
  let outSec = 0, idx = 0;

  // portada animada al inicio (sin vídeo; se genera cuadro a cuadro)
  if (intro) {
    const nF = Math.max(1, Math.round(introDur * 30));
    for (let f = 0; f < nF && !cancelled && !encErr; f++) {
      drawTitleCard(ctx, W, H, f / 30, introDur, intro);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(f / 30 * 1e6) });
      encoder.encode(frame, { keyFrame: f === 0 || f % 60 === 0 }); frame.close(); idx++;
      onProgress?.(Math.min(1, (f / 30) / total));
      if (f % 6 === 0) await new Promise((r) => requestAnimationFrame(r)); // ceder el hilo
    }
    outSec += introDur;
  }

  for (let si = 0; si < segments.length; si++) {
    if (cancelled || encErr) break;
    const seg = segments[si], entryFx = effects[si], exitFx = effects[si + 1];
    await seek(video, seg.start);
    await video.play().catch(() => {});
    let firstOfSeg = true;
    await new Promise((resolve) => {
      const onFrame = () => {
        if (cancelled || encErr) { resolve(); return; }
        const ct = video.currentTime;
        if (ct >= seg.end - 0.001) { resolve(); return; }
        const t = trailerFade(ct, seg.start, seg.end, XF);
        if (t <= 0) {
          paintVideo(ctx, video, W, H, vertical, fx); draw(ctx, ct, W, H, cfg);
        } else {
          paintVideo(tctx, video, W, H, vertical, fx); draw(tctx, ct, W, H, cfg);
          const entering = (ct - seg.start) <= (seg.end - ct);
          applyTransition(ctx, tmp, W, H, entering ? entryFx : exitFx, t, entering);
        }
        const ts = Math.max(0, Math.round((outSec + (ct - seg.start)) * 1e6));
        const frame = new VideoFrame(canvas, { timestamp: ts });
        encoder.encode(frame, { keyFrame: firstOfSeg || idx % 60 === 0 });
        frame.close(); idx++; firstOfSeg = false;
        onProgress?.(Math.min(1, (outSec + (ct - seg.start)) / total));
        useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
      };
      video.onended = () => resolve();
      useRVFC ? video.requestVideoFrameCallback(onFrame) : requestAnimationFrame(onFrame);
    });
    try { video.pause(); } catch {}
    outSec += (seg.end - seg.start);
  }

  if (musicBuffer) await encodeMusic(muxer, musicBuffer, outSec, { volume: musicVolume, start: musicStart }).catch(() => {});
  await encoder.flush(); encoder.close();
  if (cancelled) throw new DOMException('Generación cancelada', 'AbortError');
  if (encErr) throw encErr;
  return muxer.finalize();
}

/** Espera a que el vídeo termine de buscar a t. */
function seek(video, t) {
  return new Promise((res) => {
    const on = () => { video.removeEventListener('seeked', on); res(); };
    video.addEventListener('seeked', on);
    video.currentTime = t;
  });
}

/**
 * @param {object} o
 * @param {HTMLVideoElement} o.video  vídeo fuente (a resolución nativa)
 * @param {(ctx:CanvasRenderingContext2D,t:number,w:number,h:number,cfg:object)=>void} o.draw  HUD
 * @param {object} o.cfg  config del HUD (gauges/unidades)
 * @param {number} [o.maxHeight=1080]  alto máximo del export
 * @param {number} [o.fps=30]
 * @param {(p:number)=>void} [o.onProgress]  0..1
 * @param {AbortSignal} [o.signal]
 * @returns {Promise<Blob>}
 */
async function exportViaMediaRecorder({ video, draw, cfg, musicBuffer, musicVolume = 1, musicStart = 0, vertical = false, fx = '', maxHeight = 1080, fps = 30, onProgress, signal }) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Tu navegador no soporta la grabación de canvas.');
  }
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const { W, H } = outDims(video, maxHeight, vertical);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(fps);

  // Pista de audio: música propia (en bucle) o el audio del vídeo (silencioso).
  let startMusic = null, musicCtx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && musicBuffer) {
      musicCtx = new AC();
      const src = musicCtx.createBufferSource(); src.buffer = musicBuffer; src.loop = true;
      const g = musicCtx.createGain();
      const dest = musicCtx.createMediaStreamDestination();
      src.connect(g); g.connect(dest);
      const at = dest.stream.getAudioTracks()[0];
      if (at) {
        stream.addTrack(at);
        const dur = video.duration || 0, fd = 0.8;
        startMusic = () => {
          try {
            const t0 = musicCtx.currentTime;
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(musicVolume, t0 + fd);        // fundido de entrada
            if (dur > 2 * fd) { g.gain.setValueAtTime(musicVolume, t0 + dur - fd); g.gain.linearRampToValueAtTime(0, t0 + dur); } // fundido de salida
            src.start(0, musicStart || 0);
          } catch {}
        };
      }
    } else if (AC) {
      if (!video._hudAudioCtx) { video._hudAudioCtx = new AC(); video._hudAudioSrc = video._hudAudioCtx.createMediaElementSource(video); }
      await video._hudAudioCtx.resume?.();
      const dest = video._hudAudioCtx.createMediaStreamDestination();
      video._hudAudioSrc.connect(dest);
      const at = dest.stream.getAudioTracks()[0];
      if (at) { stream.addTrack(at); video.muted = false; }
    }
  } catch { /* seguimos sin audio */ }

  // MP4 (H.264 + AAC) si el navegador lo soporta; si no, webm. La extensión sale de blob.type.
  const mime = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });

  const dur = video.duration || 0;
  await seek(video, 0);

  let running = true, cancelled = false;
  const finish = () => { if (!running) return; running = false; try { rec.stop(); } catch {} try { video.pause(); } catch {} };
  if (signal) signal.addEventListener('abort', () => { cancelled = true; finish(); }, { once: true });

  const drawFrame = () => {
    paintVideo(ctx, video, W, H, vertical, fx);
    draw(ctx, video.currentTime, W, H, cfg);
    onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
  };
  const useRVFC = 'requestVideoFrameCallback' in video;
  const loop = () => { if (!running) return; drawFrame(); useRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };

  rec.start(1000);
  video.onended = finish;
  await video.play();
  startMusic?.();
  loop();

  await stopped;
  video.muted = true;
  try { video._hudAudioSrc?.disconnect(); } catch {}
  try { musicCtx?.close(); } catch {}
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
  return new Blob(chunks, { type: mime });
}
