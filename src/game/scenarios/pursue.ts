import { blank, finish, group, paint, place } from "./build.ts";
import { FOREST, HILL, URBAN } from "../sim/types.ts";

/** A light tank slips behind a wood on the way to its crest. The battle tank closes. */
export function createPursueClose() {
  const world = blank(
    "Pursue close",
    "The battle tank closes on the light tank. The light tank does not chase it back.",
    [group(1, "you", "assault", 8, 32), group(2, "hostile", "assault", 40, 8)],
  );
  paint(world, 16, 18, 24, 22, URBAN, 0);
  paint(world, 28, 14, 32, 24, FOREST, 0);
  paint(world, 36, 4, 42, 14, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 10.5, y: 30.5 }),
    place(world, { id: 2, side: "hostile", type: "light-tank", groupId: 2, name: "Dart", x: 40.5, y: 28.5 }),
  ]);
}

/** The light tank takes the far side of a ridge. The battle tank does not follow it over. */
export function createPursueCrest() {
  const world = blank(
    "Pursue crest",
    "The light tank makes for the ridge. The battle tank keeps its own hill and does not follow.",
    [group(1, "you", "assault", 10, 32), group(2, "hostile", "assault", 36, 4)],
  );
  paint(world, 16, 16, 24, 20, URBAN, 0);
  paint(world, 6, 26, 16, 32, HILL, 2);
  paint(world, 26, 10, 43, 18, HILL, 2);
  paint(world, 30, 2, 40, 8, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 10.5, y: 30.5 }),
    place(world, { id: 2, side: "hostile", type: "light-tank", groupId: 2, name: "Dart", x: 38.5, y: 24.5 }),
  ]);
}

/** A rifle reaches the town. The tank may look, but it does not go in. */
export function createPursueTown() {
  const world = blank(
    "Pursue town",
    "The rifle enters the town. The tank does not follow it in.",
    [group(1, "you", "assault", 22, 34), group(2, "hostile", "assault", 22, 8)],
  );
  paint(world, 18, 8, 26, 14, URBAN, 0);
  paint(world, 18, 15, 26, 18, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 22.5, y: 33.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Line", x: 22.5, y: 21.5 }),
  ]);
}

/** A rifle team follows another rifle into the wood. */
export function createPursueInfantry() {
  const world = blank(
    "Pursue infantry",
    "The rifle team closes into the wood after the garrison.",
    [group(1, "you", "assault", 22, 34), group(2, "hostile", "hold", 22, 8)],
  );
  paint(world, 18, 8, 26, 14, URBAN, 0);
  paint(world, 16, 18, 28, 19, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "rifle", groupId: 1, name: "Line", x: 22.5, y: 33.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 22.5, y: 22.5 }),
  ]);
}

/** A missile team keeps its distance when the tank it was watching disappears. */
export function createPursueMissile() {
  const world = blank(
    "Pursue missile",
    "The missile team looks for a new view. It does not close.",
    [group(1, "you", "overwatch", 8, 32), group(2, "hostile", "assault", 40, 8)],
  );
  paint(world, 16, 18, 24, 22, URBAN, 0);
  paint(world, 28, 14, 32, 24, FOREST, 0);
  paint(world, 36, 4, 42, 14, HILL, 2);
  paint(world, 4, 26, 14, 32, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "atgm", groupId: 1, name: "Spike", x: 8.5, y: 34.5 }),
    place(world, { id: 2, side: "hostile", type: "mbt", groupId: 2, name: "Anvil", x: 40.5, y: 28.5 }),
  ]);
}
