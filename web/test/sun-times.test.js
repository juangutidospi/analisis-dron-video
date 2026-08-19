import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunTimes, inGolden } from '../js/sun-times.js';

// verano en el hemisferio norte (Zamora, ~41.5N)
const T = sunTimes(new Date('2026-07-15T12:00:00'), 41.5, -6);

test('amanecer antes que atardecer, ambos en el día', () => {
  assert.ok(T.sunrise > 0 && T.sunrise < 1440);
  assert.ok(T.sunset > T.sunrise && T.sunset < 1440);
});

test('golden hour de mañana tras el amanecer y de tarde antes del ocaso', () => {
  assert.ok(T.goldenMorning && T.goldenMorning[0] >= T.sunrise - 1 && T.goldenMorning[1] > T.goldenMorning[0]);
  assert.ok(T.goldenEvening && T.goldenEvening[1] <= T.sunset + 1 && T.goldenEvening[1] > T.goldenEvening[0]);
});

test('el sol de mediodía en verano está alto', () => {
  assert.ok(T.noonEl > 40, 'elevación ' + T.noonEl);
});

test('inGolden detecta el tramo de tarde', () => {
  const mid = Math.round((T.goldenEvening[0] + T.goldenEvening[1]) / 2);
  assert.equal(inGolden(mid, T), 'evening');
  assert.equal(inGolden(720, T), null); // mediodía no es golden hour
});
