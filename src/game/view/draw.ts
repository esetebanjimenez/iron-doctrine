import { FOREST, HILL, ROAD, URBAN, WATER, idx, type World } from "../sim/types";
import { theme } from "./theme";

export type Camera = { x: number; y: number; zoom: number };

function terrainColor(terrain: number, x: number, y: number): string {
  const alt = (x * 3 + y * 5) % 2 === 0;
  if (terrain === HILL) return alt ? theme.hill : theme.hillAlt;
  if (terrain === FOREST) return theme.forest;
  if (terrain === URBAN) return alt ? theme.urban : theme.urbanAlt;
  if (terrain === WATER) return theme.water;
  if (terrain === ROAD) return theme.road;
  return alt ? theme.flat : theme.flatAlt;
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  width: number,
  height: number,
) {
  const cell = 22 * camera.zoom;
  const originX = width / 2 - camera.x * cell;
  const originY = height / 2 - camera.y * cell;

  ctx.fillStyle = theme.flatAlt;
  ctx.fillRect(0, 0, width, height);

  const x0 = Math.max(0, Math.floor((0 - originX) / cell));
  const y0 = Math.max(0, Math.floor((0 - originY) / cell));
  const x1 = Math.min(world.w - 1, Math.ceil((width - originX) / cell));
  const y1 = Math.min(world.h - 1, Math.ceil((height - originY) / cell));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = idx(world, x, y);
      const px = originX + x * cell;
      const py = originY + y * cell;
      ctx.fillStyle = terrainColor(world.terrain[i]!, x, y);
      ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
      if (world.terrain[i] === FOREST && (x + y) % 2 === 0) {
        ctx.fillStyle = theme.forestDot;
        ctx.beginPath();
        ctx.arc(px + cell * 0.5, py + cell * 0.55, cell * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (world.kill[i]) {
        ctx.fillStyle = theme.kill;
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }

  ctx.strokeStyle = theme.pad;
  ctx.lineWidth = 1;
  for (const pad of world.pads) {
    if (pad.kind !== "armor") continue;
    if (pad.x < x0 || pad.x > x1 || pad.y < y0 || pad.y > y1) continue;
    ctx.strokeRect(originX + pad.x * cell + 2, originY + pad.y * cell + 2, cell - 4, cell - 4);
  }

  for (const contact of world.contacts ?? []) {
    const foe = world.elements.find((el) => el.id === contact.foeId);
    if (!foe || Math.hypot(foe.x - contact.x, foe.y - contact.y) < 0.8) continue;
    const px = originX + contact.x * cell;
    const py = originY + contact.y * cell;
    ctx.strokeStyle = foe.side === "you" ? theme.you : theme.hostile;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - 5, py - 5, 10, 10);
  }

  for (const el of world.elements) {
    const px = originX + el.x * cell;
    const py = originY + el.y * cell;
    const alive = el.hp > 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(el.facing);
    const w = cell * (el.classId === "armor" ? 0.72 : 0.48);
    const h = cell * (el.classId === "armor" ? 0.5 : 0.4);
    ctx.fillStyle = alive ? (el.side === "you" ? theme.you : theme.hostile) : theme.ink;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    if (alive && el.classId === "armor") {
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h * 0.2, 0);
      ctx.lineTo(w * 0.85, 0);
      ctx.stroke();
    }
    ctx.restore();

    if (!alive) continue;
    const barW = cell * 0.7;
    const barX = px - barW / 2;
    const barY = py - cell * 0.48;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(barX, barY, barW, 3);
    ctx.fillStyle = theme.hp;
    ctx.fillRect(barX, barY, barW * Math.max(0, el.hp / el.hpMax), 3);
    if (el.label && el.labelUntil >= world.tick) {
      ctx.fillStyle = theme.bone;
      ctx.font = "600 11px Barlow Condensed, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(el.label, px, py - cell * 0.62);
    }
  }
}
