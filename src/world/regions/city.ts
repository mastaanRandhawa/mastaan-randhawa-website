import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef, Vec3 } from "../layout";
import type { RegionExtras } from "../defs";
import { courseRings } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree, bush, flowers } from "../prefabs/nature";
import { streetlight, bench } from "../prefabs/structures";
import { officeTower, type TowerStyle } from "../prefabs/architecture";
import { approachRing, medalsFor } from "./common";
import { portfolio } from "@/content/portfolio";

/** City tower in one of the architecture kit's archetypes; returns the roof height (local y). */
function tower(I: Isl, x: number, z: number, w: number, d: number, h: number, accent: string, style: TowerStyle) {
  return I.h(x, z) + officeTower(I, x, z, w, d, h, accent, style);
}

function serverHall(I: Isl, x: number, z: number, accent: string) {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.box(), T(x, y + 3.5, z, 20, 7, 12), "#e3e6ee");
  b.add(P.box(), T(x, y + 7.2, z, 20.6, 0.5, 12.6), accent);
  for (let k = 0; k < 5; k++) b.add(P.box(), T(x - 8 + k * 4, y + 8.2, z, 2.4, 1.6, 6), C.metal);
  b.add(P.box(), T(x, y + 3.6, z + 6.02, 18.4, 5, 0.06), "#20242c");
  const pts: Vec3[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) pts.push(I.w(x - 8.2 + c * 1.5, y + 2 + r * 1.5, z + 6.07));
  I.anchor("blinkers", 0, 0, 0, { data: { points: pts, colors: ["#7fe3ff", "#7dffb0", "#ffcf70", "#7dffb0"] } });
  I.box(x, y + 4, z, 10, 4, 6);
  I.block(x, z, 13);
}

export function buildCity(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const accent = def.accent;
  const I = kit.island({
    id: "city",
    x: cx,
    y: cy,
    z: cz,
    radius: 112,
    sx: 1.25,
    seed: 7101,
    hilliness: 1.2,
    depth: 100,
    rings: 18,
    segments: 72,
    palette: PALETTES.tech,
    pads: [
      { x: 0, z: 0, r: 0, w: 140, l: 90, h: 0, blend: 14 },
      { x: 0, z: 0, r: 22, h: 0, color: "#d6d2c9", colorStrength: 0.9 },
      { x: 0, z: 70, r: 20, h: 0, color: "#7fb86a", colorStrength: 0.5 },
    ],
  });
  const b = I.b;

  // ── Roads ──
  const road = (x: number, z: number, w: number, l: number) => {
    b.add(P.box(), T(x, 0.12, z, w, 0.24, l), C.asphalt);
    const along = l > w;
    const n = Math.floor((along ? l : w) / 8);
    for (let k = 0; k < n; k++) {
      const o = -((along ? l : w) / 2) + 4 + k * 8;
      b.add(P.box(), T(along ? x : x + o, 0.26, along ? z + o : z, along ? 0.35 : 3.5, 0.04, along ? 3.5 : 0.35), C.white);
    }
  };
  road(0, 32, 250, 9);
  road(0, -40, 250, 9);
  road(-50, -4, 9, 150);
  road(55, -4, 9, 150);

  // ── HQ plaza: the two roles as two towers ──
  const [appRole, dataRole] = [portfolio.company.roles[1], portfolio.company.roles[0]];
  const appTop = tower(I, -15, -8, 11, 11, 34, "#7d8fa3", "glass");
  const dataTop = tower(I, 15, -10, 12, 12, 48, accent, "glass");
  b.add(P.box(), T(15, dataTop + 3, -10, 0.4, 6, 0.4), C.metalDark);
  b.add(P.torus(0.12, 6, 24), T(15, dataTop + 1.4, -10, 10, 10, 2, 0, Math.PI / 2), accent, { emissive: 0.7 });
  I.anchor("beacon", 15, dataTop + 6.4, -10, { data: { color: "#ff4b3e", period: 1.4 } });
  out.collectibles.push({ id: "log-thoughtswin", pos: I.w(15, dataTop + 14, -10), hint: "Above the Data Engineering tower" });
  I.anchor("sign", -15, appTop - 6, -2.15, { data: { lines: [appRole.title.toUpperCase(), appRole.period], w: 9.6, h: 2.6, bg: "#fbf6ec", fg: "#1f3552", accent: "#7d8fa3" } });
  I.anchor("sign", 15, dataTop - 6, -3.65, { data: { lines: [dataRole.title.toUpperCase(), `${dataRole.period} · CURRENT`], w: 10.6, h: 2.6, bg: "#fbf6ec", fg: "#1f3552", accent } });
  // HQ lobby
  b.add(P.box(), T(0, 4.5, 16, 30, 9, 10), "#f4ead5");
  b.add(P.box(), T(0, 3, 21.05, 26, 4.6, 0.1), C.glass, { emissive: 0.3 });
  b.add(P.box(), T(0, 9.3, 16, 31, 0.6, 11), accent);
  // Colonnade, entrance canopy and a clerestory of lit windows.
  for (let k = -3; k <= 3; k++) b.add(P.box(), T(k * 4.2, 4.6, 21.3, 0.7, 8.8, 0.5), "#fbf6ec");
  b.add(P.box(), T(0, 5.6, 22.9, 9, 0.35, 3.4), accent);
  for (const sx of [-4, 4]) b.add(P.cyl(8), T(sx, 2.9, 24.2, 0.3, 5.4, 0.3), C.metalDark);
  b.add(P.box(), T(0, 0.15, 23.5, 10, 0.3, 5), C.stone);
  for (let k = -3; k < 3; k++) b.add(P.box(), T(k * 4.2 + 2.1, 7.2, 21.12, 2.6, 1.2, 0.08), C.window, { emissive: 0.45 });
  I.box(0, 4.5, 16, 15, 4.8, 5);
  I.anchor("sign", 0, 11.4, 21.2, { data: { lines: [portfolio.company.name.toUpperCase()], w: 26, h: 2.4, bg: "#1f3552", fg: "#ffffff", accent, font: 58 } });
  I.anchor("fountain", 0, 0.4, -26);
  b.add(P.cyl(16), T(0, 0.4, -26, 9, 0.8, 9), C.stone);
  I.anchor("pond", 0, 0.85, -26, { s: 4 });

  // ── Data pipelines (ETL) linking server halls to the towers ──
  serverHall(I, 95, -14, accent);
  serverHall(I, 82, 64, accent);
  const pipe = (pts: Vec3[], color: string) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0, z0] = pts[i];
      const [x1, y1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const ry = Math.atan2(x1 - x0, z1 - z0);
      const rx = Math.atan2(Math.hypot(x1 - x0, z1 - z0), y1 - y0);
      b.add(P.cyl(8), T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 1.4, len, 1.4, ry, rx), C.metal);
      for (let k = 0; k <= 1; k++) b.add(P.cyl(6), T(x0 + (x1 - x0) * k, (y0 + y1) / 2 - (y0 + y1) / 4, z0 + (z1 - z0) * k, 0.5, (y0 + y1) / 2, 0.5), C.metalDark);
    }
    I.anchor("pulses", 0, 0, 0, { data: { points: pts.map(([x, y, z]) => I.w(x, y + 1, z)), color, count: 6, speed: 0.12, size: 0.8 } });
  };
  pipe([[85, 9, -14], [40, 12, -14], [21, 14, -12]], "#7fe3d8");
  pipe([[78, 9, 58], [60, 12, 45], [20, 14, 18]], "#ffcf70");

  // ── Office blocks ──
  const blocks: [number, number, number, number, number][] = [
    [-105, -15, 14, 12, 28],
    [-80, 8, 12, 12, 20],
    [-112, 12, 10, 10, 16],
    [88, 12, 12, 10, 18],
    [-95, 62, 14, 12, 18],
    [-70, 82, 10, 12, 14],
    [112, 50, 12, 14, 24],
    [-88, -66, 14, 12, 22],
    [-28, -68, 14, 14, 26],
    [28, -66, 12, 12, 20],
    [92, -66, 12, 12, 28],
  ];
  blocks.forEach(([x, z, w, d, h], i) => {
    const style: TowerStyle = h >= 26 ? (i % 2 ? "deco" : "glass") : h <= 18 ? "masonry" : i % 2 ? "masonry" : "deco";
    tower(I, x, z, w, d, h, ["#d9573f", "#2f8f8a", "#c99a3a", "#4a5fd0"][Math.abs(x + z) % 4], style);
  });

  // ── Dashboard park: bar chart sculpture + trees ──
  const bars = [6, 10, 8, 14, 12, 18];
  bars.forEach((h, i) => b.add(P.box(), T(-10 + i * 4, h / 2, 68, 3, h, 3), ["#5b6cff", "#3fb8af", "#e6b64c", "#f2735a", "#3fb8af", accent][i]));
  b.add(P.box(), T(1, 0.2, 68, 26, 0.4, 6), C.stone);
  I.box(0, 9, 68, 13, 9, 2);
  I.anchor("sign", 1, 3, 71.1, { data: { lines: ["DASHBOARDS · REPORTS · PIPELINES"], w: 22, h: 1.6, bg: "#1f3552", fg: "#ffffff", font: 55 } });
  for (const [x, z] of [[-24, 60], [-20, 80], [22, 62], [26, 80], [-6, 86], [10, 88]] as const) tree(I, x, z, x > 0 ? "round" : "birch", 1.1);
  for (const [x, z] of [[-14, 78], [14, 76]] as const) bench(I, x, z, 0);
  for (const [x, z] of [[-30, 70], [30, 72]] as const) flowers(I, x, z, 6);

  // ── Street furniture ──
  for (let k = -5; k <= 5; k++) {
    streetlight(I, k * 22 + 4, 26, 0, 5);
    streetlight(I, k * 22 - 4, -34, Math.PI, 5);
  }
  for (const [x, z] of [[-130, -40], [-130, 32], [128, -40], [128, 32]] as const) bush(I, x, z, 1.2);
  floatingRocks(I, 12);

  // ── Skyline Sprint: down the avenues and through the tower gap ──
  const y = cy;
  const pts: Vec3[] = [
    [cx - 128, y + 20, cz - 40],
    [cx - 85, y + 18, cz - 40],
    [cx - 30, y + 22, cz - 40],
    [cx + 22, y + 20, cz - 40],
    [cx + 55, y + 22, cz - 10],
    [cx + 55, y + 18, cz + 32],
    [cx + 10, y + 22, cz + 32],
    [cx - 50, y + 20, cz + 32],
    [cx - 50, y + 26, cz - 12],
    [cx - 22, y + 38, cz - 48],
    [cx, y + 28, cz - 28],
    [cx, y + 24, cz + 4],
  ];
  out.courses.push({
    id: "skyline-sprint",
    name: "Skyline Sprint",
    regionId: "city",
    description: "Race the avenues of Experience City and thread the tower gap.",
    timed: true,
    rings: courseRings(pts, 8.5),
    medals: medalsFor(pts),
  });

  out.destinations.push({
    id: "experience",
    regionId: "city",
    kind: "experience",
    label: portfolio.company.name,
    sublabel: "Experience City · HQ",
    pos: [cx, cy + 56, cz - 4],
    interactRadius: 140,
    ring: approachRing(def, cx, cy, cz - 120, -10, 40, 13),
    accent,
    landing: { x: cx, y: cy + 0.24, z: cz - 40, heading: -Math.PI / 2, length: 200, turn: -1 },
  });
}
