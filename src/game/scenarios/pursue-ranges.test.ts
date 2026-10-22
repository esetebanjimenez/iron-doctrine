import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { step } from "../sim/step.ts";
import { FOREST, HILL, idx, URBAN, type World } from "../sim/types.ts";
import {
  createPursueClose,
  createPursueCrest,
  createPursueInfantry,
  createPursueMissile,
  createPursueTown,
} from "./pursue.ts";

function run(world: World, ticks: number) {
  for (let i = 0; i < ticks; i++) step(world);
  return world;
}

function said(world: World, text: string) {
  return world.events.some((event) => event.text === text);
}

function byName(world: World, name: string) {
  const found = world.elements.find((el) => el.name === name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

describe("pursue scenarios", () => {
  it("a battle tank closes on a light tank, and the light tank does not chase", () => {
    const world = run(createPursueClose(), 160);
    const hammer = byName(world, "Hammer");
    const dart = byName(world, "Dart");
    assert.equal(said(world, "Hammer pursues Dart, closing"), true);
    assert.equal(said(world, "Dart not pursuing Hammer"), true);
    assert.equal(said(world, "Hammer pursuing Dart, view"), false);
    assert.ok(hammer.x > 30, `hammer stayed west at ${hammer.x.toFixed(1)}`);
    assert.ok(dart.hp > 100, "the light tank was caught in the open");
  });

  it("a battle tank does not follow a light tank onto the far ridge", () => {
    const world = run(createPursueCrest(), 160);
    const hammer = byName(world, "Hammer");
    assert.equal(said(world, "Hammer pursuing Dart, view"), true);
    assert.equal(said(world, "Dart not pursuing Hammer"), true);
    assert.equal(said(world, "Hammer pursues Dart, closing"), false);
    assert.ok(hammer.x < 20, `hammer crossed east to ${hammer.x.toFixed(1)}`);
    assert.ok(hammer.y > 24, `hammer crossed the ridge to ${hammer.y.toFixed(1)}`);
    assert.equal(world.terrain[idx(world, Math.floor(hammer.x), Math.floor(hammer.y))], HILL);
  });

  it("a battle tank does not follow a rifle into the town", () => {
    const world = run(createPursueTown(), 160);
    const hammer = byName(world, "Hammer");
    const line = byName(world, "Line");
    assert.equal(said(world, "Hammer pursuing Line, view"), true);
    assert.equal(said(world, "Line not pursuing Hammer"), true);
    assert.equal(hammer.urbanTicks, 0);
    assert.ok(line.urbanTicks > 0, "the rifle never entered the town");
    assert.equal(world.terrain[idx(world, Math.floor(line.x), Math.floor(line.y))], URBAN);
    assert.ok(hammer.y > 28);
  });

  it("rifle teams close on each other into the wood", () => {
    const world = run(createPursueInfantry(), 160);
    const line = byName(world, "Line");
    const garrison = byName(world, "Garrison");
    assert.equal(said(world, "Line pursues Garrison, closing"), true);
    assert.equal(said(world, "Garrison pursues Line, closing"), true);
    assert.equal(world.terrain[idx(world, Math.floor(line.x), Math.floor(line.y))], FOREST);
    assert.ok(Math.hypot(line.x - garrison.x, line.y - garrison.y) < 3);
    assert.ok(line.hp < line.hpMax && garrison.hp < garrison.hpMax);
  });

  it("a missile team takes a view and does not close", () => {
    const world = run(createPursueMissile(), 160);
    const spike = byName(world, "Spike");
    const anvil = byName(world, "Anvil");
    assert.equal(said(world, "Spike pursuing Anvil, view"), true);
    assert.equal(said(world, "Anvil not pursuing Spike"), true);
    assert.equal(said(world, "Spike pursues Anvil, closing"), false);
    assert.ok(spike.hp > 0);
    assert.ok(spike.y > 30, `spike closed to ${spike.y.toFixed(1)}`);
    assert.equal(world.terrain[idx(world, Math.floor(anvil.x), Math.floor(anvil.y))], HILL);
  });
});
