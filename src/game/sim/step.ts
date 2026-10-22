import { idx, inBounds, FOREST, URBAN, type Element, type World } from "./types.ts";
import { findPath } from "./path.ts";
import { hasLos, passable } from "./grid.ts";
import { observe } from "./intel.ts";
import { think } from "./ai.ts";

const STEP = 0.1;

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

function occupied(world: World, x: number, y: number, selfId: number): boolean {
  for (const other of world.elements) {
    if (other.id === selfId) continue;
    if (Math.floor(other.x) === x && Math.floor(other.y) === y) return true;
  }
  return false;
}

function blockers(world: World, selfId: number): Uint8Array {
  const blocked = new Uint8Array(world.w * world.h);
  for (const other of world.elements) {
    if (other.id === selfId) continue;
    const x = Math.floor(other.x);
    const y = Math.floor(other.y);
    if (!inBounds(world, x, y)) continue;
    blocked[idx(world, x, y)] = 1;
  }
  return blocked;
}

function approach(world: World, el: Element): { x: number; y: number } {
  const gx = Math.floor(el.goalX);
  const gy = Math.floor(el.goalY);
  if (!occupied(world, gx, gy, el.id)) return { x: el.goalX, y: el.goalY };
  let bestX = gx;
  let bestY = gy;
  let bestD = Infinity;
  let found = false;
  for (const [dx, dy] of NEAR) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (!passable(world, nx, ny, el.classId) || occupied(world, nx, ny, el.id)) continue;
    const d = Math.hypot(nx + 0.5 - el.x, ny + 0.5 - el.y);
    if (d < bestD) {
      bestD = d;
      bestX = nx;
      bestY = ny;
      found = true;
    }
  }
  if (!found) return { x: el.x, y: el.y };
  return { x: bestX + 0.5, y: bestY + 0.5 };
}

function arrived(world: World, el: Element): boolean {
  if (el.goalKey < 0) return false;
  if (Math.hypot(el.x - el.goalX, el.y - el.goalY) < 0.45) return true;
  const gx = Math.floor(el.goalX);
  const gy = Math.floor(el.goalY);
  if (!occupied(world, gx, gy, el.id)) return false;
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  return Math.max(Math.abs(cx - gx), Math.abs(cy - gy)) <= 1 && (cx !== gx || cy !== gy);
}

function separate(world: World, el: Element): boolean {
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  let yieldCell = false;
  for (const other of world.elements) {
    if (other.id === el.id) continue;
    if (Math.floor(other.x) !== cx || Math.floor(other.y) !== cy) continue;
    if (other.hp <= 0 || other.id < el.id) yieldCell = true;
  }
  if (!yieldCell) return false;
  let bestX = -1;
  let bestY = -1;
  let bestD = Infinity;
  for (const [dx, dy] of NEAR) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (!passable(world, nx, ny, el.classId) || occupied(world, nx, ny, el.id)) continue;
    const d = Math.hypot(nx + 0.5 - el.goalX, ny + 0.5 - el.goalY);
    if (d < bestD) {
      bestD = d;
      bestX = nx;
      bestY = ny;
    }
  }
  if (bestX < 0) return false;
  el.x = bestX + 0.5;
  el.y = bestY + 0.5;
  el.path = [];
  el.pathFor = -1;
  return true;
}

function pushEvent(world: World, text: string) {
  world.events.push({ tick: world.tick, text });
  if (world.events.length > 40) world.events.shift();
}

function ensurePath(world: World, el: Element) {
  if (el.goalKey < 0) return;
  if (el.pathFor === el.goalKey && (el.path.length > 0 || arrived(world, el))) return;
  const goal = approach(world, el);
  el.path = findPath(world, el.classId, el.x, el.y, goal.x, goal.y, blockers(world, el.id));
  el.pathFor = el.goalKey;
}

function face(el: Element, x: number, y: number) {
  const dx = x - el.x;
  const dy = y - el.y;
  if (dx * dx + dy * dy > 0.001) el.facing = Math.atan2(dy, dx);
}

function markCell(world: World, el: Element) {
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  if (!inBounds(world, cx, cy)) return;
  const i = idx(world, cx, cy);
  if (world.terrain[i] === URBAN) {
    el.urbanTicks++;
    el.enteredUrban = true;
  }
  if (world.kill[i]) {
    el.killTicks++;
    el.killRun++;
    if (el.killRun > el.maxKillRun) el.maxKillRun = el.killRun;
  } else {
    el.killRun = 0;
  }
}

function holdContact(world: World, el: Element): boolean {
  if (el.classId !== "infantry") return false;
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  if (!inBounds(world, cx, cy)) return false;
  const here = world.terrain[idx(world, cx, cy)];
  if (here !== URBAN && here !== FOREST) return false;
  for (const foe of world.elements) {
    if (foe.side === el.side || foe.hp <= 0) continue;
    if (here === FOREST && world.terrain[idx(world, Math.floor(foe.x), Math.floor(foe.y))] !== FOREST) continue;
    if (!hasLos(world, cx, cy, Math.floor(foe.x), Math.floor(foe.y))) continue;
    const key = cy * world.w + cx;
    if (el.goalKey !== key) {
      el.goalX = cx + 0.5;
      el.goalY = cy + 0.5;
      el.goalKey = key;
      el.path = [];
      el.pathFor = key;
    }
    el.mode = "hold";
    el.label = "FIRM";
    el.labelUntil = world.tick + 30;
    return true;
  }
  return false;
}

function moveElement(world: World, el: Element) {
  if (el.hp <= 0 || el.goalKey < 0) return;
  if (holdContact(world, el) || separate(world, el)) {
    markCell(world, el);
    return;
  }
  el.px = el.x;
  el.py = el.y;
  ensurePath(world, el);

  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  const exposed = inBounds(world, cx, cy) && world.kill[idx(world, cx, cy)] === 1;
  const dash = el.suppression > 6 && exposed && !el.answered;

  if (arrived(world, el)) {
    if (el.classId === "armor") {
      el.mode = "hull-down";
      el.label = "HULL DOWN";
      el.labelUntil = world.tick + 8;
    } else if (inBounds(world, cx, cy) && world.terrain[idx(world, cx, cy)] === URBAN) {
      el.mode = "hold";
      el.label = "HOLD";
      el.labelUntil = world.tick + 8;
    }
    const blob = world.blobs.find((b) => b.id === world.objective);
    if (blob) face(el, blob.cx, blob.cy);
    markCell(world, el);
    return;
  }

  if (el.path.length === 0) {
    markCell(world, el);
    return;
  }

  if (dash) {
    el.mode = "mask";
    el.label = "MASK";
    el.labelUntil = world.tick + 12;
  }

  const wp = el.path[0]!;
  const dx = wp.x - el.x;
  const dy = wp.y - el.y;
  const dist = Math.hypot(dx, dy) || 1;
  const step = el.speed * STEP * (dash ? 1.35 : 1);
  const nx = dist <= step ? wp.x : el.x + (dx / dist) * step;
  const ny = dist <= step ? wp.y : el.y + (dy / dist) * step;
  const leave =
    Math.floor(nx) !== Math.floor(el.x) || Math.floor(ny) !== Math.floor(el.y);
  if (leave && occupied(world, Math.floor(nx), Math.floor(ny), el.id)) {
    el.path = [];
    el.pathFor = -1;
    markCell(world, el);
    return;
  }
  el.x = nx;
  el.y = ny;
  if (dist <= step) el.path.shift();
  face(el, wp.x, wp.y);
  markCell(world, el);
}

function weapons(world: World) {
  for (const el of world.elements) el.answered = false;

  for (const el of world.elements) {
    if (el.hp <= 0) continue;
    if (el.cooldown > 0) {
      el.cooldown--;
      continue;
    }
    let best: Element | null = null;
    let bestD = Infinity;
    for (const foe of world.elements) {
      if (foe.side === el.side || foe.hp <= 0) continue;
      const d = Math.hypot(foe.x - el.x, foe.y - el.y);
      if (d > el.range || d < el.minRange) continue;
      if (!hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(foe.x), Math.floor(foe.y))) continue;
      if (d < bestD) {
        best = foe;
        bestD = d;
      }
    }
    if (!best || el.opening) {
      if (!el.opening) breakFrom(world, el);
      continue;
    }
    if (el.engaged !== best.id) {
      breakFrom(world, el);
      el.engaged = best.id;
      pushEvent(world, `${el.name} engages ${best.name}`);
    }
    el.answered = true;
    best.hp = Math.max(0, best.hp - el.damage);
    best.suppression += el.damage;
    el.cooldown = 10;
    face(el, best.x, best.y);
    if (bestD > best.range && !best.notedFire) {
      best.notedFire = true;
      best.label = "MASK";
      best.labelUntil = world.tick + 25;
      pushEvent(world, `${best.name} under fire, no shot — holding the bound`);
    }
    if (best.hp <= 0) pushEvent(world, `${best.name} destroyed`);
  }

  for (const el of world.elements) {
    if (el.hp <= 0 || el.engaged == null) continue;
    const foe = world.elements.find((other) => other.id === el.engaged);
    if (!foe || foe.hp <= 0) breakFrom(world, el);
  }
}

function breakFrom(world: World, el: Element) {
  if (el.engaged == null) return;
  const foe = world.elements.find((other) => other.id === el.engaged);
  el.engaged = undefined;
  if (!foe) return;
  pushEvent(world, `${el.name} breaks from ${foe.name}`);
}

export function step(world: World): void {
  observe(world);
  if (world.tick % 10 === 0) think(world);
  for (const el of world.elements) moveElement(world, el);
  weapons(world);
  for (const el of world.elements) el.suppression = Math.max(0, el.suppression - 0.75);
  world.tick++;
}

export function runTicks(world: World, n: number): World {
  for (let i = 0; i < n; i++) step(world);
  return world;
}
