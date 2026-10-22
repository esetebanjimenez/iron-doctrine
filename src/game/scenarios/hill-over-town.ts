import { statsFor } from "../content/catalog.ts";
import { buildOverlay } from "../sim/overlay.ts";
import {
  FLAT,
  FOREST,
  HILL,
  URBAN,
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
 * West crest overlooks a town. Woods run from the friendly start up to the
 * town's southwest corner, off the sightline. The enemy crest is north of the town.
 */
export function createHillOverTown(): World {
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
      { id: 1, side: "you", role: "assault", homeX: 10, homeY: 33 },
      { id: 2, side: "hostile", role: "hold", homeX: 34, homeY: 4 },
    ],
    events: [],
    title: "Hill over town",
    place: "Controlled range",
    brief: "Armor takes the crest. The rifle team enters the town.",
  };

  paint(world, 4, 8, 12, 16, HILL, 2);
  paint(world, 30, 1, 40, 7, HILL, 2);
  paint(world, 18, 8, 28, 16, URBAN, 0);
  paint(world, 8, 17, 17, 32, FOREST, 0);

  buildOverlay(world);

  world.elements = [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 8.5, y: 33.5 }),
    place(world, { id: 2, side: "you", type: "rifle", groupId: 1, name: "Line", x: 12.5, y: 33.5 }),
    place(world, { id: 3, side: "hostile", type: "mbt", groupId: 2, name: "Anvil", x: 34.5, y: 4.5 }),
    place(world, { id: 4, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 23.5, y: 12.5 }),
  ];
  return world;
}

export function dumpWorld(world: World): string {
  const marks = new Map<number, string>();
  for (const el of world.elements) {
    const key = Math.floor(el.y) * world.w + Math.floor(el.x);
    marks.set(key, el.side === "you" ? (el.classId === "armor" ? "T" : "I") : el.classId === "armor" ? "E" : "G");
  }
  const rows: string[] = [];
  for (let y = 0; y < world.h; y++) {
    let row = "";
    for (let x = 0; x < world.w; x++) {
      const key = idx(world, x, y);
      const mark = marks.get(key);
      if (mark) {
        row += mark;
        continue;
      }
      const t = world.terrain[key];
      row += t === HILL ? "^" : t === FOREST ? "*" : t === URBAN ? "#" : world.kill[key] ? "," : ".";
    }
    rows.push(row);
  }
  const units = world.elements
    .map((el) => {
      const t = world.terrain[idx(world, Math.floor(el.x), Math.floor(el.y))];
      return `${el.name} (${el.x.toFixed(1)},${el.y.toFixed(1)}) hp ${el.hp.toFixed(0)} mode ${el.mode} terrain ${t} urban ${el.urbanTicks} killRun ${el.maxKillRun}`;
    })
    .join("\n");
  const pads = world.pads
    .filter((p) => p.kind === "armor")
    .slice(0, 8)
    .map((p) => `armor@${p.x},${p.y} los ${p.los}`)
    .join(" ");
  return `${units}\n${pads}\n${rows.join("\n")}`;
}
