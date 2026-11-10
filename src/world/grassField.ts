import { mulberry32 } from "./noise";
import { SEA_LEVEL } from "./layout";

/** Floats per grass clump: world x, y, z, then the ground colour r, g, b under it. */
export const GRASS_STRIDE = 6;

/** Clumps per square metre of open green ground (before the quality setting thins them). */
const DENSITY = 0.3;
/** Up to moderate hillsides, but never steep banks (normal.y ≈ cos 42°). */
const MIN_UP = 0.74;

interface Ground {
  freeTest(r: number): (x: number, z: number) => boolean;
}

/**
 * Grass clump positions over an island's terrain mesh: area-weighted random
 * points on every green, gentle triangle that nothing else stands on (roads,
 * buildings, pads, trees are all marked blocked while the island is built).
 * Coordinates come back in world space, ready to instance.
 */
export function grassPoints(
  ground: Ground,
  raw: { pos: ArrayLike<number>; col: ArrayLike<number>; idx: ArrayLike<number> },
  origin: [number, number, number],
  seed: number,
): Float32Array {
  const { pos, col, idx } = raw;
  const rnd = mulberry32(seed * 7919 + 13);
  const out: number[] = [];
  const [ox, oy, oz] = origin;
  const free = ground.freeTest(0.4);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-6) continue;
    // Either winding: we only care how level the facet is.
    if (Math.abs(ny) / len < MIN_UP) continue;
    // Green ground only (not sand, dirt, rock or snow).
    const r = (col[a] + col[b] + col[c]) / 3;
    const g = (col[a + 1] + col[b + 1] + col[c + 1]) / 3;
    const bl = (col[a + 2] + col[b + 2] + col[c + 2]) / 3;
    if (g < r * 1.08 || g < bl * 1.25) continue;
    if (oy + Math.min(pos[a + 1], pos[b + 1], pos[c + 1]) < SEA_LEVEL + 0.8) continue;
    const area = len / 2;
    let n = area * DENSITY;
    // Stochastic rounding keeps small facets fairly represented.
    n = Math.floor(n) + (rnd() < n - Math.floor(n) ? 1 : 0);
    for (let k = 0; k < n; k++) {
      let s = rnd();
      let q = rnd();
      if (s + q > 1) {
        s = 1 - s;
        q = 1 - q;
      }
      const x = pos[a] + ux * s + vx * q;
      const y = pos[a + 1] + uy * s + vy * q;
      const z = pos[a + 2] + uz * s + vz * q;
      if (!free(x, z)) continue;
      out.push(ox + x, oy + y, oz + z, r, g, bl);
    }
  }
  // Shuffle so any prefix is an even sample: lower quality settings draw fewer.
  const n = out.length / GRASS_STRIDE;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    for (let k = 0; k < GRASS_STRIDE; k++) {
      const tmp = out[i * GRASS_STRIDE + k];
      out[i * GRASS_STRIDE + k] = out[j * GRASS_STRIDE + k];
      out[j * GRASS_STRIDE + k] = tmp;
    }
  }
  return new Float32Array(out);
}
