/**
 * Saved preferences (language, level and maze algorithm), kept through the
 * storage helper. Anything missing or invalid falls back to its default.
 * @module settings
 */

import { ALGORITHMS, isAlgorithm } from './generators.js';
import { DEFAULT_LANGUAGE, isLanguage } from './i18n.js';
import { clampLevel } from './levels.js';

/** Storage key holding the settings object. */
export const SETTINGS_KEY = 'maze.settings';

/** @typedef {{ lang: string, level: number, algorithm: string }} Settings */

/**
 * Read the saved settings, validating every field on its own.
 * @param {import('./storage.js').Store} store
 * @returns {Settings}
 */
export function loadSettings(store) {
  const saved = store.get(SETTINGS_KEY, null);
  const data = saved && typeof saved === 'object' ? saved : {};
  return {
    lang: isLanguage(data.lang) ? data.lang : DEFAULT_LANGUAGE,
    level: clampLevel(data.level),
    algorithm: isAlgorithm(data.algorithm) ? data.algorithm : ALGORITHMS[0],
  };
}

/**
 * Save the settings.
 * @param {import('./storage.js').Store} store
 * @param {Settings} settings
 * @returns {boolean} False when they could not be saved (for example in private mode).
 */
export function saveSettings(store, { lang, level, algorithm }) {
  return store.set(SETTINGS_KEY, { lang, level, algorithm });
}
