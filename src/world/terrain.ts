import { Color } from "three";
import { clamp, fbm2, lerp, mulberry32, noise2, smoothstep } from "./noise";
import type { MeshBuilder } from "@/render/geometry/MeshBuilder";
import { SEA_LEVEL } from "./layout";
import { terrainProfile, type CoastFeature, type IslandKind, type TerrainProfile } from "./islandProfiles";

/** Samples per revolution of the around-the-island tables (outline, ridges, aprons…). */
const RING_N = 360;

/** Linear lookup in a periodic table indexed by angle. */
function ringSample(t: Float32Array, theta: number): number {
  const n = t.length;
  let f = (theta / (Math.PI * 2)) * n;
  f = ((f % n) + n) % n;
  const i = Math.floor(f);
  const a = f - i;
  return t[i] * (1 - a) + t[(i + 1) % n] * a;
}

/** Triangles of a terrain mesh binned on a 2D grid, for exact height lookups. */
interface SurfaceGrid {
  pos: number[];
  idx: number[];
  cells: Map<number, number[]>;
}

/** Integer grid cell → map key. */
const cellKey = (i: number, k: number) => (i + 32768) * 65536 + (k + 32768);

/** Signed angular difference a - b in (-π, π]. */
function angDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Smooth noise around a circle (≈ -1..1): coherent noise sampled on a ring of
 * radius k, domain-warped so features come out asymmetric rather than as
 * evenly spaced sine lobes. Seamless at 2π by construction.
 */
function ringNoise(theta: number, k: number, seed: number, warp = 0): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const wx = warp ? noise2(c * k * 0.7 + 17.3, s * k * 0.7 - 5.1, seed + 1) * warp : 0;
  const wz = warp ? noise2(c * k * 0.7 - 9.7, s * k * 0.7 + 23.9, seed + 2) * warp : 0;
  return clamp(fbm2(c * k + wx + 3.1, s * k + wz - 7.3, seed, 3) * 1.7, -1, 1);
}

/** Horizontal fraction of a rolling hillside for drop fraction u (cosine profile, eased in at the top). */
const T_OF = (u: number) => Math.acos(1 - 2 * u) / Math.PI;
const SOFT_U0 = 0.1;
const SOFT_T0 = T_OF(SOFT_U0);
function softProfile(u: number): number {
  return (T_OF(SOFT_U0 + (1 - SOFT_U0) * u) - SOFT_T0) / (1 - SOFT_T0);
}

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
  /** Canyon buttes: scrubby olive caps over warm sandstone strata. */
  mesa: { grassA: "#a7b266", grassB: "#c4c47c", edge: "#e2c48f", dirt: "#c08d62", rockA: "#e0ad80", rockB: "#c98f66", rockC: "#efc99d" },
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
  /**
   * Mountain peaks rising from the top surface: broad bells pushed out along a
   * few ridge arms (`arms`, default 4; 0 for a plain bell), with gullies
   * between them and ridged detail on the flanks.
   */
  peaks?: { height: number; radius: number; x?: number; z?: number; sharpness?: number; arms?: number }[];
  /** Terrain personality for ocean islands (default "tropical"); see islandProfiles.ts. */
  kind?: IslandKind;
  /** Per-island overrides of the preset's parameters. */
  terrain?: Partial<TerrainProfile>;
  /** Authored peninsulas and coves (angles island-local, atan2(z, x)). */
  features?: CoastFeature[];
  /** Columns: how far the rock flares toward its foot (× radius), with ridged buttresses. */
  flareBase?: number;
  /** Ocean islands: force a lighthouse on the best headland (true) or none (false); random otherwise. */
  lighthouse?: boolean;
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

type OptionalKeys = "peaks" | "snowLine" | "rockSlope" | "grounded" | "kind" | "terrain" | "features" | "flareBase" | "lighthouse";

export class IslandTerrain {
  readonly p: Required<Omit<IslandParams, OptionalKeys>> & Pick<IslandParams, OptionalKeys>;
  /** Resolved terrain personality (preset + overrides). */
  readonly tp: TerrainProfile;
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
  private buttressH: Harmonic[];
  /**
   * Shore islands: around-the-island tables. `outline` is the top's edge
   * multiplier; `spreadT` the hillside width factor; `apronT` the coastal
   * lowland reach (m); `ridgeT` ridges (+) and gullies (−); `coveT` 0..1.
   */
  private outline: Float32Array | null = null;
  private spreadT: Float32Array | null = null;
  private apronT: Float32Array | null = null;
  private ridgeT: Float32Array | null = null;
  private coveT: Float32Array | null = null;
  /** Ridge-arm angles and weights for each mountain peak. */
  private arms: { a: number; w: number }[][] = [];
  private maxProf = 1;

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
    this.tp = terrainProfile(params.kind, params.terrain);
    // Islands sit in an ocean: anything that would float low enough grows a
    // cliff-and-beach base down to the water instead of a pointed underside.
    let above = this.p.y - this.p.rimDrop - SEA_LEVEL;
    if (this.p.profile === "taper" && params.grounded !== false && above > 6 && this.p.y < 185) {
      this.p.profile = "shore";
      // The top eases down into the hillside instead of ending at a crisp rim.
      this.p.rimDrop = Math.max(this.p.rimDrop, Math.min(7, above * 0.11));
      above = this.p.y - this.p.rimDrop - SEA_LEVEL;
      this.p.depth = above + 6;
      // A wide, rolling hill base: broader than it is tall (gentle slopes, no walls).
      this.flare = Math.min(64, Math.max(12, above * 0.95)) * this.tp.slopeSpread;
    }
    this.meanRadius = this.p.radius * (this.p.sx + this.p.sz) * 0.5;
    if (this.p.profile === "shore") {
      // Enough segments around the coast for peninsulas, coves and ridges to read.
      this.p.segments = Math.max(this.p.segments, Math.round(clamp((this.meanRadius + this.flare) * 0.75, 96, 160)));
    }
    if (this.p.flareBase) this.p.segments = Math.max(this.p.segments, 40);
    this.lobeH = harmonics(this.p.seed + 55, 1, 4);
    this.cliffH = harmonics(this.p.seed + 77, 2, 5);
    this.beachH = harmonics(this.p.seed + 99, 2, 6);
    this.buttressH = harmonics(this.p.seed + 133, 3, 7);
    const rndH = mulberry32(this.p.seed);
    let norm = 0;
    for (let k = 2; k < 7; k++) {
      this.harmonics.push({ k, amp: 1 / k, phase: rndH() * Math.PI * 2 });
      norm += 1 / k;
    }
    for (const h of this.harmonics) h.amp /= norm;
    // Ridge arms for every peak: 3–5 spurs at irregular angles.
    (this.p.peaks ?? []).forEach((pk, k) => {
      const r = mulberry32(this.p.seed + 400 + k * 17);
      const n = pk.arms ?? 3 + Math.floor(r() * 3);
      const a0 = r() * Math.PI * 2;
      const list: { a: number; w: number }[] = [];
      for (let j = 0; j < n; j++) list.push({ a: a0 + (j / n) * Math.PI * 2 + (r() - 0.5) * 1.1, w: 0.65 + r() * 0.35 });
      this.arms.push(list);
    });
    if (this.p.profile === "shore") this.buildShoreTables();
    // Estimate max height for collision broad-phase.
    let m = -Infinity;
    for (let i = 0; i < 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      for (const f of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const r = f * this.p.radius * this.edge(a);
        m = Math.max(m, this.heightLocal(Math.cos(a) * r * this.p.sx, Math.sin(a) * r * this.p.sz));
      }
    }
    this.maxTop = m;
    // Broad-phase reach (outline fraction): the shelf beyond the waterline, or a column's flared foot.
    if (this.p.profile === "shore") {
      let mp = 1;
      for (let i = 0; i < 180; i++) {
        const th = (i / 180) * Math.PI * 2;
        mp = Math.max(mp, 1 + (this.coastExtra(th) + 16) / (this.p.radius * this.edge(th)));
      }
      this.maxProf = mp;
    } else if (this.p.profile === "column" && this.p.flareBase) this.maxProf = 1.25 + this.p.flareBase * 1.3;
  }

  /**
   * Builds the around-the-island tables for an ocean island: an organic top
   * outline (warped noise, never pulling in past `maxShrink` or across a pad),
   * then hillside width, coastal lowlands, peninsulas, coves and ridges.
   */
  private buildShoreTables() {
    const p = this.p;
    const tp = this.tp;
    const N = RING_N;
    const outline = new Float32Array(N);
    const floor = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const e0 = this.edge0(th);
      outline[i] = e0 * (1 + tp.coastlineIrregularity * ringNoise(th, tp.coastlineNoiseScale, p.seed + 201, tp.coastlineWarpStrength));
      floor[i] = e0 * (1 - tp.maxShrink);
    }
    // Pads (runways, plazas, building footprints) stay on land: wherever a pad
    // sat inside the authored outline, the new one may not pull in across it.
    for (const pad of p.pads) {
      const pts: [number, number][] = [];
      if (pad.w !== undefined && pad.l !== undefined) {
        const c = Math.cos(pad.ry ?? 0);
        const s = Math.sin(pad.ry ?? 0);
        const w = pad.w + 4;
        const l = pad.l + 4;
        for (let k = 0; k <= 16; k++) {
          const f = k / 16;
          // Pad space → island space is a rotation by +ry (inverse of padWeight's).
          for (const [ax, az] of [[-w + 2 * w * f, -l], [-w + 2 * w * f, l], [-w, -l + 2 * l * f], [w, -l + 2 * l * f]]) pts.push([pad.x + ax * c - az * s, pad.z + ax * s + az * c]);
        }
      } else {
        for (let k = 0; k < 24; k++) pts.push([pad.x + Math.cos((k / 24) * Math.PI * 2) * (pad.r + 4), pad.z + Math.sin((k / 24) * Math.PI * 2) * (pad.r + 4)]);
      }
      for (const [qx, qz] of pts) {
        const nx = qx / p.sx;
        const nz = qz / p.sz;
        const th = Math.atan2(nz, nx);
        const need = Math.hypot(nx, nz) / p.radius;
        const e0 = this.edge0(th);
        if (need > e0 * 1.02) continue; // already outside the authored island
        const i0 = Math.round((th / (Math.PI * 2)) * N);
        for (let d = -4; d <= 4; d++) {
          const i = (((i0 + d) % N) + N) % N;
          floor[i] = Math.max(floor[i], Math.min(e0, need * 1.04));
        }
      }
    }
    for (let i = 0; i < N; i++) outline[i] = Math.max(outline[i], floor[i]);
    // Soften the kinks the floor leaves, then re-apply it.
    for (let pass = 0; pass < 3; pass++) {
      const src = Float32Array.from(outline);
      for (let i = 0; i < N; i++) outline[i] = Math.max(floor[i], 0.25 * src[(i + N - 1) % N] + 0.5 * src[i] + 0.25 * src[(i + 1) % N]);
    }
    this.outline = outline;

    // ── Hillside, lowlands, peninsulas, coves and ridges ──
    const spread = new Float32Array(N);
    const apron = new Float32Array(N);
    const ridge = new Float32Array(N);
    const cove = new Float32Array(N);
    const rnd = mulberry32(p.seed + 321);
    const feats: Required<CoastFeature>[] = [];
    for (let k = 0; k < tp.peninsulas; k++) feats.push({ type: "peninsula", angle: rnd() * Math.PI * 2, strength: tp.peninsulaStrength * (0.6 + rnd() * 0.6), width: 0.14 + rnd() * 0.12 });
    for (let k = 0; k < tp.coves; k++) feats.push({ type: "cove", angle: rnd() * Math.PI * 2, strength: tp.coveStrength * (0.6 + rnd() * 0.5), width: 0.12 + rnd() * 0.12 });
    for (const f of p.features ?? []) feats.push({ strength: f.type === "cove" ? tp.coveStrength : tp.peninsulaStrength, width: 0.2, ...f });
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      let sp = 1 + 0.28 * ringNoise(th, 1.7, p.seed + 301, 0.7);
      let ap = this.flare * tp.lowlandApron * clamp(0.45 + 0.85 * ringNoise(th, 2.1, p.seed + 311, 0.9), 0, 1.4);
      let cv = 0;
      for (const f of feats) {
        const g = Math.exp(-((angDiff(th, f.angle) / f.width) ** 2));
        if (f.type === "peninsula") {
          ap += this.flare * f.strength * g;
          sp += 0.3 * f.strength * g;
        } else cv = Math.max(cv, f.strength * g);
      }
      sp *= 1 - 0.5 * cv;
      ap *= 1 - 0.9 * cv;
      spread[i] = Math.max(0.35, sp);
      apron[i] = Math.max(0, ap);
      cove[i] = cv;
      ridge[i] = ringNoise(th, tp.ridgeCount * 0.55, p.seed + 331, 0.6);
    }
    this.spreadT = spread;
    this.apronT = apron;
    this.ridgeT = ridge;
    this.coveT = cove;
  }

  /** 0..1 grove density at a local point: trees gather where it is high. */
  grove(lx: number, lz: number): number {
    return smoothstep(-0.2, 0.3, fbm2(lx * 0.02 + 31, lz * 0.02 - 17, this.p.seed + 501, 2));
  }

  /** Ridges (+1) and gullies (−1) down the hillside at angle theta, drop fraction u. */
  ridgeAt(theta: number, u: number): number {
    return this.ridgeT ? ringSample(this.ridgeT, theta + 0.18 * u) : 0;
  }

  get id() {
    return this.p.id;
  }

  /** Outline multiplier for a given angle (≈ 1 ± irregularity; organic table on ocean islands). */
  edge(theta: number): number {
    return this.outline ? ringSample(this.outline, theta) : this.edge0(theta);
  }

  /** The authored outline: the ellipse with gentle harmonic wobble. */
  private edge0(theta: number): number {
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
    const shore = p.profile === "shore";
    const falloff = 1 - smoothstep(shore ? 0.7 : 0.62, 1.0, rho);
    let h = p.hilliness * (fbm2(lx * p.hillScale, lz * p.hillScale, p.seed, 4) * 0.5 + 0.5) * falloff;
    h += noise2(lx * 0.09, lz * 0.09, p.seed + 7) * (shore ? this.tp.terrainRoughness : 0.35);
    if (shore && this.tp.hillHeight > 0) {
      // Rolling hills with soft ridgelines: domain-warped broad noise plus a
      // ridged medium scale, so hills connect instead of sitting as round bumps.
      const f = this.tp.hillFrequency;
      const wx = noise2(lx * f * 0.5 + 11, lz * f * 0.5 - 3, p.seed + 211) * 0.6 / f;
      const wz = noise2(lx * f * 0.5 - 7, lz * f * 0.5 + 19, p.seed + 212) * 0.6 / f;
      const broad = fbm2((lx + wx) * f, (lz + wz) * f, p.seed + 213, 3) * 0.5 + 0.5;
      const rg = 1 - Math.abs(fbm2(lx * f * 2.2 + 5, lz * f * 2.2, p.seed + 214, 2) * 1.6);
      h += this.tp.hillHeight * (0.7 * broad + 0.3 * clamp(rg, 0, 1) ** 2) * falloff;
    }
    if (p.peaks) {
      const ridge = fbm2(lx * 0.014, lz * 0.014, p.seed + 3, 4);
      for (let k = 0; k < p.peaks.length; k++) {
        const pk = p.peaks[k];
        const dx = lx - (pk.x ?? 0);
        const dz = lz - (pk.z ?? 0);
        // Ridge arms push the mountain out along a few spurs, with valleys between.
        let arm = 0;
        const list = this.arms[k];
        if (list.length) {
          const ang = Math.atan2(dz, dx);
          for (const a of list) arm = Math.max(arm, a.w * Math.pow(Math.max(0, Math.cos(angDiff(ang, a.a))), 10));
        }
        const rEff = pk.radius * (list.length ? 0.8 + 0.32 * arm : 1);
        const pr = clamp(Math.hypot(dx, dz) / rEff, 0, 1);
        const bell = Math.pow((1 + Math.cos(Math.PI * pr)) / 2, pk.sharpness ?? 1.4);
        h += pk.height * bell * (0.88 + ridge * 0.3);
        if (list.length) {
          // Ridged gullies on the flanks (none at the summit or the foot).
          const flank = 4 * bell * (1 - bell);
          const g = 1 - Math.abs(fbm2(lx * 0.03 + k * 7, lz * 0.03, p.seed + 71 + k, 3) * 1.7);
          h += pk.height * 0.07 * flank * (clamp(g, 0, 1) - 0.45);
        }
      }
    }
    if (shore) {
      // Convex ease into the hillside: the top already slopes at the rim, so
      // the hill continues it instead of starting from a flat ledge.
      const x = clamp((rho - 0.74) / 0.26, 0, 1);
      h -= p.rimDrop * x * x;
    } else h -= p.rimDrop * smoothstep(0.9, 1.0, rho);
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
  profileAt(t: number, theta = 0): number {
    if (this.p.profile === "shore") return this.shoreProfile(this.p.y - this.p.rimDrop - 2.5 - t * (this.p.depth - 2.5), theta);
    if (this.p.profile !== "column") return 1 - 0.97 * Math.pow(t, 2.2);
    // Columns are buttes: a slight overhang under the cap, then a talus flare at the foot.
    let f = 1 - 0.06 * Math.sin(Math.PI * Math.min(1, t * 2.2)) + 0.2 * Math.pow(t, 3);
    // Crags: the rock spreads into ridged buttresses and broad shoulders toward its
    // foot, so it reads as a mountain peak rather than a cylinder.
    // (A short sheer cap for the monument, then shoulders that keep widening.)
    if (this.p.flareBase) f += this.p.flareBase * Math.pow(Math.max(0, t - 0.04), 1.25) * (0.65 + 0.7 * this.buttress(theta));
    return f;
  }

  /** 0..1 buttress strength around a crag. */
  buttress(theta: number): number {
    return clamp(0.5 + 0.5 * periodic(this.buttressH, theta), 0, 1);
  }

  /** Angle around the island in the same (ellipse-normalised) frame as `edge`. */
  thetaOf(lx: number, lz: number): number {
    return Math.atan2(lz / this.p.sz, lx / this.p.sx);
  }

  /** ≈0.4..2.5: how far this side reaches out (headlands and peninsulas high, coves low). */
  lobe(theta: number): number {
    if (!this.spreadT || !this.apronT) return 1 + 0.26 * periodic(this.lobeH, theta);
    return ringSample(this.spreadT, theta) + ringSample(this.apronT, theta) / Math.max(1, this.flare);
  }

  /** Hillside width factor at angle theta. */
  private spreadAt(theta: number): number {
    return this.spreadT ? ringSample(this.spreadT, theta) : this.lobe(theta);
  }

  /** 0..1: how much of a sheltered cove this side is. */
  coveAt(theta: number): number {
    return this.coveT ? ringSample(this.coveT, theta) : 0;
  }

  /** 0..1: how much this side of the island is a cliff face rather than a green slope. */
  cliff(theta: number): number {
    const t0 = 0.9 - 0.85 * this.tp.rockyCoast;
    // Low peninsulas and lowlands run down to the sea as beach, not cliff.
    const lowland = this.apronT ? smoothstep(0.6, 1.4, ringSample(this.apronT, theta) / Math.max(1, this.flare * this.tp.lowlandApron)) : 0;
    const natural = smoothstep(t0, t0 + 0.42, periodic(this.cliffH, theta)) * (1 - 0.8 * lowland);
    // Sides squeezed in to keep gameplay space clear become deliberate rock
    // cliffs rather than a green slope pressed into a wall.
    const squeezed = this.p.profile === "shore" ? smoothstep(0.6, 0.3, this.scaleAt(theta)) : 0;
    return Math.max(natural, squeezed);
  }

  /**
   * Width (m) of the sand beach at this angle: wide on flat lowlands and in
   * coves, narrow below steeper hills, almost none under cliffs.
   */
  beachWidth(theta: number): number {
    const tp = this.tp;
    const v = 0.5 + 0.5 * periodic(this.beachH, theta);
    const varied = 1 - tp.beachWidthVariation * 0.55 + tp.beachWidthVariation * v;
    const flat = this.apronT ? clamp(ringSample(this.apronT, theta) / Math.max(1, this.flare * tp.lowlandApron), 0, 1.5) : 0.6;
    const w = tp.baseBeachWidth * varied * (0.4 + 0.5 * flat + 0.7 * this.coveAt(theta));
    return Math.max(1.2, w * (1 - 0.85 * this.cliff(theta)));
  }

  /** World y where the hill base starts below the rim. */
  get shoulderY(): number {
    // Level with the rim (the top surface eases down by rimDrop to the outline),
    // so the hillside continues the top instead of stepping down from it.
    return this.p.y - this.p.rimDrop - 0.3;
  }

  /**
   * Shore islands: outward spread (m) of the base beyond the top outline at
   * world height y and angle theta. Green sides are a rolling hill: flat where
   * they leave the top, steepest halfway down, flat again into the beach (a
   * cosine profile, so there is no crease at either end). Cliff sides drop
   * steeply, then kick out at the foot.
   */
  extraAt(y: number, theta: number): number {
    const H0 = Math.max(1, this.shoulderY - SEA_LEVEL);
    const u = 1 - (y - SEA_LEVEL) / H0;
    if (u <= 0) return 0;
    const uu = Math.min(1, u);
    // Rolling cosine hillside (eased in at the top so it continues the rim's slope),
    // with a concave share so the foot spreads wide like a real landform.
    const soft = lerp(softProfile(uu), Math.pow(uu, 1.6), 0.35);
    const steep = 0.06 * Math.min(1, uu * 4) + 0.94 * Math.pow(uu, 3.2);
    const cl = this.cliff(theta);
    let hill = this.flare * this.spreadAt(theta) * lerp(soft, steep, cl);
    // Spurs and gullies grow down the slope (bending slightly as they go), and
    // coastal lowlands fan out at the foot: ocean → beach → lowland → hills.
    hill *= 1 + this.tp.ridgeStrength * this.ridgeAt(theta, uu) * smoothstep(0, 0.75, uu) * (1 - cl);
    if (this.apronT) hill += ringSample(this.apronT, theta) * Math.pow(smoothstep(0.5, 1, uu), 1.6) * (1 - 0.7 * cl);
    let e = hill * this.scaleAt(theta);
    // Soft, deterministic lumps on the hillside (zero at the rim and at the foot),
    // shared by the mesh, collision and prop placement.
    const k = this.meanRadius * 0.045;
    const lump = noise2(Math.cos(theta) * k + 40, Math.sin(theta) * k + y * 0.06, this.p.seed + 61);
    e += lump * 2.2 * 4 * uu * (1 - uu) * (1 - 0.6 * cl) * this.scaleAt(theta);
    if (u > 1) e += this.beachWidth(theta) + Math.min(14, (u - 1) * H0 * 1.5);
    return Math.max(0, e);
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
  slopePoint(theta: number, u: number, snap = true): [number, number, number] {
    const H0 = Math.max(1, this.shoulderY - SEA_LEVEL);
    const wy = this.shoulderY - u * (H0 - 2.2);
    const f = this.shoreProfile(wy, theta);
    const er = this.p.radius * this.edge(theta);
    const x = Math.cos(theta) * er * this.p.sx * f;
    const z = Math.sin(theta) * er * this.p.sz * f;
    // Sit on the rendered facets, not the smooth profile they approximate.
    return [x, (snap ? this.surfaceAt(x, z) : null) ?? wy - this.p.y, z];
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
    this.smoothSectors();
  }

  /** Local point on the waterline at angle theta. */
  coastPoint(theta: number): [number, number] {
    const er = this.p.radius * this.edge(theta);
    const f = 1 + this.coastExtra(theta) / er;
    return [Math.cos(theta) * er * this.p.sx * f, Math.sin(theta) * er * this.p.sz * f];
  }

  /** Whether a world point lies on this island's land or beach, or within `margin` m of its waterline. */
  covers(wx: number, wz: number, margin = 0): boolean {
    const lx = wx - this.p.x;
    const lz = wz - this.p.z;
    const th = this.thetaOf(lx, lz);
    const er = this.p.radius * this.edge(th);
    const reach = 1 + ((this.p.profile === "shore" ? this.coastExtra(th) : 0) + margin) / er;
    return this.rho(lx, lz) < reach;
  }

  /**
   * Pulls this island's hillsides in where its shore would run into another
   * ocean island's (keeping `gap` m of water between them). When `mutable`,
   * the other island gives way too, so neighbours meet halfway.
   */
  separateFrom(other: IslandTerrain, mutable: boolean, gap = 12) {
    if (this.p.profile !== "shore" || other.p.profile !== "shore" || other === this) return;
    if (Math.hypot(other.p.x - this.p.x, other.p.z - this.p.z) > this.boundRadius + other.boundRadius) return;
    const n = this.sectorScale.length;
    const sectorOf = (th: number) => ((Math.round((th / (Math.PI * 2)) * n) % n) + n) % n;
    for (let k = 0; k < n * 2; k++) {
      const th = (k / (n * 2)) * Math.PI * 2;
      const s0 = Math.floor(k / 2) % n;
      const s1 = (s0 + (k % 2)) % n;
      for (let it = 0; it < 16; it++) {
        const [lx, lz] = this.coastPoint(th);
        const wx = lx + this.p.x;
        const wz = lz + this.p.z;
        if (!other.covers(wx, wz, gap)) break;
        this.sectorScale[s0] *= 0.84;
        if (s1 !== s0) this.sectorScale[s1] *= 0.84;
        if (mutable) {
          const os = sectorOf(other.thetaOf(wx - other.p.x, wz - other.p.z));
          other.sectorScale[os] = Math.max(0.05, other.sectorScale[os] * 0.88);
        }
        if (this.sectorScale[s0] < 0.06) break;
      }
    }
    this.smoothSectors();
    if (mutable) other.smoothSectors();
  }

  /**
   * Widens each pulled-in side into a smooth, rounded cove. A soft minimum
   * (s[j] + c·d²) never raises a sector, so nothing above becomes blocked again.
   */
  smoothSectors() {
    this.shapeVersion++;
    const n = this.sectorScale.length;
    const src = Float32Array.from(this.sectorScale);
    for (let i = 0; i < n; i++) {
      let m = src[i];
      for (let d = 1; d <= 6; d++) m = Math.min(m, src[(i + d) % n] + 0.028 * d * d, src[(i - d + n) % n] + 0.028 * d * d);
      this.sectorScale[i] = m;
    }
  }

  /** Base spread factor at angle theta (smoothly interpolated between sectors). */
  scaleAt(theta: number): number {
    const n = this.sectorScale.length;
    const f = (((theta / (Math.PI * 2)) * n) % n + n) % n;
    const i = Math.floor(f);
    const t = f - i;
    const s = t * t * (3 - 2 * t);
    return this.sectorScale[i % n] * (1 - s) + this.sectorScale[(i + 1) % n] * s;
  }

  /** Mean base spread factor (for decoration counts). */
  get meanScale(): number {
    let s = 0;
    for (const v of this.sectorScale) s += v;
    return s / this.sectorScale.length;
  }

  /** Largest outline fraction anywhere on the island (broad-phase bounds). */
  get maxProfile(): number {
    return this.maxProf;
  }

  /** World Y of the bottom tip region. */
  get bottomY(): number {
    return this.p.y - this.p.rimDrop - this.p.depth;
  }

  get boundRadius(): number {
    const organic = this.outline ? 1 + this.tp.coastlineIrregularity : 1;
    return this.p.radius * Math.max(this.p.sx, this.p.sz) * (1 + this.p.irregularity) * organic * this.maxProfile;
  }

  /**
   * Painted grass at a local point: two greens blended by noise, sunny
   * yellow-green drifts and deeper clumps. Shared by the top and the hillside
   * so the rim never shows a seam. Returns the base noise (0..1).
   */
  private grassColor(out: Color, lx: number, lz: number, grassA: Color, grassB: Color): number {
    const n = fbm2(lx * 0.05, lz * 0.05, this.p.seed + 11, 3) * 0.5 + 0.5;
    out.copy(grassA).lerp(grassB, n);
    const m = fbm2(lx * 0.022 + 9, lz * 0.022 - 4, this.p.seed + 31, 3);
    out.lerp(MEADOW, smoothstep(0.25, 0.55, m) * 0.45);
    out.lerp(c2.copy(grassA).multiplyScalar(0.8), smoothstep(-0.25, -0.55, m) * 0.5);
    return n;
  }

  /** Builds the terrain mesh (local coordinates) into `b`. */
  /** Adds the terrain mesh to `b`, and returns its raw arrays (for grass placement). */
  build(b: MeshBuilder) {
    const raw = this.geometry(false);
    b.addRaw(raw.pos, raw.col, raw.idx);
    return raw;
  }

  /** Bumped whenever the hillside changes shape (fitShore, separateFrom), so the surface cache rebuilds. */
  private shapeVersion = 0;
  /** Island top only: never changes, so it's built once (even while regions are still placing things). */
  private topSurface: SurfaceGrid | null = null;
  /** Top plus hillside and beach: rebuilt only after the hillside changes shape, on first use. */
  private surface: (SurfaceGrid & { version: number }) | null = null;
  private static readonly CELL = 4;

  /**
   * Height (local) of the rendered terrain mesh at a local point, or null off
   * the mesh. Props use this instead of the smooth formulas so they sit exactly
   * on the triangles you see: no trees floating over a facet or rocks sunk
   * into one.
   */
  surfaceAt(lx: number, lz: number): number | null {
    this.topSurface ??= this.surfaceGrid(true);
    const top = this.queryGrid(this.topSurface, lx, lz);
    if (top !== null || this.p.profile !== "shore") return top;
    if (!this.surface || this.surface.version !== this.shapeVersion) this.surface = { ...this.surfaceGrid(false), version: this.shapeVersion };
    return this.queryGrid(this.surface, lx, lz);
  }

  private queryGrid(s: SurfaceGrid, lx: number, lz: number): number | null {
    const C = IslandTerrain.CELL;
    const list = s.cells.get(cellKey(Math.floor(lx / C), Math.floor(lz / C)));
    if (!list) return null;
    const { pos, idx } = s;
    let best = -Infinity;
    for (const t of list) {
      const a = idx[t * 3] * 3;
      const b = idx[t * 3 + 1] * 3;
      const c = idx[t * 3 + 2] * 3;
      const x0 = pos[a], z0 = pos[a + 2];
      const x1 = pos[b], z1 = pos[b + 2];
      const x2 = pos[c], z2 = pos[c + 2];
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
      if (Math.abs(d) < 1e-9) continue;
      const w0 = ((z1 - z2) * (lx - x2) + (x2 - x1) * (lz - z2)) / d;
      const w1 = ((z2 - z0) * (lx - x2) + (x0 - x2) * (lz - z2)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      // Highest hit: the top surface, never a floating island's underside.
      best = Math.max(best, w0 * pos[a + 1] + w1 * pos[b + 1] + w2 * pos[c + 1]);
    }
    return best === -Infinity ? null : best;
  }

  private surfaceGrid(topOnly: boolean): SurfaceGrid {
    const { pos, idx } = this.geometry(true, topOnly);
    const C = IslandTerrain.CELL;
    const cells = new Map<number, number[]>();
    for (let t = 0; t < idx.length / 3; t++) {
      const a = idx[t * 3] * 3;
      const b = idx[t * 3 + 1] * 3;
      const c = idx[t * 3 + 2] * 3;
      const i0 = Math.floor(Math.min(pos[a], pos[b], pos[c]) / C);
      const i1 = Math.floor(Math.max(pos[a], pos[b], pos[c]) / C);
      const k0 = Math.floor(Math.min(pos[a + 2], pos[b + 2], pos[c + 2]) / C);
      const k1 = Math.floor(Math.max(pos[a + 2], pos[b + 2], pos[c + 2]) / C);
      for (let i = i0; i <= i1; i++) {
        for (let k = k0; k <= k1; k++) {
          const key = cellKey(i, k);
          let arr = cells.get(key);
          if (!arr) cells.set(key, (arr = []));
          arr.push(t);
        }
      }
    }
    return { pos, idx, cells };
  }

  /**
   * Terrain mesh arrays. `shapeOnly` skips the (costly) colouring where it
   * can without changing any vertex position.
   */
  private geometry(shapeOnly: boolean, topOnly = false): { pos: number[]; col: number[]; idx: number[] } {
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
      if (shapeOnly) return void col.push(0, 0, 0);
      const n = this.grassColor(c1, lx, lz, grassA, grassB);
      // Slope → rock
      // Forward differences: half the samples of a central difference, same look.
      const e = 1.5;
      const dx = this.heightLocal(lx + e, lz) - h;
      const dz = this.heightLocal(lx, lz + e) - h;
      const slope = Math.hypot(dx, dz) / e;
      const rs = p.rockSlope ?? 0.55;
      if (slope > rs) c1.lerp(c2.copy(rockA).lerp(rockC, n), smoothstep(rs, rs * 2, slope));
      if (p.snowLine !== undefined && h > p.snowLine) {
        c1.lerp(snow, smoothstep(p.snowLine, p.snowLine + 25, h + noise2(lx * 0.05, lz * 0.05, p.seed) * 12));
      }
      // Floating rims get a sandy lip; ocean islands roll on into the green slope.
      if (p.profile !== "shore") c1.lerp(edgeC, smoothstep(0.9, 1.0, rho) * 0.7);
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

    if (topOnly) return { pos, col, idx };
    if (p.profile === "shore") {
      this.buildShore(edgeXZ, pos, col, idx, rnd, [rockA, rockC, rockB, rockC], grassA, grassB, shapeOnly);
      return { pos, col, idx };
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
        const th = p.flareBase ? this.thetaOf(ex, ez) : 0;
        const ff = k === 0 ? 1.004 : (p.flareBase ? this.profileAt(t, th) : f) * jitterR;
        pos.push(ex * ff, y, ez * ff);
        if (k <= 1) c1.copy(dirt).lerp(edgeC, k === 0 ? 0.35 : 0);
        else {
          const band = [rockA, rockB, rockC, rockB][bandIndex % 4];
          c1.copy(band).lerp(rockB, rnd() * 0.3).multiplyScalar(1 - t * 0.18);
          // Crags: scrub and grass take hold on the gentler shoulders lower down.
          if (p.flareBase) {
            const green = smoothstep(0.22, 0.6, t) * (0.6 + 0.4 * this.buttress(th + 0.6));
            c1.lerp(c2.copy(grassA).lerp(grassB, rnd() * 0.5), green * 0.9);
          }
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

    return { pos, col, idx };
  }

  /**
   * Base of an ocean island: the grassy top rolls over the rim into a wide,
   * lumpy hillside with headlands and coves; some sides are layered sandstone
   * cliffs instead. A sand beach rings the foot and a shelf runs under the sea.
   */
  private buildShore(edgeXZ: [number, number][], pos: number[], col: number[], idx: number[], rnd: () => number, bands: Color[], grassA: Color, grassB: Color, shapeOnly = false) {
    const p = this.p;
    const S = edgeXZ.length;
    const sea = SEA_LEVEL - p.y; // local sea height
    const top = this.shoulderY - p.y; // local y where the slope starts
    const H0 = Math.max(1, top - sea);
    const N = Math.max(8, Math.min(20, Math.round(H0 / 3.2)));
    // Row heights (local): lip, slope rows down to just above the sand, beach, waterline, shelf.
    // Slope rows are cosine-spaced, denser near the rim and the foot where the
    // rolling profile curves most, so the shoulder stays round instead of faceted.
    type Row = { y: number; kind: "lip" | "slope" | "beach" | "water" | "shelf"; k: number; u: number };
    const rows: Row[] = [{ y: 0, kind: "lip", k: 0, u: 0 }];
    for (let k = 1; k <= N; k++) {
      const u = (1 - Math.cos((Math.PI * k) / N)) / 2;
      rows.push({ y: top - u * (H0 - 2.2), kind: "slope", k, u });
    }
    rows.push({ y: sea + 1.1, kind: "beach", k: 0, u: 1 });
    rows.push({ y: sea - 0.7, kind: "water", k: 0, u: 1 });
    rows.push({ y: sea - 8, kind: "shelf", k: 0, u: 1 });
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
          // Lumps come from extraAt's smooth noise, so props sit flush on them.
          extra = this.extraAt(p.y + y, th);
        } else if (row.kind === "beach") extra = this.extraAt(SEA_LEVEL + 2.2, th) + bw * 0.45;
        else if (row.kind === "water") extra = this.extraAt(SEA_LEVEL, th) + bw;
        else extra = this.extraAt(SEA_LEVEL, th) + bw + 14;
        const f = 1 + extra / er;
        const x = ex * f;
        const z = ez * f;
        const hAbove = p.y + y - SEA_LEVEL;
        if (shapeOnly) {
          pos.push(x, y, z);
          col.push(0, 0, 0);
          continue;
        }
        // Colour: grass with painted patches, sandstone where the side is a cliff
        // or rock breaks through, and sand at the foot.
        this.grassColor(c1, x, z, grassA, grassB);
        const u = row.u;
        // Lower slopes sit a touch deeper in tone (eased, so the rim matches the top).
        c1.multiplyScalar(1 - 0.09 * u * u);
        if (row.kind === "slope") {
          // Gullies hold a richer green, ridge crests a lighter, drier one.
          const rg = this.ridgeAt(th, u) * Math.min(1, this.tp.ridgeStrength / 0.3) * smoothstep(0, 0.4, u);
          if (rg < 0) c1.lerp(c2.copy(grassA).multiplyScalar(0.84), -rg * 0.45);
          else c1.lerp(MEADOW, rg * 0.3);
          // Bare rock only where the hillside is genuinely steep (from the profile itself).
          const slope = 3 / Math.max(0.05, this.extraAt(p.y + y - 1.5, th) - this.extraAt(p.y + y + 1.5, th));
          const steepRock = smoothstep(this.tp.rockSlope, this.tp.rockSlope * 1.7, slope) * smoothstep(0.08, 0.3, u);
          const outcrop = smoothstep(0.42, 0.62, fbm2(x * 0.06 + 13, z * 0.06, p.seed + 41, 2)) * smoothstep(0.15, 0.4, u) * (1 - smoothstep(0.85, 1, u));
          // Steep ground: a darker, drier green mottled with exposed rock in
          // streaks down the slope, not horizontal strata (those stay on the
          // deliberate cliff faces).
          if (steepRock > 0.01) {
            const mott = fbm2(x * 0.09 + 3, z * 0.09 + p.y * 0.02 - y * 0.015, p.seed + 43, 2) * 0.5 + 0.5;
            c1.multiplyScalar(1 - 0.12 * steepRock);
            c2.copy(bands[0]).lerp(bands[2], mott);
            c1.lerp(c2, steepRock * smoothstep(0.35, 0.7, mott) * 0.85);
          }
          const rockAmt = Math.max(cl * smoothstep(0.04, 0.2, u), outcrop * 0.9);
          if (rockAmt > 0.01) {
            c2.copy(bands[row.k % bands.length]).multiplyScalar(0.94 + rnd() * 0.1);
            c1.lerp(c2, rockAmt);
          }
        }
        // Rocky coasts: weathered stone at the waterline instead of a sand strip.
        const rocky = smoothstep(0.4, 0.8, cl) * 0.85;
        if (row.kind === "beach") c1.copy(SAND).lerp(WET_SAND, rnd() * 0.2).lerp(c2.copy(bands[1]).multiplyScalar(0.9), rocky);
        else if (row.kind === "water" || row.kind === "shelf") c1.copy(WET_SAND).lerp(c2.copy(bands[2]).multiplyScalar(0.8), rocky * 0.7);
        else if (hAbove < 3.4) c1.lerp(SAND, smoothstep(3.4, 2.0, hAbove) * (1 - rocky));
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
