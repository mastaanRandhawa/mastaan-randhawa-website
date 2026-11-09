import { Color } from "three";
import { clamp, fbm2, lerp, mulberry32, noise2, smoothstep } from "./noise";
import type { MeshBuilder } from "@/render/geometry/MeshBuilder";
import { SEA_LEVEL } from "./layout";

interface Harmonic {
  k: number;
  amp: number;
  phase: number;
}

/** A seeded set of sine harmonics (frequencies k0..k1 around a circle), amplitudes ∝ 1/k. */
function harmonics(seed: number, k0: number, k1: number): Harmonic[] {
  const rnd = mulberry32(seed);
  const out: Harmonic[] = [];
  let norm = 0;
  for (let k = k0; k <= k1; k++) {
    out.push({ k, amp: 1 / k, phase: rnd() * Math.PI * 2 });
    norm += 1 / k;
  }
  for (const h of out) h.amp /= norm;
  return out;
}

/** Smooth periodic noise in about -1..1. */
function periodic(hs: Harmonic[], theta: number): number {
  let v = 0;
  for (const h of hs) v += Math.sin(theta * h.k + h.phase) * h.amp;
  return v * 1.6;
}

/** Beach sand and the darker wet line at the waterline. */
const SAND = new Color("#f1d68e");
const WET_SAND = new Color("#dcc38a");
const MEADOW = new Color("#c3d97b");

/** A flattened area on an island top (runway, plaza, building footprint). */
export interface Pad {
  x: number;
  z: number;
  /** Circle radius, or half-extent fallback for rects. */
  r: number;
  h: number;
  /** Rectangle half-extents (if set, pad is a rotated rect). */
  w?: number;
  l?: number;
  ry?: number;
  blend?: number;
  color?: string;
  colorStrength?: number;
}

export interface IslandPalette {
  grassA: string;
  grassB: string;
  edge: string;
  dirt: string;
  rockA: string;
  rockB: string;
  rockC: string;
  snow?: string;
}

export const PALETTES = {
  meadow: { grassA: "#83bd67", grassB: "#a6cf74", edge: "#e2cf8f", dirt: "#c79a6b", rockA: "#e7c39a", rockB: "#d4a57d", rockC: "#f0d5ab" },
  lush: { grassA: "#6aae62", grassB: "#8fc56c", edge: "#dccb8c", dirt: "#bf9067", rockA: "#e2bc94", rockB: "#cc9d78", rockC: "#eed1a8" },
  autumn: { grassA: "#a9bd5f", grassB: "#cdc56c", edge: "#e6cd8c", dirt: "#c99568", rockA: "#ebc398", rockB: "#d6a47a", rockC: "#f2d6ac" },
  tech: { grassA: "#79b77c", grassB: "#97c886", edge: "#d8cf9c", dirt: "#b69277", rockA: "#dcc1a6", rockB: "#c4a68c", rockC: "#ead4bb" },
  lavender: { grassA: "#8dbf6d", grassB: "#acc977", edge: "#e0ce98", dirt: "#bf9479", rockA: "#e0c0a6", rockB: "#c9a28c", rockC: "#efd6bf" },
  alpine: { grassA: "#6aa865", grassB: "#8dbd6c", edge: "#d6cc9a", dirt: "#a88a6e", rockA: "#cfc4b6", rockB: "#b5a999", rockC: "#e0d7c9", snow: "#fbf8f1" },
  spire: { grassA: "#7fb66a", grassB: "#a0c875", edge: "#ddd1ac", dirt: "#ad9179", rockA: "#e6d8c4", rockB: "#cdbca6", rockC: "#f1e6d4", snow: "#fbf8f1" },
  desert: { grassA: "#d6bd7f", grassB: "#e3cb8f", edge: "#ead39b", dirt: "#c08d62", rockA: "#e3b386", rockB: "#cf9a6f", rockC: "#efc99d" },
} satisfies Record<string, IslandPalette>;

export interface IslandParams {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Ellipse stretch. */
  sx?: number;
  sz?: number;
  seed: number;
  hilliness?: number;
  hillScale?: number;
  irregularity?: number;
  depth?: number;
  pads?: Pad[];
  palette?: IslandPalette;
  rimDrop?: number;
  rings?: number;
  segments?: number;
  layers?: number;
  /** Mountain peaks rising from the top surface (bell-shaped). */
  peaks?: { height: number; radius: number; x?: number; z?: number; sharpness?: number }[];
  /** Slope above which faces turn to rock (0..∞). */
  rockSlope?: number;
  /**
   * "taper" floats with a pointed underside; "column" is a tall mesa; "shore"
   * rises from the ocean: sandstone cliffs flaring into green slopes and a
   * beach at sea level. Taper islands become shore islands unless `grounded`
   * is false.
   */
  profile?: "taper" | "column" | "shore";
  grounded?: boolean;
  /** Snow line height (local) for peaks. */
  snowLine?: number;
}

const c1 = new Color();
const c2 = new Color();

export class IslandTerrain {
  readonly p: Required<Omit<IslandParams, "peaks" | "snowLine" | "rockSlope" | "grounded">> & Pick<IslandParams, "peaks" | "snowLine" | "rockSlope" | "grounded">;
  readonly maxTop: number;
  /** Shore islands: mean outward spread (m) of the hill base at sea level, before fitting. */
  readonly flare: number = 0;
  /**
   * Per-side shrink of the base (32 sectors around the island) where it would
   * crowd a ring, collectible or landing path; see fitShore.
   */
  readonly sectorScale = new Float32Array(32).fill(1);
  /** Mean outline radius. */
  readonly meanRadius: number;
  private harmonics: Harmonic[] = [];
  /** Around-the-island variation of the base: headlands and coves, cliff faces, beach width. */
  private lobeH: Harmonic[];
  private cliffH: Harmonic[];
  private beachH: Harmonic[];

  constructor(params: IslandParams) {
    const defined = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as IslandParams;
    this.p = {
      sx: 1,
      sz: 1,
      hilliness: 5,
      hillScale: 0.018,
      irregularity: 0.16,
      depth: params.radius * 0.85,
      pads: [],
      palette: PALETTES.meadow,
      rimDrop: 1.5,
      rings: 16,
      segments: 64,
      layers: 7,
      profile: "taper",
      ...defined,
    };
    // Islands sit in an ocean: anything that would float low enough grows a
    // cliff-and-beach base down to the water instead of a pointed underside.
    const above = this.p.y - this.p.rimDrop - SEA_LEVEL;
    if (this.p.profile === "taper" && params.grounded !== false && above > 6 && this.p.y < 185) {
      this.p.profile = "shore";
      this.p.depth = above + 6;
      // A wide, rolling hill base: roughly as wide as it is tall.
      this.flare = Math.min(64, Math.max(12, above * 0.95));
    }
    this.meanRadius = this.p.radius * (this.p.sx + this.p.sz) * 0.5;
    this.lobeH = harmonics(this.p.seed + 55, 1, 4);
    this.cliffH = harmonics(this.p.seed + 77, 2, 5);
    this.beachH = harmonics(this.p.seed + 99, 2, 6);
    const rndH = mulberry32(this.p.seed);
    let norm = 0;
    for (let k = 2; k < 7; k++) {
      this.harmonics.push({ k, amp: 1 / k, phase: rndH() * Math.PI * 2 });
      norm += 1 / k;
    }
    for (const h of this.harmonics) h.amp /= norm;
    // Estimate max height for collision broad-phase.
    let m = -Infinity;
    for (let i = 0; i < 400; i++) {
      const a = (i / 400) * Math.PI * 2;
      for (const f of [0, 0.2, 0.4, 0.6, 0.8]) {
        const r = f * this.p.radius;
        m = Math.max(m, this.heightLocal(Math.cos(a) * r * this.p.sx, Math.sin(a) * r * this.p.sz));
      }
    }
    this.maxTop = m;
  }

  get id() {
    return this.p.id;
  }

  /** Outline multiplier for a given angle (≈ 1 ± irregularity). */
  edge(theta: number): number {
    let v = 0;
    for (const h of this.harmonics) v += Math.sin(theta * h.k + h.phase) * h.amp;
    return 1 + this.p.irregularity * v;
  }

  /** Normalised radial fraction (0 centre → 1 outline) in local space. */
  rho(lx: number, lz: number): number {
    const nx = lx / this.p.sx;
    const nz = lz / this.p.sz;
    const d = Math.hypot(nx, nz);
    const th = Math.atan2(nz, nx);
    return d / (this.p.radius * this.edge(th));
  }

  private padWeight(pad: Pad, lx: number, lz: number): number {
    const blend = pad.blend ?? 8;
    let dist: number;
    if (pad.w !== undefined && pad.l !== undefined) {
      const c = Math.cos(-(pad.ry ?? 0));
      const s = Math.sin(-(pad.ry ?? 0));
      const dx = lx - pad.x;
      const dz = lz - pad.z;
      const rx = Math.abs(dx * c - dz * s) - pad.w;
      const rz = Math.abs(dx * s + dz * c) - pad.l;
      dist = Math.hypot(Math.max(rx, 0), Math.max(rz, 0)) + Math.min(Math.max(rx, rz), 0);
    } else {
      dist = Math.hypot(lx - pad.x, lz - pad.z) - pad.r;
    }
    return 1 - smoothstep(0, blend, dist);
  }

  /** Top-surface height in local space (valid inside the outline). */
  heightLocal(lx: number, lz: number): number {
    const p = this.p;
    const rho = this.rho(lx, lz);
    const falloff = 1 - smoothstep(0.62, 1.0, rho);
    let h = p.hilliness * (fbm2(lx * p.hillScale, lz * p.hillScale, p.seed, 4) * 0.5 + 0.5) * falloff;
    h += noise2(lx * 0.09, lz * 0.09, p.seed + 7) * 0.35;
    if (p.peaks) {
      const ridge = fbm2(lx * 0.014, lz * 0.014, p.seed + 3, 4);
      for (const pk of p.peaks) {
        const pr = clamp(Math.hypot(lx - (pk.x ?? 0), lz - (pk.z ?? 0)) / pk.radius, 0, 1);
        const bell = Math.pow((1 + Math.cos(Math.PI * pr)) / 2, pk.sharpness ?? 1.4);
        h += pk.height * bell * (0.88 + ridge * 0.3);
      }
    }
    h -= p.rimDrop * smoothstep(0.9, 1.0, rho);
    for (const pad of p.pads) {
      const w = this.padWeight(pad, lx, lz);
      if (w > 0) h = lerp(h, pad.h, w);
    }
    return h;
  }

  /** World-space top height, or null outside the island footprint. */
  topAt(wx: number, wz: number): number | null {
    const lx = wx - this.p.x;
    const lz = wz - this.p.z;
    if (this.rho(lx, lz) > 1) return null;
    return this.p.y + this.heightLocal(lx, lz);
  }

  /** Underside radius fraction at depth fraction t (0 = rim, 1 = tip). */
  profileAt(t: number): number {
    if (this.p.profile === "shore") return this.shoreProfile(this.p.y - this.p.rimDrop - 2.5 - t * (this.p.depth - 2.5), 0);
    return this.p.profile === "column" ? 1 - 0.22 * Math.pow(t, 3) : 1 - 0.97 * Math.pow(t, 2.2);
  }

  /** Angle around the island in the same (ellipse-normalised) frame as `edge`. */
  thetaOf(lx: number, lz: number): number {
    return Math.atan2(lz / this.p.sz, lx / this.p.sx);
  }

  /** 0.55..1.45: headlands push the base out, coves pull it in. */
  lobe(theta: number): number {
    return 1 + 0.45 * periodic(this.lobeH, theta);
  }

  /** 0..1: how much this side of the island is a cliff face rather than a green slope. */
  cliff(theta: number): number {
    return smoothstep(0.3, 0.72, periodic(this.cliffH, theta));
  }

  /** Width (m) of the sand beach at this angle; narrow under cliffs. */
  beachWidth(theta: number): number {
    return (5 + 6 * (0.5 + 0.5 * periodic(this.beachH, theta))) * (1 - 0.75 * this.cliff(theta));
  }

  /** World y where the hill base starts below the rim. */
  get shoulderY(): number {
    return this.p.y - this.p.rimDrop - 1;
  }

  /**
   * Shore islands: outward spread (m) of the base beyond the top outline at
   * world height y and angle theta. Green sides roll over the rim and sweep
   * out in a long concave slope; cliff sides drop steeply, then kick out at the foot.
   */
  extraAt(y: number, theta: number): number {
    const H0 = Math.max(1, this.shoulderY - SEA_LEVEL);
    const u = 1 - (y - SEA_LEVEL) / H0;
    if (u <= 0) return 0;
    const uu = Math.min(1, u);
    const soft = 0.12 * Math.min(1, uu * 4) + 0.88 * Math.pow(uu, 1.45);
    const steep = 0.05 * Math.min(1, uu * 4) + 0.95 * Math.pow(uu, 3.2);
    let e = this.flare * this.scaleAt(theta) * this.lobe(theta) * lerp(soft, steep, this.cliff(theta));
    if (u > 1) e += this.beachWidth(theta) + Math.min(14, (u - 1) * H0 * 1.5);
    return e;
  }

  /** Spread (m) of the waterline beyond the top outline: where the sea meets the beach. */
  coastExtra(theta: number): number {
    return this.extraAt(SEA_LEVEL, theta) + this.beachWidth(theta);
  }

  /** Shore islands: outline fraction (comparable with `rho`) of the base at height y. */
  shoreProfile(y: number, theta: number): number {
    return 1 + this.extraAt(y, theta) / (this.p.radius * this.edge(theta));
  }

  /** Local point on the hill base: angle theta, u from 0 (shoulder) to 1 (just above the beach). */
  slopePoint(theta: number, u: number): [number, number, number] {
    const H0 = Math.max(1, this.shoulderY - SEA_LEVEL);
    const wy = this.shoulderY - u * (H0 - 2.2);
    const f = this.shoreProfile(wy, theta);
    const er = this.p.radius * this.edge(theta);
    return [Math.cos(theta) * er * this.p.sx * f, wy - this.p.y, Math.sin(theta) * er * this.p.sz * f];
  }

  /**
   * Shrinks the base until it keeps clear of the given spheres (rings,
   * collectibles, landing paths), so the bigger islands never block gameplay.
   */
  fitShore(points: { x: number; y: number; z: number; r: number }[]) {
    if (this.p.profile !== "shore") return;
    const p = this.p;
    const n = this.sectorScale.length;
    const sectorOf = (th: number) => ((Math.round((th / (Math.PI * 2)) * n) % n) + n) % n;
    for (const pt of points) {
      if (pt.y - pt.r > this.shoulderY) continue;
      const lx = pt.x - p.x;
      const lz = pt.z - p.z;
      const rho = this.rho(lx, lz);
      if (rho < 1) continue; // over the top itself: nothing a base can fix
      const th = this.thetaOf(lx, lz);
      const er = p.radius * this.edge(th);
      // Blocked if the base surface is above the sphere's bottom here, or (below
      // the shoulder) reaches within a radius sideways at the sphere's height.
      const blocked = () =>
        (this.shoreProfile(Math.max(SEA_LEVEL, pt.y - pt.r), th) - rho) * er > 0 ||
        (pt.y < this.shoulderY && (this.shoreProfile(Math.max(SEA_LEVEL, pt.y), th) - rho) * er + pt.r > 0);
      const s = sectorOf(th);
      for (let iter = 0; iter < 16 && blocked(); iter++) {
        // Pull this side in (and its neighbours a little, so it reads as a cove).
        this.sectorScale[s] *= 0.8;
        this.sectorScale[(s + 1) % n] = Math.min(this.sectorScale[(s + 1) % n], this.sectorScale[s] + 0.2);
        this.sectorScale[(s + n - 1) % n] = Math.min(this.sectorScale[(s + n - 1) % n], this.sectorScale[s] + 0.2);
        if (this.sectorScale[s] < 0.05) break;
      }
    }
  }

  /** Base spread factor at angle theta (interpolated between sectors). */
  scaleAt(theta: number): number {
    const n = this.sectorScale.length;
    const f = (((theta / (Math.PI * 2)) * n) % n + n) % n;
    const i = Math.floor(f);
    const t = f - i;
    return this.sectorScale[i % n] * (1 - t) + this.sectorScale[(i + 1) % n] * t;
  }

  /** Mean base spread factor (for decoration counts). */
  get meanScale(): number {
    let s = 0;
    for (const v of this.sectorScale) s += v;
    return s / this.sectorScale.length;
  }

  /** Largest outline fraction anywhere on the island (broad-phase bounds). */
  get maxProfile(): number {
    if (this.p.profile !== "shore") return 1;
    return 1 + (this.flare * 1.45 + 26) / (this.p.radius * (1 - this.p.irregularity));
  }

  /** World Y of the bottom tip region. */
  get bottomY(): number {
    return this.p.y - this.p.rimDrop - this.p.depth;
  }

  get boundRadius(): number {
    return this.p.radius * Math.max(this.p.sx, this.p.sz) * (1 + this.p.irregularity) * this.maxProfile;
  }

  /** Builds the terrain mesh (local coordinates) into `b`. */
  build(b: MeshBuilder) {
    const p = this.p;
    const pal = p.palette;
    const R = p.rings;
    const S = p.segments;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const rnd = mulberry32(p.seed + 101);

    const grassA = new Color(pal.grassA);
    const grassB = new Color(pal.grassB);
    const edgeC = new Color(pal.edge);
    const rockA = new Color(pal.rockA);
    const rockB = new Color(pal.rockB);
    const rockC = new Color(pal.rockC);
    const dirt = new Color(pal.dirt);
    const snow = new Color(pal.snow ?? "#f4f6fb");

    const topColor = (lx: number, lz: number, h: number, rho: number) => {
      const n = fbm2(lx * 0.05, lz * 0.05, p.seed + 11, 3) * 0.5 + 0.5;
      c1.copy(grassA).lerp(grassB, n);
      // Painted meadow patches: sunny yellow-green drifts and deeper green clumps.
      const m = fbm2(lx * 0.022 + 9, lz * 0.022 - 4, p.seed + 31, 3);
      c1.lerp(MEADOW, smoothstep(0.25, 0.55, m) * 0.45);
      c1.lerp(c2.copy(grassA).multiplyScalar(0.8), smoothstep(-0.25, -0.55, m) * 0.5);
      // Slope → rock
      const e = 1.5;
      const dx = this.heightLocal(lx + e, lz) - this.heightLocal(lx - e, lz);
      const dz = this.heightLocal(lx, lz + e) - this.heightLocal(lx, lz - e);
      const slope = Math.hypot(dx, dz) / (2 * e);
      const rs = p.rockSlope ?? 0.55;
      if (slope > rs) c1.lerp(c2.copy(rockA).lerp(rockC, n), smoothstep(rs, rs * 2, slope));
      if (p.snowLine !== undefined && h > p.snowLine) {
        c1.lerp(snow, smoothstep(p.snowLine, p.snowLine + 25, h + noise2(lx * 0.05, lz * 0.05, p.seed) * 12));
      }
      // Floating rims get a sandy lip; ocean islands roll on into the green slope.
      c1.lerp(edgeC, smoothstep(0.9, 1.0, rho) * (p.profile === "shore" ? 0.12 : 0.7));
      // Low ground meets the sea in a beach.
      const wy = p.y + h;
      if (wy < SEA_LEVEL + 4) c1.lerp(wy < SEA_LEVEL + 0.4 ? WET_SAND : SAND, smoothstep(SEA_LEVEL + 4, SEA_LEVEL + 1.2, wy));
      for (const pad of p.pads) {
        if (!pad.color) continue;
        const w = this.padWeight(pad, lx, lz);
        if (w > 0.01) c1.lerp(c2.set(pad.color), w * (pad.colorStrength ?? 1));
      }
      col.push(c1.r, c1.g, c1.b);
    };

    // ── Top surface: centre + polar rings ──
    const ringRadius = (i: number) => {
      const t = i / R;
      return t < 1 ? Math.pow(t, 0.9) : 1;
    };
    pos.push(0, this.heightLocal(0, 0), 0);
    topColor(0, 0, this.heightLocal(0, 0), 0);
    const edgeXZ: [number, number][] = [];
    for (let i = 1; i <= R; i++) {
      const f = ringRadius(i);
      for (let j = 0; j < S; j++) {
        const th = (j / S) * Math.PI * 2 + (i % 2) * (Math.PI / S) * 0.5;
        const er = p.radius * this.edge(th) * f;
        const lx = Math.cos(th) * er * p.sx;
        const lz = Math.sin(th) * er * p.sz;
        const h = this.heightLocal(lx, lz);
        pos.push(lx, h, lz);
        topColor(lx, lz, h, f);
        if (i === R) edgeXZ.push([lx, lz]);
      }
    }
    for (let j = 0; j < S; j++) {
      const a = 1 + j;
      const b2 = 1 + ((j + 1) % S);
      idx.push(0, b2, a);
    }
    for (let i = 1; i < R; i++) {
      const r0 = 1 + (i - 1) * S;
      const r1 = 1 + i * S;
      for (let j = 0; j < S; j++) {
        const j1 = (j + 1) % S;
        idx.push(r0 + j, r0 + j1, r1 + j);
        idx.push(r0 + j1, r1 + j1, r1 + j);
      }
    }

    if (p.profile === "shore") {
      this.buildShore(edgeXZ, pos, col, idx, rnd, [rockA, rockC, rockB, rockC], grassA, grassB);
      b.addRaw(pos, col, idx);
      return;
    }

    // ── Underside: strata layers tapering to a tip ──
    const L = p.layers;
    const layerStart = pos.length / 3;
    for (let k = 0; k <= L; k++) {
      const t = k / L;
      const f = this.profileAt(t);
      const bandIndex = k;
      for (let j = 0; j < S; j++) {
        const [ex, ez] = edgeXZ[j];
        const top = this.heightLocal(ex, ez);
        const jitterR = k === 0 ? 1 : 1 + (rnd() - 0.5) * 0.12;
        const jitterY = k === 0 ? 0 : (rnd() - 0.5) * 3.2;
        const y = k === 0 ? top - 0.05 : top - (2.5 + (p.depth - 2.5) * t) + jitterY;
        const ff = k === 0 ? 1.004 : f * jitterR;
        pos.push(ex * ff, y, ez * ff);
        if (k <= 1) c1.copy(dirt).lerp(edgeC, k === 0 ? 0.35 : 0);
        else {
          const band = [rockA, rockB, rockC, rockB][bandIndex % 4];
          c1.copy(band).lerp(rockB, rnd() * 0.3).multiplyScalar(1 - t * 0.18);
        }
        // Sea stacks and spires stand in a ring of sand at the waterline.
        if (p.y + y < SEA_LEVEL + 2.5) c1.copy(SAND);
        col.push(c1.r, c1.g, c1.b);
      }
    }
    for (let k = 0; k < L; k++) {
      const r0 = layerStart + k * S;
      const r1 = layerStart + (k + 1) * S;
      for (let j = 0; j < S; j++) {
        const j1 = (j + 1) % S;
        idx.push(r0 + j, r0 + j1, r1 + j);
        idx.push(r0 + j1, r1 + j1, r1 + j);
      }
    }
    // Tip
    const tipIndex = pos.length / 3;
    const lastTop = this.heightLocal(0, 0);
    pos.push((rnd() - 0.5) * p.radius * 0.1, lastTop - p.depth - 8, (rnd() - 0.5) * p.radius * 0.1);
    c1.copy(rockB).multiplyScalar(0.6);
    col.push(c1.r, c1.g, c1.b);
    const rl = layerStart + L * S;
    for (let j = 0; j < S; j++) idx.push(rl + j, rl + ((j + 1) % S), tipIndex);

    b.addRaw(pos, col, idx);
  }

  /**
   * Base of an ocean island: the grassy top rolls over the rim into a wide,
   * lumpy hillside with headlands and coves; some sides are layered sandstone
   * cliffs instead. A sand beach rings the foot and a shelf runs under the sea.
   */
  private buildShore(edgeXZ: [number, number][], pos: number[], col: number[], idx: number[], rnd: () => number, bands: Color[], grassA: Color, grassB: Color) {
    const p = this.p;
    const S = edgeXZ.length;
    const sea = SEA_LEVEL - p.y; // local sea height
    const top = this.shoulderY - p.y; // local y where the slope starts
    const H0 = Math.max(1, top - sea);
    const N = Math.max(6, Math.min(16, Math.round(H0 / 4.5)));
    // Row heights (local): lip, slope rows down to just above the sand, beach, waterline, shelf.
    type Row = { y: number; kind: "lip" | "slope" | "beach" | "water" | "shelf"; k: number };
    const rows: Row[] = [{ y: 0, kind: "lip", k: 0 }];
    for (let k = 1; k <= N; k++) rows.push({ y: top - (k / N) * (H0 - 2.2), kind: "slope", k });
    rows.push({ y: sea + 1.1, kind: "beach", k: 0 });
    rows.push({ y: sea - 0.7, kind: "water", k: 0 });
    rows.push({ y: sea - 8, kind: "shelf", k: 0 });
    const thetas = edgeXZ.map(([ex, ez]) => this.thetaOf(ex, ez));
    const start = pos.length / 3;
    for (const row of rows) {
      for (let j = 0; j < S; j++) {
        const [ex, ez] = edgeXZ[j];
        const th = thetas[j];
        const er = p.radius * this.edge(th);
        const cl = this.cliff(th);
        const bw = this.beachWidth(th);
        let y = row.y;
        let extra: number;
        if (row.kind === "lip") {
          y = this.heightLocal(ex, ez) - 0.05;
          extra = 0.05;
        } else if (row.kind === "slope") {
          // Small vertical and radial wobble keeps the hillside lumpy, not lathed.
          if (row.k < N) y += (rnd() - 0.5) * Math.min(2, (H0 / N) * 0.5);
          extra = this.extraAt(p.y + y, th) + (row.k < N ? (rnd() - 0.5) * 2.2 : 0);
        } else if (row.kind === "beach") extra = this.extraAt(SEA_LEVEL + 2.2, th) + bw * 0.45;
        else if (row.kind === "water") extra = this.extraAt(SEA_LEVEL, th) + bw;
        else extra = this.extraAt(SEA_LEVEL, th) + bw + 14;
        const f = 1 + extra / er;
        const x = ex * f;
        const z = ez * f;
        const hAbove = p.y + y - SEA_LEVEL;
        // Colour: grass with painted patches, sandstone where the side is a cliff
        // or rock breaks through, and sand at the foot.
        const n = fbm2(x * 0.035, z * 0.035, p.seed + 21, 3);
        c1.copy(grassA).lerp(grassB, smoothstep(-0.3, 0.4, n));
        c1.lerp(MEADOW, smoothstep(0.35, 0.6, n) * 0.35);
        const u = row.kind === "slope" ? row.k / N : row.kind === "lip" ? 0 : 1;
        c1.multiplyScalar(1 - 0.1 * u);
        if (row.kind === "slope") {
          const outcrop = smoothstep(0.42, 0.62, fbm2(x * 0.06 + 13, z * 0.06, p.seed + 41, 2)) * smoothstep(0.15, 0.4, u) * (1 - smoothstep(0.85, 1, u));
          const rockAmt = Math.max(cl * smoothstep(0.04, 0.2, u), outcrop * 0.9);
          if (rockAmt > 0.01) {
            c2.copy(bands[row.k % bands.length]).multiplyScalar(0.94 + rnd() * 0.1);
            c1.lerp(c2, rockAmt);
          }
        }
        if (row.kind === "beach") c1.copy(SAND).lerp(WET_SAND, rnd() * 0.2);
        else if (row.kind === "water" || row.kind === "shelf") c1.copy(WET_SAND);
        else if (hAbove < 3.4) c1.lerp(SAND, smoothstep(3.4, 2.0, hAbove));
        pos.push(x, y, z);
        col.push(c1.r, c1.g, c1.b);
      }
    }
    for (let k = 0; k < rows.length - 1; k++) {
      const r0 = start + k * S;
      const r1 = start + (k + 1) * S;
      for (let j = 0; j < S; j++) {
        const j1 = (j + 1) % S;
        idx.push(r0 + j, r0 + j1, r1 + j);
        idx.push(r0 + j1, r1 + j1, r1 + j);
      }
    }
  }
}
