/**
 * Browser input: keyboard, swipes on the board and the on-screen direction
 * pad. Raw events become press, release and swipe calls; what a direction does
 * is decided by the caller.
 * @module input
 */

import { directionFromKey, directionFromSwipe } from './controls.js';

/** @typedef {import('./maze.js').Direction} Direction */

/**
 * @typedef {object} InputHandlers
 * @property {(dir: Direction) => void} press A direction went down (key or pad button).
 * @property {(dir?: Direction) => void} release It came up again; without a direction, everything did.
 * @property {(dir: Direction) => void} swipe The board was swiped towards `dir`.
 */

const TEXT_FIELDS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

/**
 * Listen for player input and report it to `handlers`.
 * @param {{ board: HTMLElement, pad: HTMLElement }} elements The canvas and the pad container.
 * @param {InputHandlers} handlers
 */
export function bindInput({ board, pad }, handlers) {
  bindKeyboard(pad, handlers);
  bindSwipe(board, handlers.swipe);
  for (const button of pad.querySelectorAll('[data-dir]')) bindPadButton(button, handlers);
}

/**
 * Arrows and WASD anywhere on the page. A select that was opened with the mouse
 * or a finger hands direction keys back to the game; one reached with the
 * keyboard keeps its own arrow keys.
 */
function bindKeyboard(pad, { press, release }) {
  let pointerTarget = null;
  window.addEventListener('pointerdown', (event) => {
    pointerTarget = event.target;
  }, true);
  window.addEventListener('focusout', (event) => {
    if (event.target === pointerTarget) pointerTarget = null;
  });
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const dir = directionFromKey(event);
    if (!dir) return;
    if (isTextField(event.target)) {
      if (event.target !== pointerTarget) return;
      event.target.blur();
    }
    event.preventDefault();
    if (event.repeat) return;
    light(padButton(pad, dir), true);
    press(dir);
  });
  window.addEventListener('keyup', (event) => {
    const dir = directionFromKey(event);
    if (!dir) return;
    light(padButton(pad, dir), false);
    release(dir);
  });
  window.addEventListener('blur', () => {
    for (const button of pad.querySelectorAll('[data-dir]')) light(button, false);
    release();
  });
}

/**
 * Swipes: a drag that travels far enough in one direction fires once; turning
 * mid-drag fires the new direction, so one gesture can steer around corners.
 */
function bindSwipe(board, swipe) {
  /** @type {{ id: number, x: number, y: number, last: Direction | null } | null} */
  let drag = null;
  board.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, last: null };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dir = directionFromSwipe(event.clientX - drag.x, event.clientY - drag.y);
    if (!dir) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (dir === drag.last) return;
    drag.last = dir;
    swipe(dir);
  });
  const end = (event) => {
    if (drag && event.pointerId === drag.id) drag = null;
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
}

/** Pad buttons act like keys: down steps, holding runs on, up lets go. */
function bindPadButton(button, { press, release }) {
  const dir = /** @type {Direction} */ (button.dataset.dir);
  let down = false;
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    down = true;
    light(button, true);
    press(dir);
  });
  const letGo = () => {
    if (!down) return;
    down = false;
    light(button, false);
    release(dir);
  };
  button.addEventListener('pointerup', letGo);
  button.addEventListener('pointercancel', letGo);
  button.addEventListener('lostpointercapture', letGo);
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    press(dir);
    release(dir);
  });
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

function padButton(pad, dir) {
  return pad.querySelector(`[data-dir="${dir}"]`);
}

function light(button, on) {
  if (button) button.classList.toggle('is-pressed', on);
}

function isTextField(target) {
  return target instanceof HTMLElement && (TEXT_FIELDS.has(target.tagName) || target.isContentEditable);
}
