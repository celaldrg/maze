import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_SPEED, createMotion } from '../src/motion.js';

const cell = (x, y) => ({ x, y });
const near = (actual, expected) => {
  assert.ok(
    Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9,
    `${actual.x},${actual.y} is close to ${expected.x},${expected.y}`,
  );
};

test('starts idle on the start cell', () => {
  const motion = createMotion(cell(2, 3));
  assert.deepEqual(motion.position, cell(2, 3));
  assert.equal(motion.idle, true);
  assert.deepEqual(motion.pending, []);
});

test('glides one step at the base speed', () => {
  const motion = createMotion(cell(0, 0));
  motion.follow([cell(1, 0)]);
  assert.equal(motion.idle, false);
  motion.update(1000 / BASE_SPEED / 2);
  near(motion.position, cell(0.5, 0));
  assert.deepEqual(motion.pending, [cell(1, 0)]);
  motion.update(1000 / BASE_SPEED);
  assert.deepEqual(motion.position, cell(1, 0));
  assert.equal(motion.idle, true);
});

test('follows a bent path cell by cell and ends exactly on the last cell', () => {
  const motion = createMotion(cell(0, 0));
  motion.follow([cell(1, 0), cell(1, 1), cell(2, 1)]);
  const queued = [];
  for (let i = 0; i < 200 && !motion.idle; i += 1) {
    motion.update(5);
    const { x, y } = motion.position;
    assert.ok(Number.isInteger(x) || Number.isInteger(y), 'stays on the corridor lines and never cuts a corner');
    queued.push(motion.pending.length);
  }
  assert.deepEqual(motion.position, cell(2, 1));
  assert.deepEqual([...new Set(queued)], [3, 2, 1, 0], 'cells are reached in order');
});

test('a long queue moves faster than a single step', () => {
  const single = createMotion(cell(0, 0));
  single.follow([cell(1, 0)]);
  single.update(30);
  const run = createMotion(cell(0, 0));
  run.follow(Array.from({ length: 12 }, (_, i) => cell(i + 1, 0)));
  run.update(30);
  assert.ok(run.position.x > single.position.x * 2);
});

test('jump places the dot at once and drops the queue', () => {
  const motion = createMotion(cell(0, 0));
  motion.follow([cell(1, 0), cell(2, 0)]);
  motion.update(10);
  motion.jump(cell(5, 5));
  assert.deepEqual(motion.position, cell(5, 5));
  assert.equal(motion.idle, true);
  motion.update(1000);
  assert.deepEqual(motion.position, cell(5, 5));
});

test('ignores non-positive and invalid time steps', () => {
  const motion = createMotion(cell(0, 0));
  motion.follow([cell(1, 0)]);
  for (const dt of [0, -50, NaN, undefined]) motion.update(dt);
  assert.deepEqual(motion.position, cell(0, 0));
});

test('position and pending are copies', () => {
  const start = cell(0, 0);
  const motion = createMotion(start);
  const path = [cell(1, 0)];
  motion.follow(path);
  motion.position.x = 9;
  motion.pending[0].x = 9;
  path[0].x = 9;
  start.x = 9;
  assert.deepEqual(motion.position, cell(0, 0));
  assert.deepEqual(motion.pending, [cell(1, 0)]);
});
