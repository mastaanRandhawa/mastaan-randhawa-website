/**
 * Smooth turning paths for the landing autopilot.
 *
 * The horizontal route is a Dubins path (arc → straight → arc at a fixed
 * minimum radius), so the plane never turns tighter than `radius`. A raw
 * Dubins path snaps from straight to full curvature at each joint, which reads
 * as a jerk in yaw and bank, so the heading is low-pass filtered along the
 * path: curvature then ramps in and out over `blend` metres, like a real
 * rolled-in turn. A small correction spread over the whole route puts the end
 * back exactly on the target.
 *
 * Headings use the game convention: forward = (-sin h, -cos h) in (x, z).
 */

export interface FlatPath {
  /** Sample spacing (m). */
  ds: number;
  length: number;
  x: Float32Array;
  z: Float32Array;
  /** Game heading, unwrapped (continuous). */
  hd: Float32Array;
  /** Heading change per metre (rad/m); sign matches heading. */
  k: Float32Array;
}

export interface PathOptions {
  /** Minimum turn radius (m). */
  radius: number;
  /** Distance over which curvature ramps in and out (m). */
  blend: number;
  /** Straight run after the start before turning (m). Defaults to blend / 2. */
  lead?: number;
  /** Straight run into the end (m). Defaults to blend / 2. */
  tail?: number;
  /** Target sample spacing (m). */
  step?: number;
}

const TAU = Math.PI * 2;
const mod2pi = (a: number) => ((a % TAU) + TAU) % TAU;
/** Game heading → math angle of the forward vector in the (x, z) plane. */
const thetaOf = (h: number) => Math.atan2(-Math.cos(h), -Math.sin(h));
const smooth01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

interface Plan {
  a1: number; // signed turn (rad), + = θ increasing
  str: number;
  a2: number;
  len: number;
}

/** Shortest CSC Dubins word between two poses (math-angle headings). */
function dubins(x0: number, z0: number, t0: number, x1: number, z1: number, t1: number, R: number): Plan {
  const left = (x: number, z: number, t: number): [number, number] => [x - R * Math.sin(t), z + R * Math.cos(t)];
  const right = (x: number, z: number, t: number): [number, number] => [x + R * Math.sin(t), z - R * Math.cos(t)];
  let best: Plan | null = null;
  const consider = (a1: number, str: number, a2: number) => {
    const len = R * (Math.abs(a1) + Math.abs(a2)) + str;
    if (!best || len < best.len) best = { a1, str, a2, len };
  };
  // LSL / RSR: outer tangents, always exist.
  {
    const [ax, az] = left(x0, z0, t0);
    const [bx, bz] = left(x1, z1, t1);
    const ts = Math.atan2(bz - az, bx - ax);
    consider(mod2pi(ts - t0), Math.hypot(bx - ax, bz - az), mod2pi(t1 - ts));
  }
  {
    const [ax, az] = right(x0, z0, t0);
    const [bx, bz] = right(x1, z1, t1);
    const ts = Math.atan2(bz - az, bx - ax);
    consider(-mod2pi(t0 - ts), Math.hypot(bx - ax, bz - az), -mod2pi(ts - t1));
  }
  // LSR / RSL: inner tangents, need the circles apart.
  {
    const [ax, az] = left(x0, z0, t0);
    const [bx, bz] = right(x1, z1, t1);
    const D = Math.hypot(bx - ax, bz - az);
    if (D >= 2 * R) {
      const L = Math.sqrt(D * D - 4 * R * R);
      const tu = Math.atan2(bz - az, bx - ax) + Math.atan2(2 * R, L);
      consider(mod2pi(tu - t0), L, -mod2pi(tu - t1));
    }
  }
  {
    const [ax, az] = right(x0, z0, t0);
    const [bx, bz] = left(x1, z1, t1);
    const D = Math.hypot(bx - ax, bz - az);
    if (D >= 2 * R) {
      const L = Math.sqrt(D * D - 4 * R * R);
      const tu = Math.atan2(bz - az, bx - ax) - Math.atan2(2 * R, L);
      consider(-mod2pi(t0 - tu), L, mod2pi(t1 - tu));
    }
  }
  return best!;
}

/** Box filter with clamped ends (values beyond the ends repeat the end value). */
function boxFilter(src: Float64Array, half: number): Float64Array {
  const n = src.length;
  if (half < 1) return src.slice();
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + src[i];
  const out = new Float64Array(n);
  const w = 2 * half + 1;
  for (let i = 0; i < n; i++) {
    const lo = i - half;
    const hi = i + half;
    let sum = pre[Math.min(n, hi + 1)] - pre[Math.max(0, lo)];
    if (lo < 0) sum += -lo * src[0];
    if (hi > n - 1) sum += (hi - (n - 1)) * src[n - 1];
    out[i] = sum / w;
  }
  return out;
}

/** A smooth flat path from (x0, z0) heading h0 to (x1, z1) heading h1. */
export function buildFlatPath(x0: number, z0: number, h0: number, x1: number, z1: number, h1: number, o: PathOptions): FlatPath {
  const R = o.radius;
  const lead = o.lead ?? o.blend / 2;
  const tail = o.tail ?? o.blend / 2;
  const t0 = thetaOf(h0);
  const t1 = thetaOf(h1);
  const sx = x0 + Math.cos(t0) * lead;
  const sz = z0 + Math.sin(t0) * lead;
  const ex = x1 - Math.cos(t1) * tail;
  const ez = z1 - Math.sin(t1) * tail;
  const plan = dubins(sx, sz, t0, ex, ez, t1, R);
  const total = lead + plan.len + tail;
  const n = Math.max(3, Math.ceil(total / (o.step ?? 1)) + 1);
  const ds = total / (n - 1);

  // Raw heading (math angle) along the route, piecewise linear.
  const e1 = lead + R * Math.abs(plan.a1);
  const e2 = e1 + plan.str;
  const e3 = e2 + R * Math.abs(plan.a2);
  const tStr = t0 + plan.a1;
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = i * ds;
    if (s <= lead) raw[i] = t0;
    else if (s <= e1) raw[i] = t0 + Math.sign(plan.a1) * (s - lead) / R;
    else if (s <= e2) raw[i] = tStr;
    else if (s <= e3) raw[i] = tStr + Math.sign(plan.a2) * (s - e2) / R;
    else raw[i] = tStr + plan.a2;
  }
  // Two box passes ≈ a triangular kernel: curvature ramps in smoothly with no corners.
  const half = Math.max(0, Math.round(o.blend / 4 / ds));
  const th = boxFilter(boxFilter(raw, half), half);

  // Integrate, then spread the end error over the route (zero slope at both ends keeps the end headings).
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  xs[0] = x0;
  zs[0] = z0;
  for (let i = 1; i < n; i++) {
    const tm = (th[i - 1] + th[i]) / 2;
    xs[i] = xs[i - 1] + Math.cos(tm) * ds;
    zs[i] = zs[i - 1] + Math.sin(tm) * ds;
  }
  const errX = x1 - xs[n - 1];
  const errZ = z1 - zs[n - 1];
  const x = new Float32Array(n);
  const z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = smooth01(i / (n - 1));
    x[i] = xs[i] + errX * w;
    z[i] = zs[i] + errZ * w;
  }

  // Heading from the final geometry (unwrapped), and its rate per metre.
  const hd = new Float32Array(n);
  let prev = h0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let h = Math.atan2(-(xs[b] - xs[a] + errX * (smooth01(b / (n - 1)) - smooth01(a / (n - 1)))), -(zs[b] - zs[a] + errZ * (smooth01(b / (n - 1)) - smooth01(a / (n - 1)))));
    h = prev + Math.atan2(Math.sin(h - prev), Math.cos(h - prev));
    hd[i] = h;
    prev = h;
  }
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    k[i] = (hd[b] - hd[a]) / ((b - a) * ds);
  }
  return { ds, length: total, x, z, hd, k };
}

/**
 * Heading at arc length s, interpolated as a cubic Hermite with the stored
 * turn rates as slopes, so the yaw rate is continuous between samples too.
 */
export function sampleHeading(p: FlatPath, s: number): number {
  const f = Math.max(0, Math.min(p.length, s)) / p.ds;
  const i = Math.min(p.hd.length - 2, Math.floor(f));
  const t = f - i;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p.hd[i] + (t3 - 2 * t2 + t) * p.k[i] * p.ds + (-2 * t3 + 3 * t2) * p.hd[i + 1] + (t3 - t2) * p.k[i + 1] * p.ds;
}

/** Linear lookup of a per-sample array at arc length s. */
export function sampleArr(p: { ds: number; length: number }, arr: ArrayLike<number>, s: number): number {
  const f = Math.max(0, Math.min(p.length, s)) / p.ds;
  const i = Math.min(arr.length - 2, Math.floor(f));
  const t = f - i;
  return arr[i] + (arr[i + 1] - arr[i]) * t;
}
