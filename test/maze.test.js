import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS,
  canMove,
  carve,
  createMaze,
  directionBetween,
  hasWall,
  inBounds,
  isDirection,
  neighbors,
  openDirections,
  opposite,
  samePoint,
  step,
  toIndex,
  toPoint,
} from '../src/maze.js';

test('a new maze has every wall closed', () => {
  const maze = createMaze(5, 3);
  assert.equal(maze.width, 5);
  assert.equal(maze.height, 3);
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      for (const dir of DIRECTIONS) {
        assert.equal(hasWall(maze, x, y, dir), true);
        assert.equal(canMove(maze, x, y, dir), false);
      }
    }
  }
});

test('invalid sizes are rejected', () => {
  for (const [width, height] of [[0, 5], [5, 0], [-1, 3], [2.5, 2], [NaN, 2], ['4', 4]]) {
    assert.throws(() => createMaze(width, height), RangeError);
  }
});

test('carving opens the shared wall on both sides and nothing else', () => {
  const maze = createMaze(3, 3);
  carve(maze, 1, 1, 'right');
  assert.equal(hasWall(maze, 1, 1, 'right'), false);
  assert.equal(hasWall(maze, 2, 1, 'left'), false);
  assert.equal(canMove(maze, 1, 1, 'right'), true);
  assert.equal(canMove(maze, 2, 1, 'left'), true);
  let open = 0;
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) open += openDirections(maze, x, y).length;
  }
  assert.equal(open, 2);
});

test('the outer border cannot be carved', () => {
  const maze = createMaze(3, 2);
  const before = Uint8Array.from(maze.walls);
  assert.throws(() => carve(maze, 0, 0, 'up'), RangeError);
  assert.throws(() => carve(maze, 0, 0, 'left'), RangeError);
  assert.throws(() => carve(maze, 2, 1, 'right'), RangeError);
  assert.throws(() => carve(maze, 0, 1, 'down'), RangeError);
  assert.throws(() => carve(maze, 5, 5, 'left'), RangeError);
  assert.deepEqual(maze.walls, before);
});

test('cells outside the maze count as solid', () => {
  const maze = createMaze(2, 2);
  carve(maze, 0, 0, 'right');
  assert.equal(hasWall(maze, -1, 0, 'right'), true);
  assert.equal(canMove(maze, -1, 0, 'right'), false);
  assert.equal(canMove(maze, 2, 0, 'left'), false);
  assert.equal(inBounds(maze, 1, 1), true);
  assert.equal(inBounds(maze, 2, 1), false);
  assert.equal(inBounds(maze, 0, -1), false);
  assert.equal(inBounds(maze, 0.5, 0), false);
});

test('neighbors respect the grid edges', () => {
  const maze = createMaze(3, 3);
  assert.deepEqual(neighbors(maze, 0, 0), [{ x: 1, y: 0, dir: 'right' }, { x: 0, y: 1, dir: 'down' }]);
  assert.equal(neighbors(maze, 1, 0).length, 3);
  assert.equal(neighbors(maze, 1, 1).length, 4);
  assert.equal(neighbors(maze, 2, 2).length, 2);
});

test('openDirections lists exactly the carved passages', () => {
  const maze = createMaze(3, 3);
  carve(maze, 1, 1, 'up');
  carve(maze, 1, 1, 'left');
  assert.deepEqual(openDirections(maze, 1, 1), ['up', 'left']);
  assert.deepEqual(openDirections(maze, 1, 0), ['down']);
  assert.deepEqual(openDirections(maze, 0, 1), ['right']);
  assert.deepEqual(openDirections(maze, 2, 2), []);
});

test('direction helpers agree with each other', () => {
  const origin = { x: 4, y: 4 };
  for (const dir of DIRECTIONS) {
    const next = step(origin, dir);
    assert.equal(Math.abs(next.x - origin.x) + Math.abs(next.y - origin.y), 1);
    assert.equal(directionBetween(origin, next), dir);
    assert.equal(directionBetween(next, origin), opposite(dir));
    assert.equal(opposite(opposite(dir)), dir);
    assert.ok(samePoint(step(next, opposite(dir)), origin));
  }
  assert.deepEqual(step(origin, 'up'), { x: 4, y: 3 });
  assert.deepEqual(step(origin, 'right'), { x: 5, y: 4 });
  assert.equal(directionBetween({ x: 0, y: 0 }, { x: 1, y: 1 }), null);
  assert.equal(directionBetween({ x: 0, y: 0 }, { x: 0, y: 0 }), null);
  assert.equal(directionBetween({ x: 0, y: 0 }, { x: 2, y: 0 }), null);
});

test('isDirection accepts only the four names', () => {
  for (const dir of DIRECTIONS) assert.equal(isDirection(dir), true);
  for (const value of ['north', 'UP', '', 'toString', 'constructor', undefined, null, 1, {}]) {
    assert.equal(isDirection(value), false);
  }
  assert.ok(Object.isFrozen(DIRECTIONS));
});

test('toIndex and toPoint are inverse', () => {
  const maze = createMaze(7, 4);
  for (let index = 0; index < 28; index += 1) {
    const { x, y } = toPoint(maze, index);
    assert.ok(inBounds(maze, x, y));
    assert.equal(toIndex(maze, x, y), index);
  }
});
