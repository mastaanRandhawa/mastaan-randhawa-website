import { P, T } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { mulberry32 } from "../noise";
import { C } from "../palette";

/**
 * Rim springs: every island gets one to three waterfalls spilling over its edge
 * into the clouds below, each fed by a mossy stone basin at the rim with a few
 * glowing crystals. Placement avoids landing corridors, pads and buildings, and
 * keeps falls spread around the island.
 */
export interface SpringSite {
  /** Local rim point the water spills from. */
  x: number;
  z: number;
  /** Outward direction (unit, local). */
  dx: number;
  dz: number;
}

const MOSS = "#5f7f4a";
const MOSS_ROCK = ["#8d8f7c", "#7b806d", "#959a86"];
const CRYSTAL = "#a8ecff";

/** Walk outward along an angle until the island edge. */
function rimPoint(I: Isl, angle: number): SpringSite | null {
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  const R = I.t.p.radius * Math.max(I.t.p.sx, I.t.p.sz);
  let d = R * 0.4;
  while (I.t.rho(dx * d, dz * d) < 0.97 && d < R * 1.6) d += 0.5;
  if (d >= R * 1.6) return null;
  return { x: dx * d, z: dz * d, dx, dz };
}

export function islandSprings(I: Isl) {
  const R = I.t.p.radius * Math.max(I.t.p.sx, I.t.p.sz);
  if (R < 20) return;
  const rnd = mulberry32(I.t.p.seed * 31 + 17);
  const want = R < 45 ? 1 : R < 90 ? 2 : 3;
  // Angles already used by hand-placed waterfalls on this island.
  const taken: number[] = I.kit.anchors
    .filter((a) => a.type === "waterfall" && Math.hypot(a.x - I.ox, a.z - I.oz) < R * 1.3)
    .map((a) => Math.atan2(a.z - I.oz, a.x - I.ox));
  const minSep = (Math.PI * 2) / (want + 1.5);
  const sites: SpringSite[] = [];
  const tries = 24;
  const start = rnd() * Math.PI * 2;
  for (let k = 0; k < tries && sites.length < want; k++) {
    const a = start + (k * Math.PI * 2 * 0.618034) % (Math.PI * 2);
    if (taken.some((t) => Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t))) < minSep)) continue;
    const s = rimPoint(I, a);
    if (!s) continue;
    // Basin sits just inside the rim; both it and the lip must be clear.
    const bx = s.x - s.dx * 2.6;
    const bz = s.z - s.dz * 2.6;
    if (!I.isFree(bx, bz, 3) || !I.isFree(s.x, s.z, 2)) continue;
    taken.push(a);
    sites.push(s);
  }
  const depth = I.t.p.depth;
  for (const s of sites) spring(I, s, depth, rnd);
}

function spring(I: Isl, s: SpringSite, depth: number, rnd: () => number) {
  const b = I.b;
  const r = 2.7;
  const bx = s.x - s.dx * 2.6;
  const bz = s.z - s.dz * 2.6;
  // Basin top sits above the highest ground under it, so it reads level on a slope.
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const h = I.h(bx + Math.cos(a) * r, bz + Math.sin(a) * r);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
  }
  hi = Math.max(hi, I.h(bx, bz));
  const top = hi + 0.45;
  const base = lo - 0.6;
  // Floor below the water line, a flat stone ring above it.
  const floor = top - 0.45;
  b.add(P.cyl(14), T(bx, (floor + base) / 2, bz, r * 2, floor - base, r * 2), C.stone);
  b.add(P.torus(0.16, 5, 18), T(bx, top - 0.1, bz, r * 2.02, r * 2.02, 1.6, 0, Math.PI / 2), C.stoneDark);
  // Moss creeping over the lip, and mossy boulders around the basin.
  b.add(P.torus(0.12, 4, 10, Math.PI * 0.7), T(bx, top + 0.05, bz, r * 2.06, r * 2.06, 2, Math.atan2(-s.dz, s.dx) - Math.PI * 0.35, Math.PI / 2), MOSS);
  for (let k = 0; k < 4; k++) {
    const a = Math.atan2(s.dz, s.dx) + Math.PI * (0.55 + k * 0.3) + (rnd() - 0.5) * 0.3;
    const rx = bx + Math.cos(a) * (r + 1.1);
    const rz = bz + Math.sin(a) * (r + 1.1);
    const rs = 1 + rnd() * 1.1;
    b.add(P.rock(k + 2), T(rx, I.h(rx, rz) + rs * 0.3, rz, rs * 1.3, rs, rs * 1.2, rnd() * 6), MOSS_ROCK[k % 3]);
    b.add(P.rock(k + 3), T(rx, I.h(rx, rz) + rs * 0.62, rz, rs * 1.05, rs * 0.35, rs * 0.95, rnd() * 6), MOSS);
  }
  // A pair of faintly glowing crystals: the spring's "mystic" source.
  for (let k = 0; k < 2; k++) {
    const a = Math.atan2(s.dz, s.dx) + (k ? 1 : -1) * (1.9 + rnd() * 0.4);
    const cx = bx + Math.cos(a) * (r + 0.6);
    const cz = bz + Math.sin(a) * (r + 0.6);
    const ch = 1.6 + rnd() * 1.4;
    b.add(P.cone(5), T(cx, I.h(cx, cz) + ch / 2, cz, 0.7, ch, 0.7, rnd() * 3, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4), CRYSTAL, { emissive: 0.35, ao: false });
    b.add(P.cone(5), T(cx + 0.5, I.h(cx, cz) + ch * 0.3, cz + 0.3, 0.45, ch * 0.6, 0.45, rnd() * 3, 0.5, 0.2), CRYSTAL, { emissive: 0.3, ao: false });
  }
  I.anchor("pond", bx, top - 0.2, bz, { s: r - 0.25 });
  // The fall: spills over the lip and drops past the island's underside into the clouds.
  const lipX = bx + s.dx * (r + 0.1);
  const lipZ = bz + s.dz * (r + 0.1);
  const height = depth * 0.85 + 28;
  I.anchor("waterfall", lipX, top - 0.2, lipZ, { data: { dir: [s.dx, 0, s.dz], width: 3.4 + rnd() * 1.6, height, mist: true } });
  I.block(bx, bz, r + 3);
}
