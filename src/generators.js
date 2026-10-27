/**
 * Perfect-maze generators. Each one carves a spanning tree of the grid, so every
 * cell is reachable and there is exactly one path between any two cells.
 * All randomness comes from the injected `rng`.
 * @module generators
 */

import { carve, createMaze, neighbors, step, toIndex } from './maze.js';
import { randomInt, shuffle } from './rng.js';
import { createUnionFind } from './unionfind.js';

/** @typedef {import('./maze.js').Maze} Maze */
/** @typedef {import('./maze.js').Point} Point */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * Recursive backtracker, written as an iterative depth-first search with an
 * explicit stack (no recursion, so large mazes cannot overflow the call stack).
 * @param {number} width
 * @param {number} height
 * @param {Rng} rng
 * @returns {Maze}
 */
export function generateBacktracker(width, height, rng) {
  const maze = createMaze(width, height);
  const visited = new Uint8Array(width * height);
  const first = randomCell(maze, rng);
  visited[toIndex(maze, first.x, first.y)] = 1;
  const stack = [first];
  while (stack.length > 0) {
    const cell = stack[stack.length - 1];
    const options = neighbors(maze, cell.x, cell.y).filter((n) => !visited[toIndex(maze, n.x, n.y)]);
    if (options.length === 0) {
      stack.pop();
    } else {
      const next = options[randomInt(rng, options.length)];
      carve(maze, cell.x, cell.y, next.dir);
      visited[toIndex(maze, next.x, next.y)] = 1;
      stack.push(next);
    }
  }
  return maze;
}

/**
 * Randomized Prim: grow the maze from one cell by opening a random wall from
 * the frontier list whenever it leads to a cell that is not in the maze yet.
 * @param {number} width
 * @param {number} height
 * @param {Rng} rng
 * @returns {Maze}
 */
export function generatePrim(width, height, rng) {
  const maze = createMaze(width, height);
  const inMaze = new Uint8Array(width * height);
  /** @type {Array<{ x: number, y: number, dir: import('./maze.js').Direction }>} */
  const frontier = [];
  const addCell = (cell) => {
    inMaze[toIndex(maze, cell.x, cell.y)] = 1;
    for (const n of neighbors(maze, cell.x, cell.y)) {
      if (!inMaze[toIndex(maze, n.x, n.y)]) frontier.push({ x: cell.x, y: cell.y, dir: n.dir });
    }
  };
  addCell(randomCell(maze, rng));
  while (frontier.length > 0) {
    const wall = takeRandom(frontier, rng);
    const next = step(wall, wall.dir);
    if (!inMaze[toIndex(maze, next.x, next.y)]) {
      carve(maze, wall.x, wall.y, wall.dir);
      addCell(next);
    }
  }
  return maze;
}

/**
 * Randomized Kruskal: visit every inner wall in random order and open it when
 * it joins two cells that are not connected yet (tracked with union-find).
 * @param {number} width
 * @param {number} height
 * @param {Rng} rng
 * @returns {Maze}
 */
export function generateKruskal(width, height, rng) {
  const maze = createMaze(width, height);
  const edges = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x + 1 < width) edges.push({ x, y, dir: 'right' });
      if (y + 1 < height) edges.push({ x, y, dir: 'down' });
    }
  }
  shuffle(rng, edges);
  const sets = createUnionFind(width * height);
  for (const edge of edges) {
    if (sets.count === 1) break;
    const other = step(edge, edge.dir);
    if (sets.union(toIndex(maze, edge.x, edge.y), toIndex(maze, other.x, other.y))) {
      carve(maze, edge.x, edge.y, edge.dir);
    }
  }
  return maze;
}

const GENERATORS = Object.freeze({
  backtracker: generateBacktracker,
  prim: generatePrim,
  kruskal: generateKruskal,
});

/** Names of the available generators, in menu order. */
export const ALGORITHMS = Object.freeze(Object.keys(GENERATORS));

/**
 * Is `name` one of the available generator names?
 * @param {unknown} name
 * @returns {boolean}
 */
export function isAlgorithm(name) {
  return typeof name === 'string' && Object.hasOwn(GENERATORS, name);
}

/**
 * Generate a perfect maze with the named algorithm.
 * @param {string} algorithm One of `ALGORITHMS`.
 * @param {number} width
 * @param {number} height
 * @param {Rng} rng
 * @returns {Maze}
 * @throws {RangeError} for an unknown algorithm or an invalid size.
 */
export function generateMaze(algorithm, width, height, rng) {
  if (!isAlgorithm(algorithm)) throw new RangeError(`Unknown maze algorithm: ${algorithm}`);
  return GENERATORS[algorithm](width, height, rng);
}

function randomCell(maze, rng) {
  return { x: randomInt(rng, maze.width), y: randomInt(rng, maze.height) };
}

function takeRandom(items, rng) {
  const index = randomInt(rng, items.length);
  const item = items[index];
  items[index] = items[items.length - 1];
  items.pop();
  return item;
}
