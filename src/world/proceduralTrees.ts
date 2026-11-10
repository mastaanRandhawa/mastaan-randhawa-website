import { Color } from "three";
import { mulberry32 } from "./noise";
import type { TreeTemplate } from "./treeTemplates";
import type { TreeKind } from "./prefabs/nature";

/**
 * Low-poly trees generated in code, mixed in with the model-pack trees for
 * variety at zero download cost: round and clustered broadleaves, fruit
 * trees, flat-topped acacias, tiered firs and slim spruces, white-barked
 * birches, cypress-like poplars and curving palms. Deterministic (fixed
 * seeds), so the world looks the same every visit.
 *
 * Each template is in the same format as a baked model: height 1, trunk base
 * at the origin, linear vertex colours, one flat-coloured triangle per face.
 */

type V3 = [number, number, number];

const tmp = new Color();
const lin = (hex: string) => tmp.set(hex).clone();

class Geo {
  pos: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  /** A triangle facing away from `ref` (or both ways when `ref` is null), in `c` shaded by facing. */
  tri(a: V3, b: V3, c: V3, color: Color, ref: V3 | null, rnd: () => number) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    if (ref) {
      const mx = (a[0] + b[0] + c[0]) / 3 - ref[0], my = (a[1] + b[1] + c[1]) / 3 - ref[1], mz = (a[2] + b[2] + c[2]) / 3 - ref[2];
      if (nx * mx + ny * my + nz * mz < 0) {
        [b, c] = [c, b];
        nx = -nx; ny = -ny; nz = -nz;
      }
    }
    // Sun-side faces a touch lighter, undersides darker, plus a little per-face jitter.
    const k = (0.84 + 0.22 * (ny / nl)) * (0.95 + rnd() * 0.1);
    const push = (p: V3) => {
      this.pos.push(p[0], p[1], p[2]);
      this.col.push(color.r * k, color.g * k, color.b * k);
      this.idx.push(this.idx.length);
    };
    push(a); push(b); push(c);
    if (!ref) {
      push(a); push(c); push(b);
    }
  }

  /** Normalises to height 1 with the trunk base at the origin. */
  done(): TreeTemplate {
    let minY = Infinity, maxY = -Infinity, w = 0;
    for (let i = 0; i < this.pos.length; i += 3) {
      minY = Math.min(minY, this.pos[i + 1]);
      maxY = Math.max(maxY, this.pos[i + 1]);
    }
    const h = maxY - minY || 1;
    const out = new Float32Array(this.pos.length);
    for (let i = 0; i < this.pos.length; i += 3) {
      out[i] = this.pos[i] / h;
      out[i + 1] = (this.pos[i + 1] - minY) / h;
      out[i + 2] = this.pos[i + 2] / h;
      w = Math.max(w, Math.abs(out[i]), Math.abs(out[i + 2]));
    }
    return { pos: out, col: new Float32Array(this.col), idx: new Uint32Array(this.idx), aspect: 2 * w };
  }
}

// ── Primitives ──

const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const v: V3[] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(
    (p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l] as V3; },
  );
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return { v, f };
})();

/** Subdivided once (80 faces) for big crowns; 20 faces for small ones. */
function sphereMesh(detail: 0 | 1) {
  if (!detail) return ICO;
  const v = ICO.v.slice();
  const f: number[][] = [];
  const mid = new Map<string, number>();
  const m = (a: number, b: number) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    let i = mid.get(key);
    if (i === undefined) {
      const p: V3 = [(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2];
      const l = Math.hypot(p[0], p[1], p[2]);
      i = v.push([p[0] / l, p[1] / l, p[2] / l]) - 1;
      mid.set(key, i);
    }
    return i;
  };
  for (const [a, b, c] of ICO.f) {
    const ab = m(a, b), bc = m(b, c), ca = m(c, a);
    f.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  return { v, f };
}

/** A lumpy low-poly crown blob. */
function blob(g: Geo, c: V3, r: V3, color: Color, rnd: () => number, detail: 0 | 1 = 1, lump = 0.16) {
  const { v, f } = sphereMesh(detail);
  const p = v.map((q) => {
    const k = 1 + (rnd() - 0.5) * 2 * lump;
    return [c[0] + q[0] * r[0] * k, c[1] + q[1] * r[1] * k, c[2] + q[2] * r[2] * k] as V3;
  });
  for (const [a, b, d] of f) g.tri(p[a], p[b], p[d], color, c, rnd);
}

/** A tapered prism from a to b (trunks, branches, palm segments). */
function limb(g: Geo, a: V3, b: V3, r0: number, r1: number, sides: number, color: Color, rnd: () => number, cap = false) {
  const ax = b[0] - a[0], ay = b[1] - a[1], az = b[2] - a[2];
  const al = Math.hypot(ax, ay, az) || 1;
  const d: V3 = [ax / al, ay / al, az / al];
  // Basis perpendicular to the axis.
  const up: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let ux = up[1] * d[2] - up[2] * d[1], uy = up[2] * d[0] - up[0] * d[2], uz = up[0] * d[1] - up[1] * d[0];
  const ul = Math.hypot(ux, uy, uz);
  ux /= ul; uy /= ul; uz /= ul;
  const wx = d[1] * uz - d[2] * uy, wy = d[2] * ux - d[0] * uz, wz = d[0] * uy - d[1] * ux;
  const ring = (o: V3, r: number, ph: number) =>
    Array.from({ length: sides }, (_, i) => {
      const t = ph + (i / sides) * Math.PI * 2;
      const c = Math.cos(t) * r, s = Math.sin(t) * r;
      return [o[0] + ux * c + wx * s, o[1] + uy * c + wy * s, o[2] + uz * c + wz * s] as V3;
    });
  const ph = rnd() * Math.PI;
  const A = ring(a, r0, ph);
  const B = ring(b, r1, ph);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const ref: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    g.tri(A[i], A[j], B[i], color, ref, rnd);
    g.tri(A[j], B[j], B[i], color, ref, rnd);
  }
  if (cap) for (let i = 1; i < sides - 1; i++) g.tri(B[0], B[i], B[i + 1], color, a, rnd);
}

/** A cone tier (firs), base ring at y0. */
function cone(g: Geo, x: number, y0: number, z: number, r: number, h: number, sides: number, color: Color, rnd: () => number, tilt = 0) {
  const ph = rnd() * Math.PI * 2;
  const apex: V3 = [x + tilt, y0 + h, z];
  const ring = Array.from({ length: sides }, (_, i) => {
    const t = ph + (i / sides) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * 0.18;
    return [x + Math.cos(t) * r * k, y0 + (rnd() - 0.5) * h * 0.08, z + Math.sin(t) * r * k] as V3;
  });
  const center: V3 = [x, y0 + h * 0.3, z];
  const under = new Color().copy(color).multiplyScalar(0.7);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    g.tri(ring[i], ring[j], apex, color, center, rnd);
    g.tri(ring[i], ring[j], [x, y0 + h * 0.12, z], under, [x, y0 + h, z], rnd);
  }
}

// ── Palettes (sRGB hex → linear) ──

const GREENS = ["#83bd67", "#a5cf72", "#6aae62", "#8fc56c", "#76b35f"];
const DEEP_GREENS = ["#5f9e5c", "#4f8f5a", "#6aa865"];
const FIR_GREENS = ["#3f7d55", "#4c8c5a", "#2f6b4f", "#558f5c"];
const AUTUMN = ["#eeb24f", "#e48d4a", "#d9603b", "#f2c94c", "#c94f3a"];
const BLOSSOM = ["#f2a7b8", "#f6c1cc", "#fbe3ea", "#ea8fa8"];
const BIRCH_LEAF = ["#a9c95c", "#bcd673", "#c8dd7f"];
const BARK = ["#8a5a3c", "#7a4e33", "#94643f"];
const pick = (rnd: () => number, a: string[]) => lin(a[Math.floor(rnd() * a.length)]);

// ── Recipes ──

/** Clustered broadleaf: a main crown with 2–4 side crowns at different heights. */
function broadleaf(seed: number, leaves: string[], fruit?: string): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const H = 5 + rnd() * 1.5;
  const trunkH = H * (0.38 + rnd() * 0.1);
  const lean = (rnd() - 0.5) * 0.4;
  const top: V3 = [lean, trunkH, 0];
  limb(g, [0, -0.3, 0], top, 0.32, 0.2, 6, pick(rnd, BARK), rnd);
  const R = H * (0.26 + rnd() * 0.06);
  blob(g, [lean, trunkH + R * 0.75, 0], [R, R * 0.85, R], pick(rnd, leaves), rnd, 1);
  const n = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.8;
    const d = R * (0.65 + rnd() * 0.25);
    const r = R * (0.5 + rnd() * 0.25);
    const c: V3 = [lean + Math.cos(a) * d, trunkH + R * (0.2 + rnd() * 0.7), Math.sin(a) * d];
    // A short branch out to each side crown.
    limb(g, [lean * 0.8, trunkH * 0.85, 0], [c[0] * 0.7, c[1] - r * 0.6, c[2] * 0.7], 0.14, 0.08, 5, pick(rnd, BARK), rnd);
    blob(g, c, [r, r * 0.85, r], pick(rnd, leaves), rnd, 0);
  }
  if (fruit) {
    const f = lin(fruit);
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const yy = trunkH + R * (0.2 + rnd() * 1.1);
      const rr = R * (0.85 + rnd() * 0.2);
      blob(g, [lean + Math.cos(a) * rr, yy, Math.sin(a) * rr], [0.16, 0.16, 0.16], f, rnd, 0, 0.05);
    }
  }
  return g.done();
}

/** A single round "lollipop" crown, slightly egg-shaped. */
function lollipop(seed: number, leaves: string[]): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const trunkH = 2 + rnd() * 1;
  limb(g, [0, -0.3, 0], [0, trunkH, 0], 0.26, 0.18, 6, pick(rnd, BARK), rnd);
  const R = 1.6 + rnd() * 0.6;
  blob(g, [0, trunkH + R * 0.85, 0], [R, R * (1.05 + rnd() * 0.3), R], pick(rnd, leaves), rnd, 1, 0.12);
  return g.done();
}

/** Flat-topped acacia: a forked, leaning trunk under wide, thin crowns. */
function acacia(seed: number): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const bark = pick(rnd, BARK);
  const fork: V3 = [0.4 + rnd() * 0.3, 2.6, 0];
  limb(g, [0, -0.3, 0], fork, 0.3, 0.2, 6, bark, rnd);
  const crowns = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < crowns; i++) {
    const a = (i / crowns) * Math.PI * 2 + rnd();
    const end: V3 = [fork[0] + Math.cos(a) * 1.4, 4 + rnd() * 0.8, Math.sin(a) * 1.4];
    limb(g, fork, end, 0.16, 0.1, 5, bark, rnd);
    const r = 1.7 + rnd() * 0.6;
    blob(g, [end[0], end[1] + 0.3, end[2]], [r, 0.45, r], pick(rnd, DEEP_GREENS), rnd, 1, 0.1);
  }
  return g.done();
}

/** Tiered fir (3–5 cones) or a slim many-tiered spruce. */
function fir(seed: number, slim: boolean): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const tiers = slim ? 6 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 3);
  const H = slim ? 8 : 6.5;
  limb(g, [0, -0.3, 0], [0, H * 0.3, 0], 0.24, 0.18, 6, pick(rnd, BARK), rnd);
  const col = pick(rnd, FIR_GREENS);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (slim ? 1.3 : 2.2) * (1 - t * 0.75) * (0.92 + rnd() * 0.16);
    const y0 = H * (0.18 + t * 0.62);
    const h = (H * 0.9) / tiers + r * 0.6;
    const shade = new Color().copy(col).multiplyScalar(0.92 + t * 0.16);
    cone(g, (rnd() - 0.5) * 0.08, y0, (rnd() - 0.5) * 0.08, r, h, slim ? 7 : 8, shade, rnd, (rnd() - 0.5) * 0.1);
  }
  return g.done();
}

/** Cypress-like poplar: tall narrow crown (one or two stacked lobes). */
function cypress(seed: number): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  limb(g, [0, -0.3, 0], [0, 1.4, 0], 0.22, 0.16, 6, pick(rnd, BARK), rnd);
  const col = pick(rnd, rnd() < 0.5 ? DEEP_GREENS : FIR_GREENS);
  const r = 0.85 + rnd() * 0.3;
  const h = 3.4 + rnd() * 0.8;
  blob(g, [0, 1.2 + h, 0], [r, h, r], col, rnd, 1, 0.1);
  if (rnd() < 0.6) blob(g, [0.15, 1.2 + h * 1.75, 0], [r * 0.6, h * 0.45, r * 0.6], new Color().copy(col).multiplyScalar(1.08), rnd, 0, 0.1);
  return g.done();
}

/** Birch: slim white trunk with dark bands, small light crowns high up. */
function birch(seed: number): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const white = lin("#efe9df");
  const band = lin("#3b3633");
  const H = 4.6 + rnd() * 1;
  const lean = (rnd() - 0.5) * 0.5;
  const seg = 6;
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg;
    const a: V3 = [lean * t0, -0.3 + H * t0, 0];
    const b: V3 = [lean * t1, -0.3 + H * t1, 0];
    limb(g, a, b, 0.2 - t0 * 0.08, 0.2 - t1 * 0.08, 6, i % 2 && rnd() < 0.7 ? band : white, rnd);
  }
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 0.4 + rnd() * 0.7;
    const r = 0.8 + rnd() * 0.5;
    blob(g, [lean + Math.cos(a) * d, H * (0.7 + rnd() * 0.35), Math.sin(a) * d], [r, r * 1.1, r], pick(rnd, BIRCH_LEAF), rnd, 0);
  }
  return g.done();
}

/** Palm: a curving, ringed trunk with drooping fronds and coconuts. */
function palm(seed: number): TreeTemplate {
  const rnd = mulberry32(seed);
  const g = new Geo();
  const trunkA = lin("#a97c50");
  const trunkB = lin("#8d6440");
  const H = 6 + rnd() * 1.5;
  const bend = 0.8 + rnd() * 1.2;
  const seg = 7;
  const pt = (t: number): V3 => [bend * t * t, H * t, 0];
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg;
    limb(g, pt(t0), pt(t1), 0.26 - t0 * 0.1, 0.24 - t1 * 0.1, 6, i % 2 ? trunkA : trunkB, rnd);
  }
  const top = pt(1);
  const fronds = 7 + Math.floor(rnd() * 3);
  const green = pick(rnd, ["#6aae62", "#5f9e5c", "#76b35f"]);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rnd() * 0.4;
    const L = 2.6 + rnd() * 0.8;
    const ca = Math.cos(a), sa = Math.sin(a);
    // Three segments, rising then drooping, tapering to a point.
    let prev: V3 = top;
    let w = 0.45;
    for (let k = 1; k <= 3; k++) {
      const t = k / 3;
      const p: V3 = [top[0] + ca * L * t, top[1] + 0.5 * t - 1.6 * t * t, top[2] + sa * L * t];
      const nw = 0.45 * (1 - t * 0.8);
      const px = -sa, pz = ca;
      g.tri([prev[0] + px * w, prev[1], prev[2] + pz * w], [prev[0] - px * w, prev[1], prev[2] - pz * w], [p[0] + px * nw, p[1], p[2] + pz * nw], green, null, rnd);
      g.tri([prev[0] - px * w, prev[1], prev[2] - pz * w], [p[0] - px * nw, p[1], p[2] - pz * nw], [p[0] + px * nw, p[1], p[2] + pz * nw], green, null, rnd);
      prev = p;
      w = nw;
    }
  }
  const nut = lin("#6b4a2b");
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2;
    blob(g, [top[0] + Math.cos(a) * 0.25, top[1] - 0.3, top[2] + Math.sin(a) * 0.25], [0.18, 0.2, 0.18], nut, rnd, 0, 0.05);
  }
  return g.done();
}

/** Every generated variant, by kind, in a fixed order. */
export function proceduralTreeTemplates(): { kind: TreeKind; t: TreeTemplate }[] {
  const out: { kind: TreeKind; t: TreeTemplate }[] = [];
  const add = (kind: TreeKind, t: TreeTemplate) => out.push({ kind, t });
  for (let i = 0; i < 4; i++) add("round", broadleaf(101 + i, GREENS));
  for (let i = 0; i < 2; i++) add("round", lollipop(131 + i, GREENS));
  add("round", broadleaf(151, GREENS, "#e2483a"));
  add("round", broadleaf(152, GREENS, "#f2a33a"));
  for (let i = 0; i < 2; i++) add("round", acacia(171 + i));
  for (let i = 0; i < 3; i++) add("autumn", broadleaf(201 + i, AUTUMN));
  for (let i = 0; i < 2; i++) add("autumn", lollipop(231 + i, AUTUMN));
  for (let i = 0; i < 3; i++) add("blossom", broadleaf(301 + i, BLOSSOM));
  add("blossom", lollipop(331, BLOSSOM));
  for (let i = 0; i < 4; i++) add("birch", birch(401 + i));
  for (let i = 0; i < 3; i++) add("pine", fir(501 + i, false));
  for (let i = 0; i < 3; i++) add("pine", fir(531 + i, true));
  for (let i = 0; i < 4; i++) add("poplar", cypress(601 + i));
  for (let i = 0; i < 4; i++) add("palm", palm(701 + i));
  return out;
}
