import type { ClassId, TypeId } from "../sim/types.ts";

export type TypeStats = {
  type: TypeId;
  classId: ClassId;
  speed: number;
  range: number;
  minRange: number;
  damage: number;
  hp: number;
  radius: number;
};

export const TYPES: Record<TypeId, TypeStats> = {
  rifle: { type: "rifle", classId: "infantry", speed: 2.35, range: 5.5, minRange: 0, damage: 3, hp: 100, radius: 0.32 },
  atgm: { type: "atgm", classId: "infantry", speed: 2.05, range: 16, minRange: 5, damage: 14, hp: 70, radius: 0.32 },
  "scout-car": { type: "scout-car", classId: "recon", speed: 4.2, range: 4, minRange: 0, damage: 2, hp: 55, radius: 0.38 },
  "recon-team": { type: "recon-team", classId: "recon", speed: 2.5, range: 5, minRange: 0, damage: 2, hp: 70, radius: 0.32 },
  "light-tank": { type: "light-tank", classId: "armor", speed: 3.6, range: 12, minRange: 0, damage: 8, hp: 140, radius: 0.46 },
  ifv: { type: "ifv", classId: "armor", speed: 3.4, range: 9, minRange: 0, damage: 5, hp: 120, radius: 0.44 },
  mbt: { type: "mbt", classId: "armor", speed: 3.15, range: 14, minRange: 0, damage: 11, hp: 220, radius: 0.5 },
};

export function statsFor(type: TypeId): TypeStats {
  return TYPES[type];
}
