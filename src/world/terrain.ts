import { Color } from "three";
import { clamp, fbm2, lerp, mulberry32, noise2, smoothstep } from "./noise";
import type { MeshBuilder } from "@/render/geometry/MeshBuilder";

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
  meadow: { grassA: "#79b84a", grassB: "#a3c95a", edge: "#c9b36a", dirt: "#8a5a3b", rockA: "#b08d72", rockB: "#8f7262", rockC: "#c9a98a" },
  lush: { grassA: "#4f9e4a", grassB: "#7dbb4f", edge: "#b9a85f", dirt: "#7a4e33", rockA: "#a2826c", rockB: "#7f6559", rockC: "#bf9e82" },
  autumn: { grassA: "#a6b84a", grassB: "#d0b45a", edge: "#d4a35a", dirt: "#8a5236", rockA: "#b58a6c", rockB: "#946c58", rockC: "#d0a985" },
  tech: { grassA: "#6aae7e", grassB: "#8cc28a", edge: "#b8b48a", dirt: "#6b5a54", rockA: "#9a8f93", rockB: "#7b7279", rockC: "#b6aab0" },
  lavender: { grassA: "#8fb563", grassB: "#b2c26e", edge: "#c8b07a", dirt: "#7d5a52", rockA: "#a68fa6", rockB: "#86708a", rockC: "#c2adc0" },
  alpine: { grassA: "#5f9a55", grassB: "#86b062", edge: "#a7a07a", dirt: "#6e5446", rockA: "#9c948c", rockB: "#7d756f", rockC: "#b7aea3", snow: "#f4f6fb" },
  spire: { grassA: "#7aa860", grassB: "#9cbf6e", edge: "#c9bfa6", dirt: "#7d6a5c", rockA: "#c7bdb2", rockB: "#a89d93", rockC: "#ddd3c6", snow: "#f4f6fb" },
  desert: { grassA: "#c9a96a", grassB: "#d9bc80", edge: "#e0c48e", dirt: "#9b6a45", rockA: "#c58b62", rockB: "#a86f4d", rockC: "#dca87c" },
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
  /** "taper" floats with a pointed underside; "column" is a tall mesa. */
  profile?: "taper" | "column";
  /** Snow line height (local) for peaks. */
  snowLine?: number;
}

const c1 = new Color();
const c2 = new Color();

export class IslandTerrain {
  readonly p: Required<Omit<IslandParams, "peaks" | "snowLine" | "rockSlope">> & Pick<IslandParams, "peaks" | "snowLine" | "rockSlope">;
  readonly maxTop: number;
  private harmonics: { k: number; amp: number; phase: number }[] = [];

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
    return this.p.profile === "column" ? 1 - 0.22 * Math.pow(t, 3) : 1 - 0.97 * Math.pow(t, 2.2);
  }

  /** World Y of the bottom tip region. */
  get bottomY(): number {
    return this.p.y - this.p.rimDrop - this.p.depth;
  }

  get boundRadius(): number {
    return this.p.radius * Math.max(this.p.sx, this.p.sz) * (1 + this.p.irregularity);
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
      c1.lerp(edgeC, smoothstep(0.9, 1.0, rho) * 0.7);
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
          c1.copy(band).lerp(rockB, rnd() * 0.3).multiplyScalar(1 - t * 0.28);
        }
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
}
