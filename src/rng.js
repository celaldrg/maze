/**
 * Seeded pseudo-random numbers. Every random choice in the game goes through an
 * injectable `Rng` function, so mazes are reproducible and tests deterministic.
 * @module rng
 */

/** @typedef {() => number} Rng A function returning a float in [0, 1). */

const UINT32_RANGE = 0x100000000;

/**
 * Create a deterministic generator (mulberry32) from a seed.
 * @param {number} seed Any finite number; it is reduced to an unsigned 32-bit integer.
 * @returns {Rng}
 */
export function createRng(seed) {
  let state = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/**
 * Pick an integer in [0, maxExclusive).
 * @param {Rng} rng
 * @param {number} maxExclusive Positive integer.
 * @returns {number}
 */
export function randomInt(rng, maxExclusive) {
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

/**
 * Shuffle an array in place (Fisher-Yates) and return it.
 * @template T
 * @param {Rng} rng
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * A fresh, non-deterministic unsigned 32-bit seed for normal play.
 * Tests never rely on it; they pass explicit seeds.
 * @returns {number}
 */
export function randomSeed() {
  return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
}
