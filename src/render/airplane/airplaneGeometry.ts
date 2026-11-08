import { BufferAttribute, BufferGeometry, Color, LatheGeometry, Vector2 } from "three";
import type { SkinDef } from "@/game/progression";

/**
 * Procedural aircraft geometry. Local frame: nose → -Z, up → +Y, right → +X.
 * Painted surfaces are non-indexed with per-face colours so paint lines stay crisp.
 */

type V3 = [number, number, number];

/** Airfoil loop (u = chord fraction, v = thickness fraction), top then bottom. */
const AIRFOIL: [number, number][] = [
  [0, 0],
  [0.03, 0.04],
  [0.12, 0.072],
  [0.32, 0.082],
  [0.58, 0.058],
  [1, 0.008],
  [1, -0.008],
  [0.6, -0.022],
  [0.3, -0.034],
  [0.08, -0.03],
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
  // Tip cap
  const last = rings[rings.length - 1];
  const c: V3 = [0, 0, 0];
  for (const p of last) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
  for (let j = 0; j < n; j++) push(last[j], last[(j + 1) % n], c);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(tris.flat()), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(tris.length * 3), 3));
  return g;
}

/** Paint each triangle by a rule on its centroid. */
function paint(g: BufferGeometry, rule: (cx: number, cy: number, cz: number) => Color) {
  const p = g.getAttribute("position");
  const col = g.getAttribute("color") as BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const c = rule(cx, cy, cz);
    for (let k = 0; k < 3; k++) col.setXYZ(i + k, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

export function fuselageGeometry(): BufferGeometry {
  const profile: [number, number][] = [
    [0.0, 0.08],
    [0.35, 0.2],
    [1.2, 0.38],
    [2.4, 0.56],
    [3.5, 0.72],
    [4.3, 0.8],
    [5.1, 0.81],
    [5.75, 0.77],
    [6.3, 0.7],
    [6.72, 0.6],
    [6.92, 0.44],
    [6.95, 0.2],
  ];
  const lathe = new LatheGeometry(
    profile.map(([s, r]) => new Vector2(r, s)),
    20,
  );
  lathe.rotateX(-Math.PI / 2);
  lathe.scale(0.92, 1, 1);
  lathe.translate(0, 0, 3.9);
  const g = lathe.toNonIndexed();
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g.setAttribute("color", new BufferAttribute(new Float32Array(g.getAttribute("position").count * 3), 3));
  return g;
}

export function wingGeometry(mirror: boolean): BufferGeometry {
  return loft(
    [
      { s: 0.45, o: -0.42, zle: -1.4, chord: 2.35 },
      { s: 2.3, o: -0.31, zle: -1.3, chord: 2.05 },
      { s: 4.15, o: -0.17, zle: -1.1, chord: 1.55 },
      { s: 4.6, o: -0.13, zle: -0.95, chord: 1.15, thick: 0.75 },
      { s: 4.78, o: -0.12, zle: -0.75, chord: 0.6, thick: 0.5 },
    ],
    "x",
    mirror,
  );
}

export function stabilizerGeometry(mirror: boolean): BufferGeometry {
  return loft(
    [
      { s: 0.2, o: 0.14, zle: 2.85, chord: 1.1, thick: 0.7 },
      { s: 1.75, o: 0.17, zle: 3.1, chord: 0.72, thick: 0.7 },
      { s: 1.95, o: 0.17, zle: 3.22, chord: 0.45, thick: 0.5 },
    ],
    "x",
    mirror,
  );
}

export function finGeometry(): BufferGeometry {
  return loft(
    [
      { s: 0.25, o: 0, zle: 2.45, chord: 1.55, thick: 0.75 },
      { s: 1.05, o: 0, zle: 2.85, chord: 1.1, thick: 0.75 },
      { s: 1.72, o: 0, zle: 3.18, chord: 0.72, thick: 0.7 },
      { s: 1.86, o: 0, zle: 3.33, chord: 0.42, thick: 0.5 },
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
  paint(parts.fuselage, (x, y, z) => {
    if (z < -2.25) return cTrim; // cowling
    if (z < -2.0) return cAcc; // cowl ring
    if (Math.abs(y - 0.02) < 0.12 && z < 3.4) return cAcc; // cheat line
    if (Math.abs(y + 0.16) < 0.04 && z < 3.4) return cTrim; // pinstripe
    if (y < -0.52) return cTmp.copy(cBody).multiplyScalar(0.9);
    return cBody;
  });
  for (const w of parts.wings)
    paint(w, (x, _y, z) => {
      const ax = Math.abs(x);
      if (ax > 3.85) return cAcc;
      if (ax > 3.55 && ax < 3.7) return cTrim;
      if (z > 0.55 && ax > 2.4) return cTmp.copy(cWing).multiplyScalar(0.92); // aileron line
      return cWing;
    });
  for (const s of parts.stabs) paint(s, (x) => (Math.abs(x) > 1.45 ? cAcc : cBody));
  paint(parts.fin, (_x, y) => (y > 1.25 ? cAcc : y > 1.05 && y < 1.17 ? cTrim : cBody));
}
