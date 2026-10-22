import { statsFor } from "../content/catalog.ts";
import { buildOverlay } from "../sim/overlay.ts";
import {
  FLAT,
  FOREST,
  HILL,
  ROAD,
  URBAN,
  WATER,
  idx,
  type Element,
  type Side,
  type TypeId,
  type World,
} from "../sim/types.ts";

const W = 44;
const H = 36;

function paint(
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

function place(
  world: World,
  partial: {
    id: number;
    side: Side;
    type: TypeId;
    groupId: number;
    name: string;
    x: number;
    y: number;
  },
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

/**
 * One bridge over a river. The near crest sees the far town.
 * The wood that touches the town sits on the far bank, off the bridge deck.
 */
export function createRiverBridge(): World {
  const world: World = {
    tick: 0,
    w: W,
    h: H,
    terrain: new Uint8Array(W * H).fill(FLAT),
    elev: new Uint8Array(W * H),
    kill: new Uint8Array(W * H),
    blobs: [],
    objective: -1,
    pads: [],
    elements: [],
    groups: [
      { id: 1, side: "you", role: "assault", homeX: 12, homeY: 32 },
      { id: 2, side: "hostile", role: "hold", homeX: 23, homeY: 12 },
    ],
    events: [],
    title: "River bridge",
    place: "Controlled range",
    brief: "Armor stays on the near crest. Rifles cross, and do not stop on the bridge.",
  };

  paint(world, 0, 17, W - 1, 19, WATER, 0);
  paint(world, 21, 17, 23, 19, ROAD, 0);
  paint(world, 6, 22, 14, 28, HILL, 2);
  paint(world, 18, 10, 26, 15, URBAN, 0);
  paint(world, 16, 16, 19, 16, FOREST, 0);

  buildOverlay(world);

  world.elements = [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 10.5, y: 32.5 }),
    place(world, { id: 2, side: "you", type: "rifle", groupId: 1, name: "Line", x: 16.5, y: 32.5 }),
    place(world, { id: 3, side: "hostile", type: "rifle", groupId: 2, name: "Picket", x: 22.5, y: 12.5 }),
  ];
  return world;
}
