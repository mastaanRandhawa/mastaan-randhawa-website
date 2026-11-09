import { Color } from "three";
import { P, T } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { C } from "../palette";
import { SEA_LEVEL } from "../layout";

const tint = new Color();
function vary(hex: string, rnd: () => number, amt = 0.08): string {
  tint.set(hex);
  const k = 1 + (rnd() - 0.5) * amt * 2;
  tint.multiplyScalar(k);
  return `#${tint.getHexString()}`;
}

export type TreeKind = "pine" | "round" | "poplar" | "autumn" | "blossom" | "birch" | "palm";

const PALM_LEAF = ["#5fae5a", "#72bd5f", "#4f9e58"];

/**
 * Leaning palm: a banded, curving trunk and a crown of drooping fronds with a
 * few coconuts. `lean` tips the trunk toward angle `leanDir` (radians).
 */
export function palm(I: Isl, x: number, z: number, s = 1, y = I.h(x, z), leanDir = I.rnd() * Math.PI * 2, lean = 0.35 + I.rnd() * 0.5) {
  const b = I.b;
  const r = I.rnd;
  const H = 7.5 * s;
  const dx = Math.cos(leanDir);
  const dz = Math.sin(leanDir);
  const segs = 4;
  for (let k = 0; k < segs; k++) {
    const t0 = k / segs;
    const t1 = (k + 1) / segs;
    const tm = (t0 + t1) / 2;
    const off = lean * tm * tm * H * 0.55;
    const rad = (0.62 - 0.22 * tm) * s;
    b.add(P.cyl(6), T(x + dx * off, y + tm * H, z + dz * off, rad, (H / segs) * 1.08, rad, 0, dz * lean * tm * 0.6, -dx * lean * tm * 0.6), k % 2 ? "#c79a6a" : "#ad8158");
  }
  const off = lean * H * 0.55;
  const cx = x + dx * off;
  const cz = z + dz * off;
  const cy = y + H;
  const n = 7;
  const a0 = r() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const droop = 0.35 + r() * 0.35;
    const L = (3.4 + r() * 0.8) * s;
    const ux = Math.cos(droop) * Math.sin(a);
    const uy = -Math.sin(droop);
    const uz = Math.cos(droop) * Math.cos(a);
    b.add(P.cone(4), T(cx + ux * L * 0.5, cy + uy * L * 0.5 + 0.2 * s, cz + uz * L * 0.5, 1.25 * s, L, 0.18 * s, a, Math.PI / 2 + droop), vary(PALM_LEAF[i % 3], r, 0.06), {
      sway: 0.28 * s,
      swayBase: cy - 1.5 * s,
      swayHeight: 2 * s,
    });
  }
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + r();
    b.add(P.ico(0), T(cx + Math.cos(a) * 0.35 * s, cy - 0.35 * s, cz + Math.sin(a) * 0.35 * s, 0.5 * s, 0.5 * s, 0.5 * s), "#8a6440");
  }
}

export function tree(I: Isl, x: number, z: number, kind: TreeKind, s = 1, y = I.h(x, z)) {
  const b = I.b;
  const r = I.rnd;
  const ry = r() * Math.PI * 2;
  const sw = { swayBase: y + 1.6 * s, swayHeight: 6 * s, sway: 0.32 * s };
  switch (kind) {
    case "palm":
      palm(I, x, z, s, y);
      break;
    case "pine": {
      b.add(P.cyl(6), T(x, y + 1.1 * s, z, 0.55 * s, 2.4 * s, 0.55 * s), C.woodDark);
      const g = vary(r() > 0.5 ? C.pine : C.forest, r);
      b.add(P.cone(7), T(x, y + 2.9 * s, z, 3.6 * s, 3.2 * s, 3.6 * s, ry), g, sw);
      b.add(P.cone(7), T(x, y + 4.5 * s, z, 2.8 * s, 2.8 * s, 2.8 * s, ry + 0.4), vary(g, r, 0.05), sw);
      b.add(P.cone(7), T(x, y + 5.9 * s, z, 1.9 * s, 2.4 * s, 1.9 * s, ry + 0.8), vary(g, r, 0.05), sw);
      break;
    }
    case "round":
    case "autumn":
    case "blossom": {
      b.add(P.cyl(6), T(x, y + 1.4 * s, z, 0.6 * s, 2.8 * s, 0.6 * s), C.wood);
      const base =
        kind === "round" ? (r() > 0.5 ? C.leaf : C.leafLight) : kind === "autumn" ? (r() > 0.5 ? C.autumnA : C.autumnB) : "#f2a7b8";
      const g = vary(base, r);
      b.add(P.ico(1), T(x, y + 3.9 * s, z, 3.8 * s, 3.3 * s, 3.8 * s, ry), g, sw);
      b.add(P.ico(0), T(x + 1.1 * s, y + 3.2 * s, z + 0.4 * s, 2.2 * s, 2 * s, 2.2 * s, ry), vary(g, r, 0.06), sw);
      b.add(P.ico(0), T(x - 0.8 * s, y + 4.7 * s, z - 0.6 * s, 2 * s, 1.8 * s, 2 * s, ry + 1), vary(g, r, 0.06), sw);
      break;
    }
    case "poplar": {
      b.add(P.cyl(5), T(x, y + 1 * s, z, 0.45 * s, 2 * s, 0.45 * s), C.woodDark);
      b.add(P.ico(1), T(x, y + 4.6 * s, z, 1.9 * s, 6.4 * s, 1.9 * s, ry), vary(C.forest, r), sw);
      break;
    }
    case "birch": {
      b.add(P.cyl(5), T(x, y + 2.4 * s, z, 0.4 * s, 4.8 * s, 0.4 * s), "#ece6da");
      b.add(P.ico(0), T(x, y + 5.2 * s, z, 2.6 * s, 3.4 * s, 2.6 * s, ry), vary("#a9c95c", r), sw);
      break;
    }
  }
}

export function bush(I: Isl, x: number, z: number, s = 1, color: string = C.leaf) {
  const y = I.h(x, z);
  const r = I.rnd;
  I.b.add(P.ico(0), T(x, y + 0.6 * s, z, 2 * s, 1.4 * s, 2 * s, r() * 6), vary(color, r), {
    sway: 0.12 * s,
    swayBase: y,
    swayHeight: 1.4 * s,
  });
  if (r() > 0.5)
    I.b.add(P.ico(0), T(x + 0.8 * s, y + 0.45 * s, z + 0.3 * s, 1.3 * s, 1 * s, 1.3 * s, r() * 6), vary(color, r, 0.12), {
      sway: 0.1 * s,
      swayBase: y,
      swayHeight: 1 * s,
    });
}

/** A woolly sheep standing at local (x, y, z), facing yaw ry. */
export function sheep(I: Isl, x: number, y: number, z: number, ry = 0, s = 1) {
  const b = I.b;
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  // Local offsets along the body (forward = local +Z).
  const at = (fx: number, fz: number): [number, number] => [x + fx * c + fz * sn, z - fx * sn + fz * c];
  for (const [lx, lz] of [[-0.4, -0.6], [0.4, -0.6], [-0.4, 0.6], [0.4, 0.6]]) {
    const [px, pz] = at(lx * s, lz * s);
    b.add(P.cyl(4), T(px, y + 0.35 * s, pz, 0.22 * s, 0.8 * s, 0.22 * s), "#4a4440");
  }
  b.add(P.ico(1), T(x, y + 1.05 * s, z, 1.5 * s, 1.15 * s, 2 * s, ry), vary("#f7f3ea", I.rnd, 0.04));
  b.add(P.ico(0), T(x, y + 1.6 * s, z, 0.9 * s, 0.6 * s, 1.1 * s, ry), "#fffdf7");
  const [hx, hz] = at(0, 1.15 * s);
  b.add(P.ico(0), T(hx, y + 1.25 * s, hz, 0.6 * s, 0.7 * s, 0.75 * s, ry), "#4a4440");
  const [ex, ez] = at(0, 0.95 * s);
  b.add(P.box(), T(ex, y + 1.45 * s, ez, 1.0 * s, 0.14 * s, 0.22 * s, ry), "#4a4440");
}

const FLOWER_COLORS = ["#ffffff", "#f7d154", "#f2735a", "#c9a6e8", "#ff9fb5"];

export function flowers(I: Isl, x: number, z: number, n = 5, spread = 1.6) {
  const r = I.rnd;
  const col = FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)];
  for (let i = 0; i < n; i++) {
    const fx = x + (r() - 0.5) * spread * 2;
    const fz = z + (r() - 0.5) * spread * 2;
    const y = I.h(fx, fz);
    I.b.add(P.cone(4), T(fx, y + 0.3, fz, 0.12, 0.6, 0.12), C.leaf, { sway: 0.15, swayBase: y, swayHeight: 0.6 });
    I.b.add(P.ico(0), T(fx, y + 0.65, fz, 0.38, 0.3, 0.38, r() * 3), col, { sway: 0.15, swayBase: y, swayHeight: 0.7 });
  }
}

export function grass(I: Isl, x: number, z: number, n = 4) {
  const r = I.rnd;
  for (let i = 0; i < n; i++) {
    const gx = x + (r() - 0.5) * 1.6;
    const gz = z + (r() - 0.5) * 1.6;
    const y = I.h(gx, gz);
    I.b.add(P.cone(3), T(gx, y + 0.4, gz, 0.35, 0.9 + r() * 0.5, 0.35, r() * 6, (r() - 0.5) * 0.4), vary(C.leafLight, r, 0.1), {
      sway: 0.22,
      swayBase: y,
      swayHeight: 1,
    });
  }
}

export function rock(I: Isl, x: number, z: number, s = 1, color?: string, sink = 0.3) {
  const y = I.h(x, z);
  const r = I.rnd;
  const pal = I.t.p.palette;
  I.b.add(P.rock(Math.floor(r() * 6)), T(x, y + s * (0.5 - sink), z, s * (1 + r() * 0.5), s, s * (1 + r() * 0.4), r() * 6), color ?? vary(r() > 0.5 ? pal.rockA : pal.rockC, r));
  if (s > 2.5) I.sphere(x, y + s * 0.3, z, s * 0.6);
}

/**
 * Small rocks floating around a floating island's rim. Ocean islands get their
 * coastal boulders from decorateShore instead (after their base is fitted).
 */
export function floatingRocks(I: Isl, count: number, spread = 1.35) {
  const r = I.rnd;
  const R = I.t.p.radius;
  const pal = I.t.p.palette;
  if (I.t.p.profile === "shore" || I.t.p.y < SEA_LEVEL) return;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = R * (1.12 + r() * (spread - 1.1));
    const x = Math.cos(a) * d * I.t.p.sx;
    const z = Math.sin(a) * d * I.t.p.sz;
    const y = -10 - r() * I.t.p.depth * 0.7;
    const s = 1.5 + r() * 4.5;
    I.b.add(P.rock(i), T(x, y, z, s, s * 1.4, s, r() * 6), vary(pal.rockA, r, 0.12));
    I.b.add(P.cone(5), T(x, y - s * 1.2, z, s * 0.9, s * 1.6, s * 0.9, r() * 6, Math.PI), vary(pal.rockB, r, 0.1));
    // A grassy cap on the bigger ones.
    if (s > 3.5) I.b.add(P.cyl(6), T(x, y + s * 0.62, z, s * 1.05, 0.5, s * 1.05), pal.grassA);
    if (s > 3) I.sphere(x, y, z, s * 0.85);
  }
}

/** Dense decorative scatter for an island: trees, bushes, flowers, grass, rocks. */
export function decorate(
  I: Isl,
  o: { trees?: number; kinds?: TreeKind[]; bushes?: number; flowers?: number; grass?: number; rocks?: number; maxRho?: number; treeScale?: [number, number] } = {},
) {
  const kinds = o.kinds ?? ["pine", "round", "pine", "autumn"];
  const [s0, s1] = o.treeScale ?? [0.8, 1.35];
  I.scatter(o.trees ?? 30, { maxRho: o.maxRho ?? 0.84, spacing: 5.5 }, (x, z, y) => {
    tree(I, x, z, kinds[Math.floor(I.rnd() * kinds.length)], s0 + I.rnd() * (s1 - s0), y);
    I.block(x, z, 1.5);
  });
  I.scatter(o.bushes ?? 18, { maxRho: 0.9, spacing: 3.5 }, (x, z) => bush(I, x, z, 0.8 + I.rnd() * 0.7));
  // Small ground detail stays sparse: colour blocking carries the islands, not clutter.
  I.scatter(Math.round((o.flowers ?? 22) * 0.8), { maxRho: 0.92, spacing: 5 }, (x, z) => flowers(I, x, z, 5 + Math.floor(I.rnd() * 5), 2));
  I.scatter(Math.round((o.grass ?? 30) * 0.6), { maxRho: 0.94, spacing: 4 }, (x, z) => grass(I, x, z, 3));
  I.scatter(Math.round((o.rocks ?? 10) * 0.8), { minRho: 0.45, maxRho: 0.96, spacing: 8 }, (x, z) => rock(I, x, z, 0.8 + I.rnd() * 1.8));
  // A small flock grazing out on the open grass.
  I.scatter(Math.max(1, Math.round((o.trees ?? 30) / 25)), { maxRho: 0.8, spacing: 18 }, (x, z) => {
    for (let k = 0; k < 3 + Math.floor(I.rnd() * 3); k++) {
      const sx = x + (I.rnd() - 0.5) * 8;
      const sz = z + (I.rnd() - 0.5) * 8;
      if (I.isFree(sx, sz, 1) && I.t.rho(sx, sz) < 0.85) sheep(I, sx, I.h(sx, sz), sz, I.rnd() * Math.PI * 2, 0.85 + I.rnd() * 0.3);
    }
  });
}
