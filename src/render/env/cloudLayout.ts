import { mulberry32 } from "@/world/noise";
import { REGIONS, SEA_LEVEL } from "@/world/layout";

/**
 * Where the clouds are. Shared by the cloud renderer and the ocean (which
 * paints each cloud's shadow on the water), so both agree on positions and
 * on the slow eastward drift.
 */
export interface CloudSpec {
  x: number;
  y: number;
  z: number;
  /** Half-extents of the cloud footprint (world units). */
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  variant: number;
  /** Casts a shadow on the sea. */
  shadow: boolean;
}

export const CLOUD_DRIFT = 1.6;
export const CLOUD_WRAP = 2600;
export const MAX_CLOUD_SHADOWS = 40;

/** Islands that sit above normal flight levels (secret islands), kept clear of cloud. */
const KEEP_CLEAR: [number, number, number][] = [
  [-860, -820, 70],
  [260, -210, 60],
];

function clearOfIslands(x: number, z: number, margin: number) {
  for (const r of REGIONS) if (Math.hypot(x - r.center[0], z - r.center[2]) < r.radius * 0.75 + margin) return false;
  for (const [kx, kz, kr] of KEEP_CLEAR) if (Math.hypot(x - kx, z - kz) < kr + margin) return false;
  return true;
}

export function cloudLayout(density: number): CloudSpec[] {
  const rnd = mulberry32(4242);
  const out: CloudSpec[] = [];

  // Big fair-weather clouds high above the islands: open sky between them.
  const nHigh = Math.round(16 + 12 * density);
  for (let i = 0, tries = 0; i < nHigh && tries < 3000; tries++) {
    const a = rnd() * Math.PI * 2;
    const d = 120 + Math.sqrt(rnd()) * 1900;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!clearOfIslands(x, z, 20) && rnd() > 0.35) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 260)) continue;
    const s = 42 + rnd() * 52;
    out.push({ x, y: 285 + rnd() * 70, z, sx: s * (1.25 + rnd() * 0.5), sy: s * (0.55 + rnd() * 0.25), sz: s * (0.85 + rnd() * 0.3), ry: rnd() * Math.PI * 2, variant: i % 3, shadow: true });
    i++;
  }

  // A few smaller puffs low over open water: depth while flying between islands.
  const nLow = Math.round(6 + 8 * density);
  for (let i = 0, tries = 0; i < nLow && tries < 3000; tries++) {
    const a = rnd() * Math.PI * 2;
    const d = 200 + Math.sqrt(rnd()) * 1600;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!clearOfIslands(x, z, 110)) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 200)) continue;
    const s = 16 + rnd() * 18;
    out.push({ x, y: SEA_LEVEL + 70 + rnd() * 70, z, sx: s * 1.4, sy: s * 0.62, sz: s, ry: rnd() * Math.PI * 2, variant: 3 + (i % 2), shadow: true });
    i++;
  }

  // Long cloud banks resting on the horizon.
  const nBank = 18;
  for (let i = 0; i < nBank; i++) {
    const a = (i / nBank) * Math.PI * 2 + rnd() * 0.25;
    const d = 2350 + rnd() * 650;
    const s = 130 + rnd() * 120;
    out.push({ x: Math.cos(a) * d, y: SEA_LEVEL + 25 + rnd() * 60, z: Math.sin(a) * d, sx: s * 1.7, sy: s * (0.5 + rnd() * 0.3), sz: s, ry: rnd() * Math.PI * 2, variant: i % 3, shadow: false });
  }
  return out;
}
