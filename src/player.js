/**
 * Player movement rules: the player only ever moves through open passages.
 * @module player
 */

import { canMove, openDirections, opposite, samePoint, step } from './maze.js';

/** @typedef {import('./maze.js').Maze} Maze */
/** @typedef {import('./maze.js').Point} Point */
/** @typedef {import('./maze.js').Direction} Direction */

/**
 * Move one cell towards `dir` unless a wall (or the outer border) is in the way.
 * @param {Maze} maze
 * @param {Point} from
 * @param {Direction} dir
 * @returns {Point | null} The new position, or null when blocked.
 */
export function tryStep(maze, from, dir) {
  return canMove(maze, from.x, from.y, dir) ? step(from, dir) : null;
}

/**
 * The way on from `at` for something that arrived travelling towards `heading`:
 * the only open direction other than straight back, or null when `at` is a
 * junction or a dead end.
 * @param {Maze} maze
 * @param {Point} at
 * @param {Direction} heading
 * @returns {Direction | null}
 */
export function corridorExit(maze, at, heading) {
  const exits = openDirections(maze, at.x, at.y).filter((dir) => dir !== opposite(heading));
  return exits.length === 1 ? exits[0] : null;
}

/**
 * Move towards `dir`, then keep following the corridor around its bends until
 * reaching a junction, a dead end or `stopAt` (usually the exit).
 * @param {Maze} maze
 * @param {Point} from
 * @param {Direction} dir
 * @param {Point | null} [stopAt] A cell where the run always ends.
 * @returns {Point[]} Every cell entered, in order; empty when the first step is blocked.
 */
export function corridorRun(maze, from, dir, stopAt = null) {
  const path = [];
  const limit = maze.width * maze.height;
  let position = from;
  let heading = dir;
  while (heading && path.length < limit) {
    const next = tryStep(maze, position, heading);
    if (!next) break;
    path.push(next);
    position = next;
    if (stopAt && samePoint(next, stopAt)) break;
    heading = corridorExit(maze, next, heading);
  }
  return path;
}
