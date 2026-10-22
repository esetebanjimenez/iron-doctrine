import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { step } from "../sim/step.ts";
import { FOREST, HILL, idx, URBAN, type Element, type World } from "../sim/types.ts";
import { hasLos } from "../sim/grid.ts";
import {
  createAtgmHill,
  createCompany,
  createCrestWatch,
  createIfvRelease,
  createLightFlank,
  createMinimumRange,
  createOpenDuel,
  createWoodEdge,
} from "./ranges.ts";

function terrainAt(world: World, el: Element) {
  return world.terrain[idx(world, Math.floor(el.x), Math.floor(el.y))];
}

function byName(world: World, name: string) {
  const el = world.elements.find((unit) => unit.name === name);
  assert.ok(el, name);
  return el;
}

function dist(a: Element, b: Element) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("controlled ranges", () => {
  it("open duel closes to gun range and both tanks are hit", () => {
    const world = createOpenDuel();
    for (let i = 0; i < 70; i++) step(world);
    const hammer = byName(world, "Hammer");
    const anvil = byName(world, "Anvil");
    const gap = dist(hammer, anvil);
    assert.ok(gap <= 14, `still out of range at ${gap.toFixed(1)}`);
    assert.ok(gap >= 6, `closed to point blank at ${gap.toFixed(1)}`);
    assert.ok(hammer.hp < hammer.hpMax);
    assert.ok(anvil.hp < anvil.hpMax);
  });

  it("recon stops on the lip and does not walk down the crest", () => {
    const world = createCrestWatch();
    for (let i = 0; i < 160; i++) step(world);
    const eye = byName(world, "Eye");
    const picket = byName(world, "Picket");
    assert.equal(terrainAt(world, eye), HILL);
    assert.ok(dist(eye, picket) >= 6, `recon closed to ${dist(eye, picket).toFixed(1)}`);
    assert.equal(
      hasLos(world, Math.floor(eye.x), Math.floor(eye.y), Math.floor(picket.x), Math.floor(picket.y)),
      true,
    );
    assert.ok(eye.y > 14, "recon crossed onto the far slope");
  });

  it("the scout screens the near wood and does not cross it", () => {
    const world = createWoodEdge();
    let closest = Infinity;
    for (let i = 0; i < 120; i++) step(world);
    const glass = byName(world, "Glass");
    const picket = byName(world, "Picket");
    closest = dist(glass, picket);
    assert.ok(closest > 10, `scout closed to ${closest.toFixed(1)}`);
    assert.ok(glass.y >= 21, `scout is at y ${glass.y.toFixed(1)}, past the near edge`);
    assert.notEqual(terrainAt(world, glass), FOREST);
  });

  it("the ATGM holds a crest and does not enter the town", () => {
    const world = createAtgmHill();
    for (let i = 0; i < 180; i++) step(world);
    const spike = byName(world, "Spike");
    const garrison = byName(world, "Garrison");
    assert.equal(terrainAt(world, spike), HILL);
    assert.equal(spike.urbanTicks, 0);
    assert.equal(garrison.enteredUrban || terrainAt(world, garrison) === URBAN, true);
    assert.ok(garrison.hp < garrison.hpMax, "ATGM never got a shot");
  });

  it("an ATGM inside minimum range breaks away without firing", () => {
    const world = createMinimumRange();
    for (let i = 0; i < 80; i++) step(world);
    const spike = byName(world, "Spike");
    const anvil = byName(world, "Anvil");
    assert.ok(spike.hp > 0, "the missile team died in the open");
    assert.equal(anvil.hp, anvil.hpMax);
    assert.equal(
      hasLos(world, Math.floor(anvil.x), Math.floor(anvil.y), Math.floor(spike.x), Math.floor(spike.y)),
      false,
    );
    assert.equal(
      world.events.some((event) => event.text === "Spike engages Anvil"),
      false,
    );
  });

  it("the IFV stays on the crest and the rifle team enters the town", () => {
    const world = createIfvRelease();
    for (let i = 0; i < 200; i++) step(world);
    const carrier = byName(world, "Carrier");
    const line = byName(world, "Line");
    assert.equal(terrainAt(world, carrier), HILL);
    assert.equal(carrier.urbanTicks, 0);
    assert.equal(carrier.maxKillRun <= 2, true);
    assert.equal(line.enteredUrban, true);
    assert.equal(terrainAt(world, line), URBAN);
  });

  it("the battle tank takes the front crest and the light tank takes the flank", () => {
    const world = createLightFlank();
    for (let i = 0; i < 200; i++) step(world);
    const hammer = byName(world, "Hammer");
    const dart = byName(world, "Dart");
    assert.equal(terrainAt(world, hammer), HILL);
    assert.equal(terrainAt(world, dart), HILL);
    assert.equal(hammer.urbanTicks, 0);
    assert.equal(dart.urbanTicks, 0);
    const axis = 22;
    assert.ok(
      Math.abs(hammer.x - axis) + 2 < Math.abs(dart.x - axis),
      `hammer x ${hammer.x.toFixed(1)} dart x ${dart.x.toFixed(1)}`,
    );
  });

  it("a company splits by class", () => {
    const world = createCompany();
    for (let i = 0; i < 220; i++) step(world);
    const eye = byName(world, "Eye");
    const line = byName(world, "Line");
    const spike = byName(world, "Spike");
    const carrier = byName(world, "Carrier");
    assert.equal(eye.urbanTicks, 0);
    assert.notEqual(terrainAt(world, eye), URBAN);
    assert.equal(line.enteredUrban, true);
    assert.equal(terrainAt(world, spike), HILL);
    assert.equal(spike.urbanTicks, 0);
    assert.equal(terrainAt(world, carrier), HILL);
    assert.equal(carrier.urbanTicks, 0);
  });
});
