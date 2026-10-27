/**
 * Game session: owns the current maze, player, timer, trail, solution hint and
 * best time. Pure logic with no DOM access; the UI calls the returned methods
 * and renders `getState()` snapshots.
 * @module game
 */

import { ALGORITHMS, generateMaze, isAlgorithm } from './generators.js';
import { LEVELS, clampLevel } from './levels.js';
import { isDirection, samePoint } from './maze.js';
import { corridorRun, tryStep } from './player.js';
import { createRng, randomInt, randomSeed } from './rng.js';
import { shortestPath } from './solver.js';

/** @typedef {import('./maze.js').Maze} Maze */
/** @typedef {import('./maze.js').Point} Point */
/** @typedef {import('./maze.js').Direction} Direction */

/** Round status values. */
export const STATUS = Object.freeze({ READY: 'ready', PLAYING: 'playing', WON: 'won' });

/** Number of recently visited cells kept in the trail. */
export const TRAIL_LENGTH = 48;

const SEED_RANGE = 0x100000000;
const NO_MOVE = Object.freeze({ moved: false, won: false, path: Object.freeze([]) });

/**
 * @typedef {object} GameOptions
 * @property {number} [seed] Seeds the sequence of mazes (random when omitted).
 * @property {number} [level] Starting level index (clamped to `LEVELS`).
 * @property {string} [algorithm] One of `ALGORITHMS` (default: the first one).
 * @property {import('./records.js').Records | null} [records] Best-time book; without it nothing is saved.
 */

/**
 * @typedef {object} RoundResult
 * @property {number} timeMs
 * @property {number} moves
 * @property {boolean} assisted True when the solution was shown; assisted runs never set a best time.
 * @property {boolean} newBest
 */

/**
 * @typedef {object} GameState Read-only snapshot returned by `getState()`.
 * @property {number} level Level index into `LEVELS`.
 * @property {string} levelId For example "16x16".
 * @property {number} levelCount
 * @property {number} width
 * @property {number} height
 * @property {string} algorithm
 * @property {number} mazeSeed Reproduces this maze: `generateMaze(algorithm, width, height, createRng(mazeSeed))`.
 * @property {Maze} maze Do not mutate.
 * @property {Point} start Top-left cell.
 * @property {Point} exit Bottom-right cell.
 * @property {Point} player
 * @property {readonly Point[]} trail Recently visited cells without repeats, oldest first; the last one is the player's cell.
 * @property {number} moves Cells entered this round.
 * @property {number} elapsedMs Timer: runs from the first move until the exit is reached.
 * @property {'ready' | 'playing' | 'won'} status
 * @property {boolean} assisted
 * @property {readonly Point[] | null} solution Shortest path from the player to the exit while shown, else null.
 * @property {number | null} best Best time for this level in ms.
 * @property {RoundResult | null} result Set when the exit is reached.
 */

/**
 * @typedef {object} MoveResult
 * @property {boolean} moved
 * @property {boolean} won True when this move reached the exit.
 * @property {readonly Point[]} path Cells entered, in order (for animation).
 */

/** @typedef {ReturnType<typeof createGame>} Game */

/**
 * Create a game session. Returns a frozen object with the methods getState,
 * update, move, run, showSolution, hideSolution, restart, newMaze, setLevel,
 * nextLevel and setAlgorithm.
 * @param {GameOptions} [options]
 * @throws {RangeError} for an unknown algorithm.
 */
export function createGame(options = {}) {
  const seedRng = createRng(options.seed ?? randomSeed());
  const records = options.records ?? null;
  let level = clampLevel(options.level ?? 0);
  let algorithm = options.algorithm ?? ALGORITHMS[0];
  let round = createRound(nextSeed());

  function nextSeed() {
    return randomInt(seedRng, SEED_RANGE);
  }

  function createRound(mazeSeed, existingMaze = null) {
    const { id, width, height } = LEVELS[level];
    const start = Object.freeze({ x: 0, y: 0 });
    return {
      mazeSeed,
      maze: existingMaze ?? generateMaze(algorithm, width, height, createRng(mazeSeed)),
      start,
      exit: Object.freeze({ x: width - 1, y: height - 1 }),
      player: start,
      trail: Object.freeze([start]),
      moves: 0,
      elapsedMs: 0,
      status: STATUS.READY,
      assisted: false,
      solution: null,
      best: records ? records.get(id) : null,
      result: null,
    };
  }

  /**
   * Read-only snapshot of the current state.
   * @returns {Readonly<GameState>}
   */
  function getState() {
    const { id, width, height } = LEVELS[level];
    return Object.freeze({ level, levelId: id, levelCount: LEVELS.length, width, height, algorithm, ...round });
  }

  /**
   * Advance the timer while a round is being played.
   * @param {number} dtMs Milliseconds since the last update; non-positive or non-finite values are ignored.
   */
  function update(dtMs) {
    if (round.status === STATUS.PLAYING && Number.isFinite(dtMs) && dtMs > 0) round.elapsedMs += dtMs;
  }

  /**
   * Step one cell towards `dir`; walls block the move. The first move starts the timer.
   * @param {Direction} dir
   * @returns {MoveResult}
   */
  function move(dir) {
    if (!canAct(dir)) return NO_MOVE;
    const next = tryStep(round.maze, round.player, dir);
    return enter(next ? [next] : []);
  }

  /**
   * Move towards `dir` and keep following the corridor until a junction, a dead end or the exit.
   * @param {Direction} dir
   * @returns {MoveResult}
   */
  function run(dir) {
    if (!canAct(dir)) return NO_MOVE;
    return enter(corridorRun(round.maze, round.player, dir, round.exit));
  }

  function canAct(dir) {
    return round.status !== STATUS.WON && isDirection(dir);
  }

  function enter(path) {
    if (path.length === 0) return NO_MOVE;
    const cells = Object.freeze(path.map((cell) => Object.freeze(cell)));
    for (const cell of cells) {
      round.player = cell;
      round.trail = extendTrail(round.trail, cell);
    }
    round.moves += cells.length;
    if (round.status === STATUS.READY) round.status = STATUS.PLAYING;
    if (round.solution) round.solution = solve();
    const won = samePoint(round.player, round.exit);
    if (won) finish();
    return Object.freeze({ moved: true, won, path: cells });
  }

  function finish() {
    round.status = STATUS.WON;
    const saved = records && !round.assisted ? records.submit(LEVELS[level].id, round.elapsedMs) : null;
    if (saved) round.best = saved.best;
    round.result = Object.freeze({
      timeMs: round.elapsedMs,
      moves: round.moves,
      assisted: round.assisted,
      newBest: saved ? saved.improved : false,
    });
  }

  function solve() {
    return Object.freeze(shortestPath(round.maze, round.player, round.exit));
  }

  /**
   * Show the shortest path from the player to the exit. The round becomes
   * assisted and can no longer set a best time. Ignored once the round is won.
   */
  function showSolution() {
    if (round.status === STATUS.WON) return;
    round.assisted = true;
    round.solution = solve();
  }

  /** Hide the solution path (the round stays assisted). */
  function hideSolution() {
    round.solution = null;
  }

  /**
   * Replay the same maze from the start: timer, moves, trail and result are
   * reset and the solution is hidden. A maze whose solution was shown stays assisted.
   */
  function restart() {
    const { mazeSeed, maze, assisted } = round;
    round = createRound(mazeSeed, maze);
    round.assisted = assisted;
  }

  /** Start a fresh maze on the current level. */
  function newMaze() {
    round = createRound(nextSeed());
  }

  /**
   * Jump to a level (clamped) and start a fresh maze there.
   * @param {number} index
   */
  function setLevel(index) {
    level = clampLevel(index);
    newMaze();
  }

  /** Go to the next level with a fresh maze (the last level repeats). */
  function nextLevel() {
    setLevel(level + 1);
  }

  /**
   * Switch the generator and start a fresh maze with it.
   * @param {string} name One of `ALGORITHMS`.
   * @throws {RangeError} for an unknown name; the game is left unchanged.
   */
  function setAlgorithm(name) {
    if (!isAlgorithm(name)) throw new RangeError(`Unknown maze algorithm: ${name}`);
    algorithm = name;
    newMaze();
  }

  return Object.freeze({
    getState,
    update,
    move,
    run,
    showSolution,
    hideSolution,
    restart,
    newMaze,
    setLevel,
    nextLevel,
    setAlgorithm,
  });
}

function extendTrail(trail, cell) {
  const kept = trail.filter((visited) => !samePoint(visited, cell));
  kept.push(cell);
  return Object.freeze(kept.slice(-TRAIL_LENGTH));
}
