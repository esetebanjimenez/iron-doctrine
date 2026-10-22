import { hasLos } from "./grid.ts";
import { type Element, type Side, type World } from "./types.ts";

function note(world: World, text: string) {
  world.events.push({ tick: world.tick, text });
  if (world.events.length > 40) world.events.shift();
}

function ensure(world: World) {
  if (!world.contacts) world.contacts = [];
  if (!world.chart) world.chart = {};
  if (!world.chart.you) world.chart.you = new Uint8Array(world.w * world.h);
  if (!world.chart.hostile) world.chart.hostile = new Uint8Array(world.w * world.h);
}

/** Write what each element can see onto its side's map. Other leaders read that map. */
export function observe(world: World): void {
  ensure(world);
  const contacts = world.contacts!;
  const refreshed = new Set<string>();
  const blob = world.blobs.find((b) => b.id === world.objective);

  for (const el of world.elements) {
    if (el.hp <= 0) continue;
    const ex = Math.floor(el.x);
    const ey = Math.floor(el.y);
    const chart = world.chart![el.side]!;
    if (blob) {
      for (const cell of blob.cells) {
        if (chart[cell]) continue;
        if (hasLos(world, ex, ey, cell % world.w, Math.floor(cell / world.w))) chart[cell] = 1;
      }
    }
    for (const foe of world.elements) {
      if (foe.side === el.side || foe.hp <= 0) continue;
      if (!hasLos(world, ex, ey, Math.floor(foe.x), Math.floor(foe.y))) continue;
      const key = `${el.side}:${foe.id}`;
      refreshed.add(key);
      const row = contacts.find((c) => c.side === el.side && c.foeId === foe.id);
      if (row) {
        row.x = foe.x;
        row.y = foe.y;
        row.tick = world.tick;
      } else {
        contacts.push({ foeId: foe.id, side: el.side, x: foe.x, y: foe.y, tick: world.tick });
        note(world, `${el.name} sees ${foe.name}`);
      }
    }
  }

  world.contacts = contacts.filter((c) => {
    const foe = world.elements.find((e) => e.id === c.foeId);
    if (!foe || foe.hp <= 0) return false;
    if (refreshed.has(`${c.side}:${c.foeId}`)) return true;
    const cx = Math.floor(c.x);
    const cy = Math.floor(c.y);
    for (const el of world.elements) {
      if (el.side !== c.side || el.hp <= 0) continue;
      if (!hasLos(world, Math.floor(el.x), Math.floor(el.y), cx, cy)) continue;
      if (Math.hypot(el.x - c.x, el.y - c.y) > 4) continue;
      return false;
    }
    return true;
  });
}

/** Enemies this side has seen, standing at the last place a leader reported. */
export function reports(world: World, side: Side): Element[] {
  const out: Element[] = [];
  for (const c of world.contacts ?? []) {
    if (c.side !== side) continue;
    const foe = world.elements.find((e) => e.id === c.foeId);
    if (!foe || foe.hp <= 0) continue;
    out.push({ ...foe, x: c.x, y: c.y });
  }
  return out;
}