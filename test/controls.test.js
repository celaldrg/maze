import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOLD_DELAY_MS, SWIPE_MIN_DISTANCE, createHold, directionFromKey, directionFromSwipe,
} from '../src/controls.js';

test('arrow keys and WASD map to directions', () => {
  const cases = [
    ['ArrowUp', 'up'], ['ArrowRight', 'right'], ['ArrowDown', 'down'], ['ArrowLeft', 'left'],
    ['w', 'up'], ['a', 'left'], ['s', 'down'], ['d', 'right'], ['W', 'up'], ['D', 'right'],
  ];
  for (const [key, dir] of cases) assert.equal(directionFromKey({ key }), dir, key);
});

test('physical key codes keep WASD working on other keyboard layouts', () => {
  assert.equal(directionFromKey({ key: 'ğ', code: 'KeyW' }), 'up');
  assert.equal(directionFromKey({ key: 'ü', code: 'KeyS' }), 'down');
  assert.equal(directionFromKey({ code: 'KeyA' }), 'left');
});

test('other keys are ignored', () => {
  for (const event of [{ key: 'Enter', code: 'Enter' }, { key: ' ', code: 'Space' }, { key: 'q', code: 'KeyQ' },
    { key: 'constructor' }, { key: 42 }, {}]) {
    assert.equal(directionFromKey(event), null);
  }
});

test('swipes follow the dominant axis', () => {
  assert.equal(directionFromSwipe(80, 10), 'right');
  assert.equal(directionFromSwipe(-80, 30), 'left');
  assert.equal(directionFromSwipe(5, 60), 'down');
  assert.equal(directionFromSwipe(-20, -60), 'up');
});

test('short or invalid swipes are ignored', () => {
  assert.equal(directionFromSwipe(SWIPE_MIN_DISTANCE - 1, 0), null);
  assert.equal(directionFromSwipe(0, 0), null);
  assert.equal(directionFromSwipe(NaN, 100), null);
  assert.equal(directionFromSwipe(100, Infinity), null);
  assert.equal(directionFromSwipe(30, 0, 50), null);
  assert.equal(directionFromSwipe(SWIPE_MIN_DISTANCE, 0), 'right');
});

test('a hold fires once, after the delay', () => {
  const hold = createHold(200);
  hold.press('right', 1000);
  assert.equal(hold.poll(1000), null);
  assert.equal(hold.poll(1199), null);
  assert.equal(hold.poll(1200), 'right');
  assert.equal(hold.poll(1500), null, 'only once per press');
});

test('releasing ends the hold; releasing another direction does not', () => {
  const hold = createHold(100);
  hold.press('up', 0);
  hold.release('down');
  assert.equal(hold.poll(150), 'up');
  hold.press('left', 200);
  hold.release('left');
  assert.equal(hold.poll(400), null);
  hold.press('down', 500);
  hold.release();
  assert.equal(hold.poll(700), null, 'release() without a direction clears any hold');
});

test('a new press replaces the old hold and restarts the delay', () => {
  const hold = createHold(100);
  hold.press('up', 0);
  hold.press('left', 80);
  assert.equal(hold.poll(120), null);
  assert.equal(hold.poll(180), 'left');
});

test('the default hold delay is short but deliberate', () => {
  assert.ok(HOLD_DELAY_MS >= 150 && HOLD_DELAY_MS <= 400);
  const hold = createHold();
  hold.press('down', 0);
  assert.equal(hold.poll(HOLD_DELAY_MS - 1), null);
  assert.equal(hold.poll(HOLD_DELAY_MS), 'down');
});
