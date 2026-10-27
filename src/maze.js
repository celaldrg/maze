/**
 * Grid maze model. Each cell keeps a bit mask of its four walls. Carving a
 * passage clears the shared wall on both sides, so walls always stay symmetric,
 * and the outer border can never be carved.
 *
 * Low-level grid functions take `(maze, x, y)`; higher-level modules pass
 * `Point` objects around.
 * @module maze
 */

/** @typedef {'up' | 'right' | 'down' | 'left'} Direction */
/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ width: number, height: number, walls: Uint8Array }} Maze */

/** The four directions in clockwise order. */
export const DIRECTIONS = Object.freeze(/** @type {Direction[]} */ (['up', 'right', 'down', 'left']));

const STEPS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1, bit: 1, opposite: 'down' }),
  right: Object.freeze({ dx: 1, dy: 0, bit: 2, opposite: 'left' }),
  down: Object.freeze({ dx: 0, dy: 1, bit: 4, opposite: 'up' }),
  left: Object.freeze({ dx: -1, dy: 0, bit: 8, opposite: 'right' }),
});
const ALL_WALLS = 15;

/**
 * Create a maze with every wall closed.
 * @param {number} width Columns, an integer >= 1.
 * @param {number} height Rows, an integer >= 1.
 * @returns {Maze}
 */
export function createMaze(width, height) {
  if (!isSize(width) || !isSize(height)) {
    throw new RangeError(`Invalid maze size: ${width}x${height}`);
  }
  return { width, height, walls: new Uint8Array(width * height).fill(ALL_WALLS) };
}

function isSize(value) {
  return Number.isInteger(value) && value >= 1;
}

/**
 * Is the value one of the four direction names?
 * @param {unknown} value
 * @returns {value is Direction}
 */
export function isDirection(value) {
  return typeof value === 'string' && Object.hasOwn(STEPS, value);
}

/**
 * The direction pointing the other way.
 * @param {Direction} dir
 * @returns {Direction}
 */
export function opposite(dir) {
  return /** @type {Direction} */ (STEPS[dir].opposite);
}

/**
 * The point one step away towards `dir` (it may lie outside the maze).
 * @param {Point} point
 * @param {Direction} dir
 * @returns {Point}
 */
export function step(point, dir) {
  const { dx, dy } = STEPS[dir];
  return { x: point.x + dx, y: point.y + dy };
}

/**
 * The direction leading from `from` to the adjacent cell `to`.
 * @param {Point} from
 * @param {Point} to
 * @returns {Direction | null} null when the cells are not orthogonal neighbours.
 */
export function directionBetween(from, to) {
  return DIRECTIONS.find((dir) => samePoint(step(from, dir), to)) ?? null;
}

/**
 * Do both points name the same cell?
 * @param {Point} a
 * @param {Point} b
 * @returns {boolean}
 */
export function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

/**
 * Is (x, y) a cell of the maze?
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function inBounds(maze, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < maze.width && y < maze.height;
}

/**
 * Row-major index of cell (x, y).
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
export function toIndex(maze, x, y) {
  return y * maze.width + x;
}

/**
 * Cell for a row-major index.
 * @param {Maze} maze
 * @param {number} index
 * @returns {Point}
 */
export function toPoint(maze, index) {
  return { x: index % maze.width, y: Math.floor(index / maze.width) };
}

/**
 * Is there a wall on the `dir` side of cell (x, y)? Cells outside the maze count as solid.
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @param {Direction} dir
 * @returns {boolean}
 */
export function hasWall(maze, x, y, dir) {
  if (!inBounds(maze, x, y)) return true;
  return (maze.walls[toIndex(maze, x, y)] & STEPS[dir].bit) !== 0;
}

/**
 * Can something standing on (x, y) move one cell towards `dir`?
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @param {Direction} dir
 * @returns {boolean}
 */
export function canMove(maze, x, y, dir) {
  const { dx, dy } = STEPS[dir];
  return !hasWall(maze, x, y, dir) && inBounds(maze, x + dx, y + dy);
}

/**
 * Open the passage between (x, y) and its neighbour towards `dir` (both sides).
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @param {Direction} dir
 * @throws {RangeError} when either cell lies outside the maze.
 */
export function carve(maze, x, y, dir) {
  const { dx, dy, bit, opposite: back } = STEPS[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (!inBounds(maze, x, y) || !inBounds(maze, nx, ny)) {
    throw new RangeError(`Cannot carve ${dir} from ${x},${y}`);
  }
  maze.walls[toIndex(maze, x, y)] &= ~bit;
  maze.walls[toIndex(maze, nx, ny)] &= ~STEPS[back].bit;
}

/**
 * Neighbouring cells of (x, y) inside the maze, ignoring walls.
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @returns {Array<{ x: number, y: number, dir: Direction }>}
 */
export function neighbors(maze, x, y) {
  const result = [];
  for (const dir of DIRECTIONS) {
    const next = step({ x, y }, dir);
    if (inBounds(maze, next.x, next.y)) result.push({ ...next, dir });
  }
  return result;
}

/**
 * Directions in which (x, y) has an open passage.
 * @param {Maze} maze
 * @param {number} x
 * @param {number} y
 * @returns {Direction[]}
 */
export function openDirections(maze, x, y) {
  return DIRECTIONS.filter((dir) => canMove(maze, x, y, dir));
}
