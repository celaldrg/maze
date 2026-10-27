/**
 * Breadth-first search solver.
 * @module solver
 */

import { inBounds, openDirections, step, toIndex, toPoint } from './maze.js';

/** @typedef {import('./maze.js').Maze} Maze */
/** @typedef {import('./maze.js').Point} Point */

/**
 * Shortest path between two cells, following open passages only.
 * @param {Maze} maze
 * @param {Point} start
 * @param {Point} goal
 * @returns {Point[] | null} Cells from `start` to `goal` (both included), or null when unreachable.
 * @throws {RangeError} when `start` or `goal` lies outside the maze.
 */
export function shortestPath(maze, start, goal) {
  assertCell(maze, start);
  assertCell(maze, goal);
  const startIndex = toIndex(maze, start.x, start.y);
  const goalIndex = toIndex(maze, goal.x, goal.y);
  const cameFrom = new Int32Array(maze.width * maze.height).fill(-1);
  cameFrom[startIndex] = startIndex;
  const queue = [startIndex];
  for (let head = 0; head < queue.length && cameFrom[goalIndex] === -1; head += 1) {
    const cell = toPoint(maze, queue[head]);
    for (const dir of openDirections(maze, cell.x, cell.y)) {
      const next = step(cell, dir);
      const nextIndex = toIndex(maze, next.x, next.y);
      if (cameFrom[nextIndex] === -1) {
        cameFrom[nextIndex] = queue[head];
        queue.push(nextIndex);
      }
    }
  }
  return cameFrom[goalIndex] === -1 ? null : tracePath(maze, cameFrom, startIndex, goalIndex);
}

function tracePath(maze, cameFrom, startIndex, goalIndex) {
  const path = [];
  for (let index = goalIndex; index !== startIndex; index = cameFrom[index]) {
    path.push(toPoint(maze, index));
  }
  path.push(toPoint(maze, startIndex));
  return path.reverse();
}

function assertCell(maze, point) {
  if (!inBounds(maze, point.x, point.y)) {
    throw new RangeError(`Cell ${point.x},${point.y} is outside the maze`);
  }
}
