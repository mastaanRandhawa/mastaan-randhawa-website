import { Matrix4 } from "three";
import { P, T, TP } from "@/render/geometry/MeshBuilder";
import type { Isl } from "../regionKit";
import { mulberry32 } from "../noise";
import { SEA_LEVEL } from "../layout";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { palm, sheep, tree, type TreeKind } from "./nature";
import { house } from "./architecture";
import { windmill } from "./structures";

/** World-space spheres that decoration with colliders must keep away from. */
export interface KeepClear {
  x: number;
  y: number;
  z: number;
  r: number;
}

const BOULDER = ["#d8cdbd", "#c9bca9", "#e3d8c7"];
const BUSH = ["#5f9e5c", "#73b064", "#4f8f5a"];
const FLOWERS = ["#ffffff", "#f7d154", "#f2735a", "#c9a6e8", "#ff9fb5", "#f6a04d"];
const WALLS = [C.cream, C.white, "#f6e3c6", "#fbe9dc"];
const ROOFS = [C.roofRed, C.coral, C.roofBlue, C.roofTeal, "#d98a4e"];
const TOWELS = ["#e97959", "#3fbcc0", "#f6d55a", "#bba9dc", "#5d86b3"];
const SHALLOW = "#7fd8cf";
const SHALLOW_IN = "#b9ebdf";
const SAND = "#f1d68e";

/**
 * Brings an ocean island's hill base to life. Structures go down first
 * (hillside cottages, a windmill, the beach hut, lighthouse) so the forest can
 * grow around them; then tree clumps, flower meadows, sheep, rock outcrops,
 * stepping-stone trails, beach life (palms, towels, kayaks, campfires) and a
 * few little islets out in the shallows.
 */
export function decorateShore(I: Isl, keepClear: KeepClear[]) {
  const t = I.t;
  if (t.p.profile !== "shore") return;
  const p = t.p;
  const rnd = mulberry32(p.seed * 13 + 5);
  const b = I.b;
  const sea = SEA_LEVEL - I.oy;
  const spread = t.flare * t.meanScale;
  const R = t.meanRadius;
  const circ = 2 * Math.PI * (R + spread * 0.5);
  // Vegetation thins out faster than linearly on the lower quality presets.
  const density = I.density * I.density;
  const cool = p.palette === PALETTES.alpine || p.palette === PALETTES.spire;
  const kinds: TreeKind[] = cool ? ["pine", "pine", "round"] : p.palette === PALETTES.autumn ? ["autumn", "round", "palm"] : ["round", "round", "palm", "round"];
  const pick = <V>(a: V[]) => a[Math.floor(rnd() * a.length)];

  /** Local point on the waterline at angle th, `out` metres further out. */
  const coast = (th: number, out = 0): [number, number] => {
    const er = p.radius * t.edge(th);
    const f = 1 + (t.coastExtra(th) + out) / er;
    return [Math.cos(th) * er * p.sx * f, Math.sin(th) * er * p.sz * f];
  };
  const clear = (lx: number, lz: number, r: number) => {
    const [wx, , wz] = I.w(lx, 0, lz);
    return keepClear.every((k) => Math.hypot(k.x - wx, k.z - wz) > k.r + r);
  };
  /** Footprints of placed structures, so trees and sheep keep off them. */
  const taken: { x: number; z: number; r: number }[] = [];
  const free = (x: number, z: number, r = 0) => taken.every((q) => Math.hypot(q.x - x, q.z - z) > q.r + r);
  /** Rise over run of the slope around (th, u). */
  const grade = (th: number, u: number) => {
    const [x0, y0, z0] = t.slopePoint(th, Math.max(0, u - 0.05));
    const [x1, y1, z1] = t.slopePoint(th, Math.min(1, u + 0.05));
    return Math.abs(y0 - y1) / Math.max(0.1, Math.hypot(x1 - x0, z1 - z0));
  };
  /** Outward-facing yaw for a structure at angle th (local +Z points out to sea). */
  const outward = (th: number) => Math.atan2(Math.cos(th) * p.sx, Math.sin(th) * p.sz);
  /** A gentle spot on the green slope, or null. */
  const findGentle = (maxGrade: number, u0: number, u1: number, r: number) => {
    for (let i = 0; i < 30; i++) {
      const th = rnd() * Math.PI * 2;
      const u = u0 + rnd() * (u1 - u0);
      if (t.cliff(th) > 0.2 || grade(th, u) > maxGrade) continue;
      const [x, y, z] = t.slopePoint(th, u);
      if (!free(x, z, r) || !clear(x, z, r)) continue;
      return { th, u, x, y, z };
    }
    return null;
  };
  /** A point on the beach: f = 0 at the foot of the slope, 1 at the waterline. */
  const beachPt = (th: number, f: number): [number, number, number] => {
    const [x0, y0, z0] = t.slopePoint(th, 1);
    const [x1, z1] = coast(th, 0);
    return [x0 + (x1 - x0) * f, y0 + (sea + 0.35 - y0) * f, z0 + (z1 - z0) * f];
  };
  const findBeach = (minWidth: number) => {
    for (let i = 0; i < 24; i++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) < 0.15 && t.beachWidth(th) >= minWidth) return th;
    }
    return null;
  };

  if (spread > 6) {
    // ── A little hamlet of cottages set into the hillside ──
    const homes = Math.min(4, Math.floor((circ / 260) * (0.6 + rnd() * 0.8) * I.density));
    type Spot = { th: number; u: number; x: number; y: number; z: number };
    let first: Spot | null = null;
    for (let k = 0; k < homes; k++) {
      // Later cottages cluster near the first, like a village.
      let spot: Spot | null = null;
      if (first) {
        for (let i = 0; i < 12 && !spot; i++) {
          const th: number = first.th + (rnd() - 0.5) * (40 / (R + spread * 0.5));
          const u: number = Math.min(0.7, Math.max(0.25, first.u + (rnd() - 0.5) * 0.3));
          if (t.cliff(th) > 0.2 || grade(th, u) > 0.75) continue;
          const [x, y, z] = t.slopePoint(th, u);
          if (free(x, z, 7) && clear(x, z, 9)) spot = { th, u, x, y, z };
        }
      } else spot = findGentle(0.75, 0.25, 0.65, 9);
      if (!spot) continue;
      first ??= spot;
      const ry = outward(spot.th) + (rnd() - 0.5) * 0.5;
      const w = 5 + rnd() * 2;
      const d = 4.4 + rnd() * 1.4;
      const stories = rnd() < 0.25 ? 2 : 1;
      house(I, spot.x, spot.z, ry, {
        y: spot.y + 0.6,
        plinth: 3.5,
        w,
        d,
        wall: pick(WALLS),
        roof: pick(cool ? [C.roofSlate, C.roofRed, C.roofBlue] : ROOFS),
        stories,
      });
      taken.push({ x: spot.x, z: spot.z, r: 6.5 });
      // A garden patch and a picket fence on the downhill side.
      const M = new Matrix4().copy(T(spot.x, spot.y + 0.6, spot.z, 1, 1, 1, ry));
      for (let f = -2; f <= 2; f++) b.add(P.box(), TP(M, f * 1.3, -0.1, d / 2 + 3.4, 0.14, 1.1, 0.14), C.white);
      b.add(P.box(), TP(M, 0, 0.25, d / 2 + 3.4, 5.6, 0.12, 0.1), C.white);
      for (let f = 0; f < 6; f++) b.add(P.ico(0), TP(M, -2.2 + f * 0.9, -0.05, d / 2 + 2.5 + (f % 2) * 0.35, 0.6, 0.45, 0.6, f), FLOWERS[(k + f) % FLOWERS.length]);
      if (k === 0 && rnd() < 0.5) {
        // Chimney sits at local (w·0.26, −d·0.18) on the roof.
        const cx = w * 0.26;
        const cz = -d * 0.18;
        const chimneyTop = 0.6 + 0.85 + 3.4 * stories + d * 0.58 * 1.17 + 0.7;
        I.anchor("smoke", spot.x + cx * Math.cos(ry) + cz * Math.sin(ry), spot.y + chimneyTop, spot.z - cx * Math.sin(ry) + cz * Math.cos(ry));
      }
    }

    // ── A windmill on a breezy slope ──
    if (circ > 260 && rnd() < 0.55) {
      const spot = findGentle(0.7, 0.2, 0.55, 14);
      if (spot) {
        windmill(I, spot.x, spot.z, outward(spot.th), 0.85, spot.y + 0.3, 3);
        taken.push({ x: spot.x, z: spot.z, r: 7 });
      }
    }
  }

  // ── A hut on the beach with a dock and a rowboat ──
  let hutTh: number | null = null;
  if (!cool && R + spread > 40 && rnd() < 0.75) {
    const th = findBeach(7.5);
    if (th !== null) {
      const [hx, hy, hz] = t.slopePoint(th, 0.99);
      const ry = Math.PI / 2 - th;
      if (clear(hx, hz, 10)) {
        beachHut(I, hx, hy, hz, ry);
        taken.push({ x: hx, z: hz, r: 5 });
        hutTh = th;
      }
      // Dock from the waterline straight out to sea.
      const [dx0, dz0] = coast(th, -2);
      const ux = Math.cos(th);
      const uz = Math.sin(th);
      const len = 14;
      if (clear(dx0 + ux * len, dz0 + uz * len, 8)) {
        const M = new Matrix4().copy(T(dx0 + (ux * len) / 2, sea + 0.9, dz0 + (uz * len) / 2, 1, 1, 1, ry));
        b.add(P.box(), TP(M, 0, 0, 0, 2.6, 0.3, len), C.woodLight);
        for (let zz = -len / 2 + 1; zz <= len / 2; zz += 3.2)
          for (const sx of [-1.2, 1.2]) b.add(P.cyl(6), TP(M, sx, -0.9, zz, 0.3, 2.4, 0.3), C.woodDark);
        // A lantern post and a fishing crate at the end.
        b.add(P.cyl(5), TP(M, -1.1, 1.2, len / 2 - 0.4, 0.14, 2.4, 0.14), C.woodDark);
        b.add(P.box(), TP(M, -1.1, 2.5, len / 2 - 0.4, 0.4, 0.5, 0.4), C.window, { emissive: 0.7 });
        b.add(P.box(), TP(M, 0.6, 0.45, len / 2 - 1.2, 0.9, 0.6, 0.7, 0.3), C.coral);
        // Rowboat moored alongside the end.
        const B = new Matrix4().copy(TP(M, 2.8, -0.55, len / 2 - 2.5, 1, 1, 1, 0.15));
        b.add(P.box(), TP(B, 0, 0, 0, 1.6, 0.6, 3.8), C.coral);
        b.add(P.box(), TP(B, 0, 0.05, 0, 1.25, 0.62, 3.3), C.cream);
        b.add(P.wedge(), TP(B, 0, 0, -2.3, 1.6, 0.6, 0.9, Math.PI), C.coral);
        b.add(P.box(), TP(B, 0, 0.25, 0.2, 1.3, 0.1, 0.4), C.wood);
      }
    }
  }

  // ── Stepping-stone trail winding from the top down to the beach ──
  if (spread > 8 && (hutTh !== null || rnd() < 0.6)) {
    const th0 = hutTh !== null ? hutTh + 3 / (R + spread) : rnd() * Math.PI * 2;
    if (t.cliff(th0) < 0.25) {
      const H0 = t.shoulderY - SEA_LEVEL;
      const steps = Math.max(8, Math.round((H0 + spread) / 2.3));
      let prev: [number, number, number] | null = null;
      for (let k = 0; k <= steps; k++) {
        const u = 0.02 + (k / steps) * 0.97;
        const th = th0 + Math.sin(k * 0.45) * (6 / (R + spread * u));
        const pt = t.slopePoint(th, u);
        if (prev) {
          const [x0, y0, z0] = prev;
          const [x1, y1, z1] = pt;
          const ry = Math.atan2(x1 - x0, z1 - z0);
          const pitch = Math.atan2(y1 - y0, Math.hypot(x1 - x0, z1 - z0));
          b.add(P.box(), T((x0 + x1) / 2, (y0 + y1) / 2 + 0.06, (z0 + z1) / 2, 1.4, 0.3, 1.0, ry + (k % 2 ? 0.25 : -0.2), -pitch), k % 3 ? "#ead8b5" : "#dfc9a1", { ao: false });
        }
        prev = pt;
      }
    }
  }

  // ── A striped lighthouse on a headland ──
  if (R + spread > 30 && rnd() < 0.4) {
    let best = 0;
    let bestTh = 0;
    for (let i = 0; i < 16; i++) {
      const th = (i / 16) * Math.PI * 2;
      const score = t.lobe(th) + t.cliff(th) * 0.5;
      if (score > best) {
        best = score;
        bestTh = th;
      }
    }
    const [lx, lz] = coast(bestTh, 1);
    if (clear(lx, lz, 30)) {
      lighthouse(I, lx, sea, lz);
      taken.push({ x: lx, z: lz, r: 6 });
    }
  }

  // ── Tree clumps on the slopes (not on the cliff faces) ──
  if (spread > 6) {
    const clumps = Math.min(120, Math.round((circ / 13) * density));
    for (let c = 0; c < clumps; c++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) > 0.35) continue;
      const u = 0.12 + rnd() * 0.8;
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const th2 = th + (rnd() - 0.5) * (8 / (R + spread * u));
        const u2 = Math.min(0.95, Math.max(0.08, u + (rnd() - 0.5) * 0.18));
        const [x, y, z] = t.slopePoint(th2, u2);
        if (!free(x, z, 2.5)) continue;
        const kind = pick(kinds);
        if (kind === "palm") palm(I, x, z, 0.9 + rnd() * 0.4, y - 0.3, th2 + (rnd() - 0.5), 0.2 + rnd() * 0.4);
        else tree(I, x, z, kind, 1.1 + rnd() * 1.0, y - 0.4);
      }
      // Round bushes at the clump's foot.
      for (let k = 0; k < 2; k++) {
        const [bx, by, bz] = t.slopePoint(th + (rnd() - 0.5) * (6 / (R + spread * u)), Math.min(0.97, u + 0.06 + rnd() * 0.06));
        if (!free(bx, bz, 1.5)) continue;
        const bs = 1.2 + rnd() * 1.2;
        b.add(P.ico(k), T(bx, by + bs * 0.35, bz, bs * 2, bs * 1.4, bs * 2, rnd() * 6), BUSH[(c + k) % 3], { sway: 0.1, swayBase: by, swayHeight: bs });
      }
    }

    // ── Flower meadows between the trees ──
    const meadows = Math.min(30, Math.round((circ / 32) * density));
    for (let m = 0; m < meadows; m++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) > 0.3) continue;
      const u = 0.1 + rnd() * 0.75;
      const col = pick(FLOWERS);
      const n = 8 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) {
        const th2 = th + (rnd() - 0.5) * (7 / (R + spread * u));
        const [x, y, z] = t.slopePoint(th2, Math.min(0.96, Math.max(0.05, u + (rnd() - 0.5) * 0.12)));
        if (!free(x, z, 0.5)) continue;
        b.add(P.ico(0), T(x, y + 0.25, z, 0.65, 0.5, 0.65, rnd() * 3), k % 4 ? col : C.white, { sway: 0.12, swayBase: y, swayHeight: 0.6, ao: false });
      }
    }

    // ── Sheep grazing on the gentle meadows ──
    const flocks = cool || rnd() < 0.5 ? 1 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2);
    for (let f = 0; f < flocks; f++) {
      const spot = findGentle(0.6, 0.15, 0.7, 4);
      if (!spot) continue;
      const n = 3 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) {
        const th2 = spot.th + (rnd() - 0.5) * (14 / (R + spread * spot.u));
        const [x, y, z] = t.slopePoint(th2, Math.min(0.9, Math.max(0.1, spot.u + (rnd() - 0.5) * 0.2)));
        if (free(x, z, 1.5)) sheep(I, x, y, z, rnd() * Math.PI * 2, 0.9 + rnd() * 0.3);
      }
    }
  }

  // ── Rock outcrops breaking up the cliff sectors ──
  if (spread > 6) {
    const outcrops = Math.round(circ / 40);
    for (let k = 0, tries = 0; k < outcrops && tries < outcrops * 5; tries++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) < 0.25) continue;
      const u = 0.15 + rnd() * 0.75;
      const [x, y, z] = t.slopePoint(th, u);
      const s = 2.5 + rnd() * 3.5;
      b.add(P.rock(2 * k), T(x, y + s * 0.15, z, s * 1.4, s, s * 1.2, rnd() * 6), pick([p.palette.rockA, p.palette.rockC]), { ao: false });
      b.add(P.rock(2 * k + 2), T(x + s * 0.9, y - s * 0.1, z + s * 0.5, s * 0.8, s * 0.6, s * 0.7, rnd() * 6), p.palette.rockB, { ao: false });
      k++;
    }

    // ── Shrubs and wind-bent trees clinging to the cliff ledges ──
    const clingers = Math.min(220, Math.round((circ / 3.5) * density));
    for (let c = 0; c < clingers; c++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) < 0.3) continue;
      const u = 0.05 + rnd() * 0.9;
      const [x, y, z] = t.slopePoint(th, u);
      if (!free(x, z, 1.5)) continue;
      if (rnd() < 0.3) tree(I, x, z, cool ? "pine" : rnd() < 0.5 ? "round" : "pine", 0.6 + rnd() * 0.4, y - 0.3);
      else {
        const bs = 0.9 + rnd() * 1.1;
        b.add(P.ico(0), T(x, y + bs * 0.3, z, bs * 2.2, bs * 1.2, bs * 1.8, rnd() * 6), BUSH[c % 3], { sway: 0.08, swayBase: y, swayHeight: bs });
        if (rnd() < 0.3) b.add(P.ico(0), T(x + bs, y + bs * 0.5, z, 0.6, 0.5, 0.6), pick(FLOWERS), { ao: false });
      }
    }
  }

  // ── Palms leaning out over the beach ──
  if (!cool) {
    const groups = Math.min(26, Math.round((circ / 50) * density) + 1);
    for (let g = 0; g < groups; g++) {
      const th = rnd() * Math.PI * 2;
      if (t.cliff(th) > 0.3 || t.beachWidth(th) < 6) continue;
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const th2 = th + (rnd() - 0.5) * (6 / (R + spread));
        const [x, y, z] = t.slopePoint(th2, 0.985);
        if (!free(x, z, 2)) continue;
        palm(I, x, z, 0.85 + rnd() * 0.45, y - 0.2, th2 + (rnd() - 0.5) * 0.7, 0.45 + rnd() * 0.5);
      }
    }
  }

  // ── Beach life: towels and umbrellas, kayaks, surfboards, driftwood, campfires ──
  const spots = Math.min(7, 1 + Math.round(circ / 160));
  for (let s = 0; s < spots; s++) {
    const th = findBeach(cool ? 5 : 7);
    if (th === null) continue;
    const ry = outward(th);
    const at = (dth: number, f: number) => beachPt(th + dth / (R + spread), f);
    const kind = Math.floor(rnd() * (cool ? 2 : 5));
    if (kind === 0) {
      // Driftwood and a campfire ring.
      const [x, y, z] = at(0, 0.3);
      if (!free(x, z, 3)) continue;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        b.add(P.rock(2 * k), T(x + Math.cos(a) * 1.1, y + 0.1, z + Math.sin(a) * 1.1, 0.6, 0.4, 0.5, a), C.stoneDark, { ao: false });
      }
      for (let k = 0; k < 3; k++) b.add(P.cyl(5), T(x, y + 0.3, z, 0.22, 1.6, 0.22, (k / 3) * Math.PI, 1.2), C.woodDark);
      b.add(P.cone(5), T(x, y + 0.75, z, 0.8, 1.2, 0.8, rnd()), "#ffb04a", { emissive: 0.9, ao: false });
      b.add(P.cone(5), T(x, y + 0.6, z, 0.45, 0.7, 0.45, rnd()), "#fff1a8", { emissive: 1, ao: false });
      const [lx, ly, lz] = at(2.6, 0.25);
      b.add(P.cyl(6), T(lx, ly + 0.35, lz, 0.7, 4.2, 0.7, ry + Math.PI / 2, 0, Math.PI / 2), C.woodLight);
      if (rnd() < 0.4) I.anchor("smoke", x, y + 1.2, z);
    } else if (kind === 1) {
      // Kayaks pulled up on the sand.
      for (let k = 0; k < 2; k++) {
        const [x, y, z] = at(k * 2.2 - 1.1, 0.4);
        if (!free(x, z, 2)) continue;
        b.add(P.sphere(8, 5), T(x, y + 0.2, z, 1.1, 0.55, 4.6, ry + 0.2 * k), k ? C.yellow : C.coral);
        b.add(P.box(), T(x, y + 0.42, z, 0.7, 0.08, 1.2, ry + 0.2 * k), C.navy);
      }
    } else if (kind === 2) {
      // Towels and umbrellas.
      for (let k = 0; k < 3; k++) {
        const [x, y, z] = at(k * 3.2 - 3.2, 0.45);
        if (!free(x, z, 2)) continue;
        b.add(P.box(), T(x, y + 0.05, z, 1.3, 0.06, 2.4, ry), TOWELS[(s + k) % TOWELS.length], { ao: false });
        b.add(P.box(), T(x, y + 0.07, z, 1.3, 0.06, 0.35, ry), C.white, { ao: false });
        if (k !== 1) {
          b.add(P.cyl(5), T(x + 1.2, y + 1.2, z, 0.12, 2.6, 0.12), C.white);
          b.add(P.cone(8), T(x + 1.2, y + 2.6, z, 3.2, 0.75, 3.2), k ? C.coral : C.yellow);
        }
      }
      const [bx, by, bz] = at(1.6, 0.6);
      b.add(P.sphere(8, 6), T(bx, by + 0.4, bz, 0.8, 0.8, 0.8), C.white);
      b.add(P.torus(0.3, 4, 10), T(bx, by + 0.4, bz, 0.8, 0.8, 0.8, 0, Math.PI / 2), C.coral);
    } else if (kind === 3) {
      // Surfboards stuck upright in the sand.
      for (let k = 0; k < 3; k++) {
        const [x, y, z] = at(k * 1.3 - 1.3, 0.2);
        b.add(P.sphere(8, 5), T(x, y + 1.4, z, 0.8, 3.2, 0.18, ry + k * 0.2, 0, (k - 1) * 0.12), [C.turquoise, C.coral, C.yellow][k]);
      }
    } else {
      // A little beach bar: striped awning on posts.
      const [x, y, z] = at(0, 0.15);
      if (!free(x, z, 4) || !clear(x, z, 6)) continue;
      const M = new Matrix4().copy(T(x, y, z, 1, 1, 1, ry));
      for (const [px, pz] of [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]] as const) b.add(P.cyl(5), TP(M, px, 1.3, pz, 0.2, 2.6, 0.2), C.woodDark);
      b.add(P.box(), TP(M, 0, 1, 1.4, 4.2, 1.1, 0.9), C.woodLight);
      for (let k = 0; k < 6; k++) b.add(P.box(), TP(M, -1.75 + k * 0.7, 2.75, 0, 0.7, 0.18, 3.4), k % 2 ? C.white : C.turquoise);
      for (let k = 0; k < 3; k++) b.add(P.cyl(6), TP(M, -1.2 + k * 1.2, 0.4, 2.4, 0.5, 0.8, 0.5), C.coral);
      taken.push({ x, z, r: 3.5 });
      I.box(x, y + 1.5, z, 2.2, 1.5, 1.8, ry);
    }
  }

  // ── Boulders: under the cliffs and scattered in the shallows ──
  const boulders = 3 + Math.round(circ / 110);
  for (let k = 0, tries = 0; k < boulders && tries < boulders * 6; tries++) {
    const th = rnd() * Math.PI * 2;
    if (t.cliff(th) < 0.3 && rnd() < 0.65) continue;
    const [x, z] = coast(th, -3 + rnd() * 10);
    if (!free(x, z, 3)) continue;
    const s = 2.5 + rnd() * 5;
    b.add(P.rock(k), T(x, sea + s * 0.28, z, s * 1.35, s * 1.15, s * 1.2, rnd() * 6), BOULDER[k % 3], { ao: false });
    if (rnd() > 0.4) b.add(P.rock(k + 3), T(x + s * 1.1, sea + s * 0.1, z - s * 0.6, s * 0.65, s * 0.55, s * 0.6, rnd() * 6), BOULDER[(k + 1) % 3], { ao: false });
    if (s > 4) I.sphere(x, sea + s * 0.3, z, s * 0.7);
    k++;
  }

  // ── Little islets out in the shallows ──
  const islets = Math.min(3, Math.floor(circ / 300 + rnd() * 1.6));
  for (let k = 0, tries = 0; k < islets && tries < 12; tries++) {
    const th = rnd() * Math.PI * 2;
    const [x, z] = coast(th, 16 + rnd() * 12);
    if (!clear(x, z, 14) || !free(x, z, 10)) continue;
    taken.push({ x, z, r: 10 });
    k++;
    const s = 0.8 + rnd() * 0.6;
    b.add(P.cyl(18), T(x, sea + 0.1, z, 13 * s, 0.1, 11 * s, rnd() * 3), SHALLOW, { ao: false });
    b.add(P.cyl(16), T(x, sea + 0.14, z, 9.5 * s, 0.1, 8 * s, rnd() * 3), SHALLOW_IN, { ao: false });
    if (cool || rnd() < 0.4) {
      // Craggy rock stack with a tree clinging to the top.
      const h = 5 + rnd() * 5;
      b.add(P.rock(k), T(x, sea + h * 0.4, z, 6 * s, h, 5 * s, rnd() * 6), p.palette.rockA, { ao: false });
      b.add(P.rock(k + 2), T(x + 3 * s, sea + 0.8, z + 2 * s, 3 * s, 2.4, 3 * s, rnd() * 6), p.palette.rockB, { ao: false });
      b.add(P.cyl(7), T(x, sea + h * 0.88, z, 4.6 * s, 0.6, 3.8 * s), p.palette.grassA);
      tree(I, x, z, cool ? "pine" : "round", 0.8 * s, sea + h * 0.88);
      I.sphere(x, sea + h * 0.35, z, 3.4 * s);
    } else {
      // Sandbar with a palm or two.
      b.add(P.dome(14, 5), T(x, sea - 0.4, z, 8 * s, 2.4 * s, 6.5 * s, rnd() * 3), SAND, { ao: false });
      const np = 1 + Math.floor(rnd() * 2);
      for (let j = 0; j < np; j++) palm(I, x + (j - 0.5) * 2.2 * s, z + (rnd() - 0.5) * 1.5, 0.75 + rnd() * 0.25, sea + 0.6 * s, rnd() * Math.PI * 2, 0.4 + rnd() * 0.4);
      if (rnd() < 0.5) b.add(P.rock(k), T(x - 2.8 * s, sea + 0.5, z + 1.5 * s, 1.6, 1.1, 1.4, rnd() * 6), BOULDER[k % 3], { ao: false });
    }
  }
}

function beachHut(I: Isl, x: number, y: number, z: number, ry: number) {
  const b = I.b;
  const M = new Matrix4().copy(T(x, y, z, 1, 1, 1, ry));
  for (const [sx, sz] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]] as const) b.add(P.cyl(6), TP(M, sx, 0.3, sz, 0.3, 1.8, 0.3), C.woodDark);
  b.add(P.box(), TP(M, 0, 1.25, 0, 4, 0.25, 3.6), C.woodLight);
  b.add(P.box(), TP(M, 0, 2.6, -0.2, 3.4, 2.5, 3), C.cream);
  b.add(P.box(), TP(M, 0.6, 2.3, 1.31, 0.9, 1.7, 0.08), C.woodDark);
  b.add(P.box(), TP(M, -0.9, 2.8, 1.31, 0.8, 0.7, 0.08), C.windowCool, { emissive: 0.2 });
  b.add(P.prism(), TP(M, 0, 4.5, -0.2, 4.2, 1.5, 3.8), C.roofRed);
  // Hammock-ish line of drying nets and a barrel by the steps.
  b.add(P.cyl(6), TP(M, 2.4, 0.9, 1.6, 0.8, 1.2, 0.8), C.wood);
  b.add(P.box(), TP(M, -2.3, 2.2, 0.2, 0.1, 1.4, 2.4), "#f3e7cd");
  I.box(x, y + 2.6, z, 2.2, 2.2, 2.2, ry);
}

function lighthouse(I: Isl, x: number, sea: number, z: number) {
  const b = I.b;
  // Rocky base standing in the surf.
  b.add(P.rock(1), T(x, sea + 1.2, z, 9, 4.2, 8.5, 0.4), BOULDER[0], { ao: false });
  b.add(P.rock(4), T(x + 3.5, sea + 0.6, z - 2.5, 4.5, 2.6, 4, 1.2), BOULDER[1], { ao: false });
  const y0 = sea + 3;
  const H = 16;
  const bands = 5;
  for (let k = 0; k < bands; k++) {
    const t0 = k / bands;
    const tm = (k + 0.5) / bands;
    b.add(P.frustum(0.93, 14), T(x, y0 + tm * H, z, 4.2 - t0 * 1.3, H / bands, 4.2 - t0 * 1.3), k % 2 ? C.coral : C.white);
  }
  const yt = y0 + H;
  b.add(P.cyl(14), T(x, yt + 0.25, z, 4.2, 0.5, 4.2), C.navy);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.add(P.cyl(4), T(x + Math.cos(a) * 1.9, yt + 1, z + Math.sin(a) * 1.9, 0.08, 1.1, 0.08), C.navy);
  }
  b.add(P.cyl(12), T(x, yt + 1.6, z, 2.4, 2.2, 2.4), C.window, { emissive: 0.8, ao: false });
  b.add(P.cone(12), T(x, yt + 3.4, z, 3, 1.6, 3), C.coral, { ao: false });
  b.add(P.sphere(8, 6), T(x, yt + 4.4, z, 0.5, 0.5, 0.5), C.navy, { ao: false });
  // Keeper's cottage door and a little flag.
  b.add(P.box(), T(x, y0 + 1.1, z + 2.05, 1, 1.9, 0.2), C.navy);
  I.cyl(x, z, sea - 2, yt + 4.5, 2.6);
  I.anchor("beacon", x, yt + 1.6, z, { data: { color: "#ffd27a", period: 3.2 } });
}
