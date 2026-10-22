import {
  FLAT,
  FOREST,
  HILL,
  ROAD,
  URBAN,
  WATER,
  idx,
  inBounds,
  type ClassId,
  type World,
} from "./types.ts";

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

export function walkLine(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

/** Ground line of sight. Plateau lips can see out; equal-height interiors cannot see over their own lip. */
export function hasLos(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  if (!inBounds(world, x0, y0) || !inBounds(world, x1, y1)) return false;
  if (x0 === x1 && y0 === y1) return true;
  const urbanEnds =
    world.terrain[idx(world, x0, y0)] === URBAN && world.terrain[idx(world, x1, y1)] === URBAN;
  if (urbanEnds && Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) <= 2) return true;

  const line = walkLine(x0, y0, x1, y1);
  const e0 = world.elev[idx(world, x0, y0)]!;
  const e1 = world.elev[idx(world, x1, y1)]!;
  for (let i = 1; i < line.length - 1; i++) {
    const [x, y] = line[i]!;
    const [px, py] = line[i - 1]!;
    if (x !== px && y !== py) {
      if (sideBlocks(world, x, py) || sideBlocks(world, px, y)) return false;
    }
    const t = i / (line.length - 1);
    const expected = e0 + (e1 - e0) * t;
    if (world.elev[idx(world, x, y)]! > expected + 0.05) return false;
    const terrain = world.terrain[idx(world, x, y)];
    if (terrain === FOREST || terrain === URBAN) return false;
  }
  return true;
}

function sideBlocks(world: World, x: number, y: number): boolean {
  if (!inBounds(world, x, y)) return false;
  const terrain = world.terrain[idx(world, x, y)];
  return terrain === FOREST || terrain === URBAN;
}

export function passable(world: World, x: number, y: number, classId: ClassId): boolean {
  if (!inBounds(world, x, y)) return false;
  const terrain = world.terrain[idx(world, x, y)];
  if (terrain === WATER) return false;
  if (terrain === URBAN && classId === "armor") return false;
  if (terrain === URBAN && classId === "recon") return false;
  return true;
}

export function urbanRim(world: World, x: number, y: number): boolean {
  if (world.terrain[idx(world, x, y)] !== URBAN) return false;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(world, nx, ny) || world.terrain[idx(world, nx, ny)] !== URBAN) return true;
  }
  return false;
}

export function moveCost(world: World, x: number, y: number, classId: ClassId): number {
  const terrain = world.terrain[idx(world, x, y)]!;
  let cost = 1;
  if (terrain === ROAD) cost = 0.75;
  else if (terrain === HILL) cost = classId === "infantry" ? 1.15 : 1.25;
  else if (terrain === FOREST) cost = classId === "armor" ? 1.85 : 0.8;
  else if (terrain === URBAN) cost = classId === "infantry" && urbanRim(world, x, y) ? 3.4 : 1.2;
  else if (terrain === FLAT) cost = 1;
  if (world.kill[idx(world, x, y)]) cost += 3.2;
  return cost;
}

export function neighbors(world: World, x: number, y: number, classId: ClassId): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!passable(world, nx, ny, classId)) continue;
    if (dx !== 0 && dy !== 0) {
      if (!passable(world, x + dx, y, classId) || !passable(world, x, y + dy, classId)) continue;
    }
    const diag = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
    out.push([nx, ny, moveCost(world, nx, ny, classId) * diag]);
  }
  return out;
}

export function nearestTownDist(world: World, x: number, y: number, cells: number[]): number {
  let best = Infinity;
  for (const c of cells) {
    const cx = c % world.w;
    const cy = Math.floor(c / world.w);
    const d = Math.hypot(cx - x, cy - y);
    if (d < best) best = d;
  }
  return best;
}
