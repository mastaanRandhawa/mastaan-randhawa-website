import { BufferAttribute, BufferGeometry, Color, LatheGeometry, Vector2 } from "three";
import type { SkinDef } from "@/game/progression";

/**
 * Procedural toy-plane geometry. Local frame: nose → -Z, up → +Y, right → +X.
 *
 * The silhouette is deliberately cartoonish: a short, chubby fuselage with a
 * round cowling and an up-swept tail, thick slab wings with rounded tips, and a
 * chunky tail. Painted surfaces are non-indexed with per-face colours so the
 * colour blocks (cream body, coral cowl and tips, navy belly and tail) stay crisp.
 */

type V3 = [number, number, number];

/** Thick, blunt section (u = chord fraction, v = thickness fraction), top then bottom. */
const AIRFOIL: [number, number][] = [
  [0, 0],
  [0.04, 0.055],
  [0.16, 0.085],
  [0.4, 0.088],
  [0.7, 0.06],
  [1, 0.018],
  [1, -0.018],
  [0.7, -0.045],
  [0.35, -0.062],
  [0.08, -0.045],
];

export interface Section {
  /** Span position (x for wings, y for fins). */
  s: number;
  /** Offset on the other perpendicular axis (y for wings, x for fins). */
  o: number;
  zle: number;
  chord: number;
  thick?: number;
}

/** Lofts airfoil sections into a closed surface with a fan-capped tip. */
function loft(sections: Section[], axis: "x" | "y", mirror: boolean): BufferGeometry {
  const ring = (sec: Section): V3[] =>
    AIRFOIL.map(([u, v]) => {
      const z = sec.zle + u * sec.chord;
      const t = v * sec.chord * (sec.thick ?? 1);
      return axis === "x" ? [mirror ? -sec.s : sec.s, sec.o + t, z] : [sec.o + t, sec.s, z];
    });
  const rings = sections.map(ring);
  const tris: V3[] = [];
  const push = (a: V3, b: V3, c: V3) => {
    if (mirror || axis === "y") tris.push(a, c, b);
    else tris.push(a, b, c);
  };
  const n = AIRFOIL.length;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const A = rings[i][j];
      const B = rings[i][j1];
      const Cc = rings[i + 1][j];
      const D = rings[i + 1][j1];
      push(A, B, Cc);
      push(B, D, Cc);
    }
  }
  const last = rings[rings.length - 1];
  const c: V3 = [0, 0, 0];
  for (const p of last) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
  for (let j = 0; j < n; j++) push(last[j], last[(j + 1) % n], c);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(tris.flat()), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(tris.length * 3), 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Paint by a rule on the centroid and normal of each quad (the two triangles
 * the lathe and loft emit back to back), so colour boundaries follow mesh rows
 * as clean straight edges instead of a triangle sawtooth.
 */
function paint(g: BufferGeometry, rule: (cx: number, cy: number, cz: number, ny: number) => Color) {
  const p = g.getAttribute("position");
  const col = g.getAttribute("color") as BufferAttribute;
  for (let i = 0; i < p.count; i += 6) {
    const n = Math.min(6, p.count - i);
    let cx = 0, cy = 0, cz = 0, nyAcc = 0;
    for (let t = 0; t < n; t += 3) {
      const ax = p.getX(i + t), ay = p.getY(i + t), az = p.getZ(i + t);
      const bx = p.getX(i + t + 1) - ax, by = p.getY(i + t + 1) - ay, bz = p.getZ(i + t + 1) - az;
      const ex = p.getX(i + t + 2) - ax, ey = p.getY(i + t + 2) - ay, ez = p.getZ(i + t + 2) - az;
      const nx = by * ez - bz * ey;
      const ny = bz * ex - bx * ez;
      const nz = bx * ey - by * ex;
      nyAcc += ny / (Math.hypot(nx, ny, nz) || 1);
      for (let k = 0; k < 3; k++) {
        cx += p.getX(i + t + k);
        cy += p.getY(i + t + k);
        cz += p.getZ(i + t + k);
      }
    }
    const c = rule(cx / n, cy / n, cz / n, nyAcc / (n / 3));
    for (let k = 0; k < n; k++) col.setXYZ(i + k, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/** Nose (z) where the cowling face sits; the propeller mounts just ahead of it. */
export const NOSE_Z = -2.9;

export function fuselageGeometry(): BufferGeometry {
  // (distance from the nose, radius): blunt round cowling, fat cabin, tapering tail.
  const profile: [number, number][] = [
    [0.0, 0.0],
    [0.02, 0.5],
    [0.12, 0.7],
    [0.38, 0.84],
    [0.85, 0.94],
    // Rows at the cowl seam so the paint break is a clean ring.
    [0.95, 0.95],
    [1.1, 0.965],
    [1.5, 0.98],
    [2.3, 0.95],
    [3.1, 0.82],
    [3.9, 0.62],
    [4.7, 0.44],
    [5.4, 0.32],
    [5.95, 0.24],
    [6.22, 0.13],
    [6.28, 0.0],
  ];
  // Tail → nose with y = -s, so after rotateX(-90°) the nose sits at z = 0 and
  // the tail runs aft (+Z), keeping three.js's outward-facing winding.
  const lathe = new LatheGeometry(
    profile
      .slice()
      .reverse()
      .map(([s, r]) => new Vector2(r, -s)),
    24,
  );
  lathe.rotateX(-Math.PI / 2);
  lathe.scale(0.94, 1, 1);
  lathe.translate(0, 0, NOSE_Z);
  // Up-swept tail and a slightly flattened belly: a toy-like, friendly profile.
  const pos = lathe.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0.4) y += Math.pow(z - 0.4, 1.4) * 0.12;
    if (y < -0.55) y = -0.55 + (y + 0.55) * 0.55;
    pos.setY(i, y);
  }
  lathe.computeVertexNormals();
  const g = lathe.toNonIndexed();
  g.deleteAttribute("uv");
  g.setAttribute("color", new BufferAttribute(new Float32Array(g.getAttribute("position").count * 3), 3));
  return g;
}

/** Chunky slab wing with a gently rounded tip and a hint of dihedral. */
export function wingGeometry(mirror: boolean): BufferGeometry {
  return loft(
    [
      { s: 0.5, o: -0.22, zle: -1.08, chord: 2.0, thick: 1.6 },
      { s: 2.4, o: -0.12, zle: -1.03, chord: 1.92, thick: 1.5 },
      { s: 3.9, o: -0.04, zle: -0.98, chord: 1.8, thick: 1.4 },
      { s: 4.36, o: -0.01, zle: -0.9, chord: 1.6, thick: 1.15 },
      { s: 4.6, o: 0.0, zle: -0.72, chord: 1.18, thick: 0.85 },
      { s: 4.68, o: 0.0, zle: -0.5, chord: 0.66, thick: 0.55 },
    ],
    "x",
    mirror,
  );
}

export function stabilizerGeometry(mirror: boolean): BufferGeometry {
  return loft(
    [
      { s: 0.2, o: 0.36, zle: 2.45, chord: 1.05, thick: 1.5 },
      { s: 1.5, o: 0.38, zle: 2.6, chord: 0.85, thick: 1.4 },
      { s: 1.8, o: 0.38, zle: 2.75, chord: 0.6, thick: 1.1 },
      { s: 1.88, o: 0.38, zle: 2.9, chord: 0.32, thick: 0.7 },
    ],
    "x",
    mirror,
  );
}

export function finGeometry(): BufferGeometry {
  return loft(
    [
      { s: 0.45, o: 0, zle: 2.0, chord: 1.6, thick: 1.6 },
      { s: 1.15, o: 0, zle: 2.35, chord: 1.25, thick: 1.5 },
      // Extra rows so the cream pinstripe and coral cap paint as clean bands.
      { s: 1.42, o: 0, zle: 2.48, chord: 1.09, thick: 1.45 },
      { s: 1.52, o: 0, zle: 2.53, chord: 1.03, thick: 1.44 },
      { s: 1.7, o: 0, zle: 2.62, chord: 0.92, thick: 1.4 },
      { s: 1.92, o: 0, zle: 2.82, chord: 0.62, thick: 1.1 },
      { s: 2.0, o: 0, zle: 3.0, chord: 0.3, thick: 0.7 },
    ],
    "y",
    false,
  );
}

const cBody = new Color();
const cAcc = new Color();
const cTrim = new Color();
const cWing = new Color();
const cTmp = new Color();

export function paintAircraft(
  parts: { fuselage: BufferGeometry; wings: BufferGeometry[]; stabs: BufferGeometry[]; fin: BufferGeometry },
  skin: SkinDef,
) {
  cBody.set(skin.body);
  cAcc.set(skin.accent);
  cTrim.set(skin.trim);
  cWing.set(skin.wing);
  paint(parts.fuselage, (_x, y, z) => {
    if (z < NOSE_Z + 0.95) return cAcc; // round coral cowling
    if (z < NOSE_Z + 1.1) return cTrim; // cowl seam
    if (y < -0.38) return cTrim; // navy belly
    return cBody;
  });
  for (const w of parts.wings)
    paint(w, (x, _y, _z, ny) => {
      const ax = Math.abs(x);
      if (ax > 4.05) return cAcc; // coral tips
      if (ny < -0.2) return cTmp.copy(cTrim).lerp(cWing, 0.12); // navy underside
      if (ax > 3.8) return cTrim; // pinstripe before the tip
      return cWing;
    });
  for (const s of parts.stabs) paint(s, (x, _y, _z, ny) => (Math.abs(x) > 1.5 ? cAcc : ny < -0.2 ? cTrim : cTmp.copy(cTrim).lerp(cBody, 0.18)));
  paint(parts.fin, (_x, y) => (y > 1.5 ? cAcc : y > 1.42 ? cBody : cTrim));
}
