import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, generateMaze } from '../src/generators.js';
import { DIRECTIONS, createMaze, hasWall } from '../src/maze.js';
import { corridorExit, corridorRun, tryStep } from '../src/player.js';
import { createRng } from '../src/rng.js';
import { DELTA, buildMaze } from '../test-support/helpers.js';

const cell = (x, y) => ({ x, y });

describe('tryStep', () => {
  test('moves exactly through open passages and never through walls', () => {
    for (const algorithm of ALGORITHMS) {
      for (let seed = 1; seed <= 5; seed += 1) {
        const maze = generateMaze(algorithm, 12, 12, createRng(seed));
        for (let y = 0; y < maze.height; y += 1) {
          for (let x = 0; x < maze.width; x += 1) {
            for (const dir of DIRECTIONS) {
              const result = tryStep(maze, cell(x, y), dir);
              if (hasWall(maze, x, y, dir)) {
                assert.equal(result, null, `${algorithm} ${x},${y} ${dir} is blocked`);
              } else {
                assert.deepEqual(result, cell(x + DELTA[dir].dx, y + DELTA[dir].dy));
              }
            }
          }
        }
      }
    }
  });

  test('a fully walled maze allows no move at all', () => {
    const maze = createMaze(4, 4);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        for (const dir of DIRECTIONS) assert.equal(tryStep(maze, cell(x, y), dir), null);
      }
    }
  });

  test('the outer border is never crossed', () => {
    for (const algorithm of ALGORITHMS) {
      const maze = generateMaze(algorithm, 8, 8, createRng(3));
      for (let i = 0; i < 8; i += 1) {
        assert.equal(tryStep(maze, cell(i, 0), 'up'), null);
        assert.equal(tryStep(maze, cell(i, 7), 'down'), null);
        assert.equal(tryStep(maze, cell(0, i), 'left'), null);
        assert.equal(tryStep(maze, cell(7, i), 'right'), null);
      }
    }
  });
});

// (0,0)-(1,0)-(2,0)  (3,0)
//               |      |
//             (2,1)-(3,1)      (2,1) is a junction: up, right and down are open.
//               |
//       (1,2)-(2,2)
const maze = buildMaze(4, 3, [
  [0, 0, 'right'], [1, 0, 'right'], [2, 0, 'down'],
  [2, 1, 'right'], [3, 1, 'up'], [2, 1, 'down'], [2, 2, 'left'],
]);

describe('corridorExit', () => {
  test('a straight corridor leads on in the same direction', () => {
    assert.equal(corridorExit(maze, cell(1, 0), 'right'), 'right');
  });

  test('a bend turns the heading', () => {
    assert.equal(corridorExit(maze, cell(2, 0), 'right'), 'down');
    assert.equal(corridorExit(maze, cell(3, 1), 'right'), 'up');
    assert.equal(corridorExit(maze, cell(2, 2), 'down'), 'left');
  });

  test('a junction or a dead end has no single way on', () => {
    assert.equal(corridorExit(maze, cell(2, 1), 'down'), null, 'junction');
    assert.equal(corridorExit(maze, cell(3, 0), 'up'), null, 'dead end');
    assert.equal(corridorExit(maze, cell(0, 0), 'left'), null, 'only the way back is open');
  });

  test('never points through a wall', () => {
    const generated = generateMaze('kruskal', 12, 12, createRng(9));
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        for (const heading of DIRECTIONS) {
          const dir = corridorExit(generated, cell(x, y), heading);
          if (dir) assert.equal(tryStep(generated, cell(x, y), dir) !== null, true);
        }
      }
    }
  });
});

describe('corridorRun', () => {

  test('follows bends and stops at a junction', () => {
    assert.deepEqual(corridorRun(maze, cell(0, 0), 'right'), [cell(1, 0), cell(2, 0), cell(2, 1)]);
  });

  test('stops at a dead end', () => {
    assert.deepEqual(corridorRun(maze, cell(2, 1), 'right'), [cell(3, 1), cell(3, 0)]);
    assert.deepEqual(corridorRun(maze, cell(2, 1), 'down'), [cell(2, 2), cell(1, 2)]);
  });

  test('stops on the stopAt cell', () => {
    assert.deepEqual(corridorRun(maze, cell(0, 0), 'right', cell(2, 0)), [cell(1, 0), cell(2, 0)]);
  });

  test('returns no cells when the first step is blocked', () => {
    assert.deepEqual(corridorRun(maze, cell(0, 0), 'down'), []);
    assert.deepEqual(corridorRun(maze, cell(0, 0), 'up'), []);
  });

  test('only ever crosses open passages', () => {
    const generated = generateMaze('prim', 16, 16, createRng(8));
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        for (const dir of DIRECTIONS) {
          let from = cell(x, y);
          for (const next of corridorRun(generated, from, dir)) {
            const side = DIRECTIONS.find((d) => from.x + DELTA[d].dx === next.x && from.y + DELTA[d].dy === next.y);
            assert.ok(side && !hasWall(generated, from.x, from.y, side));
            from = next;
          }
        }
      }
    }
  });

  test('cannot loop forever in a maze that has a cycle', () => {
    const ring = buildMaze(2, 2, [[0, 0, 'right'], [1, 0, 'down'], [1, 1, 'left'], [0, 1, 'up']]);
    assert.equal(corridorRun(ring, cell(0, 0), 'right').length, 4);
  });
});
