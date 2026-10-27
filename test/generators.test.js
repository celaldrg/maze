import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALGORITHMS,
  generateBacktracker,
  generateKruskal,
  generateMaze,
  generatePrim,
  isAlgorithm,
} from '../src/generators.js';
import { LEVELS } from '../src/levels.js';
import { DIRECTIONS, hasWall } from '../src/maze.js';
import { createRng } from '../src/rng.js';
import { analyzeMaze } from '../test-support/helpers.js';

const SEEDS_PER_SIZE = 50;

/** Assert the perfect-maze properties for one generated maze. */
function assertPerfect(maze, label) {
  const cells = maze.width * maze.height;
  const report = analyzeMaze(maze);
  assert.equal(report.reachable, cells, `${label}: every cell is reachable`);
  assert.equal(report.passages, cells - 1, `${label}: open passages = cells - 1`);
  assert.equal(report.asymmetricWalls, 0, `${label}: every wall is the same from both sides`);
  assert.equal(report.borderOpenings, 0, `${label}: the outer border is closed`);
}

// DONE criterion. A connected graph on N cells with exactly N - 1 passages is a
// tree, so there is exactly one path between any two cells: the maze is perfect.
describe('DONE: every generated maze is perfect', () => {
  for (const algorithm of ALGORITHMS) {
    for (const { id, width, height } of LEVELS) {
      test(`${algorithm} ${id}, ${SEEDS_PER_SIZE} seeds: connected with exactly cells - 1 passages`, () => {
        for (let seed = 1; seed <= SEEDS_PER_SIZE; seed += 1) {
          assertPerfect(generateMaze(algorithm, width, height, createRng(seed)), `seed ${seed}`);
        }
      });
    }
  }
});

describe('generators', () => {
  test('ALGORITHMS lists the three generators in menu order', () => {
    assert.deepEqual([...ALGORITHMS], ['backtracker', 'prim', 'kruskal']);
    assert.ok(Object.isFrozen(ALGORITHMS));
  });

  test('narrow, tiny and odd-shaped grids are perfect too', () => {
    const shapes = [[1, 1], [1, 9], [9, 1], [2, 2], [3, 7], [31, 17]];
    for (const algorithm of ALGORITHMS) {
      for (const [width, height] of shapes) {
        for (let seed = 1; seed <= 10; seed += 1) {
          assertPerfect(generateMaze(algorithm, width, height, createRng(seed)), `${algorithm} ${width}x${height} seed ${seed}`);
        }
      }
    }
  });

  test('the same seed always builds the same maze', () => {
    for (const algorithm of ALGORITHMS) {
      const a = generateMaze(algorithm, 16, 16, createRng(7));
      const b = generateMaze(algorithm, 16, 16, createRng(7));
      assert.deepEqual(a.walls, b.walls, algorithm);
    }
  });

  test('different seeds build different mazes', () => {
    for (const algorithm of ALGORITHMS) {
      const shapes = new Set();
      for (let seed = 1; seed <= 50; seed += 1) {
        shapes.add(Buffer.from(generateMaze(algorithm, 12, 12, createRng(seed)).walls).toString('hex'));
      }
      assert.ok(shapes.size >= 49, `${algorithm}: ${shapes.size} distinct mazes out of 50`);
    }
  });

  test('the named generators are the ones behind generateMaze', () => {
    const named = { backtracker: generateBacktracker, prim: generatePrim, kruskal: generateKruskal };
    for (const algorithm of ALGORITHMS) {
      assert.deepEqual(
        named[algorithm](10, 10, createRng(3)).walls,
        generateMaze(algorithm, 10, 10, createRng(3)).walls,
        algorithm,
      );
    }
  });

  test('randomness comes only from the injected rng', () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error('Math.random must not be used by the generators');
    };
    try {
      for (const algorithm of ALGORITHMS) generateMaze(algorithm, 12, 12, createRng(1));
    } finally {
      Math.random = original;
    }
  });

  test('the backtracker makes long corridors: fewer dead ends than Prim or Kruskal', () => {
    const deadEnds = (maze) => {
      let count = 0;
      for (let y = 0; y < maze.height; y += 1) {
        for (let x = 0; x < maze.width; x += 1) {
          if (DIRECTIONS.filter((dir) => !hasWall(maze, x, y, dir)).length === 1) count += 1;
        }
      }
      return count;
    };
    const average = (algorithm) => {
      let total = 0;
      for (let seed = 1; seed <= 20; seed += 1) total += deadEnds(generateMaze(algorithm, 20, 20, createRng(seed)));
      return total / 20;
    };
    const backtracker = average('backtracker');
    assert.ok(backtracker < average('prim'), 'backtracker vs prim');
    assert.ok(backtracker < average('kruskal'), 'backtracker vs kruskal');
  });

  test('unknown algorithms and invalid sizes are rejected', () => {
    for (const name of ['nope', '', 'toString', 'constructor', undefined, 3]) {
      assert.equal(isAlgorithm(name), false);
      assert.throws(() => generateMaze(name, 5, 5, createRng(1)), RangeError);
    }
    for (const algorithm of ALGORITHMS) {
      assert.equal(isAlgorithm(algorithm), true);
      assert.throws(() => generateMaze(algorithm, 0, 5, createRng(1)), RangeError);
      assert.throws(() => generateMaze(algorithm, 4, 2.5, createRng(1)), RangeError);
    }
  });
});
