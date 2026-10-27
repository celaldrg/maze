import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomInt, randomSeed, shuffle } from '../src/rng.js';

const take = (rng, count) => Array.from({ length: count }, () => rng());

test('the same seed gives the same sequence', () => {
  assert.deepEqual(take(createRng(42), 100), take(createRng(42), 100));
});

test('different seeds give different sequences', () => {
  assert.notDeepEqual(take(createRng(1), 20), take(createRng(2), 20));
});

test('values stay in [0, 1)', () => {
  for (const seed of [0, 1, 123456789, 0xffffffff, -5, 3.7]) {
    for (const value of take(createRng(seed), 2000)) assert.ok(value >= 0 && value < 1);
  }
});

test('seeds are reduced to unsigned 32-bit integers', () => {
  assert.deepEqual(take(createRng(2 ** 32 + 7), 5), take(createRng(7), 5));
  assert.deepEqual(take(createRng(7.9), 5), take(createRng(7), 5));
  assert.deepEqual(take(createRng(NaN), 5), take(createRng(0), 5));
});

test('randomInt covers its whole range and nothing else', () => {
  const rng = createRng(9);
  const seen = new Set();
  for (let i = 0; i < 1000; i += 1) {
    const value = randomInt(rng, 6);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 6);
    seen.add(value);
  }
  assert.equal(seen.size, 6);
});

test('randomInt stays below its bound even for an rng that returns 1', () => {
  assert.equal(randomInt(() => 1, 5), 4);
  assert.equal(randomInt(() => 0, 5), 0);
});

test('shuffle is a deterministic, in-place permutation', () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  const a = [...items];
  assert.equal(shuffle(createRng(5), a), a);
  assert.deepEqual(a, shuffle(createRng(5), [...items]));
  assert.notDeepEqual(a, items);
  assert.deepEqual([...a].sort((x, y) => x - y), items);
});

test('randomSeed returns unsigned 32-bit integers', () => {
  for (let i = 0; i < 100; i += 1) {
    const seed = randomSeed();
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32);
  }
});
