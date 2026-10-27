/**
 * Canvas renderer. The floor and walls of a maze are painted once into an
 * offscreen layer; every frame copies that layer and draws the trail, the
 * solution, the exit, the win burst and the player on top.
 * @module renderer
 */

import { directionBetween, hasWall } from './maze.js';

/** @typedef {import('./maze.js').Maze} Maze */
/** @typedef {import('./maze.js').Point} Point */
/** @typedef {import('./game.js').GameState} GameState */

/**
 * @typedef {object} View Animation details chosen by the UI for one frame.
 * @property {Point} player Position of the dot in cell units (fractional while gliding).
 * @property {readonly Point[]} pending Cells the dot has not reached yet; the trail leaves them out.
 * @property {number} reveal Share of the solution drawn so far, from 0 to 1.
 * @property {number} pulse Breathing phase of the glows, from 0 to 1.
 * @property {number | null} burst Progress of the win burst from 0 to 1, or null.
 */

/** @typedef {{ cell: number, line: number, left: number, top: number }} Geometry */

const COLORS = Object.freeze({
  floorInner: '#141f38',
  floorOuter: '#0a1120',
  wall: '#b6c4e4',
  wallGlow: 'rgba(129, 140, 248, 0.6)',
  gate: 'rgba(148, 163, 184, 0.7)',
  accent: '244, 114, 182',
  exit: '52, 211, 153',
  core: '#f472b6',
  shine: 'rgba(255, 255, 255, 0.75)',
});
const TAU = Math.PI * 2;
const MAX_PIXEL_RATIO = 3;

/**
 * Create a renderer that draws game snapshots into `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ resize: (cssSize: number) => void, draw: (state: GameState, view: View) => void }}
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas');
  const layerCtx = layer.getContext('2d');
  let size = 0;
  let ratio = 1;
  let scale = 1;
  /** @type {Maze | null} */
  let layerMaze = null;
  /** @type {Geometry} */
  let geometry = { cell: 1, line: 1, left: 0, top: 0 };

  /**
   * Match the canvas to its on-screen size (CSS pixels) and the device pixel ratio.
   * @param {number} cssSize
   */
  function resize(cssSize) {
    size = Math.max(0, cssSize);
    ratio = pixelRatio();
    const pixels = Math.max(1, Math.round(size * ratio));
    scale = size > 0 ? pixels / size : 1;
    for (const target of [canvas, layer]) {
      if (target.width !== pixels) target.width = pixels;
      if (target.height !== pixels) target.height = pixels;
    }
    layerMaze = null;
  }

  /**
   * Draw one frame.
   * @param {GameState} state
   * @param {View} view
   */
  function draw(state, view) {
    if (size <= 0) return;
    if (ratio !== pixelRatio()) resize(size);
    if (layerMaze !== state.maze) paintLayer(state);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawTrail(ctx, geometry, state, view.pending);
    if (state.solution) drawSolution(ctx, geometry, state.solution, view.reveal);
    drawExit(ctx, geometry, state.exit, view.pulse);
    if (view.burst !== null) drawBurst(ctx, geometry, state.exit, view.burst);
    drawPlayer(ctx, geometry, view.player, view.pulse);
  }

  function paintLayer(state) {
    geometry = measure(size, state.maze);
    layerCtx.setTransform(scale, 0, 0, scale, 0, 0);
    paintFloor(layerCtx, size);
    paintWalls(layerCtx, geometry, state, scale);
    paintGates(layerCtx, geometry, state, size);
    layerMaze = state.maze;
  }

  return { resize, draw };
}

function pixelRatio() {
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_PIXEL_RATIO);
}

/**
 * Cell size, wall thickness and the top-left corner of a centred maze.
 * @param {number} size
 * @param {Maze} maze
 * @returns {Geometry}
 */
function measure(size, maze) {
  const margin = Math.max(10, size * 0.045);
  const cell = (size - margin * 2) / Math.max(maze.width, maze.height);
  return {
    cell,
    line: Math.min(5, Math.max(1.5, cell * 0.1)),
    left: (size - cell * maze.width) / 2,
    top: (size - cell * maze.height) / 2,
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb}, ${alpha.toFixed(3)})`;
}

function centre(g, point) {
  return { x: g.left + (point.x + 0.5) * g.cell, y: g.top + (point.y + 0.5) * g.cell };
}

function paintFloor(c, size) {
  c.clearRect(0, 0, size, size);
  const gradient = c.createRadialGradient(size / 2, size * 0.42, size * 0.05, size / 2, size / 2, size * 0.75);
  gradient.addColorStop(0, COLORS.floorInner);
  gradient.addColorStop(1, COLORS.floorOuter);
  c.fillStyle = gradient;
  c.fillRect(0, 0, size, size);
}

/**
 * Stroke every wall as one glowing path. The outer border is left open on the
 * left of the start and the right of the exit to show the way in and out.
 */
function paintWalls(c, g, { maze, start, exit }, scale) {
  const path = new Path2D();
  const segment = (x1, y1, x2, y2) => {
    path.moveTo(g.left + x1 * g.cell, g.top + y1 * g.cell);
    path.lineTo(g.left + x2 * g.cell, g.top + y2 * g.cell);
  };
  const lastX = maze.width - 1;
  const lastY = maze.height - 1;
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (hasWall(maze, x, y, 'up')) segment(x, y, x + 1, y);
      const entrance = x === 0 && x === start.x && y === start.y;
      if (hasWall(maze, x, y, 'left') && !entrance) segment(x, y, x, y + 1);
      const way = x === lastX && x === exit.x && y === exit.y;
      if (x === lastX && hasWall(maze, x, y, 'right') && !way) segment(x + 1, y, x + 1, y + 1);
      if (y === lastY && hasWall(maze, x, y, 'down')) segment(x, y + 1, x + 1, y + 1);
    }
  }
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = g.line;
  c.strokeStyle = COLORS.wall;
  c.shadowColor = COLORS.wallGlow;
  c.shadowBlur = g.line * 2.4 * scale;
  c.stroke(path);
  c.restore();
}

/** Small chevrons in the margin: one leading in at the start, one leading out at the exit. */
function paintGates(c, g, { start, exit }, size) {
  const arm = Math.min(g.cell * 0.22, g.left * 0.3);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1.5, g.line * 0.8);
  chevron(c, g.left / 2, centre(g, start).y, arm, COLORS.gate);
  chevron(c, size - g.left / 2, centre(g, exit).y, arm, rgba(COLORS.exit, 0.95));
  c.restore();
}

function chevron(c, x, y, arm, color) {
  c.strokeStyle = color;
  c.beginPath();
  c.moveTo(x - arm / 2, y - arm);
  c.lineTo(x + arm / 2, y);
  c.lineTo(x - arm / 2, y + arm);
  c.stroke();
}

/**
 * The trail: a ribbon through recently visited cells, brighter towards the
 * player. Neighbouring trail cells with an open passage between them are joined.
 */
function drawTrail(c, g, { maze, trail }, pending) {
  const waiting = new Set(pending.map((p) => `${p.x},${p.y}`));
  const cells = trail.filter((p) => !waiting.has(`${p.x},${p.y}`));
  const inset = g.cell * 0.3;
  const band = g.cell - inset * 2;
  cells.forEach((cell, i) => {
    const age = (i + 1) / cells.length;
    c.fillStyle = rgba(COLORS.accent, 0.06 + 0.62 * age ** 1.5);
    c.fillRect(g.left + cell.x * g.cell + inset, g.top + cell.y * g.cell + inset, band, band);
    const previous = cells[i - 1];
    if (previous && joined(maze, previous, cell)) bridge(c, g, previous, cell, inset, band);
  });
}

function joined(maze, a, b) {
  const dir = directionBetween(a, b);
  return dir !== null && !hasWall(maze, a.x, a.y, dir);
}

function bridge(c, g, a, b, inset, band) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  if (a.y === b.y) {
    c.fillRect(g.left + (x + 1) * g.cell - inset, g.top + y * g.cell + inset, inset * 2, band);
  } else {
    c.fillRect(g.left + x * g.cell + inset, g.top + (y + 1) * g.cell - inset, band, inset * 2);
  }
}

/** The shortest path to the exit, drawn up to `reveal` of its length. */
function drawSolution(c, g, path, reveal) {
  const points = path.map((p) => centre(g, p));
  if (points.length < 2) return;
  const span = Math.min(Math.max(reveal, 0), 1) * (points.length - 1);
  const whole = Math.floor(span);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let i = 1; i <= whole; i += 1) c.lineTo(points[i].x, points[i].y);
  if (whole < points.length - 1) {
    const from = points[whole];
    const to = points[whole + 1];
    const share = span - whole;
    c.lineTo(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share);
  }
  c.strokeStyle = rgba(COLORS.exit, 0.2);
  c.lineWidth = g.cell * 0.42;
  c.stroke();
  c.strokeStyle = rgba(COLORS.exit, 0.95);
  c.lineWidth = Math.max(2, g.cell * 0.12);
  c.stroke();
  c.restore();
}

function drawExit(c, g, exit, pulse) {
  const { x, y } = centre(g, exit);
  glow(c, x, y, g.cell * (0.85 + 0.2 * pulse), COLORS.exit, 0.42);
  c.lineWidth = Math.max(1.5, g.cell * 0.07);
  c.strokeStyle = rgba(COLORS.exit, 0.95);
  c.beginPath();
  c.arc(x, y, g.cell * 0.27, 0, TAU);
  c.stroke();
  c.fillStyle = rgba(COLORS.exit, 1);
  c.beginPath();
  c.arc(x, y, g.cell * 0.11, 0, TAU);
  c.fill();
}

/** Two rings that spread out from the exit when the maze is solved. */
function drawBurst(c, g, exit, progress) {
  const { x, y } = centre(g, exit);
  for (const [rgb, delay] of [[COLORS.exit, 0], [COLORS.accent, 0.2]]) {
    const p = (progress - delay) / (1 - delay);
    if (p > 0 && p < 1) {
      const eased = 1 - (1 - p) ** 3;
      c.strokeStyle = rgba(rgb, 0.75 * (1 - p));
      c.lineWidth = Math.max(1.5, g.cell * 0.18 * (1 - p));
      c.beginPath();
      c.arc(x, y, g.cell * (0.4 + 6 * eased), 0, TAU);
      c.stroke();
    }
  }
}

function drawPlayer(c, g, position, pulse) {
  const { x, y } = centre(g, position);
  glow(c, x, y, g.cell * (0.95 + 0.15 * pulse), COLORS.accent, 0.55);
  const radius = g.cell * 0.26;
  c.fillStyle = COLORS.core;
  c.beginPath();
  c.arc(x, y, radius, 0, TAU);
  c.fill();
  c.fillStyle = COLORS.shine;
  c.beginPath();
  c.arc(x - radius * 0.32, y - radius * 0.32, radius * 0.36, 0, TAU);
  c.fill();
}

function glow(c, x, y, radius, rgb, alpha) {
  const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(rgb, alpha));
  gradient.addColorStop(1, rgba(rgb, 0));
  c.fillStyle = gradient;
  c.beginPath();
  c.arc(x, y, radius, 0, TAU);
  c.fill();
}
