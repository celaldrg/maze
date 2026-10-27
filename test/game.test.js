import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, TRAIL_LENGTH, createGame } from '../src/game.js';
import { ALGORITHMS, generateMaze } from '../src/generators.js';
import { LEVELS } from '../src/levels.js';
import { DIRECTIONS, directionBetween, hasWall, inBounds, openDirections, opposite, samePoint, step } from '../src/maze.js';
import { corridorRun } from '../src/player.js';
import { BEST_TIMES_KEY, createRecords } from '../src/records.js';
import { createRng, randomInt } from '../src/rng.js';
import { shortestPath } from '../src/solver.js';
import { createStorage } from '../src/storage.js';
import { memoryBackend } from '../test-support/helpers.js';

/** Directions that lead from the player to the exit along the shortest path. */
function solutionDirections(state) {
  const path = shortestPath(state.maze, state.player, state.exit);
  return path.slice(1).map((next, i) => directionBetween(path[i], next));
}

/** Walk to the exit, advancing the clock by `stepMs` before every move. */
function playToExit(game, stepMs) {
  for (const dir of solutionDirections(game.getState())) {
    game.update(stepMs);
    game.move(dir);
  }
  return game.getState();
}

function recordsWithBackend() {
  const backend = memoryBackend();
  return { backend, records: createRecords(createStorage(() => backend)) };
}

describe('createGame', () => {
  test('starts ready on the first level with the player on the start cell', () => {
    const state = createGame({ seed: 1 }).getState();
    assert.equal(state.level, 0);
    assert.equal(state.levelId, '8x8');
    assert.equal(state.levelCount, LEVELS.length);
    assert.equal(state.width, 8);
    assert.equal(state.height, 8);
    assert.equal(state.algorithm, ALGORITHMS[0]);
    assert.deepEqual(state.start, { x: 0, y: 0 });
    assert.deepEqual(state.exit, { x: 7, y: 7 });
    assert.deepEqual(state.player, state.start);
    assert.deepEqual(state.trail, [state.start]);
    assert.equal(state.moves, 0);
    assert.equal(state.elapsedMs, 0);
    assert.equal(state.status, STATUS.READY);
    assert.equal(state.assisted, false);
    assert.equal(state.solution, null);
    assert.equal(state.best, null);
    assert.equal(state.result, null);
  });

  test('the maze can be rebuilt from its seed', () => {
    const state = createGame({ seed: 5, algorithm: 'prim', level: 1 }).getState();
    assert.deepEqual(state.maze.walls, generateMaze('prim', 12, 12, createRng(state.mazeSeed)).walls);
  });

  test('the same seed gives the same sequence of mazes', () => {
    const a = createGame({ seed: 77 });
    const b = createGame({ seed: 77 });
    for (let i = 0; i < 5; i += 1) {
      assert.equal(a.getState().mazeSeed, b.getState().mazeSeed);
      assert.deepEqual(a.getState().maze.walls, b.getState().maze.walls);
      a.newMaze();
      b.newMaze();
    }
    assert.notDeepEqual(createGame({ seed: 1 }).getState().maze.walls, createGame({ seed: 2 }).getState().maze.walls);
  });

  test('accepts every algorithm and rejects unknown ones', () => {
    for (const algorithm of ALGORITHMS) assert.equal(createGame({ seed: 3, algorithm }).getState().algorithm, algorithm);
    assert.throws(() => createGame({ seed: 3, algorithm: 'nope' }), RangeError);
  });

  test('clamps the starting level', () => {
    assert.equal(createGame({ seed: 1, level: 99 }).getState().level, LEVELS.length - 1);
    assert.equal(createGame({ seed: 1, level: -3 }).getState().level, 0);
    assert.equal(createGame({ seed: 1, level: 2 }).getState().width, 16);
  });

  test('works without any options', () => {
    const state = createGame().getState();
    assert.equal(state.status, STATUS.READY);
    assert.ok(Number.isInteger(state.mazeSeed) && state.mazeSeed >= 0 && state.mazeSeed < 2 ** 32);
  });
});

describe('moving', () => {
  test('walls block the player and do not start the timer', () => {
    const game = createGame({ seed: 4 });
    const { maze, player } = game.getState();
    const blocked = DIRECTIONS.filter((dir) => hasWall(maze, player.x, player.y, dir));
    assert.ok(blocked.length >= 2, 'the corner start cell has at least two walls');
    for (const dir of blocked) {
      assert.deepEqual(game.move(dir), { moved: false, won: false, path: [] });
      assert.equal(game.run(dir).moved, false);
    }
    game.update(1000);
    const state = game.getState();
    assert.deepEqual(state.player, player);
    assert.equal(state.moves, 0);
    assert.equal(state.status, STATUS.READY);
    assert.equal(state.elapsedMs, 0);
  });

  test('a long random walk never passes a wall or leaves the grid', () => {
    const game = createGame({ seed: 11, level: 1 });
    const pick = createRng(12);
    for (let i = 0; i < 3000 && game.getState().status !== STATUS.WON; i += 1) {
      const before = game.getState();
      const dir = DIRECTIONS[randomInt(pick, DIRECTIONS.length)];
      const open = !hasWall(before.maze, before.player.x, before.player.y, dir);
      const result = game.move(dir);
      const after = game.getState();
      assert.equal(result.moved, open);
      assert.deepEqual(after.player, open ? step(before.player, dir) : before.player);
      assert.equal(after.moves, before.moves + (open ? 1 : 0));
      assert.ok(inBounds(after.maze, after.player.x, after.player.y));
    }
  });

  test('ignores values that are not directions', () => {
    const game = createGame({ seed: 4 });
    for (const value of ['north', '', 'toString', null, undefined, 42]) {
      assert.equal(game.move(value).moved, false);
      assert.equal(game.run(value).moved, false);
    }
    assert.equal(game.getState().moves, 0);
  });

  test('the first move starts the timer; update() counts only while playing', () => {
    const game = createGame({ seed: 8 });
    game.update(500);
    assert.equal(game.getState().elapsedMs, 0);
    game.move(openDirections(game.getState().maze, 0, 0)[0]);
    assert.equal(game.getState().status, STATUS.PLAYING);
    game.update(250);
    game.update(250);
    for (const bad of [-100, 0, NaN, Infinity, undefined]) game.update(bad);
    assert.equal(game.getState().elapsedMs, 500);
  });

  test('the trail keeps recent cells without repeats and ends on the player', () => {
    const game = createGame({ seed: 13, level: LEVELS.length - 1 });
    const { maze, start, exit } = game.getState();
    const path = shortestPath(maze, start, exit);
    for (const dir of solutionDirections(game.getState())) {
      game.move(dir);
      const { trail, player } = game.getState();
      assert.ok(trail.length <= TRAIL_LENGTH);
      assert.equal(new Set(trail.map((p) => `${p.x},${p.y}`)).size, trail.length);
      assert.deepEqual(trail.at(-1), player);
    }
    assert.deepEqual(game.getState().trail, path.slice(-TRAIL_LENGTH));
  });

  test('stepping back moves a cell to the end of the trail instead of repeating it', () => {
    const game = createGame({ seed: 8 });
    const { maze, start } = game.getState();
    const dir = openDirections(maze, 0, 0)[0];
    game.move(dir);
    game.move(opposite(dir));
    assert.deepEqual(game.getState().trail, [step(start, dir), start]);
    assert.equal(game.getState().moves, 2);
  });

  test('run() follows the corridor like corridorRun and counts every cell', () => {
    const game = createGame({ seed: 21, level: 2 });
    const { maze, player, exit } = game.getState();
    const dir = openDirections(maze, 0, 0)[0];
    const expected = corridorRun(maze, player, dir, exit);
    const result = game.run(dir);
    assert.equal(result.moved, true);
    assert.deepEqual(result.path, expected);
    assert.equal(game.getState().moves, expected.length);
    assert.deepEqual(game.getState().player, expected.at(-1));
  });
});

describe('level completion', () => {
  test('walking the solution wins exactly on the exit cell', () => {
    for (const algorithm of ALGORITHMS) {
      const game = createGame({ seed: 31, algorithm });
      const dirs = solutionDirections(game.getState());
      dirs.forEach((dir, i) => {
        const last = i === dirs.length - 1;
        game.update(100);
        const result = game.move(dir);
        assert.equal(result.moved, true);
        assert.equal(result.won, last, `${algorithm}: step ${i}`);
        assert.equal(game.getState().status, last ? STATUS.WON : STATUS.PLAYING);
      });
      const state = game.getState();
      assert.deepEqual(state.player, state.exit);
      assert.deepEqual(state.result, { timeMs: 100 * (dirs.length - 1), moves: dirs.length, assisted: false, newBest: false });
    }
  });

  test('run() also finishes the level when it reaches the exit', () => {
    const game = createGame({ seed: 41, level: 3 });
    const { maze, start, exit } = game.getState();
    const path = shortestPath(maze, start, exit);
    for (let runs = 0; game.getState().status !== STATUS.WON; runs += 1) {
      assert.ok(runs < path.length, 'reaches the exit in at most one run per cell');
      const { player } = game.getState();
      const index = path.findIndex((p) => samePoint(p, player));
      assert.ok(index >= 0, 'runs along the solution stay on it');
      game.run(directionBetween(player, path[index + 1]));
    }
    assert.equal(game.getState().moves, path.length - 1);
    assert.equal(game.getState().result.moves, path.length - 1);
  });

  test('after winning, moves and the timer are frozen', () => {
    const game = createGame({ seed: 32 });
    const won = playToExit(game, 50);
    for (const dir of DIRECTIONS) {
      assert.equal(game.move(dir).moved, false);
      assert.equal(game.run(dir).moved, false);
    }
    game.update(5000);
    assert.deepEqual(game.getState(), won);
  });

  test('restart() replays the same maze from a clean state', () => {
    const game = createGame({ seed: 33 });
    const fresh = game.getState();
    playToExit(game, 120);
    game.restart();
    const state = game.getState();
    assert.equal(state.maze, fresh.maze, 'the very same maze object');
    assert.deepEqual(state, fresh);
  });

  test('restart() hides the solution but the maze stays assisted', () => {
    const game = createGame({ seed: 34 });
    game.showSolution();
    playToExit(game, 120);
    game.restart();
    const state = game.getState();
    assert.equal(state.solution, null);
    assert.equal(state.assisted, true);
    assert.equal(state.status, STATUS.READY);
    game.newMaze();
    assert.equal(game.getState().assisted, false, 'a new maze starts unassisted');
  });
});

describe('best times', () => {
  test('an unassisted win saves its time through the storage helper', () => {
    const { backend, records } = recordsWithBackend();
    const game = createGame({ seed: 51, records });
    const state = playToExit(game, 200);
    assert.ok(state.result.timeMs > 0);
    assert.equal(state.result.newBest, true);
    assert.equal(state.best, state.result.timeMs);
    assert.deepEqual(JSON.parse(backend.getItem(BEST_TIMES_KEY)), { [state.levelId]: state.result.timeMs });
  });

  test('only a faster run replaces the best time', () => {
    const { records } = recordsWithBackend();
    const game = createGame({ seed: 52, records });
    const first = playToExit(game, 200).result.timeMs;
    game.restart();
    assert.equal(game.getState().best, first);
    const slower = playToExit(game, 300);
    assert.equal(slower.result.newBest, false);
    assert.equal(slower.best, first);
    game.restart();
    const faster = playToExit(game, 100);
    assert.equal(faster.result.newBest, true);
    assert.equal(faster.best, faster.result.timeMs);
    assert.equal(createGame({ seed: 999, records }).getState().best, faster.best);
  });

  test('best times are kept per level', () => {
    const { records } = recordsWithBackend();
    const game = createGame({ seed: 53, records });
    playToExit(game, 100);
    game.nextLevel();
    assert.equal(game.getState().best, null);
    playToExit(game, 100);
    assert.notEqual(records.get(LEVELS[0].id), null);
    assert.equal(records.get(LEVELS[1].id), game.getState().best);
  });

  test('showing the solution marks the round as assisted and keeps it off the records', () => {
    const { backend, records } = recordsWithBackend();
    const game = createGame({ seed: 54, records });
    game.showSolution();
    let state = game.getState();
    assert.equal(state.assisted, true);
    assert.equal(state.status, STATUS.READY);
    assert.deepEqual(state.solution, shortestPath(state.maze, state.player, state.exit));

    game.move(solutionDirections(state)[0]);
    state = game.getState();
    assert.deepEqual(state.solution[0], state.player, 'the hint follows the player');
    assert.deepEqual(state.solution.at(-1), state.exit);

    game.hideSolution();
    assert.equal(game.getState().solution, null);
    assert.equal(game.getState().assisted, true);

    state = playToExit(game, 100);
    assert.equal(state.result.assisted, true);
    assert.equal(state.result.newBest, false);
    assert.equal(state.best, null);
    assert.equal(backend.getItem(BEST_TIMES_KEY), null);
  });

  test('the solution cannot be shown after the win', () => {
    const game = createGame({ seed: 55 });
    playToExit(game, 100);
    game.showSolution();
    assert.equal(game.getState().solution, null);
    assert.equal(game.getState().assisted, false);
  });
});

describe('levels and mazes', () => {
  test('nextLevel() walks through growing sizes and then stays on the last level', () => {
    const game = createGame({ seed: 61 });
    const sizes = [game.getState().width];
    for (let i = 0; i < LEVELS.length + 1; i += 1) {
      game.nextLevel();
      const state = game.getState();
      assert.equal(state.maze.width, state.width);
      assert.equal(state.status, STATUS.READY);
      sizes.push(state.width);
    }
    assert.deepEqual(sizes, [8, 12, 16, 20, 25, 25, 25]);
  });

  test('setLevel() clamps the index and builds a maze of that size', () => {
    const game = createGame({ seed: 62 });
    game.setLevel(3);
    assert.equal(game.getState().levelId, '20x20');
    assert.equal(game.getState().maze.height, 20);
    game.setLevel(-1);
    assert.equal(game.getState().level, 0);
  });

  test('newMaze() keeps the level and algorithm but deals a new maze', () => {
    const game = createGame({ seed: 63, level: 1, algorithm: 'kruskal' });
    const before = game.getState();
    game.move(openDirections(before.maze, 0, 0)[0]);
    game.newMaze();
    const after = game.getState();
    assert.equal(after.level, 1);
    assert.equal(after.algorithm, 'kruskal');
    assert.notEqual(after.mazeSeed, before.mazeSeed);
    assert.notDeepEqual(after.maze.walls, before.maze.walls);
    assert.equal(after.moves, 0);
    assert.equal(after.status, STATUS.READY);
  });

  test('setAlgorithm() switches the generator; an unknown name changes nothing', () => {
    const game = createGame({ seed: 64 });
    game.setAlgorithm('kruskal');
    const state = game.getState();
    assert.equal(state.algorithm, 'kruskal');
    assert.deepEqual(state.maze.walls, generateMaze('kruskal', 8, 8, createRng(state.mazeSeed)).walls);
    assert.throws(() => game.setAlgorithm('nope'), RangeError);
    assert.deepEqual(game.getState(), state);
  });
});

describe('snapshots', () => {
  test('getState() is frozen and later moves do not change an old snapshot', () => {
    const game = createGame({ seed: 71 });
    const before = game.getState();
    assert.ok(Object.isFrozen(before));
    assert.ok(Object.isFrozen(before.trail));
    game.move(openDirections(before.maze, 0, 0)[0]);
    assert.deepEqual(before.player, { x: 0, y: 0 });
    assert.equal(before.moves, 0);
    assert.equal(before.trail.length, 1);
  });

  test('the game object exposes exactly the documented methods', () => {
    assert.deepEqual(Object.keys(createGame({ seed: 1 })).sort(), [
      'getState', 'hideSolution', 'move', 'newMaze', 'nextLevel', 'restart',
      'run', 'setAlgorithm', 'setLevel', 'showSolution', 'update',
    ]);
  });
});
