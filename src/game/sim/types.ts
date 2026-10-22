export const FLAT = 0;
export const ROAD = 1;
export const HILL = 2;
export const FOREST = 3;
export const URBAN = 4;
export const WATER = 5;

export type TerrainId = 0 | 1 | 2 | 3 | 4 | 5;
export type ClassId = "recon" | "infantry" | "armor";
export type TypeId = "rifle" | "atgm" | "mbt" | "ifv" | "light-tank" | "scout-car" | "recon-team";
export type Role = "screen" | "fix" | "assault" | "overwatch" | "reserve" | "hold";
export type Side = "you" | "hostile";
export type PadKind = "armor" | "release";
export type Mode = "bound" | "hull-down" | "clear" | "hold" | "mask";

export type Pad = {
  id: number;
  kind: PadKind;
  x: number;
  y: number;
  los: number;
  dist: number;
};

export type Blob = {
  id: number;
  cells: number[];
  cx: number;
  cy: number;
};

export type Element = {
  id: number;
  side: Side;
  type: TypeId;
  classId: ClassId;
  groupId: number;
  name: string;
  x: number;
  y: number;
  px: number;
  py: number;
  facing: number;
  hp: number;
  hpMax: number;
  suppression: number;
  cooldown: number;
  goalX: number;
  goalY: number;
  goalKey: number;
  path: Array<{ x: number; y: number }>;
  pathFor: number;
  mode: Mode;
  label: string;
  labelUntil: number;
  urbanTicks: number;
  killTicks: number;
  killRun: number;
  maxKillRun: number;
  enteredUrban: boolean;
  answered: boolean;
  notedFire: boolean;
  engaged?: number;
  opening?: boolean;
  pursueLog?: string;
  speed: number;
  range: number;
  minRange: number;
  damage: number;
  radius: number;
};

export type Group = {
  id: number;
  side: Side;
  role: Role;
  homeX: number;
  homeY: number;
};

export type SimEvent = { tick: number; text: string };

export type Contact = {
  foeId: number;
  side: Side;
  x: number;
  y: number;
  tick: number;
};

export type World = {
  tick: number;
  w: number;
  h: number;
  terrain: Uint8Array;
  elev: Uint8Array;
  kill: Uint8Array;
  blobs: Blob[];
  objective: number;
  pads: Pad[];
  elements: Element[];
  groups: Group[];
  events: SimEvent[];
  contacts?: Contact[];
  chart?: Partial<Record<Side, Uint8Array>>;
  title: string;
  place: string;
  brief: string;
};

export function idx(w: World, x: number, y: number): number {
  return y * w.w + x;
}

export function inBounds(w: World, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w.w && y < w.h;
}
