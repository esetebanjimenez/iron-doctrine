import { useEffect, useRef, useState } from "react";
import { RANGES } from "../scenarios/index";
import { createHillOverTown } from "../scenarios/hill-over-town";
import { step } from "../sim/step";
import type { World } from "../sim/types";
import { drawWorld, type Camera } from "./draw";

type RangeId = (typeof RANGES)[number]["id"];

const SPEEDS = [
  { id: "pause", label: "II", value: 0 },
  { id: "1", label: "1×", value: 1 },
  { id: "2", label: "2×", value: 2 },
  { id: "4", label: "4×", value: 4 },
  { id: "8", label: "8×", value: 8 },
] as const;

type Hud = {
  tick: number;
  title: string;
  place: string;
  brief: string;
  you: number;
  hostile: number;
  lines: string[];
  roster: Array<{ name: string; side: string; detail: string; hp: number; hpMax: number }>;
};

function clock(tick: number): string {
  const seconds = Math.floor(tick / 10);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readHud(world: World): Hud {
  const you = world.elements.filter((e) => e.side === "you" && e.hp > 0).length;
  const hostile = world.elements.filter((e) => e.side === "hostile" && e.hp > 0).length;
  return {
    tick: world.tick,
    title: world.title,
    place: world.place,
    brief: world.brief,
    you,
    hostile,
    lines: world.events.slice(-4).map((e) => e.text),
    roster: world.elements.map((e) => ({
      name: e.name,
      side: e.side,
      hp: e.hp,
      hpMax: e.hpMax,
      detail: `${e.mode} · ${e.hp <= 0 ? "down" : `${Math.ceil(e.hp)} hp`}`,
    })),
  };
}

export function Battle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const [rangeId, setRangeId] = useState<RangeId>("hill");
  const [run, setRun] = useState(0);
  const [hud, setHud] = useState<Hud>(() => readHud(createHillOverTown()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const range = RANGES.find((entry) => entry.id === rangeId) ?? RANGES[0];
    const world = range.create();
    const camera: Camera = { x: world.w / 2, y: world.h / 2, zoom: 1 };
    const fitRect = canvas.getBoundingClientRect();
    const fit = Math.min(fitRect.width / (world.w * 22), fitRect.height / (world.h * 22));
    if (fit > 0) camera.zoom = Math.min(1.5, Math.max(0.28, fit * 0.92));
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let lastTick = -1;
    let dragging = false;
    let lx = 0;
    let ly = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const rate = speedRef.current;
      if (rate > 0) {
        acc += dt * rate;
        let guard = 0;
        while (acc >= 0.1 && guard < 12) {
          step(world);
          acc -= 0.1;
          guard++;
        }
      }
      const rect = canvas.getBoundingClientRect();
      drawWorld(ctx, world, camera, rect.width, rect.height);
      if (world.tick !== lastTick) {
        lastTick = world.tick;
        setHud(readHud(world));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onDown = (event: PointerEvent) => {
      dragging = true;
      lx = event.clientX;
      ly = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const cell = 22 * camera.zoom;
      camera.x -= (event.clientX - lx) / cell;
      camera.y -= (event.clientY - ly) / cell;
      lx = event.clientX;
      ly = event.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1);
      camera.zoom = Math.min(2.4, Math.max(0.28, next));
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [rangeId, run]);

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex flex-col gap-2 border-b border-line bg-surface px-3 py-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-wide">Iron Doctrine</h1>
          <p className="font-display text-xl tracking-widest text-fg">{clock(hud.tick)}</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-sm tracking-widest text-gold">{hud.title.toUpperCase()}</p>
            <p className="text-xs text-muted">{hud.place}</p>
            <p className="mt-1 max-w-md text-sm text-fg">{hud.brief}</p>
          </div>
          <p className="font-display text-lg tracking-wide">
            <span className="text-friendly">{hud.you}</span>
            <span className="px-2 text-muted">live</span>
            <span className="text-hostile">{hud.hostile}</span>
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Range">
          {RANGES.map((entry) => {
            const active = rangeId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setRangeId(entry.id)}
                className={
                  "h-11 shrink-0 rounded-sm border px-3 font-display text-base tracking-wide " +
                  (active ? "border-gold text-gold" : "border-line text-muted")
                }
              >
                {entry.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setRun((value) => value + 1)}
            className="h-11 rounded-sm border border-line px-3 font-display text-base tracking-wide text-fg"
          >
            Restart
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Time">
          {SPEEDS.map((entry) => {
            const active = speed === entry.value;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  speedRef.current = entry.value;
                  setSpeed(entry.value);
                }}
                className={
                  "h-11 min-w-11 rounded-sm border px-3 font-display text-base tracking-wide " +
                  (active ? "border-gold text-gold" : "border-line text-muted")
                }
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Battle map" />
      </div>

      <footer className="border-t border-line bg-surface px-3 py-2">
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {hud.roster.map((unit) => (
            <li key={unit.name} className="min-w-28 shrink-0">
              <p className={unit.side === "you" ? "text-friendly" : "text-hostile"}>{unit.name}</p>
              <p className="text-xs text-muted">{unit.detail}</p>
            </li>
          ))}
        </ul>
        <div className="mt-1 min-h-10 text-sm text-fg">
          {hud.lines.length === 0 ? (
            <p className="text-muted">The company is reading the ground.</p>
          ) : (
            hud.lines.map((line, index) => (
              <p key={`${index}-${line}`} className="truncate">
                {line}
              </p>
            ))
          )}
        </div>
      </footer>
    </main>
  );
}
