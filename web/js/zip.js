// Escritor ZIP mínimo (método STORE, sin compresión) para construir el .kmz en el navegador.
// Google Earth acepta KMZ sin comprimir. Sin dependencias externas.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = new TextEncoder();
const toBytes = (data) => typeof data === 'string' ? enc.encode(data) : new Uint8Array(data);

/**
 * Crea un Blob ZIP a partir de una lista de archivos.
 * @param {{name:string, data:(string|Uint8Array|ArrayBuffer)}[]} files
 * @returns {Blob}
 */
export function makeZip(files) {
  const chunks = [];       // trozos del stream (local headers + datos)
  const central = [];      // entradas del directorio central
  let offset = 0;
  const u16 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF]);
  const u32 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]);
  const push = (arr) => { chunks.push(arr); offset += arr.length; };

  for (const f of files) {
    const nameB = enc.encode(f.name);
    const dataB = toBytes(f.data);
    const crc = crc32(dataB);
    const localOffset = offset;

    // cabecera local
    const lh = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataB.length), u32(dataB.length),
      u16(nameB.length), u16(0), nameB,
    ]);
    push(lh); push(dataB);

    // entrada del directorio central
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataB.length), u32(dataB.length),
      u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(localOffset), nameB,
    ]));
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c); centralSize += c.length; offset += c.length; }

  chunks.push(concat([
    u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
    u32(centralSize), u32(centralStart), u16(0),
  ]));

  return new Blob(chunks, { type: 'application/vnd.google-earth.kmz' });
}

function concat(arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

/** Convierte un dataURL (base64) en bytes. */
export function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
