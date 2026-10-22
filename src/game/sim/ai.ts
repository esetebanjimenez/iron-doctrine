import { FOREST, HILL, URBAN, WATER, idx, inBounds, type Element, type Group, type Pad, type World } from "./types.ts";
import { hasLos, nearestTownDist, passable, urbanRim, walkLine } from "./grid.ts";
import { reports } from "./intel.ts";
import { pursuit } from "./pursue.ts";

function cellOf(x: number, y: number): [number, number] {
  return [Math.floor(x), Math.floor(y)];
}

function note(world: World, text: string) {
  const last = world.events[world.events.length - 1];
  if (last && last.text === text && world.tick - last.tick < 30) return;
  world.events.push({ tick: world.tick, text });
  if (world.events.length > 40) world.events.shift();
}

function setGoal(world: World, el: Element, x: number, y: number) {
  const [gx, gy] = cellOf(x, y);
  const key = gy * world.w + gx;
  if (el.goalKey === key) return;
  el.goalX = gx + 0.5;
  el.goalY = gy + 0.5;
  el.goalKey = key;
  el.path = [];
  el.pathFor = -1;
  const terrain = world.terrain[key];
  if (terrain === URBAN) {
    el.mode = "clear";
    el.label = "CLEAR";
    note(world, `${el.name} moving into the town`);
  } else if (terrain === HILL) {
    el.mode = "bound";
    el.label = "BOUND";
    note(world, `${el.name} bound for the crest`);
  } else if (terrain === FOREST) {
    el.mode = "bound";
    el.label = "BOUND";
    note(world, `${el.name} bound for the wood edge`);
  } else {
    el.mode = "bound";
    el.label = "BOUND";
    note(world, `${el.name} bound forward`);
  }
  el.labelUntil = world.tick + 30;
}

function townCellToward(world: World, cells: number[], x: number, y: number): number {
  let best = cells[0] ?? 0;
  let bestD = Infinity;
  for (const c of cells) {
    const cx = (c % world.w) + 0.5;
    const cy = Math.floor(c / world.w) + 0.5;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function oppositeHome(world: World, group: Group): { x: number; y: number } {
  const other = world.groups.find((g) => g.side !== group.side);
  return other ? { x: other.homeX, y: other.homeY } : { x: world.w / 2, y: world.h / 2 };
}

function groupBestRange(world: World, group: Group): number {
  let range = 0;
  for (const el of world.elements) {
    if (el.groupId === group.id && el.hp > 0) range = Math.max(range, el.range);
  }
  return range;
}

/** Known to this side, and nobody in the group can reach them. */
function unansweredShooter(world: World, group: Group): Element | null {
  const members = world.elements.filter((e) => e.groupId === group.id && e.hp > 0);
  let candidate: Element | null = null;
  let candidateD = Infinity;
  for (const foe of reports(world, group.side)) {
    let answered = false;
    let nearestD = Infinity;
    for (const el of members) {
      const d = Math.hypot(foe.x - el.x, foe.y - el.y);
      if (d < nearestD) nearestD = d;
      if (d > el.range || d < el.minRange) continue;
      if (hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(foe.x), Math.floor(foe.y))) answered = true;
    }
    if (answered) return null;
    if (nearestD < candidateD) {
      candidateD = nearestD;
      candidate = foe;
    }
  }
  return candidate;
}

function scorePad(world: World, group: Group, el: Element, pad: Pad, shooter: Element | null, bestRange: number): number {
  const home = Math.hypot(pad.x + 0.5 - group.homeX, pad.y + 0.5 - group.homeY);
  const blob = world.blobs.find((b) => b.id === world.objective);
  const axis = blob ? axisOffset(pad.x + 0.5, pad.y + 0.5, group.homeX, group.homeY, blob.cx, blob.cy) : 0;
  // Prefer the lip that sees the town. Home only breaks a tie, so the back slope loses.
  let score = pad.los * 2 + world.elev[idx(world, pad.x, pad.y)]! * 3 - pad.dist * 0.55 - home * 0.12;
  if (el.type === "light-tank") score += axis * 1.15;
  else if (el.type === "mbt") score -= axis * 0.3;
  else if (el.type === "ifv") score -= pad.dist * 0.25;
  if (!shooter) return score;
  const sees = hasLos(world, pad.x, pad.y, Math.floor(shooter.x), Math.floor(shooter.y));
  if (!sees) return score + 1;
  const dist = Math.hypot(pad.x + 0.5 - shooter.x, pad.y + 0.5 - shooter.y);
  if (dist <= bestRange && dist >= el.minRange) score += 4;
  else score -= 6;
  return score;
}

function beyondTown(world: World, group: Group, x: number, y: number, padHome: number): boolean {
  const blob = world.blobs.find((b) => b.id === world.objective);
  if (!blob) return false;
  const enemy = oppositeHome(world, group);
  const townHome = Math.hypot(blob.cx - group.homeX, blob.cy - group.homeY);
  const padEnemy = Math.hypot(x - enemy.x, y - enemy.y);
  const townEnemy = Math.hypot(blob.cx - enemy.x, blob.cy - enemy.y);
  return padHome > townHome + 3 && padEnemy < townEnemy;
}

function axisOffset(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((px - ax) * dy - (py - ay) * dx) / len;
}

function assignArmor(world: World, group: Group, el: Element, used: Set<number>, shooter: Element | null) {
  if (el.mode === "hull-down" && el.goalKey >= 0) {
    const gx = Math.floor(el.goalX);
    const gy = Math.floor(el.goalY);
    const still = world.pads.some((p) => p.kind === "armor" && p.x === gx && p.y === gy);
    if (still && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.4) {
      used.add(el.goalKey);
      return;
    }
  }
  const bestRange = groupBestRange(world, group);
  let best: Pad | null = null;
  let bestScore = -Infinity;
  for (const pad of world.pads) {
    if (pad.kind !== "armor") continue;
    const key = pad.y * world.w + pad.x;
    if (used.has(key)) continue;
    const home = Math.hypot(pad.x + 0.5 - group.homeX, pad.y + 0.5 - group.homeY);
    if (beyondTown(world, group, pad.x + 0.5, pad.y + 0.5, home)) continue;
    const score = scorePad(world, group, el, pad, shooter, bestRange);
    if (score > bestScore) {
      bestScore = score;
      best = pad;
    }
  }
  if (!best) return;
  used.add(best.y * world.w + best.x);
  setGoal(world, el, best.x, best.y);
}

function firm(world: World, el: Element) {
  const [gx, gy] = cellOf(el.x, el.y);
  const key = gy * world.w + gx;
  if (el.goalKey !== key) {
    el.goalX = gx + 0.5;
    el.goalY = gy + 0.5;
    el.goalKey = key;
    el.path = [];
    el.pathFor = -1;
    note(world, `${el.name} firm in the town`);
  }
  el.mode = "hold";
  el.label = "FIRM";
  el.labelUntil = world.tick + 30;
}

function inContact(world: World, el: Element): boolean {
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  for (const foe of world.elements) {
    if (foe.side === el.side || foe.hp <= 0) continue;
    if (hasLos(world, cx, cy, Math.floor(foe.x), Math.floor(foe.y))) return true;
  }
  return false;
}

function forestContact(world: World, el: Element): boolean {
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  for (const foe of world.elements) {
    if (foe.side === el.side || foe.hp <= 0) continue;
    const fx = Math.floor(foe.x);
    const fy = Math.floor(foe.y);
    if (world.terrain[idx(world, fx, fy)] !== FOREST) continue;
    if (hasLos(world, cx, cy, fx, fy)) return true;
  }
  return false;
}

function interiorToward(world: World, cells: number[], x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  for (const cell of cells) {
    const cx = cell % world.w;
    const cy = Math.floor(cell / world.w);
    if (urbanRim(world, cx, cy)) continue;
    const d = Math.hypot(cx + 0.5 - x, cy + 0.5 - y);
    if (d < bestD) {
      bestD = d;
      best = cell;
    }
  }
  return best >= 0 ? best : townCellToward(world, cells, x, y);
}

function foeInCover(world: World, el: Element, cells: number[]): Element | null {
  const town = new Set(cells);
  let best: Element | null = null;
  let bestD = Infinity;
  for (const foe of reports(world, el.side)) {
    const fx = Math.floor(foe.x);
    const fy = Math.floor(foe.y);
    const cover = town.has(idx(world, fx, fy)) || world.terrain[idx(world, fx, fy)] === FOREST;
    if (!cover) continue;
    const d = Math.hypot(foe.x - el.x, foe.y - el.y);
    if (d < bestD) {
      bestD = d;
      best = foe;
    }
  }
  return best;
}

/** Where to stand to look at the nearest town building this side has not seen. Avoid the exposed rim. */
function searchLook(world: World, el: Element, cells: number[]): { x: number; y: number } | null {
  const chart = world.chart?.[el.side];
  if (!chart) return null;
  let unseen = -1;
  let bestD = Infinity;
  for (const cell of cells) {
    if (chart[cell]) continue;
    const x = cell % world.w;
    const y = Math.floor(cell / world.w);
    const d = Math.hypot(x + 0.5 - el.x, y + 0.5 - el.y);
    if (d < bestD) {
      bestD = d;
      unseen = cell;
    }
  }
  if (unseen < 0) return null;
  const ux = unseen % world.w;
  const uy = Math.floor(unseen / world.w);
  if (!urbanRim(world, ux, uy)) return { x: ux, y: uy };
  let view: { x: number; y: number } | null = null;
  let viewD = Infinity;
  for (const cell of cells) {
    const x = cell % world.w;
    const y = Math.floor(cell / world.w);
    if (urbanRim(world, x, y)) continue;
    if (!hasLos(world, x, y, ux, uy)) continue;
    const d = Math.hypot(x + 0.5 - el.x, y + 0.5 - el.y);
    if (d < viewD) {
      viewD = d;
      view = { x, y };
    }
  }
  return view ?? { x: ux, y: uy };
}

const BESIDE = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/** The free tile next to an enemy, on our side of them, inside the town if one is open. */
function besideFoe(world: World, el: Element, foe: Element): { x: number; y: number } | null {
  const fx = Math.floor(foe.x);
  const fy = Math.floor(foe.y);
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const [dx, dy] of BESIDE) {
    const nx = fx + dx;
    const ny = fy + dy;
    if (!inBounds(world, nx, ny) || !passable(world, nx, ny, el.classId)) continue;
    let taken = false;
    for (const other of world.elements) {
      if (other.id === el.id || other.hp <= 0) continue;
      if (Math.floor(other.x) === nx && Math.floor(other.y) === ny) taken = true;
    }
    if (taken) continue;
    const urban = world.terrain[idx(world, nx, ny)] === URBAN ? 0 : 4;
    const d = Math.hypot(nx + 0.5 - el.x, ny + 0.5 - el.y) + urban;
    if (d < bestD) {
      bestD = d;
      best = { x: nx, y: ny };
    }
  }
  return best;
}

function assignRifle(world: World, group: Group, el: Element) {
  const blob = world.blobs.find((b) => b.id === world.objective);
  if (!blob) return;
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  const onUrban = world.terrain[idx(world, cx, cy)] === URBAN;
  const onForest = world.terrain[idx(world, cx, cy)] === FOREST;
  if (onUrban && inContact(world, el)) {
    firm(world, el);
    return;
  }
  if (onForest && forestContact(world, el)) {
    firm(world, el);
    return;
  }
  const hereUrban = onUrban || el.enteredUrban;
  const enemy = oppositeHome(world, group);
  const foe = foeInCover(world, el, blob.cells);

  let release: Pad | null = null;
  let releaseD = Infinity;
  for (const pad of world.pads) {
    if (pad.kind !== "release") continue;
    const d = Math.hypot(pad.x + 0.5 - el.x, pad.y + 0.5 - el.y);
    if (d < releaseD) {
      releaseD = d;
      release = pad;
    }
  }
  const atRelease =
    release !== null && Math.max(Math.abs(cx - release.x), Math.abs(cy - release.y)) <= 1;
  const committed = onUrban || el.enteredUrban || atRelease;
  const foeInWood = foe !== null && world.terrain[idx(world, Math.floor(foe.x), Math.floor(foe.y))] === FOREST;
  if (foe && (committed || foeInWood || (group.role === "hold" && onUrban))) {
    const tile = besideFoe(world, el, foe);
    if (tile) {
      setGoal(world, el, tile.x, tile.y);
      return;
    }
  }

  if (group.role === "hold") {
    const hold = townCellToward(world, blob.cells, enemy.x, enemy.y);
    setGoal(world, el, hold % world.w, Math.floor(hold / world.w));
    return;
  }

  if (hereUrban || atRelease) {
    const look = searchLook(world, el, blob.cells);
    if (look) {
      setGoal(world, el, look.x, look.y);
      return;
    }
    const hold = interiorToward(world, blob.cells, enemy.x, enemy.y);
    setGoal(world, el, hold % world.w, Math.floor(hold / world.w));
    return;
  }
  if (release) setGoal(world, el, release.x, release.y);
}

function seenFoes(world: World, group: Group): Element[] {
  return reports(world, group.side);
}

function nearest(el: Element, foes: Element[]): Element | null {
  let best: Element | null = null;
  let bestD = Infinity;
  for (const foe of foes) {
    const d = Math.hypot(foe.x - el.x, foe.y - el.y);
    if (d < bestD) {
      bestD = d;
      best = foe;
    }
  }
  return best;
}

function seesTown(world: World, x: number, y: number): boolean {
  const blob = world.blobs.find((b) => b.id === world.objective);
  if (!blob) return false;
  const step = Math.max(1, Math.floor(blob.cells.length / 12));
  for (let i = 0; i < blob.cells.length; i += step) {
    const c = blob.cells[i]!;
    if (hasLos(world, x, y, c % world.w, Math.floor(c / world.w))) return true;
  }
  return false;
}

function townDist(world: World, x: number, y: number): number {
  const blob = world.blobs.find((b) => b.id === world.objective);
  if (!blob) return Infinity;
  return nearestTownDist(world, x, y, blob.cells);
}

/** Point on our side of the foe, `band` cells out. */
function bandPoint(el: Element, foe: Element, band: number): { x: number; y: number } {
  const vx = el.x - foe.x;
  const vy = el.y - foe.y;
  const d = Math.hypot(vx, vy) || 1;
  return { x: foe.x + (vx / d) * band, y: foe.y + (vy / d) * band };
}

function holdBand(world: World, el: Element, foe: Element) {
  const d = Math.hypot(foe.x - el.x, foe.y - el.y);
  if (d <= el.range && d >= el.minRange + 1) {
    setGoal(world, el, el.x, el.y);
    return;
  }
  const band = d < el.minRange + 1 ? el.minRange + 4 : el.range * 0.85;
  const point = bandPoint(el, foe, Math.max(band, 1));
  setGoal(world, el, point.x, point.y);
}

function marchMask(world: World, group: Group): { x: number; y: number } {
  const enemy = oppositeHome(world, group);
  const dx = enemy.x - group.homeX;
  const dy = enemy.y - group.homeY;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  let bestX = Math.floor(group.homeX);
  let bestY = Math.floor(group.homeY);
  let bestAlong = Infinity;
  for (const spread of [-6, -3, 0, 3, 6]) {
    const hit = firstMask(
      world,
      group.homeX + px * spread,
      group.homeY + py * spread,
      enemy.x + px * spread,
      enemy.y + py * spread,
    );
    if (!hit) continue;
    const along = Math.hypot(hit.x + 0.5 - group.homeX, hit.y + 0.5 - group.homeY);
    if (along < bestAlong) {
      bestAlong = along;
      bestX = hit.x;
      bestY = hit.y;
    }
  }
  return { x: bestX, y: bestY };
}

function firstMask(world: World, x0: number, y0: number, x1: number, y1: number): { x: number; y: number } | null {
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.floor(value)));
  const line = walkLine(clamp(x0, world.w - 1), clamp(y0, world.h - 1), clamp(x1, world.w - 1), clamp(y1, world.h - 1));
  let prevX = line[0]?.[0] ?? 0;
  let prevY = line[0]?.[1] ?? 0;
  for (let i = 1; i < line.length; i++) {
    const [x, y] = line[i]!;
    if (cellMasks(world, x, y) || (x !== prevX && y !== prevY && (cellMasks(world, x, prevY) || cellMasks(world, prevX, y)))) {
      return { x: prevX, y: prevY };
    }
    prevX = x;
    prevY = y;
  }
  return null;
}

function cellMasks(world: World, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
  const terrain = world.terrain[idx(world, x, y)];
  return terrain === FOREST || terrain === HILL || terrain === URBAN || terrain === WATER;
}

function bestLookout(world: World, group: Group, wantTown: boolean): { x: number; y: number } | null {
  const anchor = oppositeHome(world, group);
  let best: { x: number; y: number } | null = null;
  let bestHome = Infinity;
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const i = idx(world, x, y);
      if (world.terrain[i] !== HILL) continue;
      const sees = wantTown ? seesTown(world, x, y) : hasLos(world, x, y, Math.floor(anchor.x), Math.floor(anchor.y));
      if (!sees) continue;
      if (wantTown && townDist(world, x, y) < 6) continue;
      const home = Math.hypot(x + 0.5 - group.homeX, y + 0.5 - group.homeY);
      if (home < bestHome) {
        bestHome = home;
        best = { x, y };
      }
    }
  }
  return best;
}

function assignRecon(world: World, group: Group, el: Element) {
  if (el.goalKey >= 0 && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.2) return;
  const town = world.objective >= 0;
  const look = bestLookout(world, group, town);
  if (look) {
    setGoal(world, el, look.x, look.y);
    return;
  }
  const mask = marchMask(world, group);
  setGoal(world, el, mask.x, mask.y);
}

function missileStandoff(el: Element): number {
  return Math.max(10, el.range * 0.75);
}

/** Nearest ground the threat cannot see, on our side of them. */
function breakCover(world: World, el: Element, foe: Element): { x: number; y: number } | null {
  const fx = Math.floor(foe.x);
  const fy = Math.floor(foe.y);
  const ax = el.x - foe.x;
  const ay = el.y - foe.y;
  const ad = Math.hypot(ax, ay) || 1;
  const ux = ax / ad;
  const uy = ay / ad;
  let best: { x: number; y: number } | null = null;
  let bestScore = Infinity;
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      if (!passable(world, x, y, el.classId)) continue;
      if (hasLos(world, fx, fy, x, y)) continue;
      const dx = x + 0.5 - el.x;
      const dy = y + 0.5 - el.y;
      const along = dx * ux + dy * uy;
      if (along < 0) continue;
      const lateral = Math.abs(dx * uy - dy * ux);
      const score = Math.hypot(dx, dy) + lateral * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

function assignAtgm(world: World, group: Group, el: Element) {
  const foe = nearest(el, seenFoes(world, group));
  const gap = foe ? Math.hypot(foe.x - el.x, foe.y - el.y) : Infinity;
  if (foe && gap < el.minRange) el.opening = true;
  if (el.opening && foe) {
    const hidden = !hasLos(world, Math.floor(foe.x), Math.floor(foe.y), Math.floor(el.x), Math.floor(el.y));
    if (hidden) {
      setGoal(world, el, el.x, el.y);
      return;
    }
    if (gap < missileStandoff(el)) {
      const cover = breakCover(world, el, foe);
      if (cover) setGoal(world, el, cover.x, cover.y);
      else {
        const away = bandPoint(el, foe, missileStandoff(el));
        setGoal(world, el, away.x, away.y);
      }
      return;
    }
    el.opening = false;
  }
  if (el.goalKey >= 0 && world.terrain[el.goalKey] === HILL && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.3) {
    return;
  }
  let best: { x: number; y: number } | null = null;
  let bestHome = Infinity;
  const anchor = oppositeHome(world, group);
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      if (world.terrain[idx(world, x, y)] !== HILL) continue;
      const dist = world.objective >= 0 ? townDist(world, x, y) : Math.hypot(x + 0.5 - anchor.x, y + 0.5 - anchor.y);
      if (dist < 6 || dist > 16) continue;
      const sees = world.objective >= 0 ? seesTown(world, x, y) : hasLos(world, x, y, Math.floor(anchor.x), Math.floor(anchor.y));
      if (!sees) continue;
      const home = Math.hypot(x + 0.5 - group.homeX, y + 0.5 - group.homeY);
      if (home < bestHome) {
        bestHome = home;
        best = { x, y };
      }
    }
  }
  if (best) setGoal(world, el, best.x, best.y);
  else if (foe) holdBand(world, el, foe);
}

function assignOpenArmor(world: World, el: Element, foe: Element | null) {
  if (!foe) return;
  holdBand(world, el, foe);
}

/** Leader decision. Incoming fire only re-ranks legal pads; it does not change the target. */
export function think(world: World): void {
  for (const group of world.groups) {
    const shooter = unansweredShooter(world, group);
    const used = new Set<number>();
    const members = world.elements.filter((e) => e.groupId === group.id && e.hp > 0);
    const armorPads = world.pads.some((pad) => pad.kind === "armor");
    for (const el of members) {
      if (el.opening && el.type === "atgm") {
        assignAtgm(world, group, el);
        continue;
      }
      const bound = pursuit(world, el);
      if (bound) {
        setGoal(world, el, bound.x, bound.y);
        continue;
      }
      if (el.classId === "armor") {
        if (armorPads) assignArmor(world, group, el, used, shooter);
        else assignOpenArmor(world, el, nearest(el, seenFoes(world, group)));
      } else if (el.type === "atgm") assignAtgm(world, group, el);
      else if (el.classId === "recon") assignRecon(world, group, el);
      else if (el.type === "rifle") assignRifle(world, group, el);
    }
  }
}
