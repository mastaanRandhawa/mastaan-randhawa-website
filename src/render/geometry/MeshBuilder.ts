import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  Matrix4,
  Euler,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type ColorRepresentation,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "@/world/noise";

/**
 * Accumulates many transformed primitives into ONE vertex-coloured geometry so
 * an entire island's scenery renders in a single draw call. Two extra vertex
 * attributes drive the shared world material:
 *   aSway     — 0..1 wind sway weight (foliage, flags)
 *   aEmissive — 0..1 self-illumination (windows, lamps, screens)
 * Normals are omitted; the material uses flat shading (screen-space derivatives).
 */
export interface AddOptions {
  sway?: number;
  /** Sway ramps from 0 at swayBase to `sway` at swayBase + swayHeight (local Y after transform). */
  swayBase?: number;
  swayHeight?: number;
  emissive?: number;
}

const tmpV = new Vector3();
const tmpColor = new Color();

export class MeshBuilder {
  private pos: number[] = [];
  private col: number[] = [];
  private sway: number[] = [];
  private emi: number[] = [];
  private idx: number[] = [];
  private vcount = 0;

  get vertexCount() {
    return this.vcount;
  }

  add(geo: BufferGeometry, m: Matrix4, color: ColorRepresentation, opts: AddOptions = {}): this {
    const p = geo.getAttribute("position");
    tmpColor.set(color);
    const base = this.vcount;
    const sw = opts.sway ?? 0;
    const sb = opts.swayBase ?? 0;
    const sh = opts.swayHeight ?? 0;
    const em = opts.emissive ?? 0;
    for (let i = 0; i < p.count; i++) {
      tmpV.fromBufferAttribute(p, i).applyMatrix4(m);
      this.pos.push(tmpV.x, tmpV.y, tmpV.z);
      this.col.push(tmpColor.r, tmpColor.g, tmpColor.b);
      let s = sw;
      if (sw > 0 && sh > 0) s = sw * Math.min(1, Math.max(0, (tmpV.y - sb) / sh));
      this.sway.push(s);
      this.emi.push(em);
    }
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) this.idx.push(base + index.getX(i));
    } else {
      for (let i = 0; i < p.count; i++) this.idx.push(base + i);
    }
    this.vcount += p.count;
    return this;
  }

  /** Raw triangle soup with per-vertex colours (used by terrain). */
  addRaw(positions: ArrayLike<number>, colors: ArrayLike<number>, indices: ArrayLike<number>, emissive = 0) {
    const base = this.vcount;
    const n = positions.length / 3;
    for (let i = 0; i < positions.length; i++) this.pos.push(positions[i]);
    for (let i = 0; i < colors.length; i++) this.col.push(colors[i]);
    for (let i = 0; i < n; i++) {
      this.sway.push(0);
      this.emi.push(emissive);
    }
    for (let i = 0; i < indices.length; i++) this.idx.push(base + indices[i]);
    this.vcount += n;
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute("aSway", new BufferAttribute(new Float32Array(this.sway), 1));
    g.setAttribute("aEmissive", new BufferAttribute(new Float32Array(this.emi), 1));
    const IndexArray = this.vcount > 65535 ? Uint32Array : Uint16Array;
    g.setIndex(new BufferAttribute(new IndexArray(this.idx), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ── Transform helper ─────────────────────────────────────────────────────────
const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/** Compose a transform. Returned matrix is shared — consume it immediately. */
export function T(
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
  ry = 0,
  rx = 0,
  rz = 0,
): Matrix4 {
  _e.set(rx, ry, rz, "YXZ");
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return _m.compose(_p, _q, _s);
}

/** Like T() but composes with a parent matrix (e.g. a rotated building frame). */
export function TP(parent: Matrix4, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
  const child = T(x, y, z, sx, sy, sz, ry, rx, rz).clone();
  return _m.multiplyMatrices(parent, child);
}

// ── Cached unit primitives (all ~1 unit in size, centred) ───────────────────
const cache = new Map<string, BufferGeometry>();
function cached(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    cache.set(key, g);
  }
  return g;
}

function welded(g: BufferGeometry): BufferGeometry {
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return mergeVertices(g, 1e-4);
}

export const P = {
  box: () => cached("box", () => new BoxGeometry(1, 1, 1)),
  cyl: (n = 8) => cached(`cyl${n}`, () => new CylinderGeometry(0.5, 0.5, 1, n)),
  /** Truncated cone; `top` is the top radius ratio. */
  frustum: (top = 0.6, n = 8) => cached(`fr${top}_${n}`, () => new CylinderGeometry(0.5 * top, 0.5, 1, n)),
  cone: (n = 8) => cached(`cone${n}`, () => new ConeGeometry(0.5, 1, n)),
  /** Half cylinder (axis Y, curved side +Z). Rotate rx=-PI/2 for an arch along Z. */
  arch: (n = 12) => cached(`arch${n}`, () => new CylinderGeometry(0.5, 0.5, 1, n, 1, false, -Math.PI / 2, Math.PI)),
  ico: (detail = 0) => cached(`ico${detail}`, () => welded(new IcosahedronGeometry(0.5, detail))),
  dodeca: () => cached("dodeca", () => welded(new DodecahedronGeometry(0.5))),
  sphere: (w = 10, h = 7) => cached(`sph${w}_${h}`, () => new SphereGeometry(0.5, w, h)),
  dome: (w = 12, h = 5) => cached(`dome${w}_${h}`, () => new SphereGeometry(0.5, w, h, 0, Math.PI * 2, 0, Math.PI / 2)),
  torus: (tube = 0.12, rs = 6, ts = 16, arc = Math.PI * 2) =>
    cached(`tor${tube}_${rs}_${ts}_${arc}`, () => new TorusGeometry(0.5, tube, rs, ts, arc)),
  /** Triangular prism: width X=1, height Y=1 (apex at top), depth Z=1. Gable roofs. */
  prism: () =>
    cached("prism", () => {
      const g = new BufferGeometry();
      const v = [
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0, 0.5, 0.5, // front
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0, 0.5, -0.5, // back
      ];
      g.setAttribute("position", new BufferAttribute(new Float32Array(v), 3));
      g.setIndex([0, 1, 2, 4, 3, 5, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2, 0, 3, 4, 0, 4, 1]);
      return g;
    }),
  /** Wedge / ramp: full height at -Z, zero at +Z. */
  wedge: () =>
    cached("wedge", () => {
      const g = new BufferGeometry();
      const v = [-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5];
      g.setAttribute("position", new BufferAttribute(new Float32Array(v), 3));
      g.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 0, 1, 4, 1, 5, 4, 0, 4, 2, 1, 3, 5]);
      return g;
    }),
  /** Jittered low-poly boulder; `variant` picks one of several shapes. */
  rock: (variant = 0) =>
    cached(`rock${variant % 6}`, () => {
      const g = welded(new IcosahedronGeometry(0.5, variant % 2));
      const rnd = mulberry32(911 + variant * 17);
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        const k = 0.78 + rnd() * 0.42;
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k);
      }
      return g;
    }),
};
