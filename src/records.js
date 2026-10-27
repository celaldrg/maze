/**
 * Best time per level, kept through the storage helper.
 * @module records
 */

/** Storage key holding `{ [levelId]: bestTimeMs }`. */
export const BEST_TIMES_KEY = 'maze.bestTimes';

/**
 * @typedef {object} Records
 * @property {(levelId: string) => number | null} get Best time in ms, or null when none is saved.
 * @property {(levelId: string, timeMs: number) => { best: number | null, improved: boolean }} submit
 *   Offer a finished time; it is saved only when it beats the stored best.
 */

/**
 * Create a best-time book on top of a store made by `createStorage`.
 * @param {import('./storage.js').Store} store
 * @returns {Records}
 */
export function createRecords(store) {
  const readAll = () => {
    const data = store.get(BEST_TIMES_KEY, null);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  };

  const get = (levelId) => {
    const all = readAll();
    return Object.hasOwn(all, levelId) && isTime(all[levelId]) ? all[levelId] : null;
  };

  const submit = (levelId, timeMs) => {
    const best = get(levelId);
    if (!isTime(timeMs) || (best !== null && best <= timeMs)) return { best, improved: false };
    store.set(BEST_TIMES_KEY, { ...readAll(), [levelId]: timeMs });
    return { best: timeMs, improved: true };
  };

  return { get, submit };
}

function isTime(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
