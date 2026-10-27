/**
 * Level list: square mazes that grow in size.
 * @module levels
 */

/** @typedef {{ id: string, width: number, height: number }} Level */

const SIZES = [8, 12, 16, 20, 25];

/** Levels in play order; `id` (e.g. "16x16") keys the best times. */
export const LEVELS = Object.freeze(
  SIZES.map((size) => Object.freeze({ id: `${size}x${size}`, width: size, height: size })),
);

/**
 * Clamp any value to a valid level index (non-integers become 0).
 * @param {unknown} index
 * @returns {number}
 */
export function clampLevel(index) {
  if (!Number.isInteger(index)) return 0;
  return Math.min(Math.max(/** @type {number} */ (index), 0), LEVELS.length - 1);
}
