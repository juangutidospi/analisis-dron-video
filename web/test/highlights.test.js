import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectHighlights } from '../js/highlights.js';

/** Vuelo sintético con cada extremo en un instante conocido y separado. */
function buildModel() {
  const S = [];
  for (let i = 0; i < 30; i++) {
    const rel = Math.max(0, 120 - Math.abs(i - 12) * 7);   // altura máx en i=12
    const hs = Math.max(0, 18 - Math.abs(i - 6) * 1.0);    // velocidad máx en i=6 (y >3 m/s en el giro)
    let vs = 0.1;
    if (i === 1) vs = 6;                                    // ascenso máx en i=1
    else if (i === 24) vs = -5;                            // descenso máx en i=24
    // trayecto: al norte hasta i=17, luego giro al este (giro brusco en i=18)
    let lat, lon;
    if (i <= 17) { lat = 40 + i * 0.001; lon = -6; }
    else { lat = 40 + 17 * 0.001; lon = -6 + (i - 17) * 0.001; }
    S.push({ t: i, rel, hs, vs, lat, lon });
  }
  return { series: S, takeoff: [40, -6] };
}

const byType = (hl, type) => hl.find((h) => h.type === type);

test('detecta los seis tipos de momento en sus instantes', () => {
  const hl = detectHighlights(buildModel());
  assert.equal(byType(hl, 'speed').t, 6);
  assert.equal(byType(hl, 'alt').t, 12);
  assert.equal(byType(hl, 'climb').t, 1);
  assert.equal(byType(hl, 'descent').t, 24);
  assert.equal(byType(hl, 'turn').t, 18);
  assert.equal(byType(hl, 'dist').t, 29);
});

test('los valores de los extremos son correctos', () => {
  const hl = detectHighlights(buildModel());
  assert.equal(byType(hl, 'speed').value, 18);
  assert.equal(byType(hl, 'alt').value, 120);
  assert.equal(byType(hl, 'climb').value, 6);
  assert.equal(byType(hl, 'descent').value, -5);
  assert.ok(byType(hl, 'dist').value > 1800); // ~1.9 km al punto más lejano
});

test('devuelve los momentos ordenados por tiempo', () => {
  const hl = detectHighlights(buildModel());
  for (let i = 1; i < hl.length; i++) assert.ok(hl[i].t >= hl[i - 1].t);
});

test('fusiona momentos próximos quedándose con el de mayor prioridad', () => {
  const hl = detectHighlights(buildModel(), { minGap: 100 }); // fuerza fusión total
  // con un minGap enorme queda un único momento, el de mayor prioridad presente (speed)
  assert.equal(hl.length, 1);
  assert.equal(hl[0].type, 'speed');
});

test('modelo vacío o mínimo devuelve lista vacía', () => {
  assert.deepEqual(detectHighlights({ series: [] }), []);
  assert.deepEqual(detectHighlights({ series: [{ t: 0, hs: 1 }] }), []);
});

test('respeta el número máximo de momentos', () => {
  const hl = detectHighlights(buildModel(), { max: 3 });
  assert.ok(hl.length <= 3);
});

import { buildTrailerSegments } from '../js/highlights.js';

test('trailer: una ventana por momento, recortada al vuelo', () => {
  const seg = buildTrailerSegments([{ t: 10 }], 100, { pre: 2, post: 3 });
  assert.deepEqual(seg, [{ start: 8, end: 13 }]);
});

test('trailer: recorta a los límites [0, dur]', () => {
  const seg = buildTrailerSegments([{ t: 0.5 }, { t: 99.5 }], 100, { pre: 2, post: 3 });
  assert.equal(seg[0].start, 0);
  assert.equal(seg[seg.length - 1].end, 100);
});

test('trailer: fusiona ventanas solapadas', () => {
  const seg = buildTrailerSegments([{ t: 10 }, { t: 12 }], 100, { pre: 1.5, post: 2.5 });
  assert.equal(seg.length, 1);         // 8.5-12.5 y 10.5-14.5 → una sola 8.5-14.5
  assert.equal(seg[0].start, 8.5);
  assert.equal(seg[0].end, 14.5);
});

test('trailer: momentos separados dan ventanas separadas', () => {
  const seg = buildTrailerSegments([{ t: 10 }, { t: 50 }], 100);
  assert.equal(seg.length, 2);
});

test('trailer: sin momentos o sin duración devuelve vacío', () => {
  assert.deepEqual(buildTrailerSegments([], 100), []);
  assert.deepEqual(buildTrailerSegments([{ t: 10 }], 0), []);
});

import { trailerFade } from '../js/highlights.js';

test('fundido: negro en los extremos, claro en el centro', () => {
  // tramo 10..14, fundido 0.4s
  assert.equal(trailerFade(10, 10, 14, 0.4), 1);        // inicio → negro
  assert.equal(trailerFade(14, 10, 14, 0.4), 1);        // fin → negro
  assert.equal(trailerFade(12, 10, 14, 0.4), 0);        // centro → claro
  assert.ok(Math.abs(trailerFade(10.2, 10, 14, 0.4) - 0.5) < 1e-9); // a mitad del fundido
});

test('fundido: en tramos muy cortos no se pasa de 1 ni baja de 0', () => {
  for (let ct = 10; ct <= 10.5; ct += 0.1) {
    const a = trailerFade(ct, 10, 10.5, 0.4);
    assert.ok(a >= 0 && a <= 1);
  }
});

test('trailer: la duración objetivo reparte el tiempo entre los momentos', () => {
  const hl = [{ t: 20 }, { t: 60 }, { t: 100 }, { t: 140 }]; // 4 momentos separados
  const seg = buildTrailerSegments(hl, 200, { target: 26 });
  const total = seg.reduce((s, g) => s + (g.end - g.start), 0);
  assert.ok(Math.abs(total - 26) < 0.5, 'suma ≈ objetivo (' + total + ')');
});
