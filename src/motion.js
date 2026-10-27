/**
 * Smooth on-screen movement of the player dot. The game logic jumps from cell
 * to cell instantly; this glides through the same cells at a steady speed and
 * speeds up when several cells are queued (long runs, fast key presses).
 * @module motion
 */

/** @typedef {import('./maze.js').Point} Point */

/** Cells per second for a single step. */
export const BASE_SPEED = 14;
const BOOST_PER_CELL = 0.2;
const MAX_BOOST = 3;

/**
 * @typedef {object} Motion
 * @property {(point: Point) => void} jump Put the dot on a cell at once and drop queued cells.
 * @property {(path: readonly Point[]) => void} follow Queue cells to glide through, in order.
 * @property {(dtMs: number) => void} update Advance the dot by `dtMs` milliseconds.
 * @property {Point} position Current position in cell units (fractional while gliding).
 * @property {Point[]} pending Copy of the cells queued but not reached yet.
 * @property {boolean} idle True when nothing is queued.
 */

/**
 * Create the glide state for a dot starting on `start`.
 * @param {Point} start
 * @param {number} [speed] Cells per second before any catch-up boost.
 * @returns {Motion}
 */
export function createMotion(start, speed = BASE_SPEED) {
  let position = copy(start);
  /** @type {Point[]} */
  let queue = [];

  function update(dtMs) {
    if (!(dtMs > 0)) return;
    let budget = (speed * boost(queue.length) * dtMs) / 1000;
    while (queue.length > 0 && budget > 0) {
      const target = queue[0];
      const distance = Math.hypot(target.x - position.x, target.y - position.y);
      if (distance <= budget) {
        position = copy(target);
        queue.shift();
        budget -= distance;
      } else {
        const share = budget / distance;
        position = { x: position.x + (target.x - position.x) * share, y: position.y + (target.y - position.y) * share };
        budget = 0;
      }
    }
  }

  return {
    jump(point) {
      position = copy(point);
      queue = [];
    },
    follow(path) {
      for (const point of path) queue.push(copy(point));
    },
    update,
    get position() {
      return copy(position);
    },
    get pending() {
      return queue.map(copy);
    },
    get idle() {
      return queue.length === 0;
    },
  };
}

function boost(queued) {
  return Math.min(MAX_BOOST, 1 + BOOST_PER_CELL * Math.max(0, queued - 1));
}

function copy(point) {
  return { x: point.x, y: point.y };
}
