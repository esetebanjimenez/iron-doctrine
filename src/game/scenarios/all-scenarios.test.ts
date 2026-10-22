import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { step } from "../sim/step.ts";
import type { World } from "../sim/types.ts";
import { RANGES } from "./index.ts";

function run(world: World, ticks: number) {
  for (let i = 0; i < ticks; i++) step(world);
  return world;
}

function stamp(world: World) {
  return world.elements
    .map((el) => `${el.id}:${el.x.toFixed(2)},${el.y.toFixed(2)},${Math.round(el.hp)}`)
    .join("|");
}

describe("every scenario", () => {
  for (const range of RANGES) {
    it(`${range.label} stays on the map, does not stack, and repeats`, () => {
      const first = run(range.create(), 80);
      const occupied = new Set<string>();
      for (const el of first.elements) {
        assert.ok(el.x >= 0 && el.y >= 0 && el.x < first.w && el.y < first.h, `${el.name} left the map`);
        const key = `${Math.floor(el.x)},${Math.floor(el.y)}`;
        assert.equal(occupied.has(key), false, `${range.label} stacks at ${key}`);
        occupied.add(key);
      }
      const second = run(range.create(), 80);
      assert.equal(stamp(first), stamp(second));
    });
  }
});
