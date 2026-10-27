import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, isLanguage, otherLanguage, translate } from '../src/i18n.js';
import { ALGORITHMS } from '../src/generators.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('English and Turkish define exactly the same keys', () => {
  assert.deepEqual(LANGUAGES, ['en', 'tr']);
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
});

test('every string is non-empty and keeps the same placeholders in both languages', () => {
  for (const key of Object.keys(STRINGS.en)) {
    for (const lang of LANGUAGES) {
      assert.equal(typeof STRINGS[lang][key], 'string', `${lang}.${key}`);
      assert.ok(STRINGS[lang][key].trim().length > 0, `${lang}.${key} is not empty`);
    }
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), key);
  }
});

test('every maze algorithm has a name and a description in both languages', () => {
  for (const lang of LANGUAGES) {
    for (const algorithm of ALGORITHMS) {
      assert.ok(Object.hasOwn(STRINGS[lang], `algorithm.${algorithm}`), `${lang} name of ${algorithm}`);
      assert.ok(Object.hasOwn(STRINGS[lang], `about.${algorithm}`), `${lang} description of ${algorithm}`);
    }
  }
});

test('the Turkish table really is translated', () => {
  const same = Object.keys(STRINGS.en).filter((key) => STRINGS.en[key] === STRINGS.tr[key]);
  assert.deepEqual(same.sort(), [
    'algorithm.kruskal', 'algorithm.prim', 'license', 'noBest', 'winStats',
  ]);
});

test('translate fills placeholders and picks the language', () => {
  assert.equal(translate('en', 'winBest', { time: '0:12.3' }), 'Best: 0:12.3');
  assert.equal(translate('tr', 'winBest', { time: '0:12.3' }), 'En iyi: 0:12.3');
  assert.equal(translate('en', 'movesMany', { count: 42 }), '42 moves');
  assert.equal(translate('tr', 'newMaze'), 'Yeni labirent');
});

test('translate falls back gracefully', () => {
  assert.equal(translate('de', 'newMaze'), 'New maze', 'unknown language -> English');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  assert.equal(translate('en', 'toString'), 'toString', 'inherited names are not keys');
  assert.equal(translate('en', 'winBest'), 'Best: {time}', 'missing values keep the placeholder');
});

test('language helpers', () => {
  assert.equal(isLanguage('en'), true);
  assert.equal(isLanguage('tr'), true);
  for (const value of ['EN', 'de', '', null, undefined, 1]) assert.equal(isLanguage(value), false);
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
});
