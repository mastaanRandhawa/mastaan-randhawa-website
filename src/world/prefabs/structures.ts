import { Matrix4 } from "three";
import { P, T, TP, type MeshBuilder } from "@/render/geometry/MeshBuilder";
import type { Isl, RegionKit } from "../regionKit";
import type { LandingSite } from "../defs";
import type { Pad } from "../terrain";
import { C } from "../palette";
import { SEA_LEVEL } from "../layout";
import { house, type HouseOpts, framedWindow, faces } from "./architecture";

/** Local building frame at (x, y, z) rotated by ry. */
export function frame(x: number, y: number, z: number, ry = 0): Matrix4 {
  return T(x, y, z, 1, 1, 1, ry).clone();
}

/** Rotate a local offset by ry (for colliders / anchors). */
export function rot(dx: number, dz: number, ry: number): [number, number] {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return [dx * c + dz * s, -dx * s + dz * c];
}

function windowsRow(b: MeshBuilder, M: Matrix4, y: number, z: number, xs: number[], size = 0.9, color: string = C.window) {
  for (const x of xs) {
    b.add(P.box(), TP(M, x, y, z, size * 1.2, size * 1.2, 0.06), C.white);
    b.add(P.box(), TP(M, x, y, z + Math.sign(z) * 0.04, size, size, 0.06), color, { emissive: 0.55 });
  }
}

export type CottageOpts = HouseOpts;

/** Storybook cottage (see architecture.house). */
export function cottage(I: Isl, x: number, z: number, ry = 0, o: CottageOpts = {}) {
  house(I, x, z, ry, o);
}

export function hangar(I: Isl, x: number, z: number, ry = 0, o: { w?: number; d?: number; h?: number; sign?: string[] } = {}) {
  const w = o.w ?? 22;
  const d = o.d ?? 20;
  const h = o.h ?? 10;
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  const b = I.b;
  b.add(P.box(), TP(M, 0, 0.2, 0, w + 2, 0.4, d + 2), C.concrete);
  b.add(P.box(), TP(M, 0, 1.6, 0, w, 3.2, d), C.cream);
  b.add(P.arch(16), TP(M, 0, 3.2, 0, w, d, h * 1.15, 0, -Math.PI / 2), C.roofTeal);
  // Ribs
  for (let i = -2; i <= 2; i++) b.add(P.torus(0.06, 4, 18, Math.PI), TP(M, 0, 3.2, (i * d) / 5, w * 1.01, h * 1.15 * 1.01 * 1, 1), C.metal);
  // Door + stripes (front faces +Z)
  b.add(P.box(), TP(M, 0, 3.6, d / 2 + 0.1, w * 0.72, 6.8, 0.3), C.metalDark);
  for (let i = -3; i <= 3; i++) b.add(P.box(), TP(M, (i * w * 0.72) / 7, 3.6, d / 2 + 0.28, 0.12, 6.6, 0.06), C.metal);
  b.add(P.box(), TP(M, 0, 7.4, d / 2 + 0.2, w * 0.76, 0.7, 0.3), C.coral);
  // Clerestory windows along both sides.
  for (const fc of faces(M, w, d)) {
    if (fc.k % 2 === 0) continue;
    for (let i = -3; i <= 3; i++) framedWindow(b, fc.F, (i * d) / 8, 2.1, { w: 1.5, h: 1, lit: (i + fc.k) % 3 !== 0, frame: C.white, sill: C.metal });
  }
  // Two-storey office annex with a flat roof on the left flank.
  const ax = -w / 2 - 3.2;
  b.add(P.box(), TP(M, ax, 0.25, d * 0.18, 6.8, 0.5, 9.4), C.concrete);
  b.add(P.box(), TP(M, ax, 3.3, d * 0.18, 6, 6, 8.6), C.cream);
  b.add(P.box(), TP(M, ax, 6.45, d * 0.18, 6.5, 0.3, 9.1), C.roofTeal);
  b.add(P.box(), TP(M, ax, 3.2, d * 0.18, 6.08, 0.22, 8.68), C.roofTeal);
  const AM = TP(M, ax, 0.3, d * 0.18).clone();
  for (const fc of faces(AM, 6, 8.6)) {
    if (fc.k === 1) continue;
    const us = fc.width > 7 ? [-2.6, 0, 2.6] : [-1.5, 1.5];
    for (const fy of [1.6, 4.6]) for (const u of us) framedWindow(b, fc.F, u, fy, { w: 1.1, h: 1.1, lit: (u + fy + fc.k) % 2 > 0.5, frame: C.white, sill: C.roofTeal });
  }
  {
    const [awx, awz] = rot(ax, d * 0.18, ry);
    I.box(x + awx, y + 3.3, z + awz, 3.4, 3.5, 4.7, ry);
    I.block(x + awx, z + awz, 6.5);
  }
  // Skylights along the barrel roof crown.
  for (let i = -1; i <= 1; i++) b.add(P.box(), TP(M, 0, 3.2 + h * 1.15 * 0.5 + 0.1, (i * d) / 3, 2.4, 0.3, 1.4), C.windowCool, { emissive: 0.15 });
  if (o.sign) {
    const [sx, sz] = rot(0, d / 2 + 0.6, ry);
    I.anchor("sign", x + sx, y + h * 1.15 * 0.5 + 3.5, z + sz, { ry, data: { lines: o.sign, w: w * 0.5, h: 2.6, bg: "#fbf8f2", fg: "#1f3552", accent: C.coral } });
  }
  I.box(x, y + (3.2 + h * 0.575) / 2, z, w / 2, (3.2 + h * 0.575) / 2 + 0.5, d / 2, ry);
  I.block(x, z, Math.max(w, d) * 0.72);
}

export function controlTower(I: Isl, x: number, z: number, ry = 0, height = 16) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  const b = I.b;
  b.add(P.box(), TP(M, 0, 1.6, 0, 7, 3.2, 7), C.cream);
  b.add(P.box(), TP(M, 0, 3.3, 0, 7.4, 0.3, 7.4), C.coral);
  windowsRow(b, M, 1.8, 3.52, [-2, 0, 2]);
  b.add(P.cyl(10), TP(M, 0, 3.2 + height / 2, 0, 3.2, height, 3.2), C.white);
  for (let i = 1; i < 4; i++) b.add(P.cyl(10), TP(M, 0, 3.2 + (height * i) / 4, 0, 3.35, 0.35, 3.35), C.coral);
  const cy = 3.2 + height;
  b.add(P.cyl(10), TP(M, 0, cy + 0.3, 0, 7.6, 0.6, 7.6), C.metalDark);
  b.add(P.frustum(1.22, 10), TP(M, 0, cy + 1.9, 0, 6.2, 2.6, 6.2), C.windowCool, { emissive: 0.35 });
  b.add(P.cyl(10), TP(M, 0, cy + 3.3, 0, 8, 0.4, 8), C.white);
  b.add(P.frustum(0.5, 10), TP(M, 0, cy + 3.9, 0, 6.6, 1, 6.6), C.coral);
  b.add(P.cyl(5), TP(M, 0, cy + 6, 0, 0.18, 3.6, 0.18), C.metalDark);
  I.anchor("radar", x, y + cy + 4.6, z, { s: 1.2 });
  I.anchor("beacon", x, y + cy + 7.9, z, { data: { color: "#ff4b3e" } });
  I.cyl(x, z, y, y + cy + 4.5, 4.2);
  I.block(x, z, 6);
}

export function runway(I: Isl, x: number, z: number, length: number, width: number, ry = 0) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  const b = I.b;
  b.add(P.box(), TP(M, 0, 0.12, 0, width + 3, 0.24, length + 3), C.concreteDark);
  b.add(P.box(), TP(M, 0, 0.22, 0, width, 0.24, length), C.asphalt);
  // Centre-line dashes
  for (let zz = -length / 2 + 18; zz < length / 2 - 18; zz += 9) b.add(P.box(), TP(M, 0, 0.36, zz, 0.45, 0.04, 4.5), C.white);
  // Threshold piano keys
  for (const end of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      b.add(P.box(), TP(M, (i * width) / 8, 0.36, end * (length / 2 - 4), width / 12, 0.04, 6), C.white);
    }
    b.add(P.box(), TP(M, 0, 0.36, end * (length / 2 - 10), width * 0.9, 0.04, 0.6), C.white);
  }
  // Edge lights
  for (let zz = -length / 2; zz <= length / 2; zz += 10) {
    for (const sx of [-1, 1]) {
      const end = Math.abs(zz) > length / 2 - 2;
      b.add(P.cyl(8), TP(M, (sx * (width + 1.6)) / 2, 0.3, zz, 0.6, 0.24, 0.6), C.metalDark);
      b.add(P.cyl(8), TP(M, (sx * (width + 1.6)) / 2, 0.5, zz, 0.42, 0.2, 0.42), end ? "#ff8a6a" : C.window, { emissive: 0.45 });
    }
  }
}

export function windsock(I: Isl, x: number, z: number) {
  const y = I.h(x, z);
  I.b.add(P.cyl(6), T(x, y + 3.5, z, 0.22, 7, 0.22), C.white);
  I.b.add(P.cyl(6), T(x, y + 0.2, z, 1, 0.4, 1), C.concreteDark);
  I.anchor("windsock", x, y + 6.8, z);
  I.block(x, z, 1.5);
}

export function fence(I: Isl, x0: number, z0: number, x1: number, z1: number, spacing = 2.6, color: string = C.woodLight) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / spacing));
  const ry = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const y = I.h(x, z);
    I.b.add(P.box(), T(x, y + 0.6, z, 0.22, 1.2, 0.22), color);
    if (i < n) {
      const xm = x0 + (x1 - x0) * (t + 0.5 / n);
      const zm = z0 + (z1 - z0) * (t + 0.5 / n);
      const ym = I.h(xm, zm);
      I.b.add(P.box(), T(xm, ym + 0.85, zm, 0.1, 0.12, len / n, ry), color);
      I.b.add(P.box(), T(xm, ym + 0.45, zm, 0.1, 0.12, len / n, ry), color);
    }
  }
}

export function crate(I: Isl, x: number, z: number, s = 1.2, ry = 0, stack = 1) {
  const y = I.h(x, z);
  for (let i = 0; i < stack; i++) {
    I.b.add(P.box(), T(x, y + s / 2 + i * s, z, s, s, s, ry + i * 0.3), i % 2 ? C.woodLight : C.wood);
    I.b.add(P.box(), T(x, y + s / 2 + i * s, z, s * 1.02, s * 0.15, s * 1.02, ry + i * 0.3), C.woodDark);
  }
}

export function barrel(I: Isl, x: number, z: number, color: string = C.coral) {
  const y = I.h(x, z);
  I.b.add(P.cyl(10), T(x, y + 0.7, z, 1, 1.4, 1), color);
  I.b.add(P.cyl(10), T(x, y + 0.7, z, 1.04, 0.12, 1.04), C.metalDark);
}

export function streetlight(I: Isl, x: number, z: number, ry = 0, h = 5) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  I.b.add(P.cyl(6), TP(M, 0, h / 2, 0, 0.22, h, 0.22), C.metalDark);
  I.b.add(P.box(), TP(M, 0.5, h, 0, 1.2, 0.15, 0.15), C.metalDark);
  I.b.add(P.box(), TP(M, 1, h - 0.2, 0, 0.6, 0.3, 0.45), C.window, { emissive: 1 });
}

export function bench(I: Isl, x: number, z: number, ry = 0) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  I.b.add(P.box(), TP(M, 0, 0.55, 0, 2.2, 0.15, 0.7), C.wood);
  I.b.add(P.box(), TP(M, 0, 1, -0.32, 2.2, 0.6, 0.12), C.wood);
  for (const sx of [-0.9, 0.9]) I.b.add(P.box(), TP(M, sx, 0.27, 0, 0.12, 0.55, 0.6), C.metalDark);
}

export function flagpole(I: Isl, x: number, z: number, color: string, h = 9) {
  const y = I.h(x, z);
  I.b.add(P.cyl(6), T(x, y + h / 2, z, 0.2, h, 0.2), C.white);
  I.b.add(P.ico(0), T(x, y + h + 0.15, z, 0.4, 0.4, 0.4), C.gold);
  I.anchor("flag", x, y + h - 1, z, { data: { color } });
}

export function windmill(I: Isl, x: number, z: number, ry = 0, s = 1, y = I.h(x, z), plinth = 0) {
  const M = frame(x, y, z, ry);
  const b = I.b;
  b.add(P.cyl(8), TP(M, 0, (0.8 * s - plinth) / 2, 0, 7 * s, 0.8 * s + plinth, 7 * s), C.stoneDark);
  b.add(P.frustum(0.62, 8), TP(M, 0, 5.4 * s, 0, 6 * s, 9.4 * s, 6 * s), C.white);
  b.add(P.cone(8), TP(M, 0, 11.6 * s, 0, 4.6 * s, 3.4 * s, 4.6 * s), C.roofRed);
  b.add(P.box(), TP(M, 0, 1.4 * s, 2.9 * s, 1.3 * s, 2.2 * s, 0.3), C.woodDark);
  windowsRow(b, M, 6 * s, 2.35 * s, [0], 0.8 * s);
  const [fx, fz] = rot(0, 2.75 * s, ry);
  b.add(P.cyl(6), T(x + fx * 0.85, y + 10.1 * s, z + fz * 0.85, 0.6 * s, 1.6 * s, 0.6 * s, ry, Math.PI / 2), C.woodDark);
  I.anchor("windmill", x + fx, y + 10.1 * s, z + fz, { ry, s });
  I.cyl(x, z, y, y + 13 * s, 3.6 * s);
  I.block(x, z, 5 * s);
}

export function turbine(I: Isl, x: number, z: number, ry = 0, h = 26) {
  const y = I.h(x, z);
  I.b.add(P.frustum(0.45, 8), T(x, y + h / 2, z, 1.6, h, 1.6), C.white);
  const M = frame(x, y + h, z, ry);
  I.b.add(P.box(), TP(M, 0, 0.4, -0.4, 1.4, 1.4, 3.2), C.white);
  const [fx, fz] = rot(0, 1.4, ry);
  I.anchor("turbine", x + fx, y + h + 0.4, z + fz, { ry, s: h / 26 });
  I.cyl(x, z, y, y + h, 1.2);
}

export function gazebo(I: Isl, x: number, z: number, r = 3.2, roof: string = C.roofTeal) {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.cyl(6), T(x, y + 0.3, z, r * 2.2, 0.6, r * 2.2), C.stone);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(P.cyl(5), T(x + Math.cos(a) * r, y + 2.2, z + Math.sin(a) * r, 0.3, 3.6, 0.3), C.white);
  }
  b.add(P.cone(6), T(x, y + 5.3, z, r * 2.7, 2.6, r * 2.7), roof);
  b.add(P.ico(0), T(x, y + 6.8, z, 0.5, 0.5, 0.5), C.gold);
  I.cyl(x, z, y, y + 6.5, r + 0.8);
  I.block(x, z, r + 2);
}

/** Plank bridge between two world points (built into the region's world mesh). */
export function bridge(b: MeshBuilder, a: [number, number, number], c: [number, number, number], width = 4, sag = 3) {
  const dx = c[0] - a[0];
  const dz = c[2] - a[2];
  const len = Math.hypot(dx, dz);
  const ry = Math.atan2(dx, dz);
  const n = Math.max(4, Math.round(len / 1.3));
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([a[0] + dx * t, a[1] + (c[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + dz * t]);
  }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = pts[i];
    const [x2, y2, z2] = pts[i + 1];
    const pitch = Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z));
    b.add(P.box(), T((x + x2) / 2, (y + y2) / 2, (z + z2) / 2, width, 0.25, (len / n) * 0.82, ry, -pitch), i % 3 ? C.wood : C.woodLight);
  }
  for (const side of [-1, 1]) {
    const ox = Math.cos(ry) * (width / 2) * side;
    const oz = -Math.sin(ry) * (width / 2) * side;
    for (let i = 0; i <= n; i += 3) {
      const [x, y, z] = pts[i];
      b.add(P.box(), T(x + ox, y + 0.8, z + oz, 0.18, 1.6, 0.18), C.woodDark);
    }
    for (let i = 0; i < n; i++) {
      const [x, y, z] = pts[i];
      const [x2, y2, z2] = pts[i + 1];
      const pitch = Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z));
      b.add(P.box(), T((x + x2) / 2 + ox, (y + y2) / 2 + 1.5, (z + z2) / 2 + oz, 0.1, 0.1, len / n, ry, -pitch), C.woodLight);
    }
  }
}

export function lampPosts(I: Isl, pts: [number, number][], h = 4.5) {
  for (const [x, z] of pts) streetlight(I, x, z, Math.atan2(-x, -z) + Math.PI / 2, h);
}

export function signpost(I: Isl, x: number, z: number, arrows: { text: string; angle: number; color?: string }[]) {
  const y = I.h(x, z);
  I.b.add(P.cyl(6), T(x, y + 2.6, z, 0.32, 5.2, 0.32), C.woodDark);
  I.b.add(P.cone(6), T(x, y + 5.4, z, 0.6, 0.5, 0.6), C.coral);
  arrows.forEach((a, i) => {
    const ry = a.angle;
    const [dx, dz] = rot(0, 1.25, ry);
    I.anchor("sign", x + dx, y + 4.6 - i * 0.95, z + dz, {
      ry: ry - Math.PI / 2,
      data: { lines: [a.text], w: 2.7, h: 0.72, bg: a.color ?? C.cream, fg: "#1f3552", arrow: true, doubleSided: true, font: 46 },
    });
  });
  I.block(x, z, 2);
}

export function tank(I: Isl, x: number, z: number, ry = 0, color: string = C.white) {
  const y = I.h(x, z);
  const M = frame(x, y, z, ry);
  I.b.add(P.cyl(12), TP(M, 0, 1.7, 0, 2.6, 5, 2.6, 0, 0, Math.PI / 2), color);
  for (const sx of [-1.6, 1.6]) I.b.add(P.box(), TP(M, sx, 0.6, 0, 0.3, 1.2, 2), C.metalDark);
  I.b.add(P.box(), TP(M, 0, 1.7, 1.32, 3.6, 0.5, 0.05), C.coral);
}

export function antenna(I: Isl, x: number, z: number, h = 14) {
  const y = I.h(x, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    I.b.add(P.box(), T(x + Math.cos(a) * 0.6, y + h / 2, z + Math.sin(a) * 0.6, 0.12, h, 0.12), C.metal);
  }
  for (let k = 1; k < h; k += 2) I.b.add(P.cyl(3), T(x, y + k, z, 1.4, 0.08, 1.4), C.metal);
  I.anchor("beacon", x, y + h + 0.3, z, { data: { color: "#ff4b3e", period: 1.6 } });
  I.cyl(x, z, y, y + h, 1);
}

// ── Landing infrastructure ──────────────────────────────────────────────────

/** Flattening pad for an axis-aligned airstrip (create it with the island). */
export function stripPad(x: number, z: number, heading: number, length: number): Pad {
  const alongX = Math.abs(Math.sin(heading)) > 0.5;
  return alongX
    ? { x, z, r: 0, w: length / 2 + 5, l: 7.5, h: 0, blend: 9, color: "#b9b08f", colorStrength: 0.35 }
    : { x, z, r: 0, w: 7.5, l: length / 2 + 5, h: 0, blend: 9, color: "#b9b08f", colorStrength: 0.35 };
}

/** Grass approach lane continuing the strip to the island rim (kept flat and clear). */
export function corridorPad(x: number, z: number, heading: number, reach: number): Pad {
  const alongX = Math.abs(Math.sin(heading)) > 0.5;
  return alongX ? { x, z, r: 0, w: reach, l: 10, h: 0, blend: 12 } : { x, z, r: 0, w: 10, l: reach, h: 0, blend: 12 };
}

/** Airstrip on an island; returns its world-space landing site. */
export function airstrip(I: Isl, x: number, z: number, heading: number, length: number, width = 8): LandingSite {
  runway(I, x, z, length, width, heading);
  I.block(x, z, 4);
  return { x: I.ox + x, y: I.oy + I.h(x, z) + 0.34, z: I.oz + z, heading, length };
}

/** Floating sky-dock airstrip for places too crowded to land on. */
export function skyDock(kit: RegionKit, x: number, y: number, z: number, heading: number, length: number, width = 9): LandingSite {
  const b = kit.world;
  const M = frame(x, y, z, heading);
  b.add(P.box(), TP(M, 0, -0.6, 0, width + 6, 1.2, length + 8), C.concrete);
  b.add(P.box(), TP(M, 0, 0.12, 0, width, 0.24, length), C.asphalt);
  for (let zz = -length / 2 + 14; zz < length / 2 - 14; zz += 9) b.add(P.box(), TP(M, 0, 0.26, zz, 0.4, 0.04, 4.5), C.white);
  for (const end of [-1, 1]) {
    for (let i = -2; i <= 2; i++) if (i) b.add(P.box(), TP(M, (i * width) / 6, 0.26, end * (length / 2 - 3.5), width / 9, 0.04, 5), C.white);
  }
  for (let zz = -length / 2 - 2; zz <= length / 2 + 2; zz += 8) {
    for (const sx of [-1, 1]) b.add(P.cyl(8), TP(M, (sx * (width + 4.5)) / 2, 0.22, zz, 0.46, 0.22, 0.46), Math.abs(zz) > length / 2 ? "#ff8a6a" : C.window, { emissive: 0.45 });
  }
  // A pier: pairs of slim pylons standing in the sea, with cross beams.
  const drop = y - SEA_LEVEL + 3;
  const n = Math.max(3, Math.round(length / 18));
  for (let k = 0; k < n; k++) {
    const zz = -length / 2 + 4 + (k * (length - 8)) / (n - 1);
    for (const sx of [-1, 1]) {
      const px = (sx * (width + 2)) / 2;
      b.add(P.cyl(8), TP(M, px, -drop / 2, zz, 1.5, drop, 1.5), C.cream);
      b.add(P.cyl(8), TP(M, px, -drop + 2.6, zz, 1.9, 1.2, 1.9), C.coral);
      const [wx, wz] = rot(px, zz, heading);
      kit.cyl(x + wx, z + wz, SEA_LEVEL - 3, y - 1.2, 0.8);
    }
    b.add(P.box(), TP(M, 0, -2.2, zz, width + 2, 0.9, 1), C.cream);
  }
  const [cx, cz] = rot(width / 2 + 2.5, length / 2 + 2, heading);
  kit.anchor("beacon", x + cx, y + 1.2, z + cz, { data: { color: "#ff4b3e", period: 1.4 } });
  kit.box(x, y - 0.6, z, (width + 6) / 2, 0.9, (length + 8) / 2, heading);
  return { x, y: y + 0.24, z, heading, length };
}
