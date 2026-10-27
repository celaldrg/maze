/**
 * Shared test helpers. They read mazes only through `hasWall` and use their own
 * direction tables and searches, so the checks stay independent of the
 * generators, the solver and the player code under test.
 *
 * This file lives outside `test/` because `node --test` runs every file there
 * and would report it as a test of its own.
 */

import assert from 'node:assert/strict';
import { carve, createMaze, hasWall } from '../src/maze.js';

export const DELTA = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1 }),
  right: Object.freeze({ dx: 1, dy: 0 }),
  down: Object.freeze({ dx: 0, dy: 1 }),
  left: Object.freeze({ dx: -1, dy: 0 }),
});
const OPPOSITE = Object.freeze({ up: 'down', right: 'left', down: 'up', left: 'right' });
const SIDES = Object.keys(DELTA);

const key = (cell) => `${cell.x},${cell.y}`;
const inside = (maze, x, y) => x >= 0 && y >= 0 && x < maze.width && y < maze.height;

/**
 * Count what makes a maze perfect: open passages (each once), cells reachable
 * from (0, 0), walls open on one side only, and openings in the outer border.
 */
export function analyzeMaze(maze) {
  let passages = 0;
  let asymmetricWalls = 0;
  let borderOpenings = 0;
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      for (const side of SIDES) {
        const open = !hasWall(maze, x, y, side);
        const nx = x + DELTA[side].dx;
        const ny = y + DELTA[side].dy;
        if (!inside(maze, nx, ny)) {
          if (open) borderOpenings += 1;
        } else {
          if (open === hasWall(maze, nx, ny, OPPOSITE[side])) asymmetricWalls += 1;
          if (open && (side === 'right' || side === 'down')) passages += 1;
        }
      }
    }
  }
  return { passages, reachable: floodFill(maze).size, asymmetricWalls, borderOpenings };
}

function floodFill(maze) {
  const seen = new Set(['0,0']);
  const stack = [{ x: 0, y: 0 }];
  while (stack.length > 0) {
    const cell = stack.pop();
    for (const side of SIDES) {
      const next = { x: cell.x + DELTA[side].dx, y: cell.y + DELTA[side].dy };
      if (!hasWall(maze, cell.x, cell.y, side) && inside(maze, next.x, next.y) && !seen.has(key(next))) {
        seen.add(key(next));
        stack.push(next);
      }
    }
  }
  return seen;
}

/**
 * The route between two cells found by depth-first search. In a perfect maze
 * (a spanning tree) this is the one and only simple path, hence the shortest.
 */
export function treePath(maze, from, to) {
  const parents = new Map([[key(from), null]]);
  const stack = [from];
  while (stack.length > 0 && !parents.has(key(to))) {
    const cell = stack.pop();
    for (const side of SIDES) {
      const next = { x: cell.x + DELTA[side].dx, y: cell.y + DELTA[side].dy };
      if (!hasWall(maze, cell.x, cell.y, side) && inside(maze, next.x, next.y) && !parents.has(key(next))) {
        parents.set(key(next), cell);
        stack.push(next);
      }
    }
  }
  if (!parents.has(key(to))) return null;
  const path = [];
  for (let cell = to; cell; cell = parents.get(key(cell))) path.push({ x: cell.x, y: cell.y });
  return path.reverse();
}

/** Assert that a path is non-empty, has no repeats and only crosses open passages. */
export function assertWalkable(maze, path) {
  assert.ok(Array.isArray(path) && path.length > 0, 'path is a non-empty array');
  const seen = new Set();
  path.forEach((cell, i) => {
    assert.ok(inside(maze, cell.x, cell.y), `cell ${i} lies inside the maze`);
    assert.ok(!seen.has(key(cell)), `cell ${i} is not repeated`);
    seen.add(key(cell));
    if (i === 0) return;
    const prev = path[i - 1];
    const side = SIDES.find((s) => prev.x + DELTA[s].dx === cell.x && prev.y + DELTA[s].dy === cell.y);
    assert.ok(side, `cells ${i - 1} and ${i} are neighbours`);
    assert.equal(hasWall(maze, prev.x, prev.y, side), false, `no wall between cells ${i - 1} and ${i}`);
  });
}

/** Build a maze by hand from a list of `[x, y, direction]` passages. */
export function buildMaze(width, height, passages) {
  const maze = createMaze(width, height);
  for (const [x, y, dir] of passages) carve(maze, x, y, dir);
  return maze;
}

/** In-memory stand-in for `localStorage`. */
export function memoryBackend() {
  const data = new Map();
  return {
    getItem: (name) => (data.has(name) ? data.get(name) : null),
    setItem: (name, value) => {
      data.set(name, String(value));
    },
  };
}
