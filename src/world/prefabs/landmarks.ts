import { P, T, TP } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { C } from "../palette";
import { frame, rot, streetlight, flagpole, bench, crate, fence } from "./structures";
import { tree, bush, flowers } from "./nature";
import type { Project } from "@/content/types";

/**
 * One hand-built landmark per real project, themed on what the project does.
 * Each returns the landmark's top height (local) for label placement.
 */
type Landmark = (I: Isl, x: number, z: number, p: Project) => number;

const W = (I: Isl, x: number, z: number) => I.w(x, 0, z);

function plaque(I: Isl, x: number, z: number, ry: number, lines: string[], accent: string, w = 6, h = 2) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  I.b.add(P.box(), TP(M, -w / 2 + 0.3, h / 2 + 0.6, 0, 0.3, h + 1.2, 0.3), C.metalDark);
  I.b.add(P.box(), TP(M, w / 2 - 0.3, h / 2 + 0.6, 0, 0.3, h + 1.2, 0.3), C.metalDark);
  I.b.add(P.box(), TP(M, 0, h / 2 + 1.2, -0.12, w + 0.3, h + 0.3, 0.2), C.metalDark);
  const [dx, dz] = rot(0, 0.02, ry);
  I.anchor("sign", x + dx, y + h / 2 + 1.2, z + dz, { ry, data: { lines, w, h, bg: "#fbf3e2", fg: "#1f3552", accent } });
}

// ── Doxa Studios client work ────────────────────────────────────────────────
export const stadium: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const L = 36;
  const Wd = 24;
  b.add(P.box(), T(x, y + 0.15, z, Wd + 10, 0.3, L + 10), C.concrete);
  b.add(P.box(), T(x, y + 0.35, z, Wd, 0.25, L), "#4f9e4a");
  for (let i = -3; i <= 3; i++) b.add(P.box(), T(x, y + 0.36, z + (i * L) / 7, Wd, 0.24, L / 14), i % 2 ? "#58a852" : "#4a9445");
  // Lines
  b.add(P.box(), T(x, y + 0.5, z, Wd - 1, 0.04, 0.25), C.white);
  b.add(P.torus(0.03, 3, 28), T(x, y + 0.5, z, 6, 6, 1, 0, -Math.PI / 2), C.white);
  for (const s of [-1, 1]) {
    b.add(P.box(), T(x, y + 0.5, z + s * (L / 2 - 0.3), Wd - 1, 0.04, 0.25), C.white);
    b.add(P.box(), T(x, y + 0.5, z + s * (L / 2 - 4), 10, 0.04, 0.25), C.white);
    for (const sx of [-5, 5]) b.add(P.box(), T(x + sx, y + 0.5, z + s * (L / 2 - 2), 0.25, 0.04, 4), C.white);
    // Goal
    b.add(P.box(), T(x, y + 1.6, z + s * (L / 2 + 0.6), 6, 0.2, 0.2), C.white);
    for (const sx of [-3, 3]) b.add(P.box(), T(x + sx, y + 0.8, z + s * (L / 2 + 0.6), 0.2, 1.6, 0.2), C.white);
  }
  b.add(P.box(), T(x, y + 0.5, z + 0, Wd - 1, 0.04, 0.25), C.white);
  // Stands (tiered, seat colours alternate)
  const seat = [p.color, "#26272c", p.color];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      b.add(P.box(), T(x + s * (Wd / 2 + 2.5 + k * 1.8), y + 0.8 + k * 1.3, z, 2, 1.6 + k * 2.6, L - 2), k % 2 ? "#e8e1d3" : seat[k % 3]);
    }
    b.add(P.box(), T(x + s * (Wd / 2 + 9.5), y + 7.5, z, 0.6, 1, L), C.metalDark);
    b.add(P.box(), T(x + s * (Wd / 2 + 6), y + 9.5, z, 8, 0.4, L - 2, 0, 0, s * 0.18), C.white);
    I.box(x + s * (Wd / 2 + 5.5), y + 4.5, z, 4.5, 4.5, L / 2);
  }
  // Floodlights
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const fx = x + sx * (Wd / 2 + 11);
      const fz = z + sz * (L / 2 + 4);
      b.add(P.frustum(0.5, 6), T(fx, y + 11, fz, 1.1, 22, 1.1), C.metal);
      const ry = Math.atan2(x - fx, z - fz);
      b.add(P.box(), T(fx, y + 22.5, fz, 4, 2.4, 0.6, ry, 0.35), C.metalDark);
      b.add(P.box(), T(fx + Math.sin(ry) * 0.3, y + 22.5, fz + Math.cos(ry) * 0.3, 3.6, 2, 0.2, ry, 0.35), "#fff4d6", { emissive: 1 });
      I.cyl(fx, fz, y, y + 24, 1.4);
    }
  // Scoreboard
  const sbz = z - L / 2 - 8;
  b.add(P.box(), T(x, y + 4, sbz, 0.8, 8, 0.8), C.metalDark);
  b.add(P.box(), T(x, y + 9.5, sbz - 0.2, 13, 5.4, 0.6), "#1d1e24");
  I.anchor("sign", x, y + 9.5, sbz + 0.15, { ry: 0, data: { lines: ["BC TIGERS FC", "LIVE · TOURNAMENT HUB", "FIXTURES  STANDINGS  BRACKETS"], w: 12.4, h: 4.8, bg: "#141519", fg: "#ffcf70", style: "screen" } });
  I.box(x, y + 9, sbz, 6.6, 3, 0.8);
  // API kiosk + data flowing to the board.
  b.add(P.box(), T(x + 14, y + 1.6, sbz - 2, 4, 3.2, 3), C.white);
  b.add(P.box(), T(x + 14, y + 2.2, sbz - 0.45, 3, 1.2, 0.1), C.windowCool, { emissive: 0.6 });
  I.anchor("pulses", 0, 0, 0, {
    data: { points: [I.w(x + 14, y + 3.4, sbz - 2), I.w(x + 9, y + 9, sbz - 2), I.w(x + 4, y + 11, sbz)], color: "#ffcf70", count: 4, speed: 0.35, size: 0.5 },
  });
  flagpole(I, x - Wd / 2 - 13, z + L / 2 + 8, p.color, 11);
  flagpole(I, x + Wd / 2 + 13, z + L / 2 + 8, "#26272c", 11);
  I.block(x, z, 32);
  return 24;
};

export const brasserie: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const M = frame(x, y, z, 0);
  b.add(P.box(), TP(M, 0, 0.5, 0, 22, 1, 16), C.stone);
  b.add(P.box(), TP(M, 0, 3.6, -1, 16, 5.4, 10), "#f6ead6");
  // Red columns + front veranda
  for (let i = -3; i <= 3; i++) b.add(P.cyl(8), TP(M, i * 2.6, 3.4, 4.6, 0.55, 5.2, 0.55), p.color);
  b.add(P.box(), TP(M, 0, 6.3, 4.6, 18, 0.5, 1), p.color);
  // Tiered flared roofs
  b.add(P.frustum(0.45, 4), TP(M, 0, 7.6, 0.5, 26, 2.6, 17, Math.PI / 4), "#2f4f4f");
  b.add(P.box(), TP(M, 0, 9.4, 0.3, 10, 2.6, 7), "#f6ead6");
  b.add(P.frustum(0.35, 4), TP(M, 0, 11.4, 0.3, 15, 2.2, 10.5, Math.PI / 4), "#2f4f4f");
  b.add(P.cone(6), TP(M, 0, 13.4, 0.3, 1, 2.4, 1), C.gold);
  // Windows
  for (const wx of [-5, -1.7, 1.7, 5]) b.add(P.box(), TP(M, wx, 3.8, 4.05, 2, 2.4, 0.1), C.window, { emissive: 0.6 });
  // Lanterns along the eaves
  for (let i = -4; i <= 4; i++) {
    b.add(P.box(), TP(M, i * 2.4, 5.6, 6, 0.06, 0.8, 0.06), C.black);
    b.add(P.sphere(8, 6), TP(M, i * 2.4, 4.9, 6, 0.9, 1.1, 0.9), "#ff4b3e", { emissive: 0.9 });
  }
  // Courtyard tables with umbrellas
  for (const [tx, tz] of [[-8, 11], [-3, 12], [3, 12], [8, 11]] as const) {
    b.add(P.cyl(10), TP(M, tx, 1.75, tz, 2.2, 0.15, 2.2), C.white);
    b.add(P.cyl(5), TP(M, tx, 1.2, tz, 0.2, 1.2, 0.2), C.metalDark);
    b.add(P.cyl(5), TP(M, tx, 3, tz, 0.12, 2.6, 0.12), C.woodDark);
    b.add(P.cone(8), TP(M, tx, 4.5, tz, 4.2, 1.2, 4.2), (tx + tz) % 2 ? p.color : C.cream);
  }
  I.anchor("sign", x, y + 9.4, z + 3.82, { data: { lines: ["BAO BEI", "CHINESE BRASSERIE"], w: 8, h: 2.2, bg: p.color, fg: "#ffd98a", accent: "#ffd98a" } });
  I.box(x, y + 6, z - 0.5, 9, 7, 6);
  for (const [bx, bz] of [[-13, -6], [13, -6], [-12, 6], [12, 6]] as const) tree(I, x + bx, z + bz, "blossom", 1);
  I.block(x, z, 16);
  return 15;
};

export const salon: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const M = frame(x, y, z, 0);
  b.add(P.box(), TP(M, 0, 0.4, 0, 20, 0.8, 13), C.stone);
  b.add(P.box(), TP(M, 0, 5.4, -1, 17, 9.2, 9), C.white);
  b.add(P.box(), TP(M, 0, 10.3, -1, 18, 0.7, 10), p.color);
  b.add(P.box(), TP(M, 0, 11.1, -1, 16, 0.9, 8.4), C.cream);
  // Tall arched windows
  for (const wx of [-5.5, 0, 5.5]) {
    b.add(P.box(), TP(M, wx, 4.4, 3.52, 3, 5.2, 0.1), C.glass, { emissive: 0.25 });
    b.add(P.arch(10), TP(M, wx, 7, 3.52, 3, 0.1, 3, 0, Math.PI / 2), C.glass, { emissive: 0.25 });
    b.add(P.box(), TP(M, wx, 4.4, 3.58, 0.12, 5.2, 0.06), p.color);
  }
  // Striped awning
  for (let i = 0; i < 9; i++) b.add(P.box(), TP(M, -8 + i * 2, 8.4, 4.8, 2, 0.15, 2.6, 0, 0.35), i % 2 ? p.color : C.cream);
  // Mirror arch sculpture
  b.add(P.box(), TP(M, 0, 0.9, 10, 7, 1, 2), C.stone);
  b.add(P.torus(0.12, 6, 24, Math.PI), TP(M, 0, 1.4, 10, 5.2, 7, 2.4), p.color);
  b.add(P.box(), TP(M, 0, 3.3, 10, 4.6, 3.8, 0.15), "#cfe6ef", { emissive: 0.35 });
  // Topiary in planters
  for (const tx of [-9, -5, 5, 9]) {
    b.add(P.box(), TP(M, tx, 0.9, 6.5, 1.6, 1.2, 1.6), C.white);
    b.add(P.ico(1), TP(M, tx, 2.5, 6.5, 2, 2, 2), C.forest, { sway: 0.05, swayBase: y + 1.5, swayHeight: 2 });
  }
  I.anchor("sign", x, y + 9.3, z + 3.58, { data: { lines: ["LUMIÈRE"], w: 7, h: 1.4, bg: "#fbf6ec", fg: "#8a6410", accent: p.color, font: 72 } });
  I.anchor("spinner", x, y + 15, z - 1, { data: { kind: "ring", color: p.color, size: 3, speed: 0.6, tumble: 0.3, bob: 0.6 } });
  I.box(x, y + 5.5, z - 1, 9, 6, 5);
  I.block(x, z, 14);
  return 18;
};

export const garage: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const M = frame(x, y, z - 6, 0);
  b.add(P.box(), TP(M, 0, 0.2, 6, 30, 0.4, 26), C.asphaltLight);
  b.add(P.box(), TP(M, 0, 4.4, -2, 26, 8.8, 12), "#e9edf2");
  b.add(P.box(), TP(M, 0, 9.1, -2, 26.6, 0.6, 12.6), "#1d1e24");
  for (const dx of [-8, 0, 8]) {
    b.add(P.box(), TP(M, dx, 3.3, 4.05, 6.4, 6.4, 0.15), C.metalDark);
    for (let k = 0; k < 7; k++) b.add(P.box(), TP(M, dx, 0.6 + k * 0.9, 4.15, 6.2, 0.08, 0.05), C.metal);
  }
  b.add(P.box(), TP(M, 0, 7.6, 4.1, 26, 0.5, 0.1), p.color, { emissive: 0.3 });
  // Spray booth + tyre stacks + tool chests
  b.add(P.box(), TP(M, -16.5, 3.2, -2, 7, 6.4, 9), C.white);
  for (let k = 0; k < 3; k++) b.add(P.box(), TP(M, -16.5, 6.6, -5 + k * 3, 2, 0.6, 1.2), C.metal);
  for (const [tx, tz] of [[13, 8], [14.6, 9.4], [13.4, 10.8]] as const)
    for (let k = 0; k < 4; k++) b.add(P.torus(0.3, 6, 12), TP(M, tx, 0.35 + k * 0.62, tz, 1.5, 1.5, 1.6, 0, Math.PI / 2), "#26272c");
  b.add(P.box(), TP(M, 11, 1.2, 3, 2.4, 2.4, 1.2), C.red);
  b.add(P.box(), TP(M, 11, 2.5, 3, 2.5, 0.2, 1.3), C.metal);
  I.anchor("turntable", x, y + 0.4, z + 7, { s: 1.1, data: { colors: [p.color, C.coral, C.turquoise], glow: "#7fd8ff" } });
  I.anchor("sign", x, y + 11.2, z - 7.8, { data: { lines: ["AK WRAPS & CUSTOMS"], w: 16, h: 2.4, bg: "#141519", fg: "#ffffff", accent: p.color, font: 52 } });
  b.add(P.box(), TP(M, 0, 11.2, -1.9, 16.4, 2.8, 0.3), "#141519");
  I.box(x, y + 4.5, z - 8, 13.5, 4.8, 6.3);
  I.box(x - 16.5, y + 3.2, z - 8, 3.5, 3.2, 4.5);
  streetlight(I, x - 12, z + 10, 0);
  streetlight(I, x + 12, z + 10, Math.PI);
  I.block(x, z, 18);
  return 13;
};

// ── Systems ─────────────────────────────────────────────────────────────────
export const cpu: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const S = 30;
  b.add(P.box(), T(x, y + 1.5, z, S, 3, S), "#1b2230");
  for (let i = 0; i < 12; i++) {
    const o = -S / 2 + 2 + (i * (S - 4)) / 11;
    for (const s of [-1, 1]) {
      b.add(P.box(), T(x + o, y + 0.6, z + s * (S / 2 + 1), 0.9, 0.5, 2.2), C.gold);
      b.add(P.box(), T(x + s * (S / 2 + 1), y + 0.6, z + o, 2.2, 0.5, 0.9), C.gold);
    }
  }
  b.add(P.box(), T(x, y + 3.4, z, S - 8, 0.8, S - 8), "#c4ccd6");
  I.anchor("sign", x - 6, y + 3.86, z + 6, { ry: 0, data: { lines: ["RISC-V", "rv32i · custom SLT"], w: 9, h: 4, bg: "#c4ccd6", fg: "#1b2230", accent: p.color, rx: -Math.PI / 2 } });
  // Five pipeline stages on the lid
  const stages = ["IF", "ID", "EX", "MEM", "WB"];
  const cols = ["#5b6cff", "#3fb8af", p.color, "#e6b64c", "#f2735a"];
  stages.forEach((s, i) => {
    const sx = x - 8 + i * 4;
    b.add(P.box(), T(sx, y + 5.6, z - 5, 3, 3.6, 3), cols[i]);
    b.add(P.box(), T(sx, y + 5.6, z - 3.46, 2.4, 1, 0.1), C.white, { emissive: 0.4 });
    I.anchor("sign", sx, y + 8.2, z - 5, { data: { lines: [s], w: 2.6, h: 1.1, bg: "#1b2230", fg: "#ffffff", font: 70, style: "screen", doubleSided: true } });
  });
  I.anchor("pulses", 0, 0, 0, {
    data: { points: [I.w(x - 11, y + 5.6, z - 5), I.w(x - 8, y + 5.6, z - 5), I.w(x, y + 5.6, z - 5), I.w(x + 8, y + 5.6, z - 5), I.w(x + 11, y + 5.6, z - 5)], color: "#9fe3ff", count: 5, speed: 0.22, size: 0.8 },
  });
  // Circuit traces radiating across the island.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.2;
    const len = 18 + (k % 3) * 8;
    const cx = x + Math.cos(a) * (S / 2 + 2 + len / 2);
    const cz = z + Math.sin(a) * (S / 2 + 2 + len / 2);
    b.add(P.box(), T(cx, I.h(cx, cz) + 0.12, cz, 0.6, 0.15, len, Math.PI / 2 - a), p.color, { emissive: 0.5 });
  }
  I.box(x, y + 2, z, S / 2 + 1, 2.5, S / 2 + 1);
  I.box(x, y + 6, z - 5, 11, 2, 2);
  I.block(x, z, S * 0.8);
  return 10;
};

export const terminal: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const M = frame(x, y, z, 0.3);
  b.add(P.box(), TP(M, 0, 0.5, 0, 20, 1, 6), C.stoneDark);
  b.add(P.box(), TP(M, 0, 8, 0, 18, 14, 2.4), "#2a2c33");
  b.add(P.box(), TP(M, 0, 8.4, 1.15, 16, 11, 0.1), "#0e1a12");
  const [dx, dz] = rot(0, 1.25, 0.3);
  I.anchor("sign", x + dx, y + 8.4, z + dz, {
    ry: 0.3,
    data: { lines: ["$ ls -li ./project", "1048  drwxr-xr-x  src/", "1052  -rw-r--r--  main.c", "1077  -rwxr-xr-x  ls", "$ █"], w: 15.4, h: 10.4, bg: "#0e1a12", fg: "#7dffb0", style: "screen" },
  });
  // Directory tree: folders on terraces linked by beams.
  const folder = (fx: number, fy: number, fz: number, s: number, col: string) => {
    b.add(P.box(), T(fx, fy + s * 0.55, fz, s * 2.2, s * 1.4, s * 1.6), col);
    b.add(P.box(), T(fx - s * 0.5, fy + s * 1.35, fz, s * 0.9, s * 0.3, s * 1.6), col);
  };
  const root: [number, number, number] = [x - 4, y + 14.5, z - 9];
  folder(root[0], y, root[2], 2.4, "#e6b64c");
  b.add(P.box(), T(root[0], y + 6, root[2], 0.5, 12, 0.5), C.metalDark);
  const kids: [number, number][] = [[-12, -16], [3, -18], [10, -12]];
  kids.forEach(([kx, kz], i) => {
    const fx = x + kx;
    const fz = z + kz;
    folder(fx, I.h(fx, fz), fz, 1.6, i === 1 ? p.color : "#d9a520");
    const mx = (fx + root[0]) / 2;
    const mz = (fz + root[2]) / 2;
    b.add(P.box(), T(mx, I.h(mx, mz) + 0.3, mz, 0.4, 0.3, Math.hypot(fx - root[0], fz - root[2]), Math.atan2(fx - root[0], fz - root[2])), C.metalDark);
  });
  // Big keycaps as stepping stones.
  "LS".split("").forEach((_, i) => {
    const kx = x + 10 + i * 4.5;
    const kz = z + 8;
    b.add(P.frustum(0.82, 4), T(kx, I.h(kx, kz) + 1, kz, 4.2, 2, 4.2, Math.PI / 4), C.cream);
  });
  I.box(x, y + 8, z, 9, 7, 1.6, 0.3);
  I.block(x, z, 14);
  return 16;
};

export const cache: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const levels = [
    { r: 9, h: 8, c: "#3d4cc4", n: "L3" },
    { r: 6.8, h: 7, c: "#5b6cff", n: "L2" },
    { r: 4.6, h: 6, c: "#8f9cff", n: "L1" },
  ];
  let yy = y;
  levels.forEach((l) => {
    b.add(P.cyl(16), T(x, yy + l.h / 2, z, l.r * 2, l.h, l.r * 2), l.c);
    b.add(P.cyl(16), T(x, yy + l.h - 0.6, z, l.r * 2 + 0.3, 0.4, l.r * 2 + 0.3), C.white, { emissive: 0.8 });
    I.anchor("sign", x, yy + l.h / 2, z + l.r + 0.05, { data: { lines: [l.n], w: 3, h: 2, bg: l.c, fg: "#ffffff", font: 80, style: "screen" } });
    I.cyl(x, z, yy, yy + l.h, l.r);
    yy += l.h;
  });
  b.add(P.cone(16), T(x, yy + 1.5, z, 6, 3, 6), C.white);
  // RAM hall with DIMM sticks
  const rx = x + 18;
  const rz = z + 4;
  b.add(P.box(), T(rx, I.h(rx, rz) + 2.5, rz, 12, 5, 16), "#e3e6ee");
  for (let k = 0; k < 6; k++) {
    b.add(P.box(), T(rx - 3.5 + k * 1.4, I.h(rx, rz) + 6.2, rz, 0.4, 2.4, 12), "#2f7d4f");
    b.add(P.box(), T(rx - 3.5 + k * 1.4, I.h(rx, rz) + 5.1, rz, 0.45, 0.3, 12), C.gold);
  }
  I.anchor("sign", rx - 6.05, I.h(rx, rz) + 2.6, rz, { ry: -Math.PI / 2, data: { lines: ["RAM"], w: 4, h: 2, bg: "#1f3552", fg: "#ffffff", font: 70 } });
  I.box(rx, I.h(rx, rz) + 4, rz, 6, 4, 8);
  I.anchor("pulses", 0, 0, 0, {
    data: { points: [I.w(rx - 6, y + 6, rz), I.w(x + 9, y + 4, z + 1), I.w(x + 7, y + 11, z), I.w(x + 4.8, y + 18, z), I.w(x, y + 22.5, z)], color: "#c7ccff", count: 6, speed: 0.18, size: 0.9 },
  });
  plaque(I, x - 13, z + 10, 0.4, ["LRU", "least recently used"], "#f2735a", 5, 2);
  plaque(I, x - 6, z + 14, 0.1, ["LFU", "least frequently used"], "#e6b64c", 5, 2);
  I.block(x, z, 16);
  return yy - y + 3;
};

export const threads: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  // Padlock gate (mutex)
  b.add(P.box(), T(x, y + 4.5, z, 7, 8, 3), C.gold);
  b.add(P.torus(0.16, 8, 20, Math.PI), T(x, y + 8.5, z, 5.2, 6, 3), C.metal);
  b.add(P.cyl(10), T(x, y + 4.6, z + 1.55, 1.2, 0.2, 1.2, 0, Math.PI / 2), "#26272c");
  b.add(P.box(), T(x, y + 3.6, z + 1.55, 0.5, 1.6, 0.2), "#26272c");
  I.box(x, y + 6, z, 3.6, 6, 1.6);
  // Three thread pylons converging on the lock.
  const pylons: [number, number][] = [[-16, -12], [0, -19], [16, -12]];
  const cols = ["#5b6cff", "#3fb8af", "#e6b64c"];
  pylons.forEach(([px, pz], i) => {
    const fx = x + px;
    const fz = z + pz;
    const fy = I.h(fx, fz);
    b.add(P.frustum(0.55, 6), T(fx, fy + 9, fz, 2.4, 18, 2.4), C.white);
    b.add(P.box(), T(fx, fy + 18.4, fz, 3.4, 1, 3.4), cols[i], { emissive: 0.5 });
    I.cyl(fx, fz, fy, fy + 19, 1.6);
    I.anchor("pulses", 0, 0, 0, { data: { points: [I.w(fx, fy + 18, fz), I.w((fx + x) / 2, y + 14, (fz + z) / 2), I.w(x, y + 9, z - 1)], color: cols[i], count: 3, speed: 0.25 + i * 0.04, size: 0.7 } });
  });
  // Shared-data vault behind the lock.
  b.add(P.box(), T(x, y + 3.5, z + 11, 12, 7, 8), "#e3e6ee");
  b.add(P.cyl(16), T(x, y + 3.6, z + 6.9, 4.6, 0.4, 4.6, 0, Math.PI / 2), C.metal);
  I.anchor("sign", x, y + 8.3, z + 15.05, { data: { lines: ["SHARED DATA"], w: 8, h: 1.4, bg: "#1f3552", fg: "#fff", font: 60 } });
  I.box(x, y + 3.5, z + 11, 6, 3.5, 4);
  I.anchor("pulses", 0, 0, 0, { data: { points: [I.w(x, y + 5, z + 1.5), I.w(x, y + 5, z + 7)], color: p.color, count: 2, speed: 0.4, size: 0.6 } });
  I.block(x, z, 18);
  return 20;
};

export const processBuilding = (I: Isl, x: number, z: number, label: string, color: string) => {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.box(), T(x, y + 6, z, 10, 12, 10), "#eef0f4");
  for (let f = 0; f < 4; f++) b.add(P.box(), T(x, y + 2.5 + f * 2.7, z + 5.02, 8.4, 1.2, 0.1), C.windowCool, { emissive: 0.45 });
  b.add(P.box(), T(x, y + 12.4, z, 10.6, 0.8, 10.6), color);
  I.anchor("sign", x, y + 14.6, z, { data: { lines: [label], w: 9, h: 2.6, bg: color, fg: "#fff", font: 70, doubleSided: true } });
  I.box(x, y + 6.5, z, 5.2, 6.5, 5.2);
};

// ── Early web work ──────────────────────────────────────────────────────────
export const racetrack: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const rx = 22;
  const rz = 13;
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const x0 = x + Math.cos(a0) * rx;
    const z0 = z + Math.sin(a0) * rz;
    const x1 = x + Math.cos(a1) * rx;
    const z1 = z + Math.sin(a1) * rz;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(x1 - x0, z1 - z0);
    b.add(P.box(), T((x0 + x1) / 2, y + 0.18, (z0 + z1) / 2, 6, 0.3, len + 0.4, ry), C.asphalt);
    // Curbs outside and inside
    for (const k of [1.0, -1.0]) {
      const ox = Math.cos(ry) * 3.2 * k;
      const oz = -Math.sin(ry) * 3.2 * k;
      b.add(P.box(), T((x0 + x1) / 2 + ox, y + 0.3, (z0 + z1) / 2 + oz, 0.6, 0.25, len + 0.3, ry), i % 2 ? C.red : C.white);
    }
  }
  // Start/finish gantry
  b.add(P.box(), T(x + rx, y + 0.34, z, 6, 0.05, 1.2), C.white);
  for (let k = 0; k < 6; k++) b.add(P.box(), T(x + rx - 2.5 + k, y + 0.36, z + ((k % 2) * 2 - 1) * 0.3, 1, 0.05, 0.6), "#1d1e24");
  for (const s of [-1, 1]) b.add(P.box(), T(x + rx + s * 4, y + 3.5, z, 0.5, 7, 0.5), C.metalDark);
  b.add(P.box(), T(x + rx, y + 7, z, 9, 1.4, 0.6), "#1d1e24");
  I.anchor("sign", x + rx, y + 7, z + 0.32, { ry: 0, data: { lines: ["START · FINISH"], w: 8.4, h: 1.2, bg: "#1d1e24", fg: "#ffffff", font: 70, doubleSided: true } });
  // Infield pit garage + grandstand
  b.add(P.box(), T(x, y + 2, z, 16, 4, 6), C.white);
  b.add(P.box(), T(x, y + 4.3, z, 17, 0.6, 7), p.color);
  for (let k = -3; k <= 3; k++) b.add(P.box(), T(x + k * 2.2, y + 1.6, z + 3.05, 1.8, 2.6, 0.1), C.metalDark);
  for (let k = 0; k < 4; k++) b.add(P.box(), T(x, y + 0.7 + k * 1.1, z - rz - 6.5 - k * 1.4, 30, 1.4 + k * 2.2, 1.6), k % 2 ? C.cream : p.color);
  I.box(x, y + 3, z - rz - 8.5, 15, 3, 3);
  I.box(x, y + 2.3, z, 8, 2.4, 3);
  I.anchor("orbitCar", x, y + 0.35, z, { s: 0.75, data: { rx, rz, speed: 0.55, color: p.color } });
  I.anchor("orbitCar", x, y + 0.35, z, { s: 0.75, data: { rx, rz, speed: 0.55, phase: 2.6, color: "#f4cf4a" } });
  flagpole(I, x - rx - 6, z + 6, "#1d1e24", 9);
  I.block(x, z, 28);
  return 9;
};

export const bikeshop: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  const M = frame(x, y, z - 6, 0);
  b.add(P.box(), TP(M, 0, 3.4, 0, 14, 6.8, 9), "#f6ead6");
  b.add(P.prism(), TP(M, 0, 8.4, 0, 9.8, 3.2, 15, Math.PI / 2), C.roofSlate);
  for (let i = 0; i < 8; i++) b.add(P.box(), TP(M, -6.1 + i * 1.75, 5.6, 5.5, 1.75, 0.15, 2.4, 0, 0.4), i % 2 ? p.color : C.white);
  b.add(P.box(), TP(M, 0, 2.2, 4.55, 4, 4.4, 0.1), C.window, { emissive: 0.4 });
  b.add(P.box(), TP(M, -4.5, 3, 4.55, 3, 2.6, 0.1), C.window, { emissive: 0.4 });
  // Tool wall
  b.add(P.box(), TP(M, 5, 3, 4.6, 3.4, 3.4, 0.1), C.woodLight);
  for (let k = 0; k < 5; k++) b.add(P.box(), TP(M, 3.8 + k * 0.6, 3.2, 4.7, 0.15, 1.4 + (k % 2) * 0.6, 0.1), C.metalDark);
  I.anchor("sign", x, y + 7.6, z - 1.4, { data: { lines: ["ROAR CYCLE", "mobile bike repair"], w: 8, h: 1.9, bg: "#1f3552", fg: "#fff", accent: p.color } });
  I.box(x, y + 4.5, z - 6, 7, 5, 4.6);
  // Giant bicycle sculpture on a plinth
  const bx = x;
  const bz = z + 10;
  const by = I.h(bx, bz);
  b.add(P.box(), T(bx, by + 0.6, bz, 18, 1.2, 4), C.stone);
  const wy = by + 1.2 + 4.2;
  I.anchor("wheel", bx - 5.5, wy, bz, { ry: Math.PI / 2, data: { r: 4, speed: 1.2 } });
  I.anchor("wheel", bx + 5.5, wy, bz, { ry: Math.PI / 2, data: { r: 4, speed: 1.2 } });
  const tube = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    b.add(P.cyl(6), T((x0 + x1) / 2, (y0 + y1) / 2, bz, 0.5, len, 0.5, 0, 0, Math.atan2(x0 - x1, y1 - y0)), p.color);
  };
  tube(bx - 5.5, wy, bx - 1, wy + 5); // seat stay
  tube(bx - 5.5, wy, bx, wy); // chain stay
  tube(bx, wy, bx - 1, wy + 5); // seat tube
  tube(bx - 1, wy + 5, bx + 4, wy + 5); // top tube
  tube(bx, wy, bx + 4, wy + 5); // down tube
  tube(bx + 4, wy + 5, bx + 5.5, wy); // fork
  b.add(P.box(), T(bx - 1.2, wy + 5.8, bz, 2.2, 0.5, 1), "#26272c");
  b.add(P.box(), T(bx + 4.3, wy + 6.2, bz, 0.4, 0.4, 3), C.metalDark);
  b.add(P.torus(0.15, 6, 16), T(bx, wy, bz, 2, 2, 1), C.metal);
  I.box(bx, by + 5, bz, 9, 5, 1.5);
  for (let k = 0; k < 4; k++) b.add(P.torus(0.06, 4, 12, Math.PI), T(x - 9 + k * 1.4, I.h(x - 9, z + 2) + 0.2, z + 2, 1.2, 1.4, 1), C.metal);
  I.block(x, z, 14);
  return 15;
};

export const studio: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.box(), T(x, y + 4.5, z - 6, 14, 9, 10), C.glass, { emissive: 0.15 });
  for (let k = -3; k <= 3; k++) b.add(P.box(), T(x + k * 2, y + 4.5, z - 0.95, 0.25, 9, 0.2), C.white);
  b.add(P.box(), T(x, y + 9.3, z - 6, 15, 0.6, 11), C.white);
  I.anchor("sign", x, y + 10.6, z - 0.9, { data: { lines: ["LOGO STUDIO"], w: 9, h: 1.6, bg: "#fbf6ec", fg: p.color, font: 64 } });
  I.box(x, y + 5, z - 6, 7, 5, 5);
  // Giant pencil leaning on a pedestal
  const px = x + 12;
  const pz = z + 3;
  const py = I.h(px, pz);
  b.add(P.cyl(6), T(px, py + 7, pz, 1.6, 12, 1.6, 0, 0, 0.35), C.yellow);
  b.add(P.cone(6), T(px + Math.sin(0.35) * 7.2, py + 7 - Math.cos(0.35) * 7.2, pz, 1.6, 2.4, 1.6, 0, 0, Math.PI + 0.35), "#e8c9a0");
  b.add(P.cyl(6), T(px - Math.sin(0.35) * 6.3, py + 7 + Math.cos(0.35) * 6.3, pz, 1.65, 1, 1.65, 0, 0, 0.35), "#f2a7b8");
  I.cyl(px, pz, py, py + 12, 1.6);
  // Geometric sculptures on pedestals
  const sculptures: [number, number, string, string][] = [
    [-10, 8, "cube", p.color],
    [-3, 12, "sphere", "#3fb8af"],
    [4, 10, "knot", "#e6b64c"],
  ];
  sculptures.forEach(([sx, sz, kind, color]) => {
    const tx = x + sx;
    const tz = z + sz;
    const ty = I.h(tx, tz);
    b.add(P.cyl(8), T(tx, ty + 1.5, tz, 3.2, 3, 3.2), C.white);
    I.anchor("spinner", tx, ty + 5.4, tz, { data: { kind, color, size: 1.6, speed: 0.5, tumble: kind === "cube" ? 0.3 : 0, bob: 0.3 } });
    I.cyl(tx, tz, ty, ty + 7, 2);
  });
  // Colour-swatch pillars
  ["#f2735a", "#e6b64c", "#3fb8af", "#5b6cff", p.color].forEach((c, i) => {
    const sx = x - 12 + i * 2.2;
    const sz = z - 2;
    b.add(P.box(), T(sx, I.h(sx, sz) + 1.5 + i * 0.4, sz, 1.8, 3 + i * 0.8, 1.8), c);
  });
  I.block(x, z, 16);
  return 12;
};

// ── Data ────────────────────────────────────────────────────────────────────
export const observatory: Landmark = (I, x, z, p) => {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.cyl(16), T(x, y + 3.5, z, 13, 7, 13), "#ece6da");
  b.add(P.cyl(16), T(x, y + 7.2, z, 13.6, 0.5, 13.6), p.color);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    b.add(P.box(), T(x + Math.cos(a) * 6.55, y + 3.6, z + Math.sin(a) * 6.55, 1.4, 2.4, 0.2, Math.PI / 2 - a), C.window, { emissive: 0.5 });
  }
  I.anchor("dome", x, y + 7.4, z, { s: 1.05 });
  I.cyl(x, z, y, y + 14, 7);
  // Map table with GPS pins and a smoothed track.
  const mx = x + 17;
  const mz = z + 5;
  const my = I.h(mx, mz);
  b.add(P.cyl(24), T(mx, my + 0.8, mz, 18, 1.6, 18), "#f6ecd9");
  const patches: [number, number, number, string][] = [
    [-3, -2, 5, "#b9d98a"],
    [3, 2, 4, "#a8d0e6"],
    [2, -4, 3, "#e6d3a8"],
    [-4, 3, 3.5, "#c8e0b0"],
  ];
  patches.forEach(([dx, dz, r, c]) => b.add(P.cyl(10), T(mx + dx, my + 1.65, mz + dz, r * 2, 0.1, r * 1.7), c));
  const pins: [number, number][] = [[-5, -3], [-1, 4], [4, -1], [2, 5], [6, 3], [-3, -6]];
  pins.forEach(([dx, dz], i) => {
    b.add(P.cone(8), T(mx + dx, my + 2.4, mz + dz, 0.6, 1.5, 0.6, 0, Math.PI), i % 2 ? "#f2735a" : p.color);
    b.add(P.sphere(8, 6), T(mx + dx, my + 3.4, mz + dz, 1, 1, 1), i % 2 ? "#f2735a" : p.color, { emissive: 0.5 });
  });
  I.anchor("pulses", 0, 0, 0, {
    data: { points: pins.map(([dx, dz]) => I.w(mx + dx, my + 1.9, mz + dz)), color: "#ffcf70", count: 8, speed: 0.08, size: 0.4 },
  });
  I.cyl(mx, mz, my, my + 3, 9);
  // Radio dish
  const dx = x - 14;
  const dz = z + 8;
  const dy = I.h(dx, dz);
  b.add(P.frustum(0.5, 6), T(dx, dy + 3, dz, 2, 6, 2), C.white);
  I.anchor("dish", dx, dy + 6.6, dz, { s: 1.6 });
  I.cyl(dx, dz, dy, dy + 9, 2.5);
  plaque(I, x + 4, z - 12, Math.PI, ["AMENITY RECOMMENDER", "OSM + GPX · Kalman · Pandas"], p.color, 9, 2.2);
  I.block(x, z, 16);
  return 16;
};

export const LANDMARKS: Record<Project["landmark"], Landmark> = {
  stadium,
  brasserie,
  salon,
  garage,
  cpu,
  terminal,
  cache,
  threads,
  ipc: (I, x, z, p) => {
    processBuilding(I, x, z, "PROCESS A", p.color);
    return 16;
  },
  racetrack,
  bikeshop,
  studio,
  observatory,
};

export { W, plaque, bench, crate, fence, bush, flowers };
