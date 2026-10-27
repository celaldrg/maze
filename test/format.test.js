import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime } from '../src/format.js';

test('formats minutes, seconds and tenths', () => {
  assert.equal(formatTime(0), '0:00.0');
  assert.equal(formatTime(99), '0:00.0');
  assert.equal(formatTime(100), '0:00.1');
  assert.equal(formatTime(59999), '0:59.9');
  assert.equal(formatTime(60000), '1:00.0');
  assert.equal(formatTime(83456), '1:23.4');
  assert.equal(formatTime(600000), '10:00.0');
});

test('invalid durations show as zero', () => {
  for (const bad of [-5, NaN, Infinity, undefined, null]) assert.equal(formatTime(bad), '0:00.0');
});
