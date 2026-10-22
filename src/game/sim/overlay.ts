import { FOREST, HILL, idx, inBounds, URBAN, type Pad, type World } from "./types.ts";
import { hasLos, nearestTownDist } from "./grid.ts";

const NEAR = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

function floodUrban(world: World): number[][] {
  const seen = new Uint8Array(world.w * world.h);
  const blobs: number[][] = [];
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const start = idx(world, x, y);
      if (seen[start] || world.terrain[start] !== URBAN) continue;
      const cells: number[] = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length > 0) {
        const c = stack.pop()!;
        cells.push(c);
        const cx = c % world.w;
        const cy = Math.floor(c / world.w);
        for (const [dx, dy] of NEAR.slice(0, 4)) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds(world, nx, ny)) continue;
          const ni = idx(world, nx, ny);
          if (seen[ni] || world.terrain[ni] !== URBAN) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
      blobs.push(cells);
    }
  }
  blobs.sort((a, b) => b.length - a.length);
  return blobs;
}

function losCount(world: World, x: number, y: number, cells: number[], cap: number): number {
  let n = 0;
  for (const c of cells) {
    const cx = c % world.w;
    const cy = Math.floor(c / world.w);
    if (hasLos(world, x, y, cx, cy)) n++;
    if (n >= cap) break;
  }
  return n;
}

/** Battle positions and kill zones for the objective town. Geometry only — classes filter later. */
export function buildOverlay(world: World): void {
  const urban = floodUrban(world);
  world.blobs = urban.map((cells, i) => {
    let sx = 0;
    let sy = 0;
    for (const c of cells) {
      sx += c % world.w;
      sy += Math.floor(c / world.w);
    }
    const ax = cells.length ? sx / cells.length : 0;
    const ay = cells.length ? sy / cells.length : 0;
    let anchor = cells[0] ?? 0;
    let anchorD = Infinity;
    for (const c of cells) {
      const d = Math.hypot((c % world.w) - ax, Math.floor(c / world.w) - ay);
      if (d < anchorD) {
        anchorD = d;
        anchor = c;
      }
    }
    return {
      id: i,
      cells,
      cx: anchor % world.w + 0.5,
      cy: Math.floor(anchor / world.w) + 0.5,
    };
  });
  world.objective = world.blobs[0]?.id ?? -1;
  const town = world.blobs[0];
  world.pads = [];
  world.kill.fill(0);
  if (!town) return;

  const townSet = new Set(town.cells);
  let padId = 1;

  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const i = idx(world, x, y);
      const terrain = world.terrain[i]!;
      const dist = nearestTownDist(world, x, y, town.cells);

      if ((terrain === 0 || terrain === 1) && dist <= 3 && dist > 0) {
        let sees = false;
        for (const c of town.cells) {
          const cx = c % world.w;
          const cy = Math.floor(c / world.w);
          if (Math.abs(cx - x) + Math.abs(cy - y) > 6) continue;
          if (hasLos(world, x, y, cx, cy)) {
            sees = true;
            break;
          }
        }
        if (sees) world.kill[i] = 1;
      }

      if (terrain === HILL && world.elev[i]! >= 1 && dist >= 4 && dist <= 20) {
        const los = losCount(world, x, y, town.cells, 8);
        const need = Math.min(4, town.cells.length);
        if (los >= need) {
          const pad: Pad = { id: padId++, kind: "armor", x, y, los, dist };
          world.pads.push(pad);
        }
      }

      if (terrain === FOREST) {
        let touches = false;
        for (const [dx, dy] of NEAR) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(world, nx, ny)) continue;
          if (townSet.has(idx(world, nx, ny))) {
            touches = true;
            break;
          }
        }
        if (touches) {
          world.pads.push({ id: padId++, kind: "release", x, y, los: 0, dist });
        }
      }
    }
  }
}
