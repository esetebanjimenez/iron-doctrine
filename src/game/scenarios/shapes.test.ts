import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasLos } from "../sim/grid.ts";
import { step } from "../sim/step.ts";
import { HILL, idx, URBAN, type Element, type World } from "../sim/types.ts";
import { createCrescent, createDiagonalWood, createHamlet, createNotchedRidge } from "./shapes.ts";

function terrainAt(world: World, el: Element) {
  return world.terrain[idx(world, Math.floor(el.x), Math.floor(el.y))];
}

function byName(world: World, name: string) {
  const el = world.elements.find((unit) => unit.name === name);
  assert.ok(el, name);
  return el;
}

describe("irregular ground", () => {
  it("the ATGM faces the crescent, not the hole or the far hill", () => {
    const world = createCrescent();
    for (let i = 0; i < 180; i++) step(world);
    const spike = byName(world, "Spike");
    assert.equal(terrainAt(world, spike), HILL);
    assert.ok(spike.y >= 26, `sat on the far hill at y ${spike.y.toFixed(1)}`);
    const inHole = spike.x > 18 && spike.x < 26 && spike.y > 15 && spike.y < 23;
    assert.equal(inHole, false);
    assert.equal(spike.urbanTicks, 0);
  });

  it("armor takes a ridge over a three-house hamlet", () => {
    const world = createHamlet();
    assert.ok(world.pads.some((pad) => pad.kind === "armor"), "hamlet produced no crest");
    for (let i = 0; i < 180; i++) step(world);
    const hammer = byName(world, "Hammer");
    assert.equal(terrainAt(world, hammer), HILL);
    assert.equal(hammer.urbanTicks, 0);
    assert.equal(terrainAt(world, byName(world, "Garrison")) === URBAN || byName(world, "Garrison").enteredUrban, true);
  });

  it("recon does not slip a one-cell notch in a ridge", () => {
    const world = createNotchedRidge();
    for (let i = 0; i < 160; i++) step(world);
    const eye = byName(world, "Eye");
    assert.ok(eye.y >= 17, `recon slipped through to y ${eye.y.toFixed(1)}`);
    assert.ok(Math.hypot(eye.x - 22.5, eye.y - 8.5) > 10);
  });

  it("a diagonal wood blocks sight and the scout stays near", () => {
    const world = createDiagonalWood();
    assert.equal(hasLos(world, 10, 30, 32, 8), false);
    assert.equal(hasLos(world, 32, 8, 10, 30), false);
    for (let i = 0; i < 120; i++) step(world);
    const glass = byName(world, "Glass");
    assert.ok(glass.y >= 20, `scout crossed the wood to y ${glass.y.toFixed(1)}`);
    assert.ok(Math.hypot(glass.x - 32.5, glass.y - 8.5) > 12);
  });
});
