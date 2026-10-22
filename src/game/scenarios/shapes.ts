import { blank, finish, group, paint, place } from "./build.ts";
import { FOREST, HILL, idx, URBAN } from "../sim/types.ts";

/** Crescent town. The hole is not the town, and a far hill is a decoy. */
export function createCrescent() {
  const world = blank("Crescent", "The missile team faces the buildings, not the empty middle.", [
    group(1, "you", "overwatch", 22, 34),
    group(2, "hostile", "hold", 22, 18),
  ]);
  paint(world, 14, 10, 17, 18, URBAN, 0);
  paint(world, 26, 10, 29, 18, URBAN, 0);
  paint(world, 14, 10, 29, 13, URBAN, 0);
  paint(world, 19, 2, 24, 5, HILL, 2);
  paint(world, 14, 26, 29, 26, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "atgm", groupId: 1, name: "Spike", x: 22.5, y: 34.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 15.5, y: 18.5 }),
  ]);
}

/** Three houses in an L. A ridge that sees them is still a crest. */
export function createHamlet() {
  const world = blank("Hamlet", "A small town is still a town. Armor takes the ridge that sees it.", [
    group(1, "you", "assault", 21, 32),
    group(2, "hostile", "hold", 21, 14),
  ]);
  paint(world, 20, 14, 22, 14, URBAN, 0);
  paint(world, 20, 15, 20, 15, URBAN, 0);
  paint(world, 16, 22, 26, 26, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 21.5, y: 32.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 21.5, y: 14.5 }),
  ]);
}

/** A ridge with a one-cell notch. The notch is not a lane. */
export function createNotchedRidge() {
  const world = blank("Notched ridge", "Recon stops on the ridge. A one-cell notch is not a way through.", [
    group(1, "you", "screen", 22, 32),
    group(2, "hostile", "hold", 22, 8),
  ]);
  paint(world, 0, 18, 43, 20, HILL, 2);
  world.terrain[idx(world, 22, 18)] = 0;
  world.terrain[idx(world, 22, 19)] = 0;
  world.terrain[idx(world, 22, 20)] = 0;
  world.elev[idx(world, 22, 18)] = 0;
  world.elev[idx(world, 22, 19)] = 0;
  world.elev[idx(world, 22, 20)] = 0;
  paint(world, 16, 6, 28, 12, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "recon-team", groupId: 1, name: "Eye", x: 22.5, y: 32.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Picket", x: 22.5, y: 8.5 }),
  ]);
}

/** A one-cell diagonal wood. Sight does not slip through the corners. */
export function createDiagonalWood() {
  const world = blank("Diagonal wood", "A thin wood on the diagonal still hides the far side.", [
    group(1, "you", "screen", 10, 30),
    group(2, "hostile", "hold", 32, 8),
  ]);
  for (let i = 0; i < 20; i++) {
    const x = 12 + i;
    const y = 28 - i;
    world.terrain[idx(world, x, y)] = FOREST;
  }
  return finish(world, [
    place(world, { id: 1, side: "you", type: "scout-car", groupId: 1, name: "Glass", x: 10.5, y: 30.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Picket", x: 32.5, y: 8.5 }),
  ]);
}
