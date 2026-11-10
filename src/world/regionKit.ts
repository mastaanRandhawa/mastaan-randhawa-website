import type { BufferGeometry } from "three";
import { MeshBuilder } from "@/render/geometry/MeshBuilder";
import { IslandTerrain, type IslandParams } from "./terrain";
import type { Collider } from "./collision";
import { mulberry32 } from "./noise";
import { islandSprings } from "./prefabs/mystic";
import { SEA_LEVEL } from "./layout";

/** Steepest ground (rise/run, about 33°) that scattered decoration may sit on. */
const DEFAULT_MAX_SLOPE = 0.65;
import { grassPoints } from "./grassField";
import { decorateShore, type KeepClear } from "./prefabs/shore";

/** Animated / textured objects that are instantiated as separate components. */
export type AnchorType =
  | "windmill"
  | "turbine"
  | "flag"
  | "windsock"
  | "radar"
  | "dish"
  | "beacon"
  | "waterfall"
  | "pond"
  | "sign"
  | "balloon"
  | "gear"
  | "turntable"
  | "orbitCar"
  | "pulses"
  | "dome"
  | "wheel"
  | "spinner"
  | "bob"
  | "blinkers"
  | "smoke"
  | "lanternGlow"
  | "fountain";

export interface Anchor {
  type: AnchorType;
  x: number;
  y: number;
  z: number;
  ry?: number;
  s?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export interface BuiltIsland {
  id: string;
  terrain: IslandTerrain;
  geometry: BufferGeometry;
  position: [number, number, number];
  /** Grass clumps over its open green ground (world space, see grassField.ts). */
  grass: Float32Array;
}

export class RegionKit {
  readonly colliders: Collider[] = [];
  readonly anchors: Anchor[] = [];
  readonly islands: Isl[] = [];
  /** Free-standing world-space geometry (bridges between islands, etc). */
  readonly world = new MeshBuilder();

  constructor(
    readonly id: string,
    readonly density = 1,
  ) {}

  island(params: IslandParams): Isl {
    const isl = new Isl(this, new IslandTerrain(params));
    this.islands.push(isl);
    this.colliders.push({ type: "island", terrain: isl.t });
    return isl;
  }

  anchor(type: AnchorType, x: number, y: number, z: number, extra: Partial<Anchor> = {}) {
    this.anchors.push({ type, x, y, z, ...extra });
  }

  box(x: number, y: number, z: number, hx: number, hy: number, hz: number, ry = 0) {
    this.colliders.push({ type: "box", x, y, z, hx, hy, hz, ry });
  }

  cyl(x: number, z: number, y0: number, y1: number, r: number) {
    this.colliders.push({ type: "cyl", x, z, y0, y1, r });
  }

  sphere(x: number, y: number, z: number, r: number) {
    this.colliders.push({ type: "sphere", x, y, z, r });
  }

  /**
   * Ocean islands: fit each hill base around the gameplay spaces (rings,
   * collectibles, landing paths), then dress its slopes and shore.
   */
  fitShores(keepClear: KeepClear[], builtShores: IslandTerrain[] = []) {
    for (const i of this.islands) i.t.fitShore(keepClear);
    // Keep open water between regions (islands already built elsewhere stay as
    // they are). Islands within one region may meet at sea level as low land
    // and sandbars, like an archipelago, instead of being squeezed into walls.
    for (const i of this.islands) for (const o of builtShores) i.t.separateFrom(o, false);
    for (const i of this.islands) decorateShore(i, keepClear);
  }

  finish(): { islands: BuiltIsland[]; world: BufferGeometry | null } {
    // Rim springs only on the few floating (secret) islands; ocean islands stay clean.
    for (const i of this.islands) if (i.t.p.profile === "taper" && i.t.p.y > SEA_LEVEL) islandSprings(i);
    return {
      islands: this.islands.map((i) => {
        const raw = i.t.build(i.b);
        const grass = grassPoints(i, raw, [i.ox, i.oy, i.oz], i.t.p.seed);
        return { id: i.t.id, terrain: i.t, geometry: i.b.build(), position: [i.ox, i.oy, i.oz], grass };
      }),
      world: this.world.vertexCount ? this.world.build() : null,
    };
  }
}

/** Builder for one island; all coordinates are local to its origin. */
export class Isl {
  readonly b = new MeshBuilder();
  readonly rnd: () => number;
  readonly ox: number;
  readonly oy: number;
  readonly oz: number;
  private blocked: { x: number; z: number; r: number }[] = [];
  private rects: { x: number; z: number; w: number; l: number; ry: number }[] = [];

  constructor(
    readonly kit: RegionKit,
    readonly t: IslandTerrain,
  ) {
    this.ox = t.p.x;
    this.oy = t.p.y;
    this.oz = t.p.z;
    this.rnd = mulberry32(t.p.seed * 7 + 3);
    this.b.ground = (x, z) => this.h(x, z);
    for (const pad of t.p.pads) {
      if (pad.w !== undefined && pad.l !== undefined) this.rects.push({ x: pad.x, z: pad.z, w: pad.w + 2, l: pad.l + 2, ry: pad.ry ?? 0 });
      else this.blocked.push({ x: pad.x, z: pad.z, r: pad.r + 2 });
    }
  }

  get density() {
    return this.kit.density;
  }

  /** Local ground height: the rendered terrain mesh, so props sit flush on its facets. */
  h(lx: number, lz: number) {
    return this.t.surfaceAt(lx, lz) ?? this.t.heightLocal(lx, lz);
  }

  block(x: number, z: number, r: number) {
    this.blocked.push({ x, z, r });
  }

  isFree(x: number, z: number, r = 0) {
    for (const b of this.blocked) if (Math.hypot(x - b.x, z - b.z) < b.r + r) return false;
    for (const q of this.rects) {
      const c = Math.cos(-q.ry);
      const s = Math.sin(-q.ry);
      const dx = x - q.x;
      const dz = z - q.z;
      if (Math.abs(dx * c - dz * s) < q.w + r && Math.abs(dx * s + dz * c) < q.l + r) return false;
    }
    return true;
  }

  /**
   * A fast isFree(x, z, r) for many queries once the island is fully dressed:
   * obstacles are bucketed into a coarse grid, so each test only checks the
   * few nearby ones instead of the whole list.
   */
  freeTest(r: number): (x: number, z: number) => boolean {
    const CELL = 8;
    const cells = new Map<number, number[]>();
    const key = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);
    const add = (i: number, x0: number, z0: number, x1: number, z1: number) => {
      for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
        for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
          const k = key(cx, cz);
          const list = cells.get(k);
          if (list) list.push(i);
          else cells.set(k, [i]);
        }
    };
    this.blocked.forEach((b, i) => add(i, b.x - b.r - r, b.z - b.r - r, b.x + b.r + r, b.z + b.r + r));
    this.rects.forEach((q, i) => {
      const e = Math.hypot(q.w, q.l) + r;
      add(-1 - i, q.x - e, q.z - e, q.x + e, q.z + e);
    });
    return (x, z) => {
      const list = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
      if (!list) return true;
      for (const i of list) {
        if (i >= 0) {
          const b = this.blocked[i];
          if (Math.hypot(x - b.x, z - b.z) < b.r + r) return false;
        } else {
          const q = this.rects[-1 - i];
          const c = Math.cos(-q.ry);
          const s = Math.sin(-q.ry);
          const dx = x - q.x;
          const dz = z - q.z;
          if (Math.abs(dx * c - dz * s) < q.w + r && Math.abs(dx * s + dz * c) < q.l + r) return false;
        }
      }
      return true;
    };
  }

  box(lx: number, ly: number, lz: number, hx: number, hy: number, hz: number, ry = 0) {
    this.kit.box(lx + this.ox, ly + this.oy, lz + this.oz, hx, hy, hz, ry);
  }

  cyl(lx: number, lz: number, y0: number, y1: number, r: number) {
    this.kit.cyl(lx + this.ox, lz + this.oz, y0 + this.oy, y1 + this.oy, r);
  }

  sphere(lx: number, ly: number, lz: number, r: number) {
    this.kit.sphere(lx + this.ox, ly + this.oy, lz + this.oz, r);
  }

  anchor(type: AnchorType, lx: number, ly: number, lz: number, extra: Partial<Anchor> = {}) {
    this.kit.anchor(type, lx + this.ox, ly + this.oy, lz + this.oz, extra);
  }

  /** World coords of a local point. */
  w(lx: number, ly: number, lz: number): [number, number, number] {
    return [lx + this.ox, ly + this.oy, lz + this.oz];
  }

  /** Random points on the island top, respecting blocked areas. */
  scatter(
    count: number,
    /**
     * `cluster` (0..1) gathers points into groves with open ground between;
     * `maxSlope` (rise/run) keeps them off steep ground (default DEFAULT_MAX_SLOPE).
     */
    opts: { maxRho?: number; minRho?: number; spacing?: number; cx?: number; cz?: number; radius?: number; cluster?: number; maxSlope?: number },
    fn: (x: number, z: number, y: number, i: number) => void,
  ) {
    const n = Math.round(count * this.density);
    const maxRho = opts.maxRho ?? 0.86;
    const minRho = opts.minRho ?? 0;
    const spacing = opts.spacing ?? 3;
    const placed: [number, number][] = [];
    let tries = 0;
    while (placed.length < n && tries < n * 30) {
      tries++;
      let x: number;
      let z: number;
      if (opts.radius !== undefined) {
        const a = this.rnd() * Math.PI * 2;
        const r = Math.sqrt(this.rnd()) * opts.radius;
        x = (opts.cx ?? 0) + Math.cos(a) * r;
        z = (opts.cz ?? 0) + Math.sin(a) * r;
      } else {
        const R = this.t.p.radius * Math.max(this.t.p.sx, this.t.p.sz);
        x = (this.rnd() * 2 - 1) * R;
        z = (this.rnd() * 2 - 1) * R;
      }
      const rho = this.t.rho(x, z);
      if (rho > maxRho || rho < minRho) continue;
      if (!this.isFree(x, z, spacing * 0.5)) continue;
      if (placed.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < spacing * spacing)) continue;
      if (opts.cluster && this.rnd() > 1 - opts.cluster * (1 - this.t.grove(x, z))) continue;
      // Nothing goes on steep mountainsides unless a caller explicitly allows it.
      {
        const e = 1.5;
        const g = Math.hypot(this.h(x + e, z) - this.h(x - e, z), this.h(x, z + e) - this.h(x, z - e)) / (2 * e);
        if (g > (opts.maxSlope ?? DEFAULT_MAX_SLOPE)) continue;
      }
      placed.push([x, z]);
      fn(x, z, this.h(x, z), placed.length - 1);
    }
  }
}
