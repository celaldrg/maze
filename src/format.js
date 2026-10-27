/**
 * Display formatting helpers (pure).
 * @module format
 */

/**
 * Format a duration as m:ss.t, for example 83456 -> "1:23.4".
 * Negative or non-finite values show as "0:00.0".
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  const tenths = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 100) : 0;
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}
