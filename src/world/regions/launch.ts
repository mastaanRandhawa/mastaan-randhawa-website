import { P, T } from "@/render/geometry/MeshBuilder";
import { portfolio } from "@/content/portfolio";
import type { RegionKit } from "../regionKit";
import { REGIONS, type RegionDef } from "../layout";
import { courseRings, type RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { decorate, floatingRocks, rock, tree, flowers, bush } from "../prefabs/nature";
import {
  barrel,
  bench,
  controlTower,
  cottage,
  crate,
  fence,
  flagpole,
  gazebo,
  hangar,
  runway,
  signpost,
  streetlight,
  tank,
  windmill,
  windsock,
  frame,
} from "../prefabs/structures";
import { TP } from "@/render/geometry/MeshBuilder";

/**
 * Region 1 — The Launch Airfield. The vertical-slice island: runway, hangar,
 * control tower, village, windmill, pond + waterfall, lookout, welcome sign,
 * mission board and signposts pointing at every other region.
 */
export function buildLaunch(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const I = kit.island({
    id: "launch-main",
    x: cx,
    y: cy,
    z: cz,
    radius: 96,
    sx: 1.05,
    sz: 1.45,
    seed: 1207,
    hilliness: 7,
    irregularity: 0.13,
    depth: 92,
    palette: PALETTES.meadow,
    rings: 18,
    segments: 72,
    pads: [
      { x: 0, z: 0, r: 0, w: 10.5, l: 84, h: 0, blend: 12, color: "#86b25a", colorStrength: 0.6 },
      { x: -27, z: 8, r: 0, w: 15, l: 38, h: 0, blend: 10, color: "#b9b08f", colorStrength: 0.5 },
      { x: 40, z: -18, r: 9, h: -1.4, blend: 6, color: "#d9c58f", colorStrength: 0.9 },
      { x: 70, z: -18, r: 0, w: 22, l: 2.6, h: -1.2, blend: 3, color: "#d9c58f", colorStrength: 0.8 },
      { x: 58, z: -60, r: 7, h: 7, blend: 14 },
      { x: 42, z: 14, r: 7, h: 1.5, blend: 6 },
      { x: 55, z: 34, r: 7, h: 2.2, blend: 6 },
      { x: 34, z: 42, r: 6, h: 1.4, blend: 6 },
      { x: 22, z: 64, r: 6, h: 0.4, blend: 5, color: "#c9b88a", colorStrength: 0.5 },
      { x: -58, z: -78, r: 7, h: 4, blend: 8, color: "#d6cdb8", colorStrength: 0.6 },
      { x: -14, z: 70, r: 3, h: 0, blend: 4 },
    ],
  });

  // ── Airfield ──
  runway(I, 0, 0, 160, 13);
  hangar(I, -31, 18, Math.PI / 2, { w: 22, d: 20, h: 10, sign: ["HANGAR 01", `${portfolio.profile.initials} · AIR`] });
  controlTower(I, -30, -20, Math.PI / 2, 17);
  tank(I, -42, 42, 0.2, C.white);
  tank(I, -36, 46, 0.2, C.cream);
  windsock(I, 12, -58);
  for (const [x, z] of [[-18, 34], [-18, 0], [-18, -34]] as const) streetlight(I, x, z, Math.PI, 5);
  crate(I, -16, 30, 1.3, 0.2, 2);
  crate(I, -15, 32.4, 1.1, 0.7, 1);
  barrel(I, -17, 26);
  barrel(I, -15.6, 25.4, C.deepBlue);
  barrel(I, -16.4, 24, C.amber);
  flagpole(I, -20, 46, C.coral, 10);
  flagpole(I, -24, 46, C.turquoise, 9);
  fence(I, -44, 56, -10, 60);
  // Apron tarmac
  I.b.add(P.box(), T(-24, I.h(-24, 8) + 0.1, 8, 14, 0.2, 52), C.asphaltLight);

  // ── Welcome sign + mission board (About destination) ──
  {
    const x = 22;
    const z = 64;
    const y = I.h(x, z);
    const M = frame(x, y, z, -0.55);
    I.b.add(P.box(), TP(M, -5.5, 3, 0, 0.6, 6, 0.6), C.woodDark);
    I.b.add(P.box(), TP(M, 5.5, 3, 0, 0.6, 6, 0.6), C.woodDark);
    I.b.add(P.box(), TP(M, 0, 4.2, -0.15, 12.4, 4.6, 0.3), C.woodDark);
    I.b.add(P.box(), TP(M, 0, 6.8, -0.1, 13.2, 0.4, 0.8), C.coral);
    I.box(x, y + 4, z, 6.6, 3.5, 0.8, -0.55);
    const [ax, az] = [Math.sin(-0.55) * 0.15, Math.cos(-0.55) * 0.15];
    I.anchor("sign", x + ax, y + 4.2, z + az, {
      ry: -0.55,
      data: {
        lines: ["WELCOME TO", "SKYBOUND", portfolio.profile.name.toUpperCase()],
        w: 12,
        h: 4.4,
        bg: "#fbf3e2",
        fg: "#1f3552",
        accent: C.coral,
        style: "welcome",
      },
    });
    flowers(I, x - 4, z + 3, 6, 1.6);
    flowers(I, x + 4, z + 3, 6, 1.6);
    bush(I, x - 7, z + 1, 1.1);
    bush(I, x + 7, z - 1, 1.1);
  }
  {
    const x = -11;
    const z = 46;
    const y = I.h(x, z);
    const M = frame(x, y, z, Math.PI / 2 + 0.25);
    I.b.add(P.box(), TP(M, -2.2, 1.6, 0, 0.3, 3.2, 0.3), C.woodDark);
    I.b.add(P.box(), TP(M, 2.2, 1.6, 0, 0.3, 3.2, 0.3), C.woodDark);
    I.b.add(P.box(), TP(M, 0, 2.6, -0.1, 4.8, 2.6, 0.2), C.wood);
    I.b.add(P.prism(), TP(M, 0, 4.25, 0, 5.4, 0.8, 1, 0), C.roofRed);
    I.anchor("sign", x + Math.sin(Math.PI / 2 + 0.25) * 0.05, y + 2.6, z + Math.cos(Math.PI / 2 + 0.25) * 0.05, {
      ry: Math.PI / 2 + 0.25,
      data: { lines: ["MISSION BOARD", "Fly the rings ▸", "Explore 10 regions", "Find 10 flight logs"], w: 4.4, h: 2.3, bg: "#fff6e4", fg: "#2b3a4f", accent: C.turquoise, style: "board" },
    });
    I.box(x, y + 2, z, 2.6, 2.2, 0.6, Math.PI / 2 + 0.25);
  }

  // Signpost pointing at every other region.
  {
    const x = -14;
    const z = 70;
    const arrows = REGIONS.filter((r) => r.id !== "launch" && ["skills", "harbor", "canyon", "city", "summit"].includes(r.id)).map((r) => ({
      text: r.name.replace("Archipelago", "Arch.").toUpperCase(),
      angle: Math.atan2(r.center[0] - (cx + x), r.center[2] - (cz + z)),
      color: "#fbf3e2",
    }));
    signpost(I, x, z, arrows);
  }

  // ── Village ──
  cottage(I, 42, 14, -0.3, { w: 6.5, d: 5, roof: C.roofRed });
  cottage(I, 55, 34, 0.4, { w: 5.5, d: 4.6, roof: C.roofBlue, wall: C.white });
  cottage(I, 34, 42, -0.8, { w: 6, d: 4.8, roof: C.roofTeal, wall: "#f6e3c4" });
  bench(I, 46, 25, 0.9);
  fence(I, 62, 22, 64, 46);
  windmill(I, 58, -60, -0.7, 1.05);
  for (const [x, z] of [[48, 2], [30, 30], [60, 48]] as const) streetlight(I, x, z, 0, 4.2);

  // ── Pond, river and waterfall off the east edge ──
  I.anchor("pond", 40, -0.75, -18, { s: 9.5 });
  {
    let ex = 40;
    while (I.t.rho(ex, -18) < 0.985 && ex < 200) ex += 0.5;
    I.anchor("pond", (40 + ex) / 2, -0.6, -18, { data: { w: ex - 40, l: 3.2 } });
    I.anchor("waterfall", ex + 0.2, I.h(ex, -18) - 0.4, -18, { data: { dir: [1, 0, 0], width: 4.8, height: 82 } });
    out.collectibles.push({ id: "log-waterfall", pos: [cx + ex + 2.5, cy - 22, cz - 18], hint: "Behind the airfield waterfall" });
  }
  for (const [x, z] of [[33, -26], [48, -9], [31, -11]] as const) rock(I, x, z, 1.6);
  for (const [x, z] of [[36, -30], [46, -28], [30, -18]] as const) flowers(I, x, z, 5);

  // ── Lookout gazebo on the west bluff ──
  gazebo(I, -58, -78, 3.4);
  bench(I, -52, -82, -0.6);
  // Hot-air balloon tethered near the hangar
  I.anchor("balloon", -66, 26, 30, { data: { colors: [C.coral, C.cream], tether: true, groundY: cy + I.h(-66, 30) } });

  decorate(I, {
    trees: 60,
    kinds: ["pine", "round", "pine", "autumn", "round", "birch"],
    bushes: 28,
    flowers: 26,
    grass: 40,
    rocks: 14,
  });
  // Tree line along the west cliffs for silhouette.
  for (let i = 0; i < 9; i++) {
    const z = -110 + i * 26;
    const x = -78 + Math.sin(i * 1.7) * 6;
    if (I.t.rho(x, z) < 0.92 && I.isFree(x, z, 3)) tree(I, x, z, i % 2 ? "pine" : "poplar", 1.3);
  }
  floatingRocks(I, 14);

  // ── Satellite islet with a little shrine ──
  const S = kit.island({
    id: "launch-islet",
    x: cx + 120,
    y: cy + 26,
    z: cz + 95,
    radius: 18,
    seed: 77,
    hilliness: 2,
    depth: 26,
    palette: PALETTES.lush,
  });
  tree(S, -4, 2, "blossom", 1.2);
  tree(S, 6, -5, "round", 0.9);
  rock(S, 2, 8, 1.4);
  flowers(S, -2, -6, 6);
  floatingRocks(S, 4, 1.6);

  // ── First Flight tutorial course ──
  out.courses.push({
    id: "tutorial",
    name: "First Flight",
    regionId: "launch",
    description: "Thread six rings around the airfield.",
    timed: false,
    medals: [60, 80, 120],
    rings: courseRings(
      [
        [cx, cy + 30, cz - 200],
        [cx + 45, cy + 40, cz - 285],
        [cx + 135, cy + 44, cz - 300],
        [cx + 205, cy + 38, cz - 215],
        [cx + 210, cy + 30, cz - 100],
        [cx + 150, cy + 24, cz + 5],
        [cx + 62, cy + 20, cz + 46],
      ],
      10.5,
    ),
  });

  out.destinations.push({
    id: "about",
    regionId: "launch",
    kind: "about",
    label: "Launch Airfield",
    sublabel: `Meet ${portfolio.profile.firstName}`,
    pos: [cx + 22, cy + 12, cz + 64],
    interactRadius: 85,
    accent: def.accent,
    landing: { x: cx, y: cy + 0.34, z: cz, heading: 0, length: 160 },
  });
}
