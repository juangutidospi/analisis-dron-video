import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectManeuvers } from '../js/maneuvers.js';

const cosLat = Math.cos(40 * Math.PI / 180);

/** Círculo alrededor de un centro (una vuelta en 40 s). */
function orbit() {
  const S = [], r = 0.001;
  for (let i = 0; i <= 40; i++) { const a = i / 40 * 2 * Math.PI; S.push({ t: i, hs: 5, vs: 0, lat: 40 + r * Math.cos(a), lon: -6 + r * Math.sin(a) / cosLat }); }
  return { series: S };
}
function cruise() { const S = []; for (let i = 0; i <= 20; i++) S.push({ t: i, hs: 8, vs: 0, lat: 40 + i * 0.0002, lon: -6 }); return { series: S }; }
function hover() { const S = []; for (let i = 0; i <= 10; i++) S.push({ t: i, hs: 0.3, vs: 0, lat: 40, lon: -6 }); return { series: S }; }
function climb() { const S = []; for (let i = 0; i <= 12; i++) S.push({ t: i, hs: 2, vs: 2.5, lat: 40 + i * 0.00005, lon: -6, rel: i * 2.5 }); return { series: S }; }

const hasType = (r, type) => r.segments.some((s) => s.type === type);

test('detecta una órbita en un vuelo circular sostenido', () => {
  const r = detectManeuvers(orbit());
  assert.ok(hasType(r, 'orbit'), JSON.stringify(r.summary));
  const orb = r.segments.find((s) => s.type === 'orbit');
  assert.ok(orb.turnDeg >= 200, 'giro acumulado ≥ 200° (' + orb.turnDeg + ')');
});

test('detecta una pasada recta como crucero', () => {
  assert.ok(hasType(detectManeuvers(cruise()), 'cruise'));
});

test('detecta el vuelo estacionario', () => {
  assert.ok(hasType(detectManeuvers(hover()), 'hover'));
});

test('detecta un ascenso', () => {
  assert.ok(hasType(detectManeuvers(climb()), 'climb'));
});

test('el resumen cuenta los tramos por tipo', () => {
  const r = detectManeuvers(orbit());
  const total = Object.values(r.summary).reduce((a, b) => a + b, 0);
  assert.equal(total, r.segments.length);
});

test('serie mínima devuelve vacío', () => {
  assert.deepEqual(detectManeuvers({ series: [{ t: 0 }, { t: 1 }] }), { segments: [], summary: {} });
});

test('descarta tramos más cortos que la duración mínima', () => {
  const r = detectManeuvers(hover(), { minDur: 100 });
  assert.equal(r.segments.length, 0);
});
