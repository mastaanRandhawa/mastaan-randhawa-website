import { P, T, TP } from "@/render/geometry/MeshBuilder";
import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { decorate, floatingRocks, rock } from "../prefabs/nature";
import { antenna, bridge, frame, signpost, streetlight } from "../prefabs/structures";
import { approachRing } from "./common";
import { portfolio } from "@/content/portfolio";

function browserWindow(I: Isl, x: number, z: number, ry: number, accent: string) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  const b = I.b;
  b.add(P.box(), TP(M, 0, 0.6, 0, 2, 1.2, 2), C.stoneDark);
  b.add(P.box(), TP(M, 0, 3, 0, 0.5, 4, 0.5), C.metalDark);
  b.add(P.box(), TP(M, 0, 9, 0, 14, 9, 0.5), C.white);
  b.add(P.box(), TP(M, 0, 12.9, 0.1, 14, 1.2, 0.6), "#e8e3da");
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => b.add(P.sphere(8, 6), TP(M, -6 + i * 0.9, 12.9, 0.45, 0.55, 0.55, 0.3), c));
  b.add(P.box(), TP(M, -3.8, 9.6, 0.3, 5, 4.6, 0.2), accent);
  b.add(P.box(), TP(M, 2.6, 11, 0.3, 6.8, 1, 0.2), "#cfd6e4");
  b.add(P.box(), TP(M, 2.6, 9.5, 0.3, 6.8, 0.6, 0.2), "#cfd6e4");
  b.add(P.box(), TP(M, 1.4, 8, 0.3, 4.4, 0.6, 0.2), "#cfd6e4");
  b.add(P.box(), TP(M, 2.6, 6, 0.3, 4, 1.4, 0.2), C.coral);
  I.box(x, y + 9, z, 7, 4.6, 0.6, ry);
}

function interfaceIsle(I: Isl, color: string) {
  const b = I.b;
  const y = I.h(0, 0);
  const cols = [color, "#f2735a", "#e6b64c", "#3fb8af"];
  cols.forEach((c, i) => {
    b.add(P.box(), T(-2 + i * 1.5, y + 1 + i * 2.6, -2 + i * 1.2, 16 - i * 3, 2.2, 12 - i * 2.2, i * 0.12), c);
  });
  I.box(0, y + 5, 0, 8, 5.5, 6);
  browserWindow(I, -18, -8, 0.5, color);
  browserWindow(I, 16, -12, -0.6, "#3fb8af");
  ["#3b5bff", "#f2735a", "#e6b64c", "#3fb8af", "#c46fc0"].forEach((c, i) => {
    const a = (i / 5) * Math.PI * 2;
    I.anchor("bob", Math.cos(a) * 12, y + 16 + (i % 2) * 3, Math.sin(a) * 12, { data: { color: c, size: 1.6 + (i % 3) * 0.4, amp: 1.2, speed: 0.8 } });
  });
  I.anchor("sign", 0, y + 13.2, 3.5, { data: { lines: ["INTERFACE ISLE", "frontend"], w: 9, h: 2.2, bg: "#fbf6ec", fg: "#1f3552", accent: color, doubleSided: true } });
  return 18;
}

function systemsForge(I: Isl, color: string) {
  const b = I.b;
  const y = I.h(0, 0);
  const M = frame(0, y, -3, 0);
  b.add(P.box(), TP(M, 0, 4, 0, 16, 8, 11), "#b8afa3");
  b.add(P.box(), TP(M, 0, 8.4, 0, 17, 0.8, 12), C.metalDark);
  b.add(P.box(), TP(M, 0, 3, 5.55, 5, 6, 0.2), "#ff8a3d", { emissive: 0.7 });
  b.add(P.frustum(0.75, 8), TP(M, 6, 12, -3, 3, 9, 3), "#8d867d");
  I.anchor("smoke", 6, y + 16.6, -6);
  I.anchor("gear", -5.5, y + 9.5, 2.6, { data: { r: 3, teeth: 12, axis: "z", color: C.gold, speed: 0.5 } });
  I.anchor("gear", -1.4, y + 11.4, 2.6, { data: { r: 1.8, teeth: 9, axis: "z", color: color, speed: -0.83 } });
  // Anvil + terminals
  b.add(P.box(), T(4, y + 0.8, 8, 2.4, 1.6, 1.2), C.metalDark);
  b.add(P.box(), T(4, y + 1.9, 8, 3.2, 0.6, 1.4), "#3a3d45");
  for (const tx of [-9, -5]) {
    b.add(P.box(), T(tx, y + 1.6, 9, 2.4, 3.2, 1.2), "#2a2c33");
    b.add(P.box(), T(tx, y + 2.2, 9.62, 2, 1.6, 0.05), "#7dffb0", { emissive: 0.9 });
  }
  I.box(0, y + 4.5, -3, 8, 4.5, 5.5);
  I.cyl(6, -6, y, y + 16.5, 1.6);
  I.anchor("sign", 0, y + 10.4, 3.05, { data: { lines: ["SYSTEMS FORGE", "backend & systems"], w: 9, h: 2.2, bg: "#2a2c33", fg: "#ffffff", accent: color } });
  return 18;
}

function dataLake(I: Isl, color: string) {
  const b = I.b;
  const y = I.h(0, 0);
  I.anchor("pond", -10, -1.4, 6, { s: 14 });
  // Data centre with blinking racks
  const dx = 13;
  const dz = -6;
  const dy = I.h(dx, dz);
  b.add(P.box(), T(dx, dy + 4, dz, 14, 8, 12), "#e3e6ee");
  b.add(P.box(), T(dx, dy + 8.3, dz, 14.6, 0.6, 12.6), color);
  for (let k = 0; k < 4; k++) b.add(P.box(), T(dx - 4.5 + k * 3, dy + 9.4, dz, 1.8, 1.6, 4), C.metal);
  const pts: [number, number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) pts.push(I.w(dx - 5.5 + c * 1.55, dy + 2.2 + r * 1.8, dz + 6.06));
  b.add(P.box(), T(dx, dy + 4, dz + 6.02, 13, 6, 0.06), "#20242c");
  I.anchor("blinkers", 0, 0, 0, { data: { points: pts, colors: ["#7fe3ff", "#7dffb0", "#ffcf70"] } });
  I.box(dx, dy + 4.5, dz, 7, 4.5, 6);
  // ETL pipe from lake into the data centre
  const pipe: [number, number][] = [[-4, 2], [2, -1], [6, -3]];
  for (let i = 0; i < pipe.length - 1; i++) {
    const [x0, z0] = pipe[i];
    const [x1, z1] = pipe[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    b.add(P.cyl(8), T((x0 + x1) / 2, y + 1.2, (z0 + z1) / 2, 1.2, len, 1.2, Math.atan2(x1 - x0, z1 - z0), Math.PI / 2), C.metal);
  }
  I.anchor("pulses", 0, 0, 0, { data: { points: [I.w(-10, y + 0.5, 6), I.w(-4, y + 1.3, 2), I.w(2, y + 1.3, -1), I.w(6, y + 1.3, -3)], color: color, count: 4, speed: 0.3, size: 0.7 } });
  antenna(I, 2, -18, 18);
  I.anchor("dish", -14, I.h(-14, -14) + 4.5, -14, { s: 1.4 });
  b.add(P.frustum(0.5, 6), T(-14, I.h(-14, -14) + 2, -14, 2, 4, 2), C.white);
  I.anchor("sign", dx, dy + 6.4, dz + 6.1, { data: { lines: ["DATA LAKE REACH", "data & cloud"], w: 9, h: 2, bg: "#fbf6ec", fg: "#1f3552", accent: color } });
  return 20;
}

function toolsmith(I: Isl, color: string, out: RegionExtras) {
  const b = I.b;
  const y = I.h(0, 0);
  // Stacked shipping containers (very on-brand for Docker)
  const cont = ["#2496ed", "#f2735a", "#3fb8af", "#e6b64c", "#2496ed", "#c46fc0"];
  let k = 0;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3 - row; col++) {
      const cx = -10 + col * 6.6 + row * 3.3;
      const cy = y + 1.3 + row * 2.7;
      b.add(P.box(), T(cx, cy, -4, 6.2, 2.6, 2.6), cont[k++ % cont.length]);
      for (let r = 0; r < 6; r++) b.add(P.box(), T(cx - 2.6 + r * 1.04, cy, -2.67, 0.12, 2.4, 0.06), C.white);
    }
  I.box(-3.4, y + 4, -4, 10.5, 4, 1.6);
  out.collectibles.push({ id: "log-akwraps-docker", pos: I.w(-3.5, y + 3.2, 2.5), hint: "Between the containers at Toolsmith Harbor" });
  // Gantry crane
  for (const sx of [-14, 8]) b.add(P.box(), T(sx, y + 6, 0, 0.8, 12, 0.8), C.yellow);
  b.add(P.box(), T(-3, y + 12.2, 0, 23, 0.9, 0.9), C.yellow);
  b.add(P.box(), T(2, y + 10.4, 0, 0.1, 3.4, 0.1), C.metalDark);
  // Database cylinders
  for (const [dx, dz] of [[10, 8], [15, 4]] as const) {
    const dy = I.h(dx, dz);
    for (let s = 0; s < 3; s++) b.add(P.cyl(16), T(dx, dy + 1.2 + s * 2.3, dz, 4.4, 1.8, 4.4), s % 2 ? "#5b6cff" : "#7f8cff");
    I.cyl(dx, dz, dy, dy + 7.5, 2.3);
  }
  // Git branch tree
  const gx = -12;
  const gz = 10;
  const gy = I.h(gx, gz);
  b.add(P.cyl(8), T(gx, gy + 6, gz, 0.6, 12, 0.6), C.metalDark);
  const nodes: [number, number, string][] = [[0, 2, color], [0, 5, color], [0, 8, color], [0, 11, color], [3, 6.5, "#3fb8af"], [3, 9.5, "#3fb8af"], [-3, 8, "#e6b64c"]];
  for (const [nx, ny, c] of nodes) b.add(P.sphere(10, 8), T(gx + nx, gy + ny, gz, 1.3, 1.3, 1.3), c, { emissive: 0.25 });
  b.add(P.cyl(6), T(gx + 1.5, gy + 5.75, gz, 0.35, 3.4, 0.35, 0, 0, -0.9), "#3fb8af");
  b.add(P.cyl(6), T(gx + 3, gy + 8, gz, 0.35, 3, 0.35), "#3fb8af");
  b.add(P.cyl(6), T(gx + 1.5, gy + 10.25, gz, 0.35, 3.4, 0.35, 0, 0, 0.9), "#3fb8af");
  b.add(P.cyl(6), T(gx - 1.5, gy + 6.5, gz, 0.35, 3.4, 0.35, 0, 0, 0.9), "#e6b64c");
  I.cyl(gx, gz, gy, gy + 12, 3);
  I.anchor("sign", -3, y + 9.4, -2.6, { data: { lines: ["TOOLSMITH HARBOR", "databases & tools"], w: 9, h: 2, bg: "#fbf6ec", fg: "#1f3552", accent: color } });
  return 14;
}

export function buildSkills(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const hub = kit.island({ id: "skills-hub", x: cx, y: cy, z: cz, radius: 15, seed: 410, hilliness: 1, depth: 30, palette: PALETTES.lavender });
  antenna(hub, 0, 0, 10);
  floatingRocks(hub, 5, 1.8);

  const layout: { id: string; dx: number; dz: number; dy: number; r: number; pal: keyof typeof PALETTES; seed: number }[] = [
    { id: "frontend", dx: -88, dz: -82, dy: 6, r: 40, pal: "lavender", seed: 421 },
    { id: "systems", dx: 92, dz: -84, dy: -6, r: 38, pal: "tech", seed: 422 },
    { id: "data-cloud", dx: 92, dz: 88, dy: 8, r: 42, pal: "lush", seed: 423 },
    { id: "tools", dx: -92, dz: 86, dy: -4, r: 40, pal: "autumn", seed: 424 },
  ];
  const arrows: { text: string; angle: number }[] = [];
  for (const L of layout) {
    const cat = portfolio.skillCategories.find((c) => c.id === L.id)!;
    const x = cx + L.dx;
    const z = cz + L.dz;
    const y = cy + L.dy;
    const I = kit.island({
      id: `skills-${L.id}`,
      x,
      y,
      z,
      radius: L.r,
      seed: L.seed,
      hilliness: 4,
      depth: L.r * 0.9,
      palette: PALETTES[L.pal],
      pads: [{ x: 0, z: 0, r: L.r * 0.55, h: 0, blend: 8 }],
    });
    const h =
      L.id === "frontend" ? interfaceIsle(I, cat.color) : L.id === "systems" ? systemsForge(I, cat.color) : L.id === "data-cloud" ? dataLake(I, cat.color) : toolsmith(I, cat.color, out);
    decorate(I, { trees: 14, bushes: 10, flowers: 12, grass: 16, rocks: 5 });
    floatingRocks(I, 6);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6;
      const lx = Math.cos(a) * L.r * 0.7;
      const lz = Math.sin(a) * L.r * 0.7;
      if (I.isFree(lx, lz, 2)) streetlight(I, lx, lz, -a);
    }
    // Rope bridge from the hub edge to the island edge.
    const ang = Math.atan2(L.dz, L.dx);
    const a0: [number, number, number] = [cx + Math.cos(ang) * 14, cy + hub.h(Math.cos(ang) * 14, Math.sin(ang) * 14) + 0.2, cz + Math.sin(ang) * 14];
    const edge = L.r * 0.92;
    const a1: [number, number, number] = [x - Math.cos(ang) * edge, y + I.h(-Math.cos(ang) * edge, -Math.sin(ang) * edge) + 0.2, z - Math.sin(ang) * edge];
    bridge(kit.world, a0, a1, 3.6, 4);
    arrows.push({ text: cat.islandName.toUpperCase(), angle: Math.atan2(L.dx, L.dz) });
    out.destinations.push({
      id: `skills-${L.id}`,
      regionId: "skills",
      kind: "skills",
      contentId: L.id,
      label: cat.islandName,
      sublabel: `Skills · ${cat.label}`,
      pos: [x, y + h + 8, z],
      interactRadius: L.r + 55,
      ring: approachRing(def, x, y, z, L.r + 20, 22, 11),
      accent: cat.color,
    });
  }
  signpost(hub, 3, 4, arrows);
  rock(hub, -5, -4, 1.6);
}
