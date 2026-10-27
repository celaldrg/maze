/**
 * DOM side of the interface: translates the page, mirrors the game state in
 * the stats, buttons and win card, and forwards clicks to the given actions.
 * Text is only ever written with textContent and attributes.
 * @module hud
 */

import { formatTime } from './format.js';
import { STATUS } from './game.js';
import { ALGORITHMS } from './generators.js';
import { DEFAULT_LANGUAGE, otherLanguage, translate } from './i18n.js';
import { LEVELS } from './levels.js';

/** @typedef {import('./game.js').GameState} GameState */

/**
 * @typedef {object} HudActions
 * @property {() => void} restart
 * @property {() => void} newMaze
 * @property {() => void} nextLevel
 * @property {() => void} toggleSolution
 * @property {() => void} toggleLanguage
 * @property {(index: number) => void} setLevel
 * @property {(name: string) => void} setAlgorithm
 */

/**
 * @typedef {object} Hud
 * @property {(lang: string) => void} setLanguage Translate every visible string into `lang`.
 * @property {(state: GameState) => void} render Show a state; only values that changed touch the DOM.
 * @property {(state: GameState) => void} showWin Open the win card for a finished round.
 * @property {() => void} hideWin Close the win card.
 */

/**
 * Wire the page's buttons and selects to `actions` and return the display helpers.
 * @param {HudActions} actions
 * @returns {Hud}
 */
export function createHud(actions) {
  const el = findElements();
  let lang = DEFAULT_LANGUAGE;
  /** @type {GameState | null} */
  let shown = null;
  const t = (key, params) => translate(lang, key, params);

  addOptions(el.level, LEVELS.map((_, index) => String(index)));
  addOptions(el.algorithm, ALGORITHMS);
  bindControls(el, actions);

  function setLanguage(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = t('title');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-label]')) {
      node.setAttribute('aria-label', t(node.dataset.i18nLabel));
    }
    for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
    el.lang.textContent = otherLanguage(lang).toUpperCase();
    LEVELS.forEach((level, index) => {
      el.level.options[index].textContent = t('levelOption', { n: index + 1, size: sizeOf(level) });
    });
    ALGORITHMS.forEach((name, index) => {
      el.algorithm.options[index].textContent = t(`algorithm.${name}`);
    });
    if (shown) render(shown);
  }

  function render(state) {
    shown = state;
    setText(el.levelLabel, t('levelOf', { n: state.level + 1, count: state.levelCount }));
    setText(el.levelValue, sizeOf(state));
    setValue(el.level, String(state.level));
    setValue(el.algorithm, state.algorithm);
    setText(el.about, t(`about.${state.algorithm}`));
    setText(el.time, formatTime(state.elapsedMs));
    setText(el.best, state.best === null ? t('noBest') : formatTime(state.best));
    setHidden(el.assisted, !state.assisted);
    const showing = state.solution !== null;
    setText(el.solutionLabel, t(showing ? 'hideSolution' : 'showSolution'));
    setClass(el.solution, 'is-active', showing);
    setDisabled(el.solution, state.status === STATUS.WON);
    setClass(el.startHint, 'is-visible', state.status === STATUS.READY);
    if (!el.win.hidden) renderWin(state);
  }

  function renderWin(state) {
    if (!state.result) return;
    const { timeMs, moves, newBest } = state.result;
    const steps = t(moves === 1 ? 'movesOne' : 'movesMany', { count: moves });
    setText(el.winStats, t('winStats', { time: formatTime(timeMs), moves: steps }));
    setText(el.winNote, winNote(state));
    setClass(el.winNote, 'is-best', newBest);
    const lastLevel = state.level >= state.levelCount - 1;
    setHidden(el.winNew, lastLevel);
    setText(el.winNext, t(lastLevel ? 'newMaze' : 'nextLevel'));
  }

  function winNote({ result, best }) {
    if (result.assisted) return t('winAssisted');
    if (result.newBest) return t('winNewBest');
    return best === null ? '' : t('winBest', { time: formatTime(best) });
  }

  function showWin(state) {
    setHidden(el.win, false);
    renderWin(state);
    el.winNext.focus({ preventScroll: true });
  }

  function hideWin() {
    setHidden(el.win, true);
  }

  return { setLanguage, render, showWin, hideWin };
}

function findElements() {
  const ids = {
    restart: 'restart',
    lang: 'lang',
    levelLabel: 'level-label',
    levelValue: 'level-value',
    level: 'level',
    assisted: 'assisted',
    time: 'time',
    best: 'best',
    startHint: 'start-hint',
    win: 'win',
    winStats: 'win-stats',
    winNote: 'win-note',
    winNew: 'win-new',
    winNext: 'win-next',
    newMaze: 'new-maze',
    solution: 'solution',
    solutionLabel: 'solution-label',
    algorithm: 'algorithm',
    about: 'algorithm-about',
  };
  return Object.fromEntries(Object.entries(ids).map(([name, id]) => [name, document.getElementById(id)]));
}

function bindControls(el, actions) {
  el.restart.addEventListener('click', () => actions.restart());
  el.lang.addEventListener('click', () => actions.toggleLanguage());
  el.newMaze.addEventListener('click', () => actions.newMaze());
  el.solution.addEventListener('click', () => actions.toggleSolution());
  el.winNew.addEventListener('click', () => actions.newMaze());
  el.winNext.addEventListener('click', () => actions.nextLevel());
  el.level.addEventListener('change', () => {
    actions.setLevel(Number(el.level.value));
    el.level.blur();
  });
  el.algorithm.addEventListener('change', () => {
    actions.setAlgorithm(el.algorithm.value);
    el.algorithm.blur();
  });
}

function addOptions(select, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    select.append(option);
  }
}

function sizeOf({ width, height }) {
  return `${width}×${height}`;
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function setValue(select, value) {
  if (select.value !== value) select.value = value;
}

function setHidden(node, hidden) {
  if (node.hidden !== hidden) node.hidden = hidden;
}

function setDisabled(button, disabled) {
  if (button.disabled !== disabled) button.disabled = disabled;
}

function setClass(node, name, on) {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}
