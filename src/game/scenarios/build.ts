import { statsFor } from "../content/catalog.ts";
import { buildOverlay } from "../sim/overlay.ts";
import {
  FLAT,
  idx,
  URBAN,
  type Element,
  type Role,
  type Side,
  type TypeId,
  type World,
} from "../sim/types.ts";

export function blank(title: string, brief: string, groups: World["groups"]): World {
  const w = 44;
  const h = 36;
  return {
    tick: 0,
    w,
    h,
    terrain: new Uint8Array(w * h).fill(FLAT),
    elev: new Uint8Array(w * h),
    kill: new Uint8Array(w * h),
    blobs: [],
    objective: -1,
    pads: [],
    elements: [],
    groups,
    events: [],
    title,
    place: "Controlled range",
    brief,
  };
}

export function paint(
  world: World,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  terrain: number,
  elev: number,
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= world.w || y >= world.h) continue;
      const i = idx(world, x, y);
      world.terrain[i] = terrain;
      world.elev[i] = elev;
    }
  }
}

export function place(
  world: World,
  partial: { id: number; side: Side; type: TypeId; groupId: number; name: string; x: number; y: number },
): Element {
  const stats = statsFor(partial.type);
  const el: Element = {
    id: partial.id,
    side: partial.side,
    type: partial.type,
    classId: stats.classId,
    groupId: partial.groupId,
    name: partial.name,
    x: partial.x,
    y: partial.y,
    px: partial.x,
    py: partial.y,
    facing: partial.side === "you" ? -Math.PI / 2 : Math.PI / 2,
    hp: stats.hp,
    hpMax: stats.hp,
    suppression: 0,
    cooldown: 0,
    goalX: partial.x,
    goalY: partial.y,
    goalKey: -1,
    path: [],
    pathFor: -1,
    mode: "bound",
    label: "",
    labelUntil: 0,
    urbanTicks: 0,
    killTicks: 0,
    killRun: 0,
    maxKillRun: 0,
    enteredUrban: false,
    answered: false,
    notedFire: false,
    speed: stats.speed,
    range: stats.range,
    minRange: stats.minRange,
    damage: stats.damage,
    radius: stats.radius,
  };
  const cx = Math.floor(el.x);
  const cy = Math.floor(el.y);
  if (world.terrain[idx(world, cx, cy)] === URBAN) el.enteredUrban = true;
  return el;
}

export function finish(world: World, elements: Element[]): World {
  buildOverlay(world);
  world.elements = elements;
  return world;
}

export function group(id: number, side: Side, role: Role, homeX: number, homeY: number): World["groups"][number] {
  return { id, side, role, homeX, homeY };
}
