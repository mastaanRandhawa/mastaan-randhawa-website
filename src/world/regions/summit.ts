import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit } from "../regionKit";
import { SEA_LEVEL, type RegionDef, type Vec3 } from "../layout";
import type { RegionExtras } from "../defs";
import { courseRings } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { tree, rock } from "../prefabs/nature";
import { flagpole, streetlight, bench, bridge, skyDock } from "../prefabs/structures";
import { medalsFor } from "./common";
import { portfolio } from "@/content/portfolio";

const SFU_RED = "#a6192e";

/**
 * Education Summit — a mountain island rising out of the ocean (a nod to SFU's
 * hilltop campus) with a terraced concrete campus on its shoulder and a
 * spiral ring course to the peak.
 */
export function buildSummit(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, , cz] = def.center;
  const baseY = -30;
  const peakH = 270;
  const R = 200;
  const campus = { x: 46, z: 64, r: 30, h: 132 };
  const I = kit.island({
    id: "summit",
    x: cx,
    y: baseY,
    z: cz,
    radius: R,
    seed: 4401,
    hilliness: 12,
    hillScale: 0.012,
    irregularity: 0.2,
    depth: 40,
    rimDrop: 0,
    rings: 26,
    segments: 80,
    peaks: [
      { height: peakH, radius: 175, sharpness: 1.25 },
      { height: 120, radius: 70, x: -70, z: 40, sharpness: 1.6 },
      { height: 95, radius: 60, x: 60, z: -75, sharpness: 1.6 },
      // Lower, differently shaped neighbours: a sharp horn and a broad, worn hump.
      { height: 78, radius: 48, x: -110, z: -55, sharpness: 2.3, arms: 2 },
      { height: 52, radius: 70, x: 125, z: -10, sharpness: 0.9, arms: 5 },
    ],
    rockSlope: 1.4,
    // Ridge arms and flank gullies (see heightLocal) turn the cone into a massif.
    kind: "mountain",
    palette: PALETTES.alpine,
    snowLine: 215,
    pads: [
      { x: campus.x, z: campus.z, r: campus.r, h: campus.h, blend: 22, color: "#cfc8bb", colorStrength: 0.5 },
      { x: campus.x + 28, z: campus.z + 30, r: 12, h: campus.h - 8, blend: 14 },
    ],
  });
  const b = I.b;
  const y0 = campus.h;
  // Terraced concrete campus (stepped long blocks around a covered quad).
  const terrace = (x: number, z: number, w: number, d: number, steps: number, ry: number) => {
    for (let s = 0; s < steps; s++) {
      b.add(P.box(), T(x, y0 + 2 + s * 3.6, z - s * 1.8 * Math.cos(ry), w - s * 2, 3.6, d - s * 3.2, ry), s % 2 ? C.concrete : C.concreteDark);
      b.add(P.box(), T(x, y0 + 2.4 + s * 3.6, z - s * 1.8 * Math.cos(ry) + (d - s * 3.2) / 2 + 0.05, w - s * 2 - 1, 1, 0.1, ry), C.window, { emissive: 0.45 });
    }
    I.box(x, y0 + (steps * 3.6) / 2, z, w / 2, (steps * 3.6) / 2 + 0.4, d / 2, ry);
  };
  const qx = campus.x;
  const qz = campus.z;
  terrace(qx - 16, qz, 10, 34, 4, 0);
  terrace(qx + 16, qz, 10, 34, 4, 0);
  terrace(qx, qz - 18, 30, 10, 3, 0);
  // Covered quad: glass canopy on slim columns
  for (const sx of [-9, 9]) for (const sz of [-12, 0, 12]) b.add(P.cyl(6), T(qx + sx, y0 + 6, qz + sz, 0.6, 12, 0.6), C.white);
  b.add(P.box(), T(qx, y0 + 12.2, qz, 20, 0.4, 28), C.glass, { emissive: 0.25 });
  b.add(P.box(), T(qx, y0 + 0.15, qz, 18, 0.3, 26), "#7fb86a");
  // Library block with a clock tower
  b.add(P.box(), T(qx + 2, y0 + 5, qz + 24, 22, 10, 10), C.concrete);
  b.add(P.box(), T(qx + 2, y0 + 5, qz + 29.05, 20, 6, 0.1), C.window, { emissive: 0.5 });
  b.add(P.box(), T(qx + 14, y0 + 11, qz + 24, 4, 22, 4), C.concreteDark);
  b.add(P.cyl(16), T(qx + 14, y0 + 19, qz + 26.05, 2.8, 0.2, 2.8, 0, Math.PI / 2), C.white, { emissive: 0.4 });
  b.add(P.prism(), T(qx + 14, y0 + 23, qz + 24, 4.4, 2, 4.4), SFU_RED);
  I.box(qx + 2, y0 + 5, qz + 24, 11, 5, 5);
  I.cyl(qx + 14, qz + 24, y0, y0 + 24, 2.8);
  I.anchor("sign", qx + 2, y0 + 12, qz + 29.1, { data: { lines: [portfolio.education.school.toUpperCase(), portfolio.education.degree], w: 18, h: 2.6, bg: "#fbf6ec", fg: SFU_RED, accent: SFU_RED } });
  flagpole(I, qx - 6, qz + 34, SFU_RED, 10);
  flagpole(I, qx + 6, qz + 34, C.white, 10);
  for (const [x, z] of [[qx - 24, qz + 18], [qx + 24, qz - 14], [qx - 24, qz - 16]] as const) streetlight(I, x, z, 0);
  bench(I, qx + 28, qz + 30, 0.4);
  bench(I, qx + 32, qz + 26, 0.9);

  // Pines on the lower slopes, rocks on the upper ones, a cairn at the peak.
  I.scatter(90, { minRho: 0.35, maxRho: 0.92, spacing: 9 }, (x, z, y) => {
    if (y < 175 && baseY + y > SEA_LEVEL + 4) tree(I, x, z, I.rnd() > 0.3 ? "pine" : "poplar", 1.2 + I.rnd() * 0.8, y);
  });
  I.scatter(30, { minRho: 0.12, maxRho: 0.5, spacing: 10 }, (x, z) => rock(I, x, z, 2 + I.rnd() * 3));
  const top = I.h(0, 0);
  for (let k = 0; k < 4; k++) b.add(P.rock(k), T(0, top + 1 + k * 1.3, 0, 3 - k * 0.5, 1.4, 3 - k * 0.5, k), C.stoneDark);
  flagpole(I, 3, 2, SFU_RED, 7);
  out.collectibles.push({ id: "log-sfu", pos: I.w(0, top + 16, 0), hint: "Above the summit cairn" });

  // ── Summit Spiral: climb around the mountain to the peak ──
  /** Distance from the summit where the terrain drops below local height h. */
  const mountainR = (h: number) => {
    let maxR = 0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      for (let r = 0; r < R * 1.2; r += 3) {
        if (I.h(Math.cos(a) * r, Math.sin(a) * r) < h) {
          maxR = Math.max(maxR, r);
          break;
        }
      }
    }
    return maxR;
  };
  const pts: Vec3[] = [];
  const N = 13;
    for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Starts well above the sea (the mountain's foothills are now underwater).
    const h = 118 + t * 182;
    const a = -2.2 + t * Math.PI * 2.6;
    // Divide by the chord sag so the straight line between rings also clears the slopes.
    const r = mountainR(h - 20) / Math.cos((Math.PI * 2.6) / (N - 1) / 2) + 30;
    pts.push([cx + Math.cos(a) * r, baseY + h, cz + Math.sin(a) * r]);
  }
  out.courses.push({ id: "summit-spiral", name: "Summit Spiral", regionId: "summit", description: "Spiral up the mountain to the peak.", timed: true, rings: courseRings(pts, 10), medals: medalsFor(pts) });

  // Floating sky dock off the campus shoulder, joined by a bridge.
  const rl = Math.hypot(campus.x, campus.z);
  const ux = campus.x / rl;
  const uz = campus.z / rl;
  const dockL = { x: campus.x + ux * 84, z: campus.z + uz * 84 };
  const dockHeading = Math.atan2(uz, -ux);
  const dock = skyDock(kit, cx + dockL.x, baseY + campus.h, cz + dockL.z, dockHeading, 78);
  dock.turn = -1;
  const bx = campus.x + ux * 27;
  const bz = campus.z + uz * 27;
  bridge(kit.world, [cx + dockL.x - ux * 10, baseY + campus.h - 0.2, cz + dockL.z - uz * 10], I.w(bx, I.h(bx, bz) + 0.2, bz), 4, 3);

  out.destinations.push({
    id: "education",
    regionId: "summit",
    kind: "education",
    label: "Education Summit",
    sublabel: portfolio.education.school,
    pos: I.w(qx, y0 + 30, qz),
    interactRadius: 110,
    accent: def.accent,
    landing: dock,
  });
}
