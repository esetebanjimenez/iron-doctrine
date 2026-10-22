import { idx, inBounds, type ClassId, type World } from "./types.ts";
import { neighbors, passable } from "./grid.ts";

function heuristic(x0: number, y0: number, x1: number, y1: number): number {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const m = Math.min(dx, dy);
  const M = Math.max(dx, dy);
  return 0.7 * (M + (Math.SQRT2 - 1) * m);
}

/** Synchronous A*. Later path requests can be time-sliced behind this function. */
export function findPath(
  world: World,
  classId: ClassId,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  blocked?: Uint8Array,
): Array<{ x: number; y: number }> {
  const tx = Math.floor(gx);
  const ty = Math.floor(gy);
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  if (!inBounds(world, tx, ty) || !passable(world, tx, ty, classId)) return [];
  if (x0 === tx && y0 === ty) return [];

  const n = world.w * world.h;
  const gScore = new Float64Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const start = idx(world, x0, y0);
  const goal = idx(world, tx, ty);
  gScore[start] = 0;

  const heap: Array<[number, number]> = [[heuristic(x0, y0, tx, ty), start]];

  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p]![0] <= heap[k]![0]) break;
      const tmp = heap[p]!;
      heap[p] = heap[k]!;
      heap[k] = tmp;
      k = p;
    }
  };
  const pop = (): [number, number] | undefined => {
    if (heap.length === 0) return undefined;
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let s = k;
        if (l < heap.length && heap[l]![0] < heap[s]![0]) s = l;
        if (r < heap.length && heap[r]![0] < heap[s]![0]) s = r;
        if (s === k) break;
        const tmp = heap[s]!;
        heap[s] = heap[k]!;
        heap[k] = tmp;
        k = s;
      }
    }
    return top;
  };

  while (heap.length > 0) {
    const next = pop();
    if (!next) break;
    const i = next[1];
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === goal) break;
    const x = i % world.w;
    const y = Math.floor(i / world.w);
    for (const [nx, ny, cost] of neighbors(world, x, y, classId)) {
      const ni = idx(world, nx, ny);
      if (blocked?.[ni] && ni !== goal) continue;
      if (nx !== x && ny !== y && blocked && ni !== goal) {
        const sideA = idx(world, nx, y);
        const sideB = idx(world, x, ny);
        if (blocked[sideA] || blocked[sideB]) continue;
      }
      if (closed[ni]) continue;
      const ng = gScore[i]! + cost;
      if (ng < gScore[ni]!) {
        gScore[ni] = ng;
        parent[ni] = i;
        push(ng + heuristic(nx, ny, tx, ty), ni);
      }
    }
  }

  if (parent[goal] === -1 && goal !== start) return [];
  const cells: Array<{ x: number; y: number }> = [];
  let cur = goal;
  const guard = n + 2;
  let steps = 0;
  while (cur !== start && cur !== -1 && steps < guard) {
    cells.push({ x: (cur % world.w) + 0.5, y: Math.floor(cur / world.w) + 0.5 });
    cur = parent[cur]!;
    steps++;
  }
  cells.reverse();
  return cells;
}
