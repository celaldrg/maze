import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEST_TIMES_KEY, createRecords } from '../src/records.js';
import { createStorage } from '../src/storage.js';
import { memoryBackend } from '../test-support/helpers.js';

function setup() {
  const backend = memoryBackend();
  return { backend, records: createRecords(createStorage(() => backend)) };
}

test('there is no best time before a level is finished', () => {
  const { records } = setup();
  assert.equal(records.get('8x8'), null);
  assert.equal(records.get('constructor'), null);
});

test('the first finished time becomes the best and is stored', () => {
  const { backend, records } = setup();
  assert.deepEqual(records.submit('8x8', 41250), { best: 41250, improved: true });
  assert.equal(records.get('8x8'), 41250);
  assert.deepEqual(JSON.parse(backend.getItem(BEST_TIMES_KEY)), { '8x8': 41250 });
});

test('only a faster time replaces the best', () => {
  const { records } = setup();
  records.submit('8x8', 30000);
  assert.deepEqual(records.submit('8x8', 35000), { best: 30000, improved: false });
  assert.deepEqual(records.submit('8x8', 30000), { best: 30000, improved: false });
  assert.deepEqual(records.submit('8x8', 29900), { best: 29900, improved: true });
  assert.equal(records.get('8x8'), 29900);
});

test('levels are tracked separately', () => {
  const { records } = setup();
  records.submit('8x8', 10000);
  records.submit('12x12', 50000);
  assert.equal(records.get('8x8'), 10000);
  assert.equal(records.get('12x12'), 50000);
  assert.equal(records.get('16x16'), null);
});

test('invalid times are ignored', () => {
  const { backend, records } = setup();
  for (const bad of [NaN, -1, Infinity, '100', null, undefined]) {
    assert.deepEqual(records.submit('8x8', bad), { best: null, improved: false });
  }
  assert.equal(backend.getItem(BEST_TIMES_KEY), null);
});

test('corrupt stored data is treated as empty and then repaired', () => {
  for (const raw of ['[1,2]', '"text"', '42', '{"8x8":"fast"}', '{"8x8":-5}', '{oops']) {
    const { backend, records } = setup();
    backend.setItem(BEST_TIMES_KEY, raw);
    assert.equal(records.get('8x8'), null, raw);
    assert.deepEqual(records.submit('8x8', 5000), { best: 5000, improved: true }, raw);
    assert.equal(records.get('8x8'), 5000, raw);
  }
});

test('unavailable storage never crashes; nothing is kept', () => {
  const records = createRecords(createStorage(() => {
    throw new Error('SecurityError');
  }));
  assert.equal(records.get('8x8'), null);
  assert.deepEqual(records.submit('8x8', 1000), { best: 1000, improved: true });
  assert.equal(records.get('8x8'), null);
});
