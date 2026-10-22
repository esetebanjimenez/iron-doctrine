import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLAT, FOREST, HILL, idx, URBAN } from "../sim/types.ts";
import { hasLos, urbanRim } from "../sim/grid.ts";
import { runTicks, step } from "../sim/step.ts";
import { createHillOverTown, dumpWorld } from "./hill-over-town.ts";

function cell(world: ReturnType<typeof createHillOverTown>, x: number, y: number) {
  return world.terrain[idx(world, Math.floor(x), Math.floor(y))];
}

describe("hill over town", () => {
  it("finds a crest pad and a wood-edge release", () => {
    const world = createHillOverTown();
    assert.ok(world.pads.some((p) => p.kind === "armor"));
    assert.ok(world.pads.some((p) => p.kind === "release"));
  });

  it("puts armor on the crest and rifles in the town", () => {
    const world = runTicks(createHillOverTown(), 180);
    const hammer = world.elements.find((e) => e.name === "Hammer");
    const line = world.elements.find((e) => e.name === "Line");
    const anvil = world.elements.find((e) => e.name === "Anvil");
    assert.ok(hammer && line && anvil, dumpWorld(world));

    assert.equal(hammer.urbanTicks, 0, dumpWorld(world));
    assert.equal(cell(world, hammer.x, hammer.y), HILL, dumpWorld(world));
    assert.ok(hammer.maxKillRun <= 2, dumpWorld(world));
    const seesTown = world.blobs[0]!.cells.some((c) =>
      hasLos(world, Math.floor(hammer.x), Math.floor(hammer.y), c % world.w, Math.floor(c / world.w)),
    );
    assert.equal(seesTown, true, dumpWorld(world));

    assert.equal(line.enteredUrban, true, dumpWorld(world));
    assert.equal(cell(world, line.x, line.y), URBAN, dumpWorld(world));

    assert.equal(anvil.urbanTicks, 0, dumpWorld(world));
    assert.equal(cell(world, anvil.x, anvil.y), HILL, dumpWorld(world));

    const tiles = new Set<number>();
    for (const el of world.elements) {
      const key = Math.floor(el.y) * world.w + Math.floor(el.x);
      assert.equal(tiles.has(key), false, dumpWorld(world));
      tiles.add(key);
    }
  });

  it("fights the garrison instead of walking past", () => {
    const world = createHillOverTown();
    let closest = Infinity;
    let gapWhenDown = Infinity;
    for (let i = 0; i < 220; i++) {
      step(world);
      const line = world.elements.find((e) => e.name === "Line");
      const garrison = world.elements.find((e) => e.name === "Garrison");
      assert.ok(line && garrison);
      const gap = Math.hypot(line.x - garrison.x, line.y - garrison.y);
      if (line.hp > 0 && garrison.hp > 0) closest = Math.min(closest, gap);
      else if (gapWhenDown === Infinity) gapWhenDown = gap;
    }
    assert.ok(closest <= 1.6, `closest approach ${closest.toFixed(2)}`);
    assert.ok(gapWhenDown <= 2, `walked off before the fight, gap ${gapWhenDown.toFixed(2)}`);
  });

  it("still closes when the rifle enters from the far side", () => {
    const world = createHillOverTown();
    const line = world.elements.find((e) => e.name === "Line");
    assert.ok(line);
    line.x = 23.5;
    line.y = 5.5;
    line.px = line.x;
    line.py = line.y;
    let closest = Infinity;
    for (let i = 0; i < 200; i++) {
      step(world);
      const garrison = world.elements.find((e) => e.name === "Garrison");
      assert.ok(garrison);
      if (line.hp > 0 && garrison.hp > 0) {
        closest = Math.min(closest, Math.hypot(line.x - garrison.x, line.y - garrison.y));
      }
    }
    const garrison = world.elements.find((e) => e.name === "Garrison");
    assert.ok(garrison);
    assert.ok(closest <= 2.2, `never closed, gap ${closest.toFixed(2)}`);
    assert.ok(line.hp < 100 || garrison.hp < 100);
  });

  it("stays in the woods and holds inside the town", () => {
    const world = createHillOverTown();
    let sawForest = false;
    let open = 0;
    for (let i = 0; i < 280; i++) {
      step(world);
      const line = world.elements.find((e) => e.name === "Line");
      assert.ok(line);
      if (line.enteredUrban) continue;
      const ground = world.terrain[idx(world, Math.floor(line.x), Math.floor(line.y))];
      if (ground === FOREST) sawForest = true;
      if (sawForest && ground === FLAT) open++;
    }
    const line = world.elements.find((e) => e.name === "Line");
    assert.ok(line);
    assert.equal(sawForest, true);
    assert.ok(open < 15, `left the woods for ${open} ticks`);
    assert.ok(line.hp > 60, `hp ${line.hp}`);
    assert.equal(urbanRim(world, Math.floor(line.x), Math.floor(line.y)), false);
  });

  it("logs who engages and who breaks", () => {
    const world = createHillOverTown();
    let engaged = false;
    let broke = false;
    for (let i = 0; i < 220; i++) {
      step(world);
      for (const event of world.events) {
        if (event.text === "Line engages Garrison") engaged = true;
        if (event.text === "Line breaks from Garrison") broke = true;
      }
    }
    assert.equal(engaged, true);
    assert.equal(broke, true);
  });

  it("repeats the same positions from the same setup", () => {
    const a = runTicks(createHillOverTown(), 180);
    const b = runTicks(createHillOverTown(), 180);
    for (let i = 0; i < a.elements.length; i++) {
      assert.equal(a.elements[i]!.x.toFixed(3), b.elements[i]!.x.toFixed(3));
      assert.equal(a.elements[i]!.y.toFixed(3), b.elements[i]!.y.toFixed(3));
      assert.equal(a.elements[i]!.hp, b.elements[i]!.hp);
    }
  });
});
