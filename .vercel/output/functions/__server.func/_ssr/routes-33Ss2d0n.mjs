import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-33Ss2d0n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TYPES = {
	rifle: {
		type: "rifle",
		classId: "infantry",
		speed: 2.35,
		range: 5.5,
		minRange: 0,
		damage: 3,
		hp: 100,
		radius: .32
	},
	atgm: {
		type: "atgm",
		classId: "infantry",
		speed: 2.05,
		range: 16,
		minRange: 5,
		damage: 14,
		hp: 70,
		radius: .32
	},
	"scout-car": {
		type: "scout-car",
		classId: "recon",
		speed: 4.2,
		range: 4,
		minRange: 0,
		damage: 2,
		hp: 55,
		radius: .38
	},
	"recon-team": {
		type: "recon-team",
		classId: "recon",
		speed: 2.5,
		range: 5,
		minRange: 0,
		damage: 2,
		hp: 70,
		radius: .32
	},
	"light-tank": {
		type: "light-tank",
		classId: "armor",
		speed: 3.6,
		range: 12,
		minRange: 0,
		damage: 8,
		hp: 140,
		radius: .46
	},
	ifv: {
		type: "ifv",
		classId: "armor",
		speed: 3.4,
		range: 9,
		minRange: 0,
		damage: 5,
		hp: 120,
		radius: .44
	},
	mbt: {
		type: "mbt",
		classId: "armor",
		speed: 3.15,
		range: 14,
		minRange: 0,
		damage: 11,
		hp: 220,
		radius: .5
	}
};
function statsFor(type) {
	return TYPES[type];
}
function idx(w, x, y) {
	return y * w.w + x;
}
function inBounds(w, x, y) {
	return x >= 0 && y >= 0 && x < w.w && y < w.h;
}
var DIRS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];
function walkLine(x0, y0, x1, y1) {
	const cells = [];
	let x = x0;
	let y = y0;
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx - dy;
	for (;;) {
		cells.push([x, y]);
		if (x === x1 && y === y1) break;
		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			x += sx;
		}
		if (e2 < dx) {
			err += dx;
			y += sy;
		}
	}
	return cells;
}
/** Ground line of sight. Plateau lips can see out; equal-height interiors cannot see over their own lip. */
function hasLos(world, x0, y0, x1, y1) {
	if (!inBounds(world, x0, y0) || !inBounds(world, x1, y1)) return false;
	if (x0 === x1 && y0 === y1) return true;
	const bothUrban = world.terrain[idx(world, x0, y0)] === 4 && world.terrain[idx(world, x1, y1)] === 4;
	const cheb = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
	if (bothUrban && cheb <= 4) return true;
	const line = walkLine(x0, y0, x1, y1);
	const e0 = world.elev[idx(world, x0, y0)];
	const e1 = world.elev[idx(world, x1, y1)];
	for (let i = 1; i < line.length - 1; i++) {
		const [x, y] = line[i];
		const t = i / (line.length - 1);
		const expected = e0 + (e1 - e0) * t;
		if (world.elev[idx(world, x, y)] > expected + .05) return false;
		const terrain = world.terrain[idx(world, x, y)];
		if (terrain === 3 || terrain === 4) return false;
	}
	return true;
}
function passable(world, x, y, classId) {
	if (!inBounds(world, x, y)) return false;
	const terrain = world.terrain[idx(world, x, y)];
	if (terrain === 5) return false;
	if (terrain === 4 && classId === "armor") return false;
	if (terrain === 4 && classId === "recon") return false;
	return true;
}
function moveCost(world, x, y, classId) {
	const terrain = world.terrain[idx(world, x, y)];
	let cost = 1;
	if (terrain === 1) cost = .75;
	else if (terrain === 2) cost = classId === "infantry" ? 1.15 : 1.25;
	else if (terrain === 3) cost = classId === "armor" ? 1.85 : 1.15;
	else if (terrain === 4) cost = 1.2;
	else if (terrain === 0) cost = 1;
	if (world.kill[idx(world, x, y)]) cost += 3.2;
	return cost;
}
function neighbors(world, x, y, classId) {
	const out = [];
	for (const [dx, dy] of DIRS) {
		const nx = x + dx;
		const ny = y + dy;
		if (!passable(world, nx, ny, classId)) continue;
		if (dx !== 0 && dy !== 0) {
			if (!passable(world, x + dx, y, classId) || !passable(world, x, y + dy, classId)) continue;
		}
		const diag = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
		out.push([
			nx,
			ny,
			moveCost(world, nx, ny, classId) * diag
		]);
	}
	return out;
}
function nearestTownDist(world, x, y, cells) {
	let best = Infinity;
	for (const c of cells) {
		const cx = c % world.w;
		const cy = Math.floor(c / world.w);
		const d = Math.hypot(cx - x, cy - y);
		if (d < best) best = d;
	}
	return best;
}
var NEAR = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];
function floodUrban(world) {
	const seen = new Uint8Array(world.w * world.h);
	const blobs = [];
	for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
		const start = idx(world, x, y);
		if (seen[start] || world.terrain[start] !== 4) continue;
		const cells = [];
		const stack = [start];
		seen[start] = 1;
		while (stack.length > 0) {
			const c = stack.pop();
			cells.push(c);
			const cx = c % world.w;
			const cy = Math.floor(c / world.w);
			for (const [dx, dy] of NEAR.slice(0, 4)) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (!inBounds(world, nx, ny)) continue;
				const ni = idx(world, nx, ny);
				if (seen[ni] || world.terrain[ni] !== 4) continue;
				seen[ni] = 1;
				stack.push(ni);
			}
		}
		blobs.push(cells);
	}
	blobs.sort((a, b) => b.length - a.length);
	return blobs;
}
function losCount(world, x, y, cells, cap) {
	let n = 0;
	for (const c of cells) {
		if (hasLos(world, x, y, c % world.w, Math.floor(c / world.w))) n++;
		if (n >= cap) break;
	}
	return n;
}
/** Battle positions and kill zones for the objective town. Geometry only — classes filter later. */
function buildOverlay(world) {
	world.blobs = floodUrban(world).map((cells, i) => {
		let sx = 0;
		let sy = 0;
		for (const c of cells) {
			sx += c % world.w;
			sy += Math.floor(c / world.w);
		}
		return {
			id: i,
			cells,
			cx: cells.length ? sx / cells.length + .5 : 0,
			cy: cells.length ? sy / cells.length + .5 : 0
		};
	});
	world.objective = world.blobs[0]?.id ?? -1;
	const town = world.blobs[0];
	world.pads = [];
	world.kill.fill(0);
	if (!town) return;
	const townSet = new Set(town.cells);
	let padId = 1;
	for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
		const i = idx(world, x, y);
		const terrain = world.terrain[i];
		const dist = nearestTownDist(world, x, y, town.cells);
		if ((terrain === 0 || terrain === 1) && dist <= 3 && dist > 0) {
			let sees = false;
			for (const c of town.cells) {
				const cx = c % world.w;
				const cy = Math.floor(c / world.w);
				if (Math.abs(cx - x) + Math.abs(cy - y) > 6) continue;
				if (hasLos(world, x, y, cx, cy)) {
					sees = true;
					break;
				}
			}
			if (sees) world.kill[i] = 1;
		}
		if (terrain === 2 && world.elev[i] >= 1 && dist >= 4 && dist <= 15) {
			const los = losCount(world, x, y, town.cells, 8);
			if (los >= 4) {
				const pad = {
					id: padId++,
					kind: "armor",
					x,
					y,
					los,
					dist
				};
				world.pads.push(pad);
			}
		}
		if (terrain === 3) {
			let touches = false;
			for (const [dx, dy] of NEAR) {
				const nx = x + dx;
				const ny = y + dy;
				if (!inBounds(world, nx, ny)) continue;
				if (townSet.has(idx(world, nx, ny))) {
					touches = true;
					break;
				}
			}
			if (touches) world.pads.push({
				id: padId++,
				kind: "release",
				x,
				y,
				los: 0,
				dist
			});
		}
	}
}
var W$1 = 44;
var H$1 = 36;
function paint$2(world, x0, y0, x1, y1, terrain, elev) {
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
		if (x < 0 || y < 0 || x >= world.w || y >= world.h) continue;
		const i = idx(world, x, y);
		world.terrain[i] = terrain;
		world.elev[i] = elev;
	}
}
function place$2(world, partial) {
	const stats = statsFor(partial.type);
	const el = {
		id: partial.id,
		side: partial.side,
		type: partial.type,
		classId: stats.classId,
		groupId: partial.groupId,
		name: partial.name,
		x: partial.x,
		y: partial.y,
		px: partial.x,
		py: partial.y,
		facing: partial.side === "you" ? -Math.PI / 2 : Math.PI / 2,
		hp: stats.hp,
		hpMax: stats.hp,
		suppression: 0,
		cooldown: 0,
		goalX: partial.x,
		goalY: partial.y,
		goalKey: -1,
		path: [],
		pathFor: -1,
		mode: "bound",
		label: "",
		labelUntil: 0,
		urbanTicks: 0,
		killTicks: 0,
		killRun: 0,
		maxKillRun: 0,
		enteredUrban: false,
		answered: false,
		notedFire: false,
		speed: stats.speed,
		range: stats.range,
		minRange: stats.minRange,
		damage: stats.damage,
		radius: stats.radius
	};
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	if (world.terrain[idx(world, cx, cy)] === 4) el.enteredUrban = true;
	return el;
}
/**
* West crest overlooks a town. Woods run from the friendly start up to the
* town's southwest corner, off the sightline. The enemy crest is north of the town.
*/
function createHillOverTown() {
	const world = {
		tick: 0,
		w: W$1,
		h: H$1,
		terrain: (/* @__PURE__ */ new Uint8Array(1584)).fill(0),
		elev: /* @__PURE__ */ new Uint8Array(1584),
		kill: /* @__PURE__ */ new Uint8Array(1584),
		blobs: [],
		objective: -1,
		pads: [],
		elements: [],
		groups: [{
			id: 1,
			side: "you",
			role: "assault",
			homeX: 10,
			homeY: 33
		}, {
			id: 2,
			side: "hostile",
			role: "hold",
			homeX: 34,
			homeY: 4
		}],
		events: [],
		title: "Hill over town",
		place: "Controlled range",
		brief: "Armor takes the crest. The rifle team enters the town."
	};
	paint$2(world, 4, 8, 12, 16, 2, 2);
	paint$2(world, 30, 1, 40, 7, 2, 2);
	paint$2(world, 18, 8, 28, 16, 4, 0);
	paint$2(world, 8, 17, 17, 32, 3, 0);
	buildOverlay(world);
	world.elements = [
		place$2(world, {
			id: 1,
			side: "you",
			type: "mbt",
			groupId: 1,
			name: "Hammer",
			x: 8.5,
			y: 33.5
		}),
		place$2(world, {
			id: 2,
			side: "you",
			type: "rifle",
			groupId: 1,
			name: "Line",
			x: 12.5,
			y: 33.5
		}),
		place$2(world, {
			id: 3,
			side: "hostile",
			type: "mbt",
			groupId: 2,
			name: "Anvil",
			x: 34.5,
			y: 4.5
		}),
		place$2(world, {
			id: 4,
			side: "hostile",
			type: "rifle",
			groupId: 2,
			name: "Garrison",
			x: 23.5,
			y: 12.5
		})
	];
	return world;
}
var W = 44;
var H = 36;
function paint$1(world, x0, y0, x1, y1, terrain, elev) {
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
		if (x < 0 || y < 0 || x >= world.w || y >= world.h) continue;
		const i = idx(world, x, y);
		world.terrain[i] = terrain;
		world.elev[i] = elev;
	}
}
function place$1(world, partial) {
	const stats = statsFor(partial.type);
	const el = {
		id: partial.id,
		side: partial.side,
		type: partial.type,
		classId: stats.classId,
		groupId: partial.groupId,
		name: partial.name,
		x: partial.x,
		y: partial.y,
		px: partial.x,
		py: partial.y,
		facing: partial.side === "you" ? -Math.PI / 2 : Math.PI / 2,
		hp: stats.hp,
		hpMax: stats.hp,
		suppression: 0,
		cooldown: 0,
		goalX: partial.x,
		goalY: partial.y,
		goalKey: -1,
		path: [],
		pathFor: -1,
		mode: "bound",
		label: "",
		labelUntil: 0,
		urbanTicks: 0,
		killTicks: 0,
		killRun: 0,
		maxKillRun: 0,
		enteredUrban: false,
		answered: false,
		notedFire: false,
		speed: stats.speed,
		range: stats.range,
		minRange: stats.minRange,
		damage: stats.damage,
		radius: stats.radius
	};
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	if (world.terrain[idx(world, cx, cy)] === 4) el.enteredUrban = true;
	return el;
}
/**
* One bridge over a river. The near crest sees the far town.
* The wood that touches the town sits on the far bank, off the bridge deck.
*/
function createRiverBridge() {
	const world = {
		tick: 0,
		w: W,
		h: H,
		terrain: (/* @__PURE__ */ new Uint8Array(1584)).fill(0),
		elev: /* @__PURE__ */ new Uint8Array(1584),
		kill: /* @__PURE__ */ new Uint8Array(1584),
		blobs: [],
		objective: -1,
		pads: [],
		elements: [],
		groups: [{
			id: 1,
			side: "you",
			role: "assault",
			homeX: 12,
			homeY: 32
		}, {
			id: 2,
			side: "hostile",
			role: "hold",
			homeX: 23,
			homeY: 12
		}],
		events: [],
		title: "River bridge",
		place: "Controlled range",
		brief: "Armor stays on the near crest. Rifles cross, and do not stop on the bridge."
	};
	paint$1(world, 0, 17, 43, 19, 5, 0);
	paint$1(world, 21, 17, 23, 19, 1, 0);
	paint$1(world, 6, 22, 14, 28, 2, 2);
	paint$1(world, 18, 10, 26, 15, 4, 0);
	paint$1(world, 16, 16, 19, 16, 3, 0);
	buildOverlay(world);
	world.elements = [
		place$1(world, {
			id: 1,
			side: "you",
			type: "mbt",
			groupId: 1,
			name: "Hammer",
			x: 10.5,
			y: 32.5
		}),
		place$1(world, {
			id: 2,
			side: "you",
			type: "rifle",
			groupId: 1,
			name: "Line",
			x: 16.5,
			y: 32.5
		}),
		place$1(world, {
			id: 3,
			side: "hostile",
			type: "rifle",
			groupId: 2,
			name: "Picket",
			x: 22.5,
			y: 12.5
		})
	];
	return world;
}
function blank(title, brief, groups) {
	return {
		tick: 0,
		w: 44,
		h: 36,
		terrain: (/* @__PURE__ */ new Uint8Array(1584)).fill(0),
		elev: /* @__PURE__ */ new Uint8Array(1584),
		kill: /* @__PURE__ */ new Uint8Array(1584),
		blobs: [],
		objective: -1,
		pads: [],
		elements: [],
		groups,
		events: [],
		title,
		place: "Controlled range",
		brief
	};
}
function paint(world, x0, y0, x1, y1, terrain, elev) {
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
		if (x < 0 || y < 0 || x >= world.w || y >= world.h) continue;
		const i = idx(world, x, y);
		world.terrain[i] = terrain;
		world.elev[i] = elev;
	}
}
function place(world, partial) {
	const stats = statsFor(partial.type);
	const el = {
		id: partial.id,
		side: partial.side,
		type: partial.type,
		classId: stats.classId,
		groupId: partial.groupId,
		name: partial.name,
		x: partial.x,
		y: partial.y,
		px: partial.x,
		py: partial.y,
		facing: partial.side === "you" ? -Math.PI / 2 : Math.PI / 2,
		hp: stats.hp,
		hpMax: stats.hp,
		suppression: 0,
		cooldown: 0,
		goalX: partial.x,
		goalY: partial.y,
		goalKey: -1,
		path: [],
		pathFor: -1,
		mode: "bound",
		label: "",
		labelUntil: 0,
		urbanTicks: 0,
		killTicks: 0,
		killRun: 0,
		maxKillRun: 0,
		enteredUrban: false,
		answered: false,
		notedFire: false,
		speed: stats.speed,
		range: stats.range,
		minRange: stats.minRange,
		damage: stats.damage,
		radius: stats.radius
	};
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	if (world.terrain[idx(world, cx, cy)] === 4) el.enteredUrban = true;
	return el;
}
function finish(world, elements) {
	buildOverlay(world);
	world.elements = elements;
	return world;
}
function group(id, side, role, homeX, homeY) {
	return {
		id,
		side,
		role,
		homeX,
		homeY
	};
}
/** Two tanks in the open. They close to gun range and stop there. */
function createOpenDuel() {
	const world = blank("Open duel", "The tanks close to gun range, then they hold and shoot.", [group(1, "you", "assault", 22, 30), group(2, "hostile", "assault", 22, 8)]);
	return finish(world, [place(world, {
		id: 1,
		side: "you",
		type: "mbt",
		groupId: 1,
		name: "Hammer",
		x: 22.5,
		y: 30.5
	}), place(world, {
		id: 2,
		side: "hostile",
		type: "mbt",
		groupId: 2,
		name: "Anvil",
		x: 22.5,
		y: 8.5
	})]);
}
/** A ridge hides the far slope. Recon takes the lip that sees, and does not walk down. */
function createCrestWatch() {
	const world = blank("Crest watch", "Recon stops on the lip that can see. It does not walk down.", [group(1, "you", "screen", 22, 28), group(2, "hostile", "hold", 22, 8)]);
	paint(world, 0, 16, 43, 18, 2, 2);
	return finish(world, [place(world, {
		id: 1,
		side: "you",
		type: "recon-team",
		groupId: 1,
		name: "Eye",
		x: 22.5,
		y: 28.5
	}), place(world, {
		id: 2,
		side: "hostile",
		type: "rifle",
		groupId: 2,
		name: "Picket",
		x: 22.5,
		y: 8.5
	})]);
}
/** A wood blocks sight. The scout screens the near edge instead of driving through. */
function createWoodEdge() {
	const world = blank("Wood edge", "The scout stops at the near wood. The far side stays unseen.", [group(1, "you", "screen", 22, 30), group(2, "hostile", "hold", 22, 8)]);
	paint(world, 0, 14, 43, 20, 3, 0);
	return finish(world, [place(world, {
		id: 1,
		side: "you",
		type: "scout-car",
		groupId: 1,
		name: "Glass",
		x: 22.5,
		y: 30.5
	}), place(world, {
		id: 2,
		side: "hostile",
		type: "rifle",
		groupId: 2,
		name: "Picket",
		x: 22.5,
		y: 8.5
	})]);
}
/** ATGM on a crest over a town. It shoots from standoff and does not walk in. */
function createAtgmHill() {
	const world = blank("ATGM hill", "The missile team holds the crest. It does not close on the town.", [group(1, "you", "overwatch", 18, 32), group(2, "hostile", "hold", 22, 13)]);
	paint(world, 12, 22, 24, 28, 2, 2);
	paint(world, 18, 10, 26, 16, 4, 0);
	return finish(world, [place(world, {
		id: 1,
		side: "you",
		type: "atgm",
		groupId: 1,
		name: "Spike",
		x: 18.5,
		y: 32.5
	}), place(world, {
		id: 2,
		side: "hostile",
		type: "rifle",
		groupId: 2,
		name: "Garrison",
		x: 22.5,
		y: 15.5
	})]);
}
/** ATGM starts inside its own minimum range, with a hill behind it. */
function createMinimumRange() {
	const world = blank("Minimum range", "Inside minimum range, the missile team breaks away. It does not fire.", [group(1, "you", "overwatch", 20, 30), group(2, "hostile", "assault", 20, 8)]);
	return finish(world, [place(world, {
		id: 1,
		side: "you",
		type: "atgm",
		groupId: 1,
		name: "Spike",
		x: 20.5,
		y: 18.5
	}), place(world, {
		id: 2,
		side: "hostile",
		type: "mbt",
		groupId: 2,
		name: "Anvil",
		x: 20.5,
		y: 14.5
	})]);
}
/** IFV overwatches. The rifle team is the one that enters the town. */
function createIfvRelease() {
	const world = blank("IFV release", "The IFV takes the crest. The rifle team enters the town.", [group(1, "you", "assault", 12, 32), group(2, "hostile", "hold", 22, 13)]);
	paint(world, 4, 16, 14, 24, 2, 2);
	paint(world, 18, 10, 26, 16, 4, 0);
	paint(world, 15, 16, 17, 30, 3, 0);
	return finish(world, [
		place(world, {
			id: 1,
			side: "you",
			type: "ifv",
			groupId: 1,
			name: "Carrier",
			x: 8.5,
			y: 32.5
		}),
		place(world, {
			id: 2,
			side: "you",
			type: "rifle",
			groupId: 1,
			name: "Line",
			x: 15.5,
			y: 32.5
		}),
		place(world, {
			id: 3,
			side: "hostile",
			type: "rifle",
			groupId: 2,
			name: "Garrison",
			x: 22.5,
			y: 13.5
		})
	]);
}
/** Front hill on the axis, flank hill to the west. The light tank takes the flank. */
function createLightFlank() {
	const world = blank("Light flank", "The battle tank takes the front crest. The light tank takes the flank.", [group(1, "you", "assault", 21, 34), group(2, "hostile", "hold", 22, 16)]);
	paint(world, 16, 24, 26, 30, 2, 2);
	paint(world, 4, 12, 10, 20, 2, 2);
	paint(world, 18, 12, 26, 18, 4, 0);
	return finish(world, [
		place(world, {
			id: 1,
			side: "you",
			type: "mbt",
			groupId: 1,
			name: "Hammer",
			x: 20.5,
			y: 33.5
		}),
		place(world, {
			id: 2,
			side: "you",
			type: "light-tank",
			groupId: 1,
			name: "Dart",
			x: 23.5,
			y: 33.5
		}),
		place(world, {
			id: 3,
			side: "hostile",
			type: "rifle",
			groupId: 2,
			name: "Garrison",
			x: 22.5,
			y: 15.5
		})
	]);
}
/** Recon, rifle, ATGM, and IFV each take their own kind of ground. */
function createCompany() {
	const world = blank("Company", "Recon and guns stay on the crests. Only the rifle team enters the town.", [group(1, "you", "assault", 14, 32), group(2, "hostile", "hold", 28, 4)]);
	paint(world, 4, 22, 14, 28, 2, 2);
	paint(world, 24, 1, 34, 5, 2, 2);
	paint(world, 20, 8, 28, 14, 4, 0);
	paint(world, 16, 15, 20, 30, 3, 0);
	return finish(world, [
		place(world, {
			id: 1,
			side: "you",
			type: "recon-team",
			groupId: 1,
			name: "Eye",
			x: 6.5,
			y: 31.5
		}),
		place(world, {
			id: 2,
			side: "you",
			type: "rifle",
			groupId: 1,
			name: "Line",
			x: 17.5,
			y: 32.5
		}),
		place(world, {
			id: 3,
			side: "you",
			type: "atgm",
			groupId: 1,
			name: "Spike",
			x: 12.5,
			y: 32.5
		}),
		place(world, {
			id: 4,
			side: "you",
			type: "ifv",
			groupId: 1,
			name: "Carrier",
			x: 9.5,
			y: 33.5
		}),
		place(world, {
			id: 5,
			side: "hostile",
			type: "rifle",
			groupId: 2,
			name: "Garrison",
			x: 24.5,
			y: 13.5
		}),
		place(world, {
			id: 6,
			side: "hostile",
			type: "mbt",
			groupId: 2,
			name: "Anvil",
			x: 30.5,
			y: 4.5
		})
	]);
}
var RANGES = [
	{
		id: "hill",
		label: "Hill over town",
		create: createHillOverTown
	},
	{
		id: "bridge",
		label: "River bridge",
		create: createRiverBridge
	},
	{
		id: "duel",
		label: "Open duel",
		create: createOpenDuel
	},
	{
		id: "crest",
		label: "Crest watch",
		create: createCrestWatch
	},
	{
		id: "wood",
		label: "Wood edge",
		create: createWoodEdge
	},
	{
		id: "atgm",
		label: "ATGM hill",
		create: createAtgmHill
	},
	{
		id: "minimum",
		label: "Minimum range",
		create: createMinimumRange
	},
	{
		id: "ifv",
		label: "IFV release",
		create: createIfvRelease
	},
	{
		id: "flank",
		label: "Light flank",
		create: createLightFlank
	},
	{
		id: "company",
		label: "Company",
		create: createCompany
	}
];
function heuristic(x0, y0, x1, y1) {
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	return .7 * (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
}
/** Synchronous A*. Later path requests can be time-sliced behind this function. */
function findPath(world, classId, sx, sy, gx, gy) {
	const tx = Math.floor(gx);
	const ty = Math.floor(gy);
	const x0 = Math.floor(sx);
	const y0 = Math.floor(sy);
	if (!inBounds(world, tx, ty) || !passable(world, tx, ty, classId)) return [];
	if (x0 === tx && y0 === ty) return [];
	const n = world.w * world.h;
	const gScore = new Float64Array(n).fill(Infinity);
	const parent = new Int32Array(n).fill(-1);
	const closed = new Uint8Array(n);
	const start = idx(world, x0, y0);
	const goal = idx(world, tx, ty);
	gScore[start] = 0;
	const heap = [[heuristic(x0, y0, tx, ty), start]];
	const push = (f, i) => {
		heap.push([f, i]);
		let k = heap.length - 1;
		while (k > 0) {
			const p = k - 1 >> 1;
			if (heap[p][0] <= heap[k][0]) break;
			const tmp = heap[p];
			heap[p] = heap[k];
			heap[k] = tmp;
			k = p;
		}
	};
	const pop = () => {
		if (heap.length === 0) return void 0;
		const top = heap[0];
		const last = heap.pop();
		if (heap.length > 0) {
			heap[0] = last;
			let k = 0;
			for (;;) {
				const l = k * 2 + 1;
				const r = l + 1;
				let s = k;
				if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
				if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
				if (s === k) break;
				const tmp = heap[s];
				heap[s] = heap[k];
				heap[k] = tmp;
				k = s;
			}
		}
		return top;
	};
	while (heap.length > 0) {
		const next = pop();
		if (!next) break;
		const i = next[1];
		if (closed[i]) continue;
		closed[i] = 1;
		if (i === goal) break;
		const x = i % world.w;
		const y = Math.floor(i / world.w);
		for (const [nx, ny, cost] of neighbors(world, x, y, classId)) {
			const ni = idx(world, nx, ny);
			if (closed[ni]) continue;
			const ng = gScore[i] + cost;
			if (ng < gScore[ni]) {
				gScore[ni] = ng;
				parent[ni] = i;
				push(ng + heuristic(nx, ny, tx, ty), ni);
			}
		}
	}
	if (parent[goal] === -1 && goal !== start) return [];
	const cells = [];
	let cur = goal;
	const guard = n + 2;
	let steps = 0;
	while (cur !== start && cur !== -1 && steps < guard) {
		cells.push({
			x: cur % world.w + .5,
			y: Math.floor(cur / world.w) + .5
		});
		cur = parent[cur];
		steps++;
	}
	cells.reverse();
	return cells;
}
function cellOf(x, y) {
	return [Math.floor(x), Math.floor(y)];
}
function note(world, text) {
	const last = world.events[world.events.length - 1];
	if (last && last.text === text && world.tick - last.tick < 30) return;
	world.events.push({
		tick: world.tick,
		text
	});
	if (world.events.length > 40) world.events.shift();
}
function setGoal(world, el, x, y) {
	const [gx, gy] = cellOf(x, y);
	const key = gy * world.w + gx;
	if (el.goalKey === key) return;
	el.goalX = gx + .5;
	el.goalY = gy + .5;
	el.goalKey = key;
	el.path = [];
	el.pathFor = -1;
	const terrain = world.terrain[key];
	if (terrain === 4) {
		el.mode = "clear";
		el.label = "CLEAR";
		note(world, `${el.name} moving into the town`);
	} else if (terrain === 2) {
		el.mode = "bound";
		el.label = "BOUND";
		note(world, `${el.name} bound for the crest`);
	} else if (terrain === 3) {
		el.mode = "bound";
		el.label = "BOUND";
		note(world, `${el.name} bound for the wood edge`);
	} else {
		el.mode = "bound";
		el.label = "BOUND";
		note(world, `${el.name} bound forward`);
	}
	el.labelUntil = world.tick + 30;
}
function townCellToward(world, cells, x, y) {
	let best = cells[0] ?? 0;
	let bestD = Infinity;
	for (const c of cells) {
		const cx = c % world.w + .5;
		const cy = Math.floor(c / world.w) + .5;
		const d = Math.hypot(cx - x, cy - y);
		if (d < bestD) {
			bestD = d;
			best = c;
		}
	}
	return best;
}
function oppositeHome(world, group) {
	const other = world.groups.find((g) => g.side !== group.side);
	return other ? {
		x: other.homeX,
		y: other.homeY
	} : {
		x: world.w / 2,
		y: world.h / 2
	};
}
function groupBestRange(world, group) {
	let range = 0;
	for (const el of world.elements) if (el.groupId === group.id && el.hp > 0) range = Math.max(range, el.range);
	return range;
}
/** Seen by this group, and nobody in the group can reach them. */
function unansweredShooter(world, group) {
	const members = world.elements.filter((e) => e.groupId === group.id && e.hp > 0);
	let candidate = null;
	for (const el of members) for (const foe of world.elements) {
		if (foe.side === el.side || foe.hp <= 0) continue;
		if (!hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(foe.x), Math.floor(foe.y))) continue;
		if (Math.hypot(foe.x - el.x, foe.y - el.y) <= el.range) return null;
		candidate = foe;
	}
	return candidate;
}
function scorePad(world, group, el, pad, shooter, bestRange) {
	const home = Math.hypot(pad.x + .5 - group.homeX, pad.y + .5 - group.homeY);
	const blob = world.blobs.find((b) => b.id === world.objective);
	const axis = blob ? axisOffset(pad.x + .5, pad.y + .5, group.homeX, group.homeY, blob.cx, blob.cy) : 0;
	let score = pad.los * 2 + world.elev[idx(world, pad.x, pad.y)] * 3 - pad.dist * .55 - home * .12;
	if (el.type === "light-tank") score += axis * 1.15;
	else if (el.type === "mbt") score -= axis * .3;
	else if (el.type === "ifv") score -= pad.dist * .25;
	if (!shooter) return score;
	if (!hasLos(world, pad.x, pad.y, Math.floor(shooter.x), Math.floor(shooter.y))) return score + 1;
	const dist = Math.hypot(pad.x + .5 - shooter.x, pad.y + .5 - shooter.y);
	if (dist <= bestRange && dist >= el.minRange) score += 4;
	else score -= 6;
	return score;
}
function axisOffset(px, py, ax, ay, bx, by) {
	const dx = bx - ax;
	const dy = by - ay;
	const len = Math.hypot(dx, dy) || 1;
	return Math.abs((px - ax) * dy - (py - ay) * dx) / len;
}
function assignArmor(world, group, el, used, shooter) {
	if (el.mode === "hull-down" && el.goalKey >= 0) {
		const gx = Math.floor(el.goalX);
		const gy = Math.floor(el.goalY);
		if (world.pads.some((p) => p.kind === "armor" && p.x === gx && p.y === gy) && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.4) {
			used.add(el.goalKey);
			return;
		}
	}
	const bestRange = groupBestRange(world, group);
	let best = null;
	let bestScore = -Infinity;
	for (const pad of world.pads) {
		if (pad.kind !== "armor") continue;
		const key = pad.y * world.w + pad.x;
		if (used.has(key)) continue;
		const score = scorePad(world, group, el, pad, shooter, bestRange);
		if (score > bestScore) {
			bestScore = score;
			best = pad;
		}
	}
	if (!best) return;
	used.add(best.y * world.w + best.x);
	setGoal(world, el, best.x, best.y);
}
function assignRifle(world, group, el) {
	const blob = world.blobs.find((b) => b.id === world.objective);
	if (!blob) return;
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	const hereUrban = world.terrain[idx(world, cx, cy)] === 4 || el.enteredUrban;
	const enemy = oppositeHome(world, group);
	if (hereUrban) {
		const hold = townCellToward(world, blob.cells, enemy.x, enemy.y);
		setGoal(world, el, hold % world.w, Math.floor(hold / world.w));
		return;
	}
	if (group.role === "hold") {
		const hold = townCellToward(world, blob.cells, enemy.x, enemy.y);
		setGoal(world, el, hold % world.w, Math.floor(hold / world.w));
		return;
	}
	let release = null;
	let bestD = Infinity;
	for (const pad of world.pads) {
		if (pad.kind !== "release") continue;
		const d = Math.hypot(pad.x + .5 - el.x, pad.y + .5 - el.y);
		if (d < bestD) {
			bestD = d;
			release = pad;
		}
	}
	if (release && bestD < 1.8) {
		const deep = townCellToward(world, blob.cells, enemy.x, enemy.y);
		setGoal(world, el, deep % world.w, Math.floor(deep / world.w));
		return;
	}
	if (release) setGoal(world, el, release.x, release.y);
}
function seenFoes(world, group) {
	const members = world.elements.filter((e) => e.groupId === group.id && e.hp > 0);
	const foes = [];
	for (const foe of world.elements) {
		if (foe.side === group.side || foe.hp <= 0) continue;
		if (members.some((member) => hasLos(world, Math.floor(member.x), Math.floor(member.y), Math.floor(foe.x), Math.floor(foe.y)))) foes.push(foe);
	}
	return foes;
}
function nearest(el, foes) {
	let best = null;
	let bestD = Infinity;
	for (const foe of foes) {
		const d = Math.hypot(foe.x - el.x, foe.y - el.y);
		if (d < bestD) {
			bestD = d;
			best = foe;
		}
	}
	return best;
}
function seesTown(world, x, y) {
	const blob = world.blobs.find((b) => b.id === world.objective);
	if (!blob) return false;
	const step = Math.max(1, Math.floor(blob.cells.length / 12));
	for (let i = 0; i < blob.cells.length; i += step) {
		const c = blob.cells[i];
		if (hasLos(world, x, y, c % world.w, Math.floor(c / world.w))) return true;
	}
	return false;
}
function townDist(world, x, y) {
	const blob = world.blobs.find((b) => b.id === world.objective);
	if (!blob) return Infinity;
	return Math.hypot(x + .5 - blob.cx, y + .5 - blob.cy);
}
/** Point on our side of the foe, `band` cells out. */
function bandPoint(el, foe, band) {
	const vx = el.x - foe.x;
	const vy = el.y - foe.y;
	const d = Math.hypot(vx, vy) || 1;
	return {
		x: foe.x + vx / d * band,
		y: foe.y + vy / d * band
	};
}
function holdBand(world, el, foe) {
	const d = Math.hypot(foe.x - el.x, foe.y - el.y);
	if (d <= el.range && d >= el.minRange + 1) {
		setGoal(world, el, el.x, el.y);
		return;
	}
	const band = d < el.minRange + 1 ? el.minRange + 4 : el.range * .85;
	const point = bandPoint(el, foe, Math.max(band, 1));
	setGoal(world, el, point.x, point.y);
}
function marchMask(world, group) {
	const enemy = oppositeHome(world, group);
	const steps = 48;
	let prevX = Math.floor(group.homeX);
	let prevY = Math.floor(group.homeY);
	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		const x = Math.floor(group.homeX + (enemy.x - group.homeX) * t);
		const y = Math.floor(group.homeY + (enemy.y - group.homeY) * t);
		if (x < 0 || y < 0 || x >= world.w || y >= world.h) break;
		const terrain = world.terrain[idx(world, x, y)];
		if (terrain === 3 || terrain === 2 || terrain === 4 || terrain === 5) return {
			x: prevX,
			y: prevY
		};
		prevX = x;
		prevY = y;
	}
	return {
		x: prevX,
		y: prevY
	};
}
function bestLookout(world, group, wantTown) {
	const anchor = oppositeHome(world, group);
	let best = null;
	let bestHome = Infinity;
	for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
		const i = idx(world, x, y);
		if (world.terrain[i] !== 2) continue;
		if (!(wantTown ? seesTown(world, x, y) : hasLos(world, x, y, Math.floor(anchor.x), Math.floor(anchor.y)))) continue;
		if (wantTown && townDist(world, x, y) < 6) continue;
		const home = Math.hypot(x + .5 - group.homeX, y + .5 - group.homeY);
		if (home < bestHome) {
			bestHome = home;
			best = {
				x,
				y
			};
		}
	}
	return best;
}
function assignRecon(world, group, el) {
	if (el.goalKey >= 0 && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.2) return;
	const look = bestLookout(world, group, world.objective >= 0);
	if (look) {
		setGoal(world, el, look.x, look.y);
		return;
	}
	const mask = marchMask(world, group);
	setGoal(world, el, mask.x, mask.y);
}
function assignAtgm(world, group, el) {
	const foe = nearest(el, seenFoes(world, group));
	if (foe && Math.hypot(foe.x - el.x, foe.y - el.y) < el.minRange + 2) {
		const away = bandPoint(el, foe, Math.max(10, el.range * .75));
		setGoal(world, el, away.x, away.y);
		return;
	}
	if (el.goalKey >= 0 && world.terrain[el.goalKey] === 2 && Math.hypot(el.x - el.goalX, el.y - el.goalY) < 1.3) return;
	let best = null;
	let bestDist = Infinity;
	const anchor = oppositeHome(world, group);
	for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
		if (world.terrain[idx(world, x, y)] !== 2) continue;
		const dist = world.objective >= 0 ? townDist(world, x, y) : Math.hypot(x + .5 - anchor.x, y + .5 - anchor.y);
		if (dist < 8 || dist > 16) continue;
		if (!(world.objective >= 0 ? seesTown(world, x, y) : hasLos(world, x, y, Math.floor(anchor.x), Math.floor(anchor.y)))) continue;
		if (dist < bestDist) {
			bestDist = dist;
			best = {
				x,
				y
			};
		}
	}
	if (best) setGoal(world, el, best.x, best.y);
	else if (foe) holdBand(world, el, foe);
}
function assignOpenArmor(world, el, foe) {
	if (!foe) return;
	holdBand(world, el, foe);
}
/** Leader decision. Incoming fire only re-ranks legal pads; it does not change the target. */
function think(world) {
	for (const group of world.groups) {
		const shooter = unansweredShooter(world, group);
		const used = /* @__PURE__ */ new Set();
		const members = world.elements.filter((e) => e.groupId === group.id && e.hp > 0);
		const armorPads = world.pads.some((pad) => pad.kind === "armor");
		for (const el of members) if (el.classId === "armor") {
			if (armorPads) assignArmor(world, group, el, used, shooter);
			else assignOpenArmor(world, el, nearest(el, seenFoes(world, group)));
		} else if (el.type === "atgm") assignAtgm(world, group, el);
		else if (el.classId === "recon") assignRecon(world, group, el);
		else if (el.type === "rifle") assignRifle(world, group, el);
	}
}
var STEP = .1;
function arrived(el) {
	return el.goalKey >= 0 && Math.hypot(el.x - el.goalX, el.y - el.goalY) < .45;
}
function pushEvent(world, text) {
	world.events.push({
		tick: world.tick,
		text
	});
	if (world.events.length > 40) world.events.shift();
}
function ensurePath(world, el) {
	if (el.goalKey < 0) return;
	if (el.pathFor === el.goalKey && (el.path.length > 0 || arrived(el))) return;
	el.path = findPath(world, el.classId, el.x, el.y, el.goalX, el.goalY);
	el.pathFor = el.goalKey;
}
function face(el, x, y) {
	const dx = x - el.x;
	const dy = y - el.y;
	if (dx * dx + dy * dy > .001) el.facing = Math.atan2(dy, dx);
}
function markCell(world, el) {
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	if (!inBounds(world, cx, cy)) return;
	const i = idx(world, cx, cy);
	if (world.terrain[i] === 4) {
		el.urbanTicks++;
		el.enteredUrban = true;
	}
	if (world.kill[i]) {
		el.killTicks++;
		el.killRun++;
		if (el.killRun > el.maxKillRun) el.maxKillRun = el.killRun;
	} else el.killRun = 0;
}
function moveElement(world, el) {
	if (el.hp <= 0 || el.goalKey < 0) return;
	el.px = el.x;
	el.py = el.y;
	ensurePath(world, el);
	const cx = Math.floor(el.x);
	const cy = Math.floor(el.y);
	const exposed = inBounds(world, cx, cy) && world.kill[idx(world, cx, cy)] === 1;
	const dash = el.suppression > 6 && exposed && !el.answered;
	if (arrived(el)) {
		if (el.classId === "armor") {
			el.mode = "hull-down";
			el.label = "HULL DOWN";
			el.labelUntil = world.tick + 8;
		} else if (inBounds(world, cx, cy) && world.terrain[idx(world, cx, cy)] === 4) {
			el.mode = "hold";
			el.label = "HOLD";
			el.labelUntil = world.tick + 8;
		}
		const blob = world.blobs.find((b) => b.id === world.objective);
		if (blob) face(el, blob.cx, blob.cy);
		markCell(world, el);
		return;
	}
	if (el.path.length === 0) {
		markCell(world, el);
		return;
	}
	if (dash) {
		el.mode = "mask";
		el.label = "MASK";
		el.labelUntil = world.tick + 12;
	}
	const wp = el.path[0];
	const dx = wp.x - el.x;
	const dy = wp.y - el.y;
	const dist = Math.hypot(dx, dy) || 1;
	const step = el.speed * STEP * (dash ? 1.35 : 1);
	if (dist <= step) {
		el.x = wp.x;
		el.y = wp.y;
		el.path.shift();
	} else {
		el.x += dx / dist * step;
		el.y += dy / dist * step;
	}
	face(el, wp.x, wp.y);
	markCell(world, el);
}
function weapons(world) {
	for (const el of world.elements) el.answered = false;
	for (const el of world.elements) {
		if (el.hp <= 0) continue;
		if (el.cooldown > 0) {
			el.cooldown--;
			continue;
		}
		let best = null;
		let bestD = Infinity;
		for (const foe of world.elements) {
			if (foe.side === el.side || foe.hp <= 0) continue;
			const d = Math.hypot(foe.x - el.x, foe.y - el.y);
			if (d > el.range || d < el.minRange) continue;
			if (!hasLos(world, Math.floor(el.x), Math.floor(el.y), Math.floor(foe.x), Math.floor(foe.y))) continue;
			if (d < bestD) {
				best = foe;
				bestD = d;
			}
		}
		if (!best) continue;
		el.answered = true;
		best.hp = Math.max(0, best.hp - el.damage);
		best.suppression += el.damage;
		el.cooldown = 10;
		face(el, best.x, best.y);
		if (bestD > best.range && !best.notedFire) {
			best.notedFire = true;
			best.label = "MASK";
			best.labelUntil = world.tick + 25;
			pushEvent(world, `${best.name} under fire, no shot — holding the bound`);
		}
		if (best.hp <= 0) pushEvent(world, `${best.name} destroyed`);
	}
}
function step(world) {
	if (world.tick % 10 === 0) think(world);
	for (const el of world.elements) moveElement(world, el);
	weapons(world);
	for (const el of world.elements) el.suppression = Math.max(0, el.suppression - .75);
	world.tick++;
}
/** Presentation only. The simulation does not import this module. */
var theme = {
	flat: "#6d7558",
	flatAlt: "#626b52",
	hill: "#8d9676",
	hillAlt: "#808a6c",
	forest: "#3d4a36",
	forestDot: "#2c3828",
	urban: "#c4b48a",
	urbanAlt: "#b3a27a",
	water: "#4e626c",
	road: "#6a6256",
	kill: "rgba(212, 83, 60, 0.16)",
	you: "#9ec0dc",
	hostile: "#d4533c",
	hp: "#8eae78",
	ink: "#14170f",
	bone: "#ebe6d8",
	gold: "#e2a322",
	pad: "rgba(226, 163, 34, 0.55)",
	fog: "rgba(12, 16, 14, 0.55)"
};
function terrainColor(terrain, x, y) {
	const alt = (x * 3 + y * 5) % 2 === 0;
	if (terrain === 2) return alt ? theme.hill : theme.hillAlt;
	if (terrain === 3) return theme.forest;
	if (terrain === 4) return alt ? theme.urban : theme.urbanAlt;
	if (terrain === 5) return theme.water;
	if (terrain === 1) return theme.road;
	return alt ? theme.flat : theme.flatAlt;
}
function drawWorld(ctx, world, camera, width, height) {
	const cell = 22 * camera.zoom;
	const originX = width / 2 - camera.x * cell;
	const originY = height / 2 - camera.y * cell;
	ctx.fillStyle = theme.flatAlt;
	ctx.fillRect(0, 0, width, height);
	const x0 = Math.max(0, Math.floor((0 - originX) / cell));
	const y0 = Math.max(0, Math.floor((0 - originY) / cell));
	const x1 = Math.min(world.w - 1, Math.ceil((width - originX) / cell));
	const y1 = Math.min(world.h - 1, Math.ceil((height - originY) / cell));
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
		const i = idx(world, x, y);
		const px = originX + x * cell;
		const py = originY + y * cell;
		ctx.fillStyle = terrainColor(world.terrain[i], x, y);
		ctx.fillRect(px, py, cell + .5, cell + .5);
		if (world.terrain[i] === 3 && (x + y) % 2 === 0) {
			ctx.fillStyle = theme.forestDot;
			ctx.beginPath();
			ctx.arc(px + cell * .5, py + cell * .55, cell * .12, 0, Math.PI * 2);
			ctx.fill();
		}
		if (world.kill[i]) {
			ctx.fillStyle = theme.kill;
			ctx.fillRect(px, py, cell, cell);
		}
	}
	ctx.strokeStyle = theme.pad;
	ctx.lineWidth = 1;
	for (const pad of world.pads) {
		if (pad.kind !== "armor") continue;
		if (pad.x < x0 || pad.x > x1 || pad.y < y0 || pad.y > y1) continue;
		ctx.strokeRect(originX + pad.x * cell + 2, originY + pad.y * cell + 2, cell - 4, cell - 4);
	}
	for (const el of world.elements) {
		const px = originX + el.x * cell;
		const py = originY + el.y * cell;
		const alive = el.hp > 0;
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(el.facing);
		const w = cell * (el.classId === "armor" ? .72 : .48);
		const h = cell * (el.classId === "armor" ? .5 : .4);
		ctx.fillStyle = alive ? el.side === "you" ? theme.you : theme.hostile : theme.ink;
		ctx.strokeStyle = theme.ink;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.roundRect(-w / 2, -h / 2, w, h, 3);
		ctx.fill();
		ctx.stroke();
		if (alive && el.classId === "armor") {
			ctx.beginPath();
			ctx.arc(0, 0, h * .28, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(h * .2, 0);
			ctx.lineTo(w * .85, 0);
			ctx.stroke();
		}
		ctx.restore();
		if (!alive) continue;
		const barW = cell * .7;
		const barX = px - barW / 2;
		const barY = py - cell * .48;
		ctx.fillStyle = theme.ink;
		ctx.fillRect(barX, barY, barW, 3);
		ctx.fillStyle = theme.hp;
		ctx.fillRect(barX, barY, barW * Math.max(0, el.hp / el.hpMax), 3);
		if (el.label && el.labelUntil >= world.tick) {
			ctx.fillStyle = theme.bone;
			ctx.font = "600 11px Barlow Condensed, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(el.label, px, py - cell * .62);
		}
	}
}
var SPEEDS = [
	{
		id: "pause",
		label: "II",
		value: 0
	},
	{
		id: "1",
		label: "1×",
		value: 1
	},
	{
		id: "2",
		label: "2×",
		value: 2
	},
	{
		id: "4",
		label: "4×",
		value: 4
	},
	{
		id: "8",
		label: "8×",
		value: 8
	}
];
function clock(tick) {
	const seconds = Math.floor(tick / 10);
	return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}
function readHud(world) {
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
			detail: `${e.mode} · ${e.hp <= 0 ? "down" : `${Math.ceil(e.hp)} hp`}`
		}))
	};
}
function Battle() {
	const canvasRef = (0, import_react.useRef)(null);
	const speedRef = (0, import_react.useRef)(1);
	const [speed, setSpeed] = (0, import_react.useState)(1);
	const [rangeId, setRangeId] = (0, import_react.useState)("hill");
	const [run, setRun] = (0, import_react.useState)(0);
	const [hud, setHud] = (0, import_react.useState)(() => readHud(createHillOverTown()));
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const world = (RANGES.find((entry) => entry.id === rangeId) ?? RANGES[0]).create();
		const camera = {
			x: world.w / 2,
			y: world.h / 2,
			zoom: 1
		};
		const fitRect = canvas.getBoundingClientRect();
		const fit = Math.min(fitRect.width / (world.w * 22), fitRect.height / (world.h * 22));
		if (fit > 0) camera.zoom = Math.min(1.5, Math.max(.28, fit * .92));
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
		const frame = (now) => {
			const dt = Math.min(.1, (now - last) / 1e3);
			last = now;
			const rate = speedRef.current;
			if (rate > 0) {
				acc += dt * rate;
				let guard = 0;
				while (acc >= .1 && guard < 12) {
					step(world);
					acc -= .1;
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
		const onDown = (event) => {
			dragging = true;
			lx = event.clientX;
			ly = event.clientY;
			canvas.setPointerCapture(event.pointerId);
		};
		const onMove = (event) => {
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
		const onWheel = (event) => {
			event.preventDefault();
			const next = camera.zoom * (event.deltaY > 0 ? .9 : 1.1);
			camera.zoom = Math.min(2.4, Math.max(.28, next));
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-2 border-b border-line bg-surface px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-2xl font-semibold tracking-wide",
							children: "Iron Doctrine"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tracking-widest text-fg",
							children: clock(hud.tick)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-sm tracking-widest text-gold",
								children: hud.title.toUpperCase()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: hud.place
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 max-w-md text-sm text-fg",
								children: hud.brief
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-lg tracking-wide",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-friendly",
									children: hud.you
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2 text-muted",
									children: "live"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-hostile",
									children: hud.hostile
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1.5 overflow-x-auto",
						role: "group",
						"aria-label": "Range",
						children: [RANGES.map((entry) => {
							const active = rangeId === entry.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": active,
								onClick: () => setRangeId(entry.id),
								className: "h-11 shrink-0 rounded-sm border px-3 font-display text-base tracking-wide " + (active ? "border-gold text-gold" : "border-line text-muted"),
								children: entry.label
							}, entry.id);
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setRun((value) => value + 1),
							className: "h-11 rounded-sm border border-line px-3 font-display text-base tracking-wide text-fg",
							children: "Restart"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						role: "group",
						"aria-label": "Time",
						children: SPEEDS.map((entry) => {
							const active = speed === entry.value;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": active,
								onClick: () => {
									speedRef.current = entry.value;
									setSpeed(entry.value);
								},
								className: "h-11 min-w-11 rounded-sm border px-3 font-display text-base tracking-wide " + (active ? "border-gold text-gold" : "border-line text-muted"),
								children: entry.label
							}, entry.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative min-h-0 flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className: "h-full w-full touch-none",
					"aria-label": "Battle map"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "border-t border-line bg-surface px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex gap-3 overflow-x-auto pb-1",
					children: hud.roster.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "min-w-28 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: unit.side === "you" ? "text-friendly" : "text-hostile",
							children: unit.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: unit.detail
						})]
					}, unit.name))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 min-h-10 text-sm text-fg",
					children: hud.lines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "The company is reading the ground."
					}) : hud.lines.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate",
						children: line
					}, `${index}-${line}`))
				})]
			})
		]
	});
}
var SplitComponent = Battle;
//#endregion
export { SplitComponent as component };
