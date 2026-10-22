import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blank, paint } from "../scenarios/build.ts";
import { decidePursue, type PursueCtx } from "./pursue.ts";
import { FOREST, HILL, URBAN, type Element, type TypeId } from "./types.ts";

function unit(type: TypeId, x: number, y: number, minRange = 0): Element {
  return { type, x, y, minRange, name: type, id: 1, side: "you", hp: 10 } as Element;
}

function ctx(pursuer: Element, target: Element, terrain?: { kind: number; x: number; y: number }): PursueCtx {
  const world = blank("pursue", "", []);
  if (terrain) paint(world, terrain.x, terrain.y, terrain.x, terrain.y, terrain.kind, terrain.kind === HILL ? 2 : 0);
  return { world, pursuer, target, x: target.x, y: target.y, gap: Math.hypot(target.x - pursuer.x, target.y - pursuer.y) };
}

describe("pursue matrix", () => {
  it("uses the open-ground pair", () => {
    assert.equal(decidePursue(ctx(unit("mbt", 10, 20), unit("light-tank", 10, 10))), "close");
    assert.equal(decidePursue(ctx(unit("mbt", 10, 20), unit("rifle", 10, 12))), "close");
    assert.equal(decidePursue(ctx(unit("light-tank", 10, 20), unit("mbt", 10, 10))), "no");
    assert.equal(decidePursue(ctx(unit("ifv", 10, 20), unit("light-tank", 10, 10))), "view");
    assert.equal(decidePursue(ctx(unit("rifle", 10, 20), unit("mbt", 10, 10))), "no");
    assert.equal(decidePursue(ctx(unit("rifle", 10, 20), unit("rifle", 10, 12))), "close");
    assert.equal(decidePursue(ctx(unit("atgm", 10, 20), unit("mbt", 10, 8))), "view");
    assert.equal(decidePursue(ctx(unit("recon-team", 10, 20), unit("rifle", 10, 8))), "view");
    assert.equal(decidePursue(ctx(unit("scout-car", 10, 20), unit("rifle", 10, 8))), "view");
    assert.equal(decidePursue(ctx(unit("mbt", 10, 20), unit("scout-car" as TypeId, 10, 8))), "close");
  });

  it("does not close a vehicle into a town or a wood", () => {
    const town = ctx(unit("mbt", 10, 30), unit("rifle", 10, 12), { kind: URBAN, x: 10, y: 12 });
    assert.equal(decidePursue(town), "view");
    const wood = ctx(unit("light-tank", 10, 30), unit("rifle", 10, 12), { kind: FOREST, x: 10, y: 12 });
    assert.equal(decidePursue(wood), "view");
    const rifles = ctx(unit("rifle", 10, 30), unit("rifle", 10, 12), { kind: URBAN, x: 10, y: 12 });
    assert.equal(decidePursue(rifles), "close");
  });

  it("does not follow anyone over a crest", () => {
    const world = blank("pursue", "", []);
    paint(world, 10, 16, 10, 16, HILL, 2);
    const pursuer = unit("mbt", 10.5, 24.5);
    const target = unit("light-tank", 10.5, 8.5);
    assert.equal(decidePursue({ world, pursuer, target, x: target.x, y: target.y, gap: 16 }), "view");
  });

  it("closes a missile team only from inside its minimum", () => {
    assert.equal(decidePursue(ctx(unit("mbt", 10, 18), unit("atgm", 10, 14, 5))), "close");
    assert.equal(decidePursue(ctx(unit("mbt", 10, 24), unit("atgm", 10, 14, 5))), "no");
    assert.equal(decidePursue(ctx(unit("rifle", 10, 20), unit("atgm", 10, 14, 5))), "no");
    const covered = ctx(unit("rifle", 10, 20), unit("atgm", 10, 14, 5), { kind: URBAN, x: 10, y: 14 });
    assert.equal(decidePursue(covered), "close");
  });

  it("a class with no row does not pursue", () => {
    assert.equal(decidePursue(ctx(unit("mbt", 10, 20), unit("rifle", 10, 12))), "close");
    const world = blank("pursue", "", []);
    const ghost = unit("rifle", 10, 12);
    ghost.type = "missing" as TypeId;
    assert.equal(decidePursue({ world, pursuer: unit("mbt", 10, 20), target: ghost, x: 10, y: 12, gap: 8 }), "no");
  });
});
