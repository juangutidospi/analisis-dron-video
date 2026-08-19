import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePilotScore } from '../js/pilot-score.js';

/** Vuelo suave: velocidad y altura que cambian de forma gradual. */
function smooth() {
  const S = [];
  for (let i = 0; i < 60; i++) { const p = i / 60; S.push({ t: i, hs: 6 + 2 * Math.sin(p * 3), vs: 0.4 * Math.sin(p * 2), lat: 40 + i * 0.0002, lon: -6, pitch: -20 + 2 * Math.sin(p) }); }
  return { series: S };
}
/** Vuelo brusco: velocidad y vertical a tirones. */
function jerky() {
  const S = [];
  for (let i = 0; i < 60; i++) S.push({ t: i, hs: i % 2 ? 12 : 1, vs: i % 2 ? 4 : -4, lat: 40 + i * 0.0002, lon: -6, pitch: i % 2 ? -10 : -40 });
  return { series: S };
}

test('un vuelo suave puntúa alto', () => {
  const r = computePilotScore(smooth());
  assert.ok(r.overall >= 75, 'overall ' + r.overall);
  assert.ok(r.aspects.smoothness >= 70);
});

test('un vuelo brusco puntúa bajo y avisa', () => {
  const r = computePilotScore(jerky());
  assert.ok(r.overall < 55, 'overall ' + r.overall);
  assert.ok(r.tips.some((tp) => tp.level === 'warn'));
});

test('el suave elogia algún aspecto', () => {
  const r = computePilotScore(smooth());
  assert.ok(r.tips.some((tp) => tp.level === 'good'));
});

test('todos los aspectos están en 0..100', () => {
  const r = computePilotScore(smooth());
  for (const v of Object.values(r.aspects)) assert.ok(v >= 0 && v <= 100);
  assert.ok(r.overall >= 0 && r.overall <= 100);
});

test('serie mínima devuelve null', () => {
  assert.equal(computePilotScore({ series: [{ t: 0, hs: 1 }] }), null);
});
