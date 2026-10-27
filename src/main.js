/**
 * Entry point: connects the game logic, the canvas renderer, the HUD and the
 * input handlers, and runs the animation loop. `?demo` opens a fixed mid-game
 * position (used for the README screenshot).
 * @module main
 */

import { createHold } from './controls.js';
import { createDemoGame } from './demo.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { otherLanguage } from './i18n.js';
import { bindInput } from './input.js';
import { createMotion } from './motion.js';
import { corridorExit } from './player.js';
import { createRecords } from './records.js';
import { createRenderer } from './renderer.js';
import { loadSettings, saveSettings } from './settings.js';
import { storage } from './storage.js';

const MAX_FRAME_MS = 250;
const PULSE_MS = 2600;
const STILL_PULSE = 0.6;
const BURST_MS = 1100;

function start() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  const settings = loadSettings(storage);
  const game = demo
    ? createDemoGame()
    : createGame({ level: settings.level, algorithm: settings.algorithm, records: createRecords(storage) });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.getElementById('stage');
  const wrap = document.getElementById('board-wrap');
  const board = document.getElementById('board');
  const renderer = createRenderer(board);
  const motion = createMotion(game.getState().player);
  const hold = createHold();
  // The demo keeps its clock and glow still until the first move, so screenshots repeat exactly.
  let frozen = demo;
  let lastFrame = null;
  let boardSize = 0;
  let winPending = false;
  let burstStart = null;
  let solutionStart = null;

  const hud = createHud({
    restart() {
      game.restart();
      resetView();
    },
    newMaze() {
      game.newMaze();
      resetView();
    },
    nextLevel() {
      game.nextLevel();
      rememberChoice();
      resetView();
    },
    setLevel(index) {
      game.setLevel(index);
      rememberChoice();
      resetView();
    },
    setAlgorithm(name) {
      game.setAlgorithm(name);
      rememberChoice();
      resetView();
    },
    toggleSolution,
    toggleLanguage,
  });
  hud.setLanguage(settings.lang);
  bindInput(
    { board, pad: document.getElementById('pad') },
    { press, release: (dir) => hold.release(dir), swipe: (dir) => show(game.run(dir)) },
  );
  new ResizeObserver(fit).observe(stage);
  document.addEventListener('visibilitychange', () => {
    lastFrame = null;
    hold.release();
  });
  requestAnimationFrame(frame);

  /** A tap steps one cell; keeping the direction down runs on to the next junction. */
  function press(dir) {
    const result = game.move(dir);
    show(result);
    if (result.moved && !result.won) hold.press(dir, performance.now());
  }

  function runOn(dir) {
    const { maze, player } = game.getState();
    const forward = corridorExit(maze, player, dir);
    if (forward) show(game.run(forward));
  }

  function show(result) {
    if (!result.moved) return;
    frozen = false;
    if (reducedMotion.matches) motion.jump(result.path[result.path.length - 1]);
    else motion.follow(result.path);
    if (result.won) {
      winPending = true;
      hold.release();
    }
  }

  /** Keep the chosen level and algorithm for the next visit. */
  function rememberChoice() {
    const { level, algorithm } = game.getState();
    Object.assign(settings, { level, algorithm });
    saveSettings(storage, settings);
  }

  /** After a new or restarted round: put the dot on the start and clear effects. */
  function resetView() {
    hold.release();
    frozen = false;
    winPending = false;
    burstStart = null;
    solutionStart = null;
    motion.jump(game.getState().player);
    hud.hideWin();
  }

  function toggleSolution() {
    if (game.getState().solution) {
      game.hideSolution();
    } else {
      game.showSolution();
      solutionStart = performance.now();
    }
  }

  function toggleLanguage() {
    settings.lang = otherLanguage(settings.lang);
    saveSettings(storage, settings);
    hud.setLanguage(settings.lang);
  }

  function fit() {
    const size = Math.floor(Math.min(stage.clientWidth, stage.clientHeight));
    if (size === boardSize) return;
    boardSize = size;
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    renderer.resize(size);
    paint(performance.now());
  }

  function frame(now) {
    const dt = lastFrame === null ? 0 : Math.min(now - lastFrame, MAX_FRAME_MS);
    lastFrame = now;
    if (!frozen) game.update(dt);
    const held = hold.poll(now);
    if (held) runOn(held);
    motion.update(dt);
    if (winPending && motion.idle) {
      winPending = false;
      burstStart = now;
      hud.showWin(game.getState());
    }
    if (burstStart !== null && now - burstStart > BURST_MS) burstStart = null;
    paint(now);
    requestAnimationFrame(frame);
  }

  function paint(now) {
    const state = game.getState();
    const still = frozen || reducedMotion.matches;
    renderer.draw(state, {
      player: motion.position,
      pending: motion.pending,
      reveal: still || solutionStart === null ? 1 : (now - solutionStart) / revealMs(state.solution),
      pulse: still ? STILL_PULSE : 0.5 - 0.5 * Math.cos((now / PULSE_MS) * Math.PI * 2),
      burst: still || burstStart === null ? null : (now - burstStart) / BURST_MS,
    });
    hud.render(state);
  }
}

/** The solution draws itself in over a time that grows with its length. */
function revealMs(path) {
  return Math.min(1600, 260 + (path ? path.length : 0) * 30);
}

start();
