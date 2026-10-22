import { createHillOverTown } from "./hill-over-town.ts";
import { createRiverBridge } from "./river-bridge.ts";
import {
  createAtgmHill,
  createCompany,
  createCrestWatch,
  createIfvRelease,
  createLightFlank,
  createMinimumRange,
  createOpenDuel,
  createWoodEdge,
} from "./ranges.ts";
import {
  createPursueClose,
  createPursueCrest,
  createPursueInfantry,
  createPursueMissile,
  createPursueTown,
} from "./pursue.ts";
import {
  createCrescent,
  createDiagonalWood,
  createHamlet,
  createNotchedRidge,
} from "./shapes.ts";

export const RANGES = [
  { id: "hill", label: "Hill over town", create: createHillOverTown },
  { id: "bridge", label: "River bridge", create: createRiverBridge },
  { id: "duel", label: "Open duel", create: createOpenDuel },
  { id: "crest", label: "Crest watch", create: createCrestWatch },
  { id: "wood", label: "Wood edge", create: createWoodEdge },
  { id: "atgm", label: "ATGM hill", create: createAtgmHill },
  { id: "minimum", label: "Minimum range", create: createMinimumRange },
  { id: "ifv", label: "IFV release", create: createIfvRelease },
  { id: "flank", label: "Light flank", create: createLightFlank },
  { id: "company", label: "Company", create: createCompany },
  { id: "crescent", label: "Crescent", create: createCrescent },
  { id: "hamlet", label: "Hamlet", create: createHamlet },
  { id: "notch", label: "Notched ridge", create: createNotchedRidge },
  { id: "diagonal", label: "Diagonal wood", create: createDiagonalWood },
  { id: "pursue-close", label: "Pursue close", create: createPursueClose },
  { id: "pursue-crest", label: "Pursue crest", create: createPursueCrest },
  { id: "pursue-town", label: "Pursue town", create: createPursueTown },
  { id: "pursue-infantry", label: "Pursue infantry", create: createPursueInfantry },
  { id: "pursue-missile", label: "Pursue missile", create: createPursueMissile },
] as const;
