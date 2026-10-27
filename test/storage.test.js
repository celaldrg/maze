import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';
import { memoryBackend } from '../test-support/helpers.js';

test('values round-trip as JSON', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.set('times', { '8x8': 1234, list: [1, 2] }), true);
  assert.deepEqual(store.get('times'), { '8x8': 1234, list: [1, 2] });
  assert.equal(store.set('lang', 'tr'), true);
  assert.equal(store.get('lang'), 'tr');
  assert.equal(backend.getItem('lang'), '"tr"');
});

test('missing keys and corrupt data return the fallback', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.get('missing'), null);
  assert.equal(store.get('missing', 5), 5);
  backend.setItem('broken', '{not json');
  assert.equal(store.get('broken', 'fallback'), 'fallback');
});

test('a backend that throws on access (blocked storage) never crashes', () => {
  const store = createStorage(() => {
    throw new Error('SecurityError');
  });
  assert.equal(store.get('key', 1), 1);
  assert.equal(store.set('key', 2), false);
});

test('getItem and setItem that throw (private mode, full quota) never crash', () => {
  const store = createStorage(() => ({
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  }));
  assert.equal(store.get('key', 'x'), 'x');
  assert.equal(store.set('key', 1), false);
});

test('no backend at all behaves like empty, read-only storage', () => {
  for (const missing of [undefined, null]) {
    const store = createStorage(() => missing);
    assert.equal(store.get('key', 'x'), 'x');
    assert.equal(store.set('key', 1), false);
  }
});

test('the backend is looked up on every call, never up front', () => {
  let lookups = 0;
  const backend = memoryBackend();
  const store = createStorage(() => {
    lookups += 1;
    return backend;
  });
  assert.equal(lookups, 0);
  store.set('a', 1);
  store.get('a');
  assert.equal(lookups, 2);
});

test('importing the module does not touch localStorage, and blocked localStorage is survived', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let touched = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      touched = true;
      throw new Error('SecurityError');
    },
  });
  try {
    const fresh = await import(`../src/storage.js?fresh=${Date.now()}`);
    assert.equal(touched, false, 'nothing is read at import time');
    assert.equal(fresh.storage.get('key', 'fallback'), 'fallback');
    assert.equal(fresh.storage.set('key', 1), false);
    assert.equal(touched, true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
