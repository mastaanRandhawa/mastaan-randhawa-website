import { Color } from "three";
import { P, T } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { C } from "../palette";
import { SEA_LEVEL } from "../layout";
import { TREE_HEIGHT, propTemplates, treeTemplates, type PropKind } from "../treeTemplates";

const tint = new Color();
function vary(hex: string, rnd: () => number, amt = 0.08): string {
  tint.set(hex);
  const k = 1 + (rnd() - 0.5) * amt * 2;
  tint.multiplyScalar(k);
  return `#${tint.getHexString()}`;
}

export type TreeKind = "pine" | "round" | "poplar" | "autumn" | "blossom" | "birch" | "palm";

/**
 * Trees come only from the free model packs (see src/render/treeAssets.ts and
 * src/content/credits.ts): each call stamps a baked glTF tree of this kind.
 * If the models are not loaded (unit tests, a failed download) no tree is placed.
 */
function modelTree(I: Isl, x: number, z: number, kind: TreeKind, s: number, y: number) {
  const list = treeTemplates(kind);
  if (!list) return;
  const r = I.rnd;
  const t = list[Math.floor(r() * list.length)];
  // Broad crowns (width > 0.8 × height) are planted a little smaller so they don't read as boulders.
  // Every tree gets its own size (saplings to old giants) and a slightly wider or slimmer crown.
  const H = TREE_HEIGHT[kind] * s * sizeVariation(r, 0.62, 1.38) * Math.min(1, Math.sqrt(0.8 / t.aspect));
  const W = H * (0.88 + r() * 0.24);
  const ry = r() * Math.PI * 2;
  // Sunk a little so roots never float on slopes; crowns sway, trunks stay put.
  I.b.addTemplate(t, T(x, y - 0.12 * H, z, W, H, W, ry), 0.9 + r() * 0.18, { sway: 0.3 * s, swayBase: y + H * 0.3, swayHeight: H * 0.7 });
}

/** A size multiplier between lo and hi, weighted toward the middle with the odd outlier. */
function sizeVariation(r: () => number, lo: number, hi: number): number {
  const t = (r() + r()) / 2;
  return lo + (hi - lo) * (r() < 0.12 ? r() : t);
}

/**
 * Stamps a baked ground prop (rock, bush, flower…) of `height` metres, with
 * its own size variation, a random yaw and a slight squash or stretch.
 * Returns false when no models are loaded (unit tests) so callers can fall back.
 */
function modelProp(
  I: Isl,
  kind: PropKind,
  x: number,
  y: number,
  z: number,
  height: number,
  o: { lo?: number; hi?: number; sink?: number; sway?: number; tint?: number; pick?: number } = {},
): { h: number; w: number } | null {
  const list = propTemplates(kind);
  if (!list) return null;
  const r = I.rnd;
  const t = list[Math.min(list.length - 1, Math.floor((o.pick ?? r()) * list.length))];
  // Wide models (flat slabs, sprawling plants) are scaled by footprint, not height.
  const H = height * sizeVariation(r, o.lo ?? 0.65, o.hi ?? 1.45) * Math.min(1, Math.sqrt(1.2 / t.aspect));
  const sx = H * (0.85 + r() * 0.3);
  const sz = H * (0.85 + r() * 0.3);
  const base = y - (o.sink ?? 0) * H;
  I.b.addTemplate(t, T(x, base, z, sx, H, sz, r() * Math.PI * 2), (o.tint ?? 1) * (0.92 + r() * 0.16), o.sway ? { sway: o.sway, swayBase: base, swayHeight: H } : {});
  return { h: H, w: Math.max(sx, sz) * t.aspect };
}

/**
 * Palm tree from the packs. `leanDir` / `lean` are kept for call-site
 * compatibility; the models carry their own natural lean, and a random yaw
 * varies its direction.
 */
export function palm(I: Isl, x: number, z: number, s = 1, y = I.h(x, z), _leanDir?: number, _lean?: number) {
  modelTree(I, x, z, "palm", s, y);
}

export function tree(I: Isl, x: number, z: number, kind: TreeKind, s = 1, y = I.h(x, z)) {
  modelTree(I, x, z, kind, s, y);
}

export function bush(I: Isl, x: number, z: number, s = 1, color: string = C.leaf) {
  const y = I.h(x, z);
  const r = I.rnd;
  // Mostly round shrubs, sometimes a low fan-leaved plant.
  if (modelProp(I, r() < 0.7 ? "bush" : "plant", x, y, z, 1.5 * s, { sink: 0.08, sway: 0.1 * s })) return;
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

/**
 * Woodland floor under a grove: a little cluster of mushrooms, or an old
 * stump. Only with the model packs loaded.
 */
export function groveFloor(I: Isl, x: number, z: number) {
  const r = I.rnd;
  if (r() < 0.3) {
    modelProp(I, "stump", x, I.h(x, z), z, 0.9, { lo: 0.7, hi: 1.3, sink: 0.15 });
    return;
  }
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const mx = x + (r() - 0.5) * 1.8;
    const mz = z + (r() - 0.5) * 1.8;
    modelProp(I, "mushroom", mx, I.h(mx, mz), mz, 0.45, { lo: 0.5, hi: 1.5, sink: 0.05 });
  }
}

/** One flower model (`species` 0..1 picks which, so a patch can share one). Returns false without models. */
export function flower(I: Isl, x: number, z: number, species?: number, s = 1, y = I.h(x, z)): boolean {
  return !!modelProp(I, "flower", x, y, z, 0.75 * s, { pick: species, lo: 0.6, hi: 1.4, sink: 0.04, sway: 0.15 });
}

export function flowers(I: Isl, x: number, z: number, n = 5, spread = 1.6) {
  const r = I.rnd;
  if (propTemplates("flower")) {
    // A patch of one species, with the odd stray of another, each its own size.
    const species = r();
    for (let i = 0; i < n; i++) {
      const fx = x + (r() - 0.5) * spread * 2;
      const fz = z + (r() - 0.5) * spread * 2;
      flower(I, fx, fz, r() < 0.85 ? species : r());
    }
    return;
  }
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
  if (propTemplates("grass")) {
    // Fewer, fuller tufts: each model is already a clump.
    for (let i = 0; i < Math.max(1, Math.round(n * 0.6)); i++) {
      const gx = x + (r() - 0.5) * 2.2;
      const gz = z + (r() - 0.5) * 2.2;
      modelProp(I, "grass", gx, I.h(gx, gz), gz, 0.7, { lo: 0.6, hi: 1.5, sink: 0.05, sway: 0.2 });
    }
    return;
  }
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
  return rockAt(I, x, I.h(x, z), z, s, color, sink);
}

/**
 * A boulder of roughly `s` metres at an explicit height, bedded into the
 * ground by `sink` of its height. Sizes vary from pebbles to big boulders; big
 * ones get a collider.
 */
export function rockAt(I: Isl, x: number, y: number, z: number, s = 1, color?: string, sink = 0.3, solid = s > 2.5) {
  const placed = modelProp(I, "rock", x, y, z, s, { lo: 0.5, hi: 1.7, sink });
  if (placed) {
    // Same rule as before for which rocks are solid (only the big ones asked for).
    if (solid) I.sphere(x, y + placed.h * 0.25, z, Math.min(placed.w, placed.h) * 0.5);
    return;
  }
  const r = I.rnd;
  const pal = I.t.p.palette;
  I.b.add(P.rock(Math.floor(r() * 6)), T(x, y + s * (0.5 - sink), z, s * (1 + r() * 0.5), s, s * (1 + r() * 0.4), r() * 6), color ?? vary(r() > 0.5 ? pal.rockA : pal.rockC, r));
  if (solid) I.sphere(x, y + s * 0.3, z, s * 0.6);
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
  // Groves and open meadows rather than an even sprinkle (see the island's terrain profile).
  const tp = I.t.tp;
  I.scatter(o.trees ?? 30, { maxRho: o.maxRho ?? 0.84, spacing: 5.5, cluster: tp.treeClusterStrength, maxSlope: tp.maxTreeSlope }, (x, z, y) => {
    tree(I, x, z, kinds[Math.floor(I.rnd() * kinds.length)], s0 + I.rnd() * (s1 - s0), y);
    I.block(x, z, 1.5);
  });
  // Mushrooms and the odd stump only where the groves are thick.
  if (propTemplates("mushroom")) {
    I.scatter(Math.round((o.trees ?? 30) / 9), { maxRho: o.maxRho ?? 0.84, spacing: 7, cluster: 0.95, maxSlope: 0.6 }, (x, z) => groveFloor(I, x, z));
  }
  // Shrubs: some gathered at the groves' edges, the rest dotted over open ground.
  const bushes = Math.round((o.bushes ?? 18) * 2.2);
  I.scatter(Math.round(bushes * 0.55), { maxRho: 0.9, spacing: 3, cluster: 0.8, maxSlope: 0.55 }, (x, z) => bush(I, x, z, 0.6 + I.rnd() * 0.9));
  I.scatter(Math.round(bushes * 0.45), { maxRho: 0.93, spacing: 3.5, maxSlope: 0.55 }, (x, z) => bush(I, x, z, 0.5 + I.rnd() * 0.8));
  I.scatter(Math.round((o.flowers ?? 22) * 0.8), { maxRho: 0.92, spacing: 5, maxSlope: 0.55 }, (x, z) => flowers(I, x, z, 5 + Math.floor(I.rnd() * 5), 2));
  // Grass tufts everywhere the ground is walkable, thicker in drifts.
  const tufts = Math.round((o.grass ?? 30) * 2.4);
  I.scatter(Math.round(tufts * 0.5), { maxRho: 0.95, spacing: 2.5, cluster: 0.6, maxSlope: 0.6 }, (x, z) => grass(I, x, z, 4));
  I.scatter(Math.round(tufts * 0.5), { maxRho: 0.96, spacing: 3, maxSlope: 0.6 }, (x, z) => grass(I, x, z, 2));
  I.scatter(Math.round((o.rocks ?? 10) * 0.8), { minRho: 0.45, maxRho: 0.96, spacing: 8, maxSlope: 0.5 }, (x, z) => rock(I, x, z, 0.8 + I.rnd() * 1.8));
  // A small flock grazing out on the open grass.
  I.scatter(Math.max(1, Math.round((o.trees ?? 30) / 25)), { maxRho: 0.8, spacing: 18 }, (x, z) => {
    for (let k = 0; k < 3 + Math.floor(I.rnd() * 3); k++) {
      const sx = x + (I.rnd() - 0.5) * 8;
      const sz = z + (I.rnd() - 0.5) * 8;
      if (I.isFree(sx, sz, 1) && I.t.rho(sx, sz) < 0.85) sheep(I, sx, I.h(sx, sz), sz, I.rnd() * Math.PI * 2, 0.85 + I.rnd() * 0.3);
    }
  });
}
