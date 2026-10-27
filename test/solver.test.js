import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, generateMaze } from '../src/generators.js';
import { createMaze } from '../src/maze.js';
import { createRng, randomInt } from '../src/rng.js';
import { shortestPath } from '../src/solver.js';
import { assertWalkable, buildMaze, treePath } from '../test-support/helpers.js';

const cell = (x, y) => ({ x, y });

describe('shortestPath', () => {
  test('on generated mazes the path is contiguous and runs from start to goal', () => {
    for (const algorithm of ALGORITHMS) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const maze = generateMaze(algorithm, 16, 16, createRng(seed));
        const start = cell(0, 0);
        const goal = cell(15, 15);
        const path = shortestPath(maze, start, goal);
        assert.deepEqual(path[0], start, 'starts on the start cell');
        assert.deepEqual(path.at(-1), goal, 'ends on the goal cell');
        assertWalkable(maze, path);
        assert.deepEqual(path, treePath(maze, start, goal), 'matches the unique route');
      }
    }
  });

  test('random pairs: the unique route, the same in both directions', () => {
    const pick = createRng(99);
    for (const algorithm of ALGORITHMS) {
      const maze = generateMaze(algorithm, 25, 25, createRng(5));
      for (let i = 0; i < 30; i += 1) {
        const a = cell(randomInt(pick, 25), randomInt(pick, 25));
        const b = cell(randomInt(pick, 25), randomInt(pick, 25));
        const path = shortestPath(maze, a, b);
        assertWalkable(maze, path);
        assert.deepEqual(path, treePath(maze, a, b));
        assert.deepEqual(shortestPath(maze, b, a), [...path].reverse());
      }
    }
  });

  test('takes the shorter of two routes around a loop', () => {
    // 4x3 ring: the top row is a short route, the left, bottom and right sides a long one.
    const maze = buildMaze(4, 3, [
      [0, 0, 'right'], [1, 0, 'right'], [2, 0, 'right'],
      [0, 0, 'down'], [0, 1, 'down'], [0, 2, 'right'], [1, 2, 'right'], [2, 2, 'right'], [3, 2, 'up'], [3, 1, 'up'],
    ]);
    assert.deepEqual(shortestPath(maze, cell(0, 0), cell(3, 0)), [cell(0, 0), cell(1, 0), cell(2, 0), cell(3, 0)]);
    // From (0, 2) the first neighbour tried is "up", which leads to the long way round.
    assert.deepEqual(shortestPath(maze, cell(0, 2), cell(3, 2)), [cell(0, 2), cell(1, 2), cell(2, 2), cell(3, 2)]);
  });

  test('never walks through walls: a sealed-off cell is unreachable', () => {
    const maze = buildMaze(3, 1, [[0, 0, 'right']]);
    assert.deepEqual(shortestPath(maze, cell(0, 0), cell(1, 0)), [cell(0, 0), cell(1, 0)]);
    assert.equal(shortestPath(maze, cell(0, 0), cell(2, 0)), null);
    assert.equal(shortestPath(createMaze(4, 4), cell(0, 0), cell(3, 3)), null);
  });

  test('start and goal on the same cell give a one-cell path', () => {
    assert.deepEqual(shortestPath(createMaze(3, 3), cell(1, 1), cell(1, 1)), [cell(1, 1)]);
  });

  test('cells outside the maze are rejected', () => {
    const maze = createMaze(3, 3);
    assert.throws(() => shortestPath(maze, cell(-1, 0), cell(1, 1)), RangeError);
    assert.throws(() => shortestPath(maze, cell(0, 0), cell(3, 0)), RangeError);
  });
});
