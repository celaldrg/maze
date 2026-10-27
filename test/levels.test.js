import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, clampLevel } from '../src/levels.js';

test('levels are square and grow in size', () => {
  assert.deepEqual(LEVELS.map((level) => level.width), [8, 12, 16, 20, 25]);
  for (const level of LEVELS) {
    assert.equal(level.height, level.width);
    assert.equal(level.id, `${level.width}x${level.height}`);
  }
  for (let i = 1; i < LEVELS.length; i += 1) assert.ok(LEVELS[i].width > LEVELS[i - 1].width);
});

test('the level list cannot be changed', () => {
  assert.ok(Object.isFrozen(LEVELS));
  assert.ok(LEVELS.every((level) => Object.isFrozen(level)));
});

test('clampLevel keeps indexes inside the list', () => {
  assert.equal(clampLevel(0), 0);
  assert.equal(clampLevel(3), 3);
  assert.equal(clampLevel(-2), 0);
  assert.equal(clampLevel(LEVELS.length), LEVELS.length - 1);
  for (const bad of [1.5, NaN, '2', null, undefined]) assert.equal(clampLevel(bad), 0);
});
