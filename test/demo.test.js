import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SEED, createDemoGame } from '../src/demo.js';
import { STATUS, TRAIL_LENGTH, createGame } from '../src/game.js';
import { directionBetween } from '../src/maze.js';
import { shortestPath } from '../src/solver.js';

test('the demo is a 16x16 backtracker maze built from DEMO_SEED', () => {
  const state = createDemoGame().getState();
  assert.equal(state.levelId, '16x16');
  assert.equal(state.algorithm, 'backtracker');
  const reference = createGame({ seed: DEMO_SEED, level: state.level, algorithm: 'backtracker' }).getState();
  assert.deepEqual(state.maze.walls, reference.maze.walls);
});

test('the demo player stands halfway along the solution with a visible trail', () => {
  const state = createDemoGame().getState();
  const path = shortestPath(state.maze, state.start, state.exit);
  const halfway = Math.floor((path.length - 1) / 2);
  assert.ok(path.length >= 60, 'the solution is long enough to look good');
  assert.deepEqual(state.player, path[halfway]);
  assert.equal(state.moves, halfway);
  assert.equal(state.status, STATUS.PLAYING);
  assert.ok(state.elapsedMs > 0);
  assert.deepEqual(state.trail, path.slice(0, halfway + 1).slice(-TRAIL_LENGTH));
  assert.ok(state.trail.length >= 20, 'the trail is visible');
  assert.equal(state.assisted, false);
  assert.equal(state.solution, null);
});

test('the demo is identical on every call', () => {
  assert.deepEqual(createDemoGame().getState(), createDemoGame().getState());
});

test('the demo can be played on to the exit without saving a best time', () => {
  const game = createDemoGame();
  const { maze, player, exit } = game.getState();
  const rest = shortestPath(maze, player, exit);
  for (let i = 1; i < rest.length; i += 1) game.move(directionBetween(rest[i - 1], rest[i]));
  const state = game.getState();
  assert.equal(state.status, STATUS.WON);
  assert.equal(state.best, null);
  assert.equal(state.result.newBest, false);
});
