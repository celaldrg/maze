/**
 * Input mapping (pure): keyboard keys and swipe gestures to directions.
 * @module controls
 */

/** @typedef {import('./maze.js').Direction} Direction */

const KEY_DIRECTIONS = new Map([
  ['arrowup', 'up'],
  ['w', 'up'],
  ['keyw', 'up'],
  ['arrowright', 'right'],
  ['d', 'right'],
  ['keyd', 'right'],
  ['arrowdown', 'down'],
  ['s', 'down'],
  ['keys', 'down'],
  ['arrowleft', 'left'],
  ['a', 'left'],
  ['keya', 'left'],
]);

/** Shortest movement, in CSS pixels, that counts as a swipe. */
export const SWIPE_MIN_DISTANCE = 24;

/**
 * Direction for a keyboard event: arrow keys or WASD, matched by `key` first
 * and then by the physical `code` (so WASD also works on other layouts).
 * @param {{ key?: string, code?: string }} event
 * @returns {Direction | null}
 */
export function directionFromKey(event) {
  for (const value of [event.key, event.code]) {
    const dir = typeof value === 'string' ? KEY_DIRECTIONS.get(value.toLowerCase()) : undefined;
    if (dir) return /** @type {Direction} */ (dir);
  }
  return null;
}

/**
 * Direction of a swipe from its total movement, or null when it is too short.
 * @param {number} dx Horizontal distance (positive = right).
 * @param {number} dy Vertical distance (positive = down).
 * @param {number} [minDistance]
 * @returns {Direction | null}
 */
export function directionFromSwipe(dx, dy, minDistance = SWIPE_MIN_DISTANCE) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** How long, in ms, a direction must stay pressed before the player runs on to the next junction. */
export const HOLD_DELAY_MS = 220;

/**
 * @typedef {object} Hold
 * @property {(dir: Direction, now: number) => void} press Start holding `dir`; replaces an earlier hold.
 * @property {(dir?: Direction) => void} release Stop holding `dir`, or whatever is held when omitted.
 * @property {(now: number) => Direction | null} poll The held direction, reported once, when it has been held long enough.
 */

/**
 * Track one held direction so that a long press can turn into a run.
 * @param {number} [delayMs]
 * @returns {Hold}
 */
export function createHold(delayMs = HOLD_DELAY_MS) {
  /** @type {{ dir: Direction, since: number, fired: boolean } | null} */
  let held = null;
  return {
    press(dir, now) {
      held = { dir, since: now, fired: false };
    },
    release(dir) {
      if (held && (dir === undefined || held.dir === dir)) held = null;
    },
    poll(now) {
      if (!held || held.fired || now - held.since < delayMs) return null;
      held.fired = true;
      return held.dir;
    },
  };
}
