/**
 * Deterministic mid-game state for the README screenshot (`?demo`).
 * @module demo
 */

import { createGame } from './game.js';
import { LEVELS } from './levels.js';
import { directionBetween } from './maze.js';
import { shortestPath } from './solver.js';

/** Game seed of the demo, chosen for a long solution whose midpoint sits in the centre. */
export const DEMO_SEED = 966;

const DEMO_LEVEL = LEVELS.findIndex((level) => level.id === '16x16');
const DEMO_STEP_MS = 290;

/**
 * Build the demo game: a 16x16 backtracker maze with the player halfway along
 * the solution and the trail of the walked half behind them. It never saves a
 * best time, and every call returns an identical state.
 * @returns {import('./game.js').Game}
 */
export function createDemoGame() {
  const game = createGame({ seed: DEMO_SEED, level: DEMO_LEVEL, algorithm: 'backtracker' });
  const { maze, start, exit } = game.getState();
  const path = shortestPath(maze, start, exit);
  const halfway = Math.floor((path.length - 1) / 2);
  for (let i = 1; i <= halfway; i += 1) {
    game.move(directionBetween(path[i - 1], path[i]));
    game.update(DEMO_STEP_MS);
  }
  return game;
}
