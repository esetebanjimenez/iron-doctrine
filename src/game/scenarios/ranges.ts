import { blank, finish, group, paint, place } from "./build.ts";
import { FOREST, HILL, URBAN } from "../sim/types.ts";

/** Two tanks in the open. They close to gun range and stop there. */
export function createOpenDuel() {
  const world = blank("Open duel", "The tanks close to gun range, then they hold and shoot.", [
    group(1, "you", "assault", 22, 30),
    group(2, "hostile", "assault", 22, 8),
  ]);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 22.5, y: 30.5 }),
    place(world, { id: 2, side: "hostile", type: "mbt", groupId: 2, name: "Anvil", x: 22.5, y: 8.5 }),
  ]);
}

/** A ridge hides the far slope. Recon takes the lip that sees, and does not walk down. */
export function createCrestWatch() {
  const world = blank("Crest watch", "Recon stops on the lip that can see. It does not walk down.", [
    group(1, "you", "screen", 22, 28),
    group(2, "hostile", "hold", 22, 8),
  ]);
  paint(world, 0, 16, 43, 18, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "recon-team", groupId: 1, name: "Eye", x: 22.5, y: 28.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Picket", x: 22.5, y: 8.5 }),
  ]);
}

/** A wood blocks sight. The scout screens the near edge instead of driving through. */
export function createWoodEdge() {
  const world = blank("Wood edge", "The scout stops at the near wood. The far side stays unseen.", [
    group(1, "you", "screen", 22, 30),
    group(2, "hostile", "hold", 22, 8),
  ]);
  paint(world, 0, 14, 43, 20, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "scout-car", groupId: 1, name: "Glass", x: 22.5, y: 30.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Picket", x: 22.5, y: 8.5 }),
  ]);
}

/** ATGM on a crest over a town. It shoots from standoff and does not walk in. */
export function createAtgmHill() {
  const world = blank("ATGM hill", "The missile team holds the crest. It does not close on the town.", [
    group(1, "you", "overwatch", 18, 32),
    group(2, "hostile", "hold", 22, 13),
  ]);
  paint(world, 12, 22, 24, 28, HILL, 2);
  paint(world, 18, 10, 26, 16, URBAN, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "atgm", groupId: 1, name: "Spike", x: 18.5, y: 32.5 }),
    place(world, { id: 2, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 22.5, y: 15.5 }),
  ]);
}

/** ATGM starts inside its own minimum range. A hill behind it is the break. */
export function createMinimumRange() {
  const world = blank("Minimum range", "Inside minimum range, the missile team breaks into cover. It does not fire.", [
    group(1, "you", "overwatch", 20, 30),
    group(2, "hostile", "assault", 20, 8),
  ]);
  paint(world, 14, 23, 27, 28, HILL, 2);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "atgm", groupId: 1, name: "Spike", x: 20.5, y: 18.5 }),
    place(world, { id: 2, side: "hostile", type: "mbt", groupId: 2, name: "Anvil", x: 20.5, y: 14.5 }),
  ]);
}

/** IFV overwatches. The rifle team is the one that enters the town. */
export function createIfvRelease() {
  const world = blank("IFV release", "The IFV takes the crest. The rifle team enters the town.", [
    group(1, "you", "assault", 12, 32),
    group(2, "hostile", "hold", 22, 13),
  ]);
  paint(world, 4, 16, 14, 24, HILL, 2);
  paint(world, 18, 10, 26, 16, URBAN, 0);
  paint(world, 15, 16, 17, 30, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "ifv", groupId: 1, name: "Carrier", x: 8.5, y: 32.5 }),
    place(world, { id: 2, side: "you", type: "rifle", groupId: 1, name: "Line", x: 15.5, y: 32.5 }),
    place(world, { id: 3, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 22.5, y: 13.5 }),
  ]);
}

/** Front hill on the axis, flank hill to the west. The light tank takes the flank. */
export function createLightFlank() {
  const world = blank("Light flank", "The battle tank takes the front crest. The light tank takes the flank.", [
    group(1, "you", "assault", 21, 34),
    group(2, "hostile", "hold", 22, 16),
  ]);
  paint(world, 16, 24, 26, 30, HILL, 2);
  paint(world, 4, 12, 10, 20, HILL, 2);
  paint(world, 18, 12, 26, 18, URBAN, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "mbt", groupId: 1, name: "Hammer", x: 20.5, y: 33.5 }),
    place(world, { id: 2, side: "you", type: "light-tank", groupId: 1, name: "Dart", x: 23.5, y: 33.5 }),
    place(world, { id: 3, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 22.5, y: 15.5 }),
  ]);
}

/** Recon, rifle, ATGM, and IFV each take their own kind of ground. */
export function createCompany() {
  const world = blank("Company", "Recon and guns stay on the crests. Only the rifle team enters the town.", [
    group(1, "you", "assault", 14, 32),
    group(2, "hostile", "hold", 28, 4),
  ]);
  paint(world, 4, 22, 14, 28, HILL, 2);
  paint(world, 24, 1, 34, 5, HILL, 2);
  paint(world, 20, 8, 28, 14, URBAN, 0);
  paint(world, 16, 15, 20, 30, FOREST, 0);
  return finish(world, [
    place(world, { id: 1, side: "you", type: "recon-team", groupId: 1, name: "Eye", x: 6.5, y: 31.5 }),
    place(world, { id: 2, side: "you", type: "rifle", groupId: 1, name: "Line", x: 17.5, y: 32.5 }),
    place(world, { id: 3, side: "you", type: "atgm", groupId: 1, name: "Spike", x: 12.5, y: 32.5 }),
    place(world, { id: 4, side: "you", type: "ifv", groupId: 1, name: "Carrier", x: 9.5, y: 33.5 }),
    place(world, { id: 5, side: "hostile", type: "rifle", groupId: 2, name: "Garrison", x: 24.5, y: 13.5 }),
    place(world, { id: 6, side: "hostile", type: "mbt", groupId: 2, name: "Anvil", x: 30.5, y: 4.5 }),
  ]);
}
