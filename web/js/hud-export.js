// Exporta el vídeo con el HUD "quemado" encima, 100% en el navegador.
// Compone cada fotograma (vídeo + HUD) en un canvas. Preferimos WebCodecs +
// muxer MP4 estándar (compatible con iOS, sin audio); si no hay WebCodecs, se
// usa MediaRecorder (webm/mp4 fragmentado, con audio). Siempre en tiempo real.

import { createMp4 } from './mp4-muxer.js';

/** Elige el mejor método disponible. */
export async function exportHudVideo(opts) {
  if ('VideoEncoder' in window && 'VideoFrame' in window) {
    try { return await exportViaWebCodecs(opts); }
    catch (e) { if (e.name === 'AbortError') throw e; console.warn('WebCodecs falló, se usa MediaRecorder.', e); }
  }
  return exportViaMediaRecorder(opts);
}

/** WebCodecs → MP4 estándar (H.264, sin audio). Compatible con iPhone/QuickTime. */
async function exportViaWebCodecs({ video, draw, cfg, maxHeight = 1080, onProgress, signal }) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const scale = Math.min(1, maxHeight / vh);
  const W = Math.round(vw * scale / 2) * 2, H = Math.round(vh * scale / 2) * 2;
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
  let running = true, cancelled = false, idx = 0;
  const dur = video.duration || 0;
  const finish = () => { running = false; try { video.pause(); } catch {} };
  if (signal) signal.addEventListener('abort', () => { cancelled = true; finish(); }, { once: true });

  const useRVFC = 'requestVideoFrameCallback' in video;
  await video.play();
  await new Promise((resolve) => {
    const onFrame = () => {
      if (!running || encErr) { resolve(); return; }
      ctx.drawImage(video, 0, 0, W, H);
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
  await encoder.flush(); encoder.close();
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
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
async function exportViaMediaRecorder({ video, draw, cfg, maxHeight = 1080, fps = 30, onProgress, signal }) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('Tu navegador no soporta la grabación de canvas.');
  }
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) throw new Error('El vídeo aún no está listo.');
  const scale = Math.min(1, maxHeight / vh);
  const W = Math.round(vw * scale / 2) * 2, H = Math.round(vh * scale / 2) * 2; // dimensiones pares
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(fps);

  // audio del vídeo, capturado en silencio vía Web Audio (no suena por los altavoces)
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
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
    ctx.drawImage(video, 0, 0, W, H);
    draw(ctx, video.currentTime, W, H, cfg);
    onProgress?.(dur ? Math.min(1, video.currentTime / dur) : 0);
  };
  const useRVFC = 'requestVideoFrameCallback' in video;
  const loop = () => { if (!running) return; drawFrame(); useRVFC ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop); };

  rec.start(1000);
  video.onended = finish;
  await video.play();
  loop();

  await stopped;
  video.muted = true;
  try { video._hudAudioSrc?.disconnect(); } catch {}
  if (cancelled) throw new DOMException('Exportación cancelada', 'AbortError');
  return new Blob(chunks, { type: mime });
}
