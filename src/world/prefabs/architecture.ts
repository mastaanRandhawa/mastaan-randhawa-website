import { Matrix4 } from "three";
import { P, TP, type MeshBuilder } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { C } from "../palette";

/**
 * Architectural kit: facades built from real parts (piers, spandrels, framed
 * windows, cornices, storefronts, rooftop plant) instead of flat boxes with
 * window stripes. Everything merges into the island mesh, so detail costs
 * vertices, not draw calls.
 */

/** Deterministic 0..1 hash for per-window variation (lit / unlit, blinds). */
export function hash3(a: number, b: number, c: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const DARK_GLASS = "#33465a";
const SKY_GLASS = "#7fa4ba";
const LIT = C.window;

export interface Face {
  /** Local frame: origin at the face's bottom centre, +Z out of the face, +X along it. */
  F: Matrix4;
  /** Face width along local X. */
  width: number;
  /** Index 0..3 (front, right, back, left). */
  k: number;
}

/** The four outward-facing frames of a w × d footprint inside parent frame M. */
export function faces(M: Matrix4, w: number, d: number, y = 0): Face[] {
  const out: Face[] = [];
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2;
    const half = k % 2 === 0 ? d / 2 : w / 2;
    out.push({ F: TP(M, Math.sin(ry) * half, y, Math.cos(ry) * half, 1, 1, 1, ry).clone(), width: k % 2 === 0 ? w : d, k });
  }
  return out;
}

/** Evenly spaced bay centres across a width, keeping `margin` clear at each corner. */
export function bays(width: number, spacing: number, margin = 0.8): number[] {
  const n = Math.max(1, Math.floor((width - margin * 2) / spacing));
  const step = (width - margin * 2) / n;
  return Array.from({ length: n }, (_, i) => -width / 2 + margin + step * (i + 0.5));
}

/** A framed punched window with sill; optionally shutters and a mullion cross. */
export function framedWindow(
  b: MeshBuilder,
  F: Matrix4,
  u: number,
  y: number,
  o: { w?: number; h?: number; lit?: boolean; frame?: string; shutters?: string; cross?: boolean; sill?: string } = {},
) {
  const w = o.w ?? 1;
  const h = o.h ?? 1.3;
  const frame = o.frame ?? C.white;
  b.add(P.box(), TP(F, u, y, 0.05, w + 0.24, h + 0.24, 0.1), frame);
  b.add(P.box(), TP(F, u, y, 0.08, w, h, 0.06), o.lit ? LIT : DARK_GLASS, { emissive: o.lit ? 0.6 : 0 });
  if (o.cross) {
    b.add(P.box(), TP(F, u, y, 0.13, 0.07, h, 0.05), frame);
    b.add(P.box(), TP(F, u, y + h * 0.12, 0.13, w, 0.07, 0.05), frame);
  }
  b.add(P.box(), TP(F, u, y - h / 2 - 0.16, 0.12, w + 0.42, 0.12, 0.3), o.sill ?? frame);
  if (o.shutters) for (const s of [-1, 1]) b.add(P.box(), TP(F, u + s * (w / 2 + 0.36), y, 0.07, 0.4, h + 0.1, 0.07), o.shutters);
}

/** Striped shop awning projecting from a face. */
export function awning(b: MeshBuilder, F: Matrix4, u: number, y: number, width: number, color: string, depth = 1.6) {
  const n = Math.max(3, Math.round(width / 0.7));
  for (let i = 0; i < n; i++) {
    const x = u - width / 2 + (width * (i + 0.5)) / n;
    b.add(P.box(), TP(F, x, y, depth / 2, width / n + 0.01, 0.1, depth, 0, -0.38), i % 2 ? C.cream : color);
  }
  b.add(P.box(), TP(F, u, y - 0.32, depth * 0.95, width + 0.05, 0.36, 0.06), color);
}

/** Rooftop plant: HVAC units with fans, vent stacks, a stair bulkhead. */
export function roofPlant(b: MeshBuilder, M: Matrix4, y: number, w: number, d: number, seed: number) {
  const r = (i: number) => hash3(seed, i, 7.7);
  const units = 1 + Math.floor(r(1) * 3);
  for (let i = 0; i < units; i++) {
    const ux = (r(10 + i) - 0.5) * w * 0.55;
    const uz = (r(20 + i) - 0.5) * d * 0.55;
    b.add(P.box(), TP(M, ux, y + 0.7, uz, 2.2, 1.4, 1.6), "#c9ced6");
    b.add(P.cyl(10), TP(M, ux - 0.5, y + 1.45, uz, 0.9, 0.12, 0.9), C.metalDark);
    b.add(P.cyl(10), TP(M, ux + 0.5, y + 1.45, uz, 0.9, 0.12, 0.9), C.metalDark);
  }
  b.add(P.box(), TP(M, -w * 0.28, y + 1.3, d * 0.25, 2.4, 2.6, 2.2), "#d7d2c8");
  b.add(P.box(), TP(M, -w * 0.28, y + 2.7, d * 0.25, 2.7, 0.2, 2.5), C.metalDark);
  for (let i = 0; i < 2; i++) b.add(P.cyl(6), TP(M, w * 0.3 - i * 1.2, y + 0.9, -d * 0.3, 0.35, 1.8, 0.35), C.metal);
}

/** Classic rooftop water tank on legs. */
export function waterTank(b: MeshBuilder, M: Matrix4, x: number, y: number, z: number, s = 1) {
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.add(P.box(), TP(M, x + lx * 0.9 * s, y + 1.1 * s, z + lz * 0.9 * s, 0.18 * s, 2.2 * s, 0.18 * s), C.woodDark);
  b.add(P.cyl(12), TP(M, x, y + 2.3 * s, z, 2.6 * s, 0.2 * s, 2.6 * s), C.woodDark);
  b.add(P.cyl(12), TP(M, x, y + 3.6 * s, z, 2.4 * s, 2.6 * s, 2.4 * s), "#9b7458");
  for (const hy of [2.9, 4.3]) b.add(P.cyl(12), TP(M, x, y + hy * s, z, 2.48 * s, 0.1 * s, 2.48 * s), C.metalDark);
  b.add(P.cone(12), TP(M, x, y + 5.4 * s, z, 2.7 * s, 1.1 * s, 2.7 * s), "#5f4a3c");
}

export type TowerStyle = "deco" | "glass" | "masonry";

const STONE = ["#efe6d6", "#e7ddcc", "#e9e3da", "#ded6c8"];
const BRICK = ["#b9806a", "#a9735f", "#c49a7c", "#9fa8ae"];

/**
 * An office tower in one of three archetypes. Returns the roof height (local y)
 * so callers can mount antennas, beacons or signs.
 */
export function officeTower(I: Isl, x: number, z: number, w: number, d: number, h: number, accent: string, style: TowerStyle): number {
  const y = I.h(x, z);
  const b = I.b;
  const M = TP(new Matrix4(), x, y, z).clone();
  const seed = Math.round(x * 13 + z * 7);
  const pick = <T,>(arr: T[]) => arr[Math.abs(seed) % arr.length];
  // Plinth and ground floor shared by every archetype.
  b.add(P.box(), TP(M, 0, 0.3, 0, w + 1.6, 0.6, d + 1.6), C.stone);
  const groundH = 4.2;
  b.add(P.box(), TP(M, 0, groundH / 2 + 0.3, 0, w - 0.4, groundH, d - 0.4), "#3a4350");
  for (const f of faces(M, w - 0.4, d - 0.4, 0.3)) {
    for (const u of bays(f.width, 3.2, 0.6)) {
      b.add(P.box(), TP(f.F, u, groundH / 2, 0.06, 2.6, groundH - 1.1, 0.06), hash3(seed, f.k, u) > 0.35 ? "#ffe2b0" : SKY_GLASS, { emissive: 0.32 });
    }
    if (f.k === 0) awning(b, f.F, 0, groundH - 0.2, Math.min(f.width - 1, 7), accent);
  }
  b.add(P.box(), TP(M, 0, groundH + 0.45, 0, w + 0.5, 0.5, d + 0.5), style === "glass" ? C.white : accent);
  const base = groundH + 0.7;
  let top = base;

  if (style === "glass") {
    const bodyH = h - base;
    b.add(P.box(), TP(M, 0, base + bodyH / 2, 0, w, bodyH, d), SKY_GLASS);
    const floors = Math.floor(bodyH / 3.2);
    for (let f = 1; f <= floors; f++) b.add(P.box(), TP(M, 0, base + f * 3.2 - 0.2, 0, w + 0.14, 0.42, d + 0.14), "#eef2f5");
    for (const fc of faces(M, w, d, base)) {
      for (const u of bays(fc.width, 2.2, 0.3)) b.add(P.box(), TP(fc.F, u + 1.1, bodyH / 2, 0.09, 0.14, bodyH, 0.1), "#5d6f80");
      for (let f = 0; f < floors; f++)
        for (const u of bays(fc.width, 2.2, 0.3)) {
          if (hash3(seed + f, fc.k, u) < 0.72) continue;
          b.add(P.box(), TP(fc.F, u, f * 3.2 + 1.5, 0.05, 1.9, 2.4, 0.04), LIT, { emissive: 0.45 });
        }
    }
    top = base + bodyH;
    // Mechanical crown with louvres.
    b.add(P.box(), TP(M, 0, top + 1.4, 0, w - 1.2, 2.8, d - 1.2), "#59636f");
    for (let i = 0; i < 4; i++) b.add(P.box(), TP(M, 0, top + 0.5 + i * 0.6, 0, w - 1.1, 0.14, d - 1.1), "#8a949f");
    b.add(P.box(), TP(M, 0, top + 0.25, 0, w + 0.3, 0.5, d + 0.3), "#eef2f5");
    I.box(x, y + (top + 2.8) / 2, z, w / 2 + 0.3, (top + 2.8) / 2 + 0.4, d / 2 + 0.3);
    top += 2.8;
  } else if (style === "deco") {
    const stone = pick(STONE);
    const tiers = [
      { f: 1, h: (h - base) * 0.62 },
      { f: 0.76, h: (h - base) * 0.24 },
      { f: 0.52, h: (h - base) * 0.14 },
    ];
    for (const [ti, t] of tiers.entries()) {
      const tw = w * t.f;
      const td = d * t.f;
      b.add(P.box(), TP(M, 0, top + t.h / 2, 0, tw - 0.5, t.h, td - 0.5), DARK_GLASS);
      const floors = Math.floor(t.h / 3);
      for (const fc of faces(M, tw - 0.5, td - 0.5, top)) {
        const us = bays(fc.width, 2.6, 0.5);
        // Piers between bays and at the corners.
        const piers = [-fc.width / 2 + 0.25, ...us.slice(0, -1).map((u, i) => (u + us[i + 1]) / 2), fc.width / 2 - 0.25];
        for (const px of piers) b.add(P.box(), TP(fc.F, px, t.h / 2, 0.12, 0.5, t.h, 0.3), stone);
        for (let f = 0; f < floors; f++) {
          b.add(P.box(), TP(fc.F, 0, f * 3 + 0.35, 0.08, fc.width, 0.7, 0.18), stone);
          for (const u of us) if (hash3(seed + ti * 31 + f, fc.k, u) > 0.58) b.add(P.box(), TP(fc.F, u, f * 3 + 1.75, 0.05, 1.7, 1.8, 0.04), LIT, { emissive: 0.5 });
        }
      }
      top += t.h;
      // Stepped cornice: stone cap with an accent band.
      b.add(P.box(), TP(M, 0, top + 0.2, 0, tw + 0.3, 0.4, td + 0.3), stone);
      b.add(P.box(), TP(M, 0, top + 0.55, 0, tw - 0.1, 0.3, td - 0.1), accent);
      I.box(x, y + top - t.h / 2, z, tw / 2 + 0.2, t.h / 2 + 0.6, td / 2 + 0.2);
      top += 0.7;
    }
    // Crown and spire.
    b.add(P.frustum(0.55, 8), TP(M, 0, top + 1.5, 0, w * 0.34, 3, d * 0.34), stone);
    b.add(P.cone(8), TP(M, 0, top + 5, 0, w * 0.16, 4, d * 0.16), accent);
    b.add(P.cyl(6), TP(M, 0, top + 8.5, 0, 0.18, 3, 0.18), C.metalDark);
    top += 3;
  } else {
    const brick = pick(BRICK);
    const bodyH = h - base;
    b.add(P.box(), TP(M, 0, base + bodyH / 2, 0, w, bodyH, d), brick);
    const floors = Math.floor(bodyH / 3);
    for (const fc of faces(M, w, d, base)) {
      // Quoins at the corners.
      for (let f = 0; f < floors; f++)
        for (const s of [-1, 1]) b.add(P.box(), TP(fc.F, s * (fc.width / 2 - 0.3), f * 3 + 0.9, 0.04, 0.7, 0.9, 0.1), C.cream);
      for (let f = 0; f < floors; f++)
        for (const u of bays(fc.width, 2.3, 1.1)) framedWindow(b, fc.F, u, f * 3 + 1.6, { w: 1, h: 1.5, lit: hash3(seed + f, fc.k, u) > 0.62, frame: C.cream, cross: true });
    }
    top = base + bodyH;
    b.add(P.box(), TP(M, 0, top + 0.3, 0, w + 0.6, 0.6, d + 0.6), C.cream);
    b.add(P.box(), TP(M, 0, top + 0.95, 0, w + 0.1, 0.7, d + 0.1), brick);
    b.add(P.box(), TP(M, 0, top + 1.35, 0, w + 0.3, 0.15, d + 0.3), C.cream);
    waterTank(b, M, w * 0.18, top + 0.6, -d * 0.12, 0.9);
    I.box(x, y + top / 2, z, w / 2 + 0.4, top / 2 + 0.8, d / 2 + 0.4);
    top += 0.6;
  }
  if (style !== "deco") roofPlant(b, M, top, w * 0.9, d * 0.9, seed);
  I.block(x, z, Math.max(w, d) * 0.78);
  return top;
}

export interface HouseOpts {
  w?: number;
  d?: number;
  h?: number;
  wall?: string;
  roof?: string;
  trim?: string;
  chimney?: boolean;
  stories?: number;
  /** Floor height (local); defaults to the island top under (x, z). */
  y?: number;
  /** Extra stone plinth depth below the floor, for houses set into a slope. */
  plinth?: number;
}

/** Darken a hex colour by factor k (0..1). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const bl = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/**
 * A storybook cottage: stone footing, timber frame, overhanging gable roof with
 * fascia and ridge cap, shuttered windows with flower boxes, porch canopy.
 */
export function house(I: Isl, x: number, z: number, ry: number, o: HouseOpts = {}) {
  const w = o.w ?? 6;
  const d = o.d ?? 5;
  const stories = o.stories ?? 1;
  const h = (o.h ?? 3.4) * stories;
  const wall = o.wall ?? C.cream;
  const roof = o.roof ?? C.roofRed;
  const trim = o.trim ?? C.woodDark;
  const y = o.y ?? I.h(x, z);
  const M = TP(new Matrix4(), x, y, z, 1, 1, 1, ry).clone();
  const b = I.b;
  const seed = Math.round(x * 3 + z * 5);
  // Footing and walls.
  const pl = o.plinth ?? 0;
  b.add(P.box(), TP(M, 0, 0.35 - pl / 2, 0, w + 0.5, 0.7 + pl, d + 0.5), C.stoneDark);
  b.add(P.box(), TP(M, 0, 0.7 + h / 2, 0, w, h, d), wall);
  // Timber frame: corner posts, sill and eave beams, a mid rail per storey.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(P.box(), TP(M, (sx * w) / 2, 0.7 + h / 2, (sz * d) / 2, 0.3, h, 0.3), trim);
  b.add(P.box(), TP(M, 0, 0.78, 0, w + 0.12, 0.18, d + 0.12), trim);
  b.add(P.box(), TP(M, 0, 0.7 + h, 0, w + 0.2, 0.3, d + 0.2), trim);
  for (let s = 1; s < stories; s++) b.add(P.box(), TP(M, 0, 0.7 + (h / stories) * s, 0, w + 0.14, 0.2, d + 0.14), trim);
  // Gable roof (ridge along X) with overhangs, fascia boards and a ridge cap.
  const roofH = d * 0.58;
  const ry0 = 0.7 + h + 0.15;
  const over = 0.6;
  b.add(P.prism(), TP(M, 0, ry0 + roofH / 2, 0, d + over * 2, roofH, w, Math.PI / 2), wall);
  const slope = Math.atan2(roofH, d / 2 + over);
  const run = Math.hypot(roofH, d / 2 + over);
  for (const s of [-1, 1]) {
    b.add(P.box(), TP(M, 0, ry0 + roofH / 2 - 0.02, (s * (d / 2 + over)) / 2, w + over * 2, 0.16, run, 0, s * slope), roof);
    // Tile courses: slightly darker strips across the slope.
    for (let k = 1; k < 4; k++) {
      const f = k / 4;
      b.add(P.box(), TP(M, 0, ry0 + roofH * (1 - f) + 0.075, s * (d / 2 + over) * f, w + over * 2 + 0.02, 0.06, 0.16, 0, s * slope), shade(roof, 0.84));
    }
    b.add(P.box(), TP(M, 0, ry0 + 0.02, s * (d / 2 + over), w + over * 2 + 0.12, 0.26, 0.14), trim);
  }
  b.add(P.box(), TP(M, 0, ry0 + roofH + 0.05, 0, w + over * 2 + 0.2, 0.22, 0.32), shade(roof, 0.62));
  // Gable faces get a small attic window.
  const wide = w > 5;
  const doorU = wide ? 0 : w * 0.22;
  for (const fc of faces(M, w, d, 0.7)) {
    const side = fc.k % 2 === 1;
    if (side) framedWindow(b, fc.F, 0, h + roofH * 0.38 + 0.15, { w: 0.6, h: 0.6, lit: hash3(seed, fc.k, 1) > 0.5, frame: C.white, sill: trim });
    const us = side ? [0] : wide ? [-fc.width / 3.2, fc.width / 3.2] : fc.k === 0 ? [-fc.width * 0.22] : [0];
    for (let s = 0; s < stories; s++) {
      const wy = (h / stories) * s + (h / stories) * 0.55;
      for (const u of us) {
        framedWindow(b, fc.F, u, wy, { w: 0.95, h: 1.05, lit: hash3(seed + s, fc.k, u) > 0.45, frame: C.white, shutters: shade(roof, 0.85), cross: true, sill: trim });
        if (fc.k === 0 && s === 0) {
          b.add(P.box(), TP(fc.F, u, wy - 0.82, 0.32, 1.25, 0.32, 0.38), C.woodDark);
          for (let k = 0; k < 4; k++) b.add(P.ico(0), TP(fc.F, u - 0.45 + k * 0.3, wy - 0.58, 0.34, 0.26, 0.24, 0.26), ["#e8607a", "#ffd166", "#f4f1ec", "#c77dff"][(seed + k) & 3]);
        }
      }
    }
    if (fc.k === 0) {
      // Door with frame, step and porch canopy.
      const dx = doorU;
      b.add(P.box(), TP(fc.F, dx, 1.1, 0.06, 1.3, 2.2, 0.12), C.white);
      b.add(P.box(), TP(fc.F, dx, 1.05, 0.1, 1.0, 2.0, 0.08), shade(roof, 0.7));
      b.add(P.ico(0), TP(fc.F, dx + 0.32, 1.05, 0.18, 0.1, 0.1, 0.1), C.gold);
      b.add(P.box(), TP(fc.F, dx, -0.15, 0.6, 1.6, 0.3, 0.9), C.stone);
      b.add(P.box(), TP(fc.F, dx, 2.55, 0.55, 1.9, 0.14, 1.05, 0, 0.32), roof);
      for (const s of [-1, 1]) b.add(P.box(), TP(fc.F, dx + s * 0.6, 2.42, 0.7, 0.08, 0.36, 0.08), trim);
    }
  }
  if (o.chimney !== false) {
    b.add(P.box(), TP(M, w * 0.26, ry0 + roofH * 0.7, -d * 0.18, 0.85, roofH * 0.9 + 1, 0.85), C.stoneDark);
    b.add(P.box(), TP(M, w * 0.26, ry0 + roofH * 1.17 + 0.55, -d * 0.18, 1.05, 0.2, 1.05), C.stone);
  }
  I.box(x, y + (0.7 + h + roofH) / 2, z, w / 2 + over, (0.7 + h + roofH) / 2 + 0.3, d / 2 + over, ry);
  I.block(x, z, Math.max(w, d) * 0.78);
}
