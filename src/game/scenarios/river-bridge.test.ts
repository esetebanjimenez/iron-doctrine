import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasLos } from "../sim/grid.ts";
import { step } from "../sim/step.ts";
import { HILL, idx, ROAD, URBAN, WATER, type World } from "../sim/types.ts";
import { createRiverBridge } from "./river-bridge.ts";

function terrainAt(world: World, x: number, y: number) {
  return world.terrain[idx(world, Math.floor(x), Math.floor(y))];
}

describe("river bridge", () => {
  it("keeps armor on the near crest and sends rifles across", () => {
    const world = createRiverBridge();
    assert.ok(world.pads.some((p) => p.kind === "armor"));
    assert.ok(world.pads.some((p) => p.kind === "release"));

    let lineRoad = 0;
    let lineRoadRun = 0;
    let lineRoadMax = 0;
    let hammerRoad = 0;

    for (let i = 0; i < 220; i++) {
      step(world);
      const hammer = world.elements[0]!;
      const line = world.elements[1]!;
      const hammerCell = terrainAt(world, hammer.x, hammer.y);
      const lineCell = terrainAt(world, line.x, line.y);
      assert.notEqual(hammerCell, WATER);
      assert.notEqual(lineCell, WATER);
      if (hammerCell === ROAD) hammerRoad++;
      if (lineCell === ROAD) {
        lineRoad++;
        lineRoadRun++;
        if (lineRoadRun > lineRoadMax) lineRoadMax = lineRoadRun;
      } else {
        lineRoadRun = 0;
      }
    }

    const hammer = world.elements[0]!;
    const line = world.elements[1]!;
    assert.equal(hammerRoad, 0, `armor entered the bridge at ${hammer.x.toFixed(1)},${hammer.y.toFixed(1)}`);
    assert.equal(terrainAt(world, hammer.x, hammer.y), HILL);
    assert.equal(hammer.urbanTicks, 0);
    const seesTown = world.blobs[0]!.cells.some((c) =>
      hasLos(world, Math.floor(hammer.x), Math.floor(hammer.y), c % world.w, Math.floor(c / world.w)),
    );
    assert.equal(seesTown, true);

    assert.ok(lineRoad > 0, "rifles never crossed the bridge");
    assert.ok(lineRoadMax <= 18, `rifles halted on the bridge for ${lineRoadMax} ticks`);
    assert.equal(line.enteredUrban, true);
    assert.equal(terrainAt(world, line.x, line.y), URBAN);
    assert.notEqual(terrainAt(world, line.x, line.y), ROAD);
    const picket = world.elements.find((e) => e.name === "Picket");
    assert.ok(picket);
    assert.ok(
      picket.hp <= 0 || Math.hypot(line.x - picket.x, line.y - picket.y) < 2.5,
      `line ${line.x.toFixed(1)},${line.y.toFixed(1)} picket ${picket.x.toFixed(1)},${picket.y.toFixed(1)}`,
    );
  });

  it("finds a picket holding the far side of the town", () => {
    const world = createRiverBridge();
    world.groups[0]!.homeX = 4;
    world.groups[0]!.homeY = 4;
    const picket = world.elements.find((e) => e.name === "Picket");
    const line = world.elements.find((e) => e.name === "Line");
    assert.ok(picket && line);
    picket.x = 24.5;
    picket.y = 10.5;
    picket.px = picket.x;
    picket.py = picket.y;
    let closest = Infinity;
    for (let i = 0; i < 400; i++) {
      step(world);
      if (line.hp > 0 && picket.hp > 0) {
        closest = Math.min(closest, Math.hypot(line.x - picket.x, line.y - picket.y));
      }
    }
    assert.ok(closest <= 3, `closest ${closest.toFixed(2)}`);
    assert.ok(line.hp < 100 && picket.hp < 100);
  });
});
