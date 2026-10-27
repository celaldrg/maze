import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../src/settings.js';
import { createStorage } from '../src/storage.js';
import { memoryBackend } from '../test-support/helpers.js';

const DEFAULTS = Object.freeze({ lang: 'en', level: 0, algorithm: 'backtracker' });

test('a first visit gets the defaults', () => {
  assert.deepEqual(loadSettings(createStorage(() => memoryBackend())), DEFAULTS);
});

test('settings round-trip through the storage helper', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(saveSettings(store, { lang: 'tr', level: 3, algorithm: 'kruskal' }), true);
  assert.deepEqual(JSON.parse(backend.getItem(SETTINGS_KEY)), { lang: 'tr', level: 3, algorithm: 'kruskal' });
  assert.deepEqual(loadSettings(store), { lang: 'tr', level: 3, algorithm: 'kruskal' });
});

test('each invalid field falls back on its own', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  backend.setItem(SETTINGS_KEY, JSON.stringify({ lang: 'xx', level: 99, algorithm: 'prim' }));
  assert.deepEqual(loadSettings(store), { lang: 'en', level: 4, algorithm: 'prim' });
  backend.setItem(SETTINGS_KEY, JSON.stringify({ lang: 'tr', level: 1.5, algorithm: 'nope' }));
  assert.deepEqual(loadSettings(store), { lang: 'tr', level: 0, algorithm: 'backtracker' });
});

test('corrupt or unexpected data gives the defaults', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  for (const raw of ['{broken', '"tr"', '42', 'null', '[1,2]']) {
    backend.setItem(SETTINGS_KEY, raw);
    assert.deepEqual(loadSettings(store), DEFAULTS, raw);
  }
});

test('blocked storage never crashes', () => {
  const store = createStorage(() => {
    throw new Error('SecurityError');
  });
  assert.deepEqual(loadSettings(store), DEFAULTS);
  assert.equal(saveSettings(store, { lang: 'tr', level: 2, algorithm: 'prim' }), false);
});
