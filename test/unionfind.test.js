import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUnionFind } from '../src/unionfind.js';

test('starts with one set per item', () => {
  const sets = createUnionFind(5);
  assert.equal(sets.count, 5);
  for (let i = 0; i < 5; i += 1) assert.equal(sets.find(i), i);
});

test('union joins two sets exactly once', () => {
  const sets = createUnionFind(6);
  assert.equal(sets.union(0, 1), true);
  assert.equal(sets.union(1, 0), false);
  assert.equal(sets.union(2, 3), true);
  assert.equal(sets.union(1, 3), true);
  assert.equal(sets.union(0, 2), false);
  assert.equal(sets.find(0), sets.find(3));
  assert.notEqual(sets.find(0), sets.find(4));
  assert.equal(sets.count, 3);
});

test('a long chain collapses into a single set', () => {
  const size = 2000;
  const sets = createUnionFind(size);
  for (let i = 1; i < size; i += 1) assert.equal(sets.union(i - 1, i), true);
  assert.equal(sets.count, 1);
  const root = sets.find(0);
  for (let i = 0; i < size; i += 1) assert.equal(sets.find(i), root);
});
