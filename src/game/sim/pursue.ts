import { FOREST, HILL, URBAN, idx, type Element, type TypeId, type World } from "./types.ts";
import { hasLos, passable, walkLine } from "./grid.ts";
import { reports } from "./intel.ts";

export type PursueIntent = "close" | "view" | "no";

const TYPES: TypeId[] = ["mbt", "light-tank", "ifv", "rifle", "atgm", "recon-team", "scout-car"];

function row(intents: Partial<Record<TypeId, PursueIntent>>, fallback: PursueIntent = "no"): Record<TypeId, PursueIntent> {
  const out = {} as Record<TypeId, PursueIntent>;
  for (const type of TYPES) out[type] = intents[type] ?? fallback;
  return out;
}

/**
 * Open-ground default for each pursuer against each target.
 * A new class adds a row. A missing row pursues nothing.
 * Crest, concealment, and missile range are modifiers, not extra rows.
 */
export const PURSUE: Record<TypeId, Record<TypeId, PursueIntent>> = {
  mbt: row({
    mbt: "close",
    "light-tank": "close",
    ifv: "close",
    rifle: "close",
    atgm: "close",
    "recon-team": "close",
    "scout-car": "close",
  }),
  "light-tank": row({
    mbt: "no",
    "light-tank": "close",
    ifv: "close",
    rifle: "close",
    atgm: "close",
    "recon-team": "close",
    "scout-car": "close",
  }),
  ifv: row({
    mbt: "no",
    "light-tank": "view",
    ifv: "close",
    rifle: "close",
    atgm: "close",
    "recon-team": "close",
    "scout-car": "close",
  }),
  rifle: row({
    rifle: "close",
    atgm: "close",
    "recon-team": "close",
  }),
  atgm: row({}, "view"),
  "recon-team": row({}, "view"),
  "scout-car": row({}, "view"),
};

const VEHICLE: ReadonlySet<TypeId> = new Set(["mbt", "ifv", "light-tank", "scout-car"]);

export type PursueCtx = {
  world: World;
  pursuer: Element;
  target: Element;
  x: number;
  y: number;
  gap: number;
};

export function basePursue(pursuer: TypeId, target: TypeId): PursueIntent {
  return PURSUE[pursuer]?.[target] ?? "no";
}

function blocks(world: World, x: number, y: number): boolean {
  const terrain = world.terrain[idx(world, x, y)];
  return terrain === HILL || terrain === FOREST || terrain === URBAN;
}

export function crestBetween(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const line = walkLine(x0, y0, x1, y1);
  for (let i = 1; i < line.length - 1; i++) {
    const [x, y] = line[i]!;
    if (world.terrain[idx(world, x, y)] === HILL) return true;
  }
  return false;
}

/** Pair default, then the ground and range rules that apply to every class. */
export function decidePursue(ctx: PursueCtx): PursueIntent {
  let intent = basePursue(ctx.pursuer.type, ctx.target.type);
  const tx = Math.floor(ctx.x);
  const ty = Math.floor(ctx.y);
  const terrain = ctx.world.terrain[idx(ctx.world, tx, ty)];
  const concealed = terrain === URBAN || terrain === FOREST || terrain === HILL;
  if (
    ctx.pursuer.type === "rifle" &&
    (ctx.target.type === "atgm" || ctx.target.type === "recon-team") &&
    !concealed
  ) {
    intent = "no";
  }
  if (concealed && (terrain === URBAN || terrain === FOREST) && VEHICLE.has(ctx.pursuer.type) && intent === "close") {
    intent = "view";
  }
  if (ctx.target.type === "atgm" && VEHICLE.has(ctx.pursuer.type) && intent === "close" && ctx.gap >= ctx.target.minRange) {
    intent = "no";
  }
  if (
    intent === "close" &&
    crestBetween(ctx.world, Math.floor(ctx.pursuer.x), Math.floor(ctx.pursuer.y), tx, ty)
  ) {
    intent = "view";
  }
  if (ctx.pursuer.type === "atgm" && intent === "close") intent = "view";
  return intent;
}

function hiddenContact(world: World, el: Element): PursueCtx | null {
  let best: PursueCtx | null = null;
  let bestD = Infinity;
  for (const report of reports(world, el.side)) {
    const real = world.elements.find((other) => other.id === report.id);
    if (!real || real.hp <= 0) continue;
    if (hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(real.x), Math.floor(real.y))) continue;
    const gap = Math.hypot(report.x - el.x, report.y - el.y);
    if (gap < bestD) {
      bestD = gap;
      best = { world, pursuer: el, target: real, x: report.x, y: report.y, gap };
    }
  }
  return best;
}

function seesAnyone(world: World, el: Element): boolean {
  for (const foe of world.elements) {
    if (foe.side === el.side || foe.hp <= 0) continue;
    if (hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(foe.x), Math.floor(foe.y))) return true;
  }
  return false;
}

function nearestStand(world: World, el: Element, x: number, y: number): { x: number; y: number } {
  if (passable(world, x, y, el.classId)) return { x, y };
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!passable(world, nx, ny, el.classId)) continue;
      const d = Math.hypot(nx - el.x, ny - el.y);
      if (d < bestD) {
        bestD = d;
        best = { x: nx, y: ny };
      }
    }
  }
  return best ?? { x: Math.floor(el.x), y: Math.floor(el.y) };
}

function nearSide(world: World, el: Element, tx: number, ty: number): { x: number; y: number } | null {
  const line = walkLine(Math.floor(el.x), Math.floor(el.y), tx, ty);
  let prevX = line[0]?.[0] ?? Math.floor(el.x);
  let prevY = line[0]?.[1] ?? Math.floor(el.y);
  for (let i = 1; i < line.length; i++) {
    const [x, y] = line[i]!;
    if (blocks(world, x, y)) return passable(world, prevX, prevY, el.classId) ? { x: prevX, y: prevY } : null;
    prevX = x;
    prevY = y;
  }
  return null;
}

function viewpoint(world: World, el: Element, ctx: PursueCtx): { x: number; y: number } | null {
  const tx = Math.floor(ctx.x);
  const ty = Math.floor(ctx.y);
  const px = Math.floor(el.x);
  const py = Math.floor(el.y);
  const posted = world.terrain[idx(world, px, py)] === HILL;
  const ax = ctx.x - el.x;
  const ay = ctx.y - el.y;
  const ad = Math.hypot(ax, ay) || 1;
  let best: { x: number; y: number } | null = null;
  let bestScore = Infinity;
  for (let y = Math.max(0, py - 14); y <= Math.min(world.h - 1, py + 14); y++) {
    for (let x = Math.max(0, px - 14); x <= Math.min(world.w - 1, px + 14); x++) {
      if (!passable(world, x, y, el.classId)) continue;
      const terrain = world.terrain[idx(world, x, y)];
      if (posted && terrain !== HILL) continue;
      if (VEHICLE.has(el.type) && (terrain === URBAN || terrain === FOREST)) continue;
      if (crestBetween(world, px, py, x, y)) continue;
      if (!hasLos(world, x, y, tx, ty)) continue;
      const reach = Math.hypot(x + 0.5 - ctx.x, y + 0.5 - ctx.y);
      if (el.type === "atgm" && reach < ctx.gap - 0.5) continue;
      const along = ((x + 0.5 - el.x) * ax + (y + 0.5 - el.y) * ay) / ad;
      if (along > ad + 1) continue;
      let score = Math.hypot(x + 0.5 - el.x, y + 0.5 - el.y);
      if (el.classId === "armor" && terrain === HILL) score -= 4;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

export function pursuePoint(ctx: PursueCtx, intent: PursueIntent): { x: number; y: number } | null {
  if (intent === "no") return null;
  const tx = Math.floor(ctx.x);
  const ty = Math.floor(ctx.y);
  if (intent === "close") return nearestStand(ctx.world, ctx.pursuer, tx, ty);
  const px = Math.floor(ctx.pursuer.x);
  const py = Math.floor(ctx.pursuer.y);
  const terrain = ctx.world.terrain[idx(ctx.world, tx, ty)];
  const concealed = terrain === URBAN || terrain === FOREST;
  if (
    crestBetween(ctx.world, px, py, tx, ty) &&
    basePursue(ctx.pursuer.type, ctx.target.type) === "close" &&
    !concealed
  ) {
    return nearSide(ctx.world, ctx.pursuer, tx, ty) ?? { x: px, y: py };
  }
  if (ctx.pursuer.classId === "armor" && ctx.world.terrain[idx(ctx.world, px, py)] !== HILL) return null;
  const view = viewpoint(ctx.world, ctx.pursuer, ctx);
  if (view) return view;
  if (ctx.world.terrain[idx(ctx.world, px, py)] === HILL) return { x: px, y: py };
  if (ctx.pursuer.classId === "armor") return null;
  return nearSide(ctx.world, ctx.pursuer, tx, ty);
}

function logPursue(world: World, el: Element, target: Element, intent: PursueIntent) {
  const text =
    intent === "close"
      ? `${el.name} pursues ${target.name}, closing`
      : intent === "view"
        ? `${el.name} pursuing ${target.name}, view`
        : `${el.name} not pursuing ${target.name}`;
  if (el.pursueLog === text) return;
  el.pursueLog = text;
  world.events.push({ tick: world.tick, text });
  if (world.events.length > 40) world.events.shift();
}

/** A broken contact this element cannot see. Logs the decision. The point is set only for close and view. */
export function pursuit(world: World, el: Element): { x: number; y: number } | null {
  if (el.opening || seesAnyone(world, el)) return null;
  const ctx = hiddenContact(world, el);
  if (!ctx) return null;
  const intent = decidePursue(ctx);
  logPursue(world, el, ctx.target, intent);
  if (intent === "no") return null;
  return pursuePoint(ctx, intent);
}
