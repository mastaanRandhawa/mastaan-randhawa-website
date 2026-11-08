import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree, flowers, bush } from "../prefabs/nature";
import { bridge, gazebo, bench } from "../prefabs/structures";
import { projectIsland } from "./common";

/** Region: Frontend Gardens — the early HTML/CSS/JS sites, in a blooming garden. */
export function buildGardens(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const hub = kit.island({
    id: "gardens-hub",
    x: cx,
    y: cy,
    z: cz,
    radius: 26,
    seed: 9001,
    hilliness: 1.2,
    depth: 40,
    palette: PALETTES.lush,
    pads: [{ x: 0, z: 0, r: 12, h: 0, color: "#d8cfbd", colorStrength: 0.8 }],
  });
  hub.anchor("fountain", 0, 1.2, 0);
  hub.b.add(P.cyl(18), T(0, 0.5, 0, 9, 1, 9), C.stone);
  hub.anchor("pond", 0, 1.05, 0, { s: 4.2 });
  // Hedge ring + flower beds
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    if (k % 4 === 0) continue;
    hub.b.add(P.box(), T(Math.cos(a) * 11, 0.8, Math.sin(a) * 11, 3.6, 1.6, 1.2, Math.PI / 2 - a), C.forest, { sway: 0.03, swayBase: cy, swayHeight: 1.6 });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    flowers(hub, Math.cos(a) * 17, Math.sin(a) * 17, 7, 2);
  }
  gazebo(hub, 16, -12, 3, "#c46fc0");
  bench(hub, -14, 8, 1.2);
  for (const [x, z] of [[-18, -10], [8, 19], [-6, -20]] as const) tree(hub, x, z, "blossom", 1.1);
  floatingRocks(hub, 6, 1.6);

  const fer = projectIsland(kit, def, out, { projectId: "ferrari", x: cx - 100, y: cy + 6, z: cz - 70, radius: 40, sx: 1.15, seed: 9011, palette: PALETTES.meadow, trees: 10, kinds: ["poplar", "round"] });
  const roar = projectIsland(kit, def, out, { projectId: "roar-cycle", x: cx + 95, y: cy - 6, z: cz - 60, radius: 30, seed: 9012, palette: PALETTES.autumn, trees: 12, kinds: ["autumn", "round", "pine"] });
  const logo = projectIsland(kit, def, out, { projectId: "logo-design", x: cx - 20, y: cy + 12, z: cz + 105, radius: 30, seed: 9013, palette: PALETTES.lavender, trees: 12, kinds: ["blossom", "birch"] });
  for (const I of [fer, roar, logo]) {
    I.scatter(10, { maxRho: 0.9, spacing: 4 }, (x, z) => flowers(I, x, z, 6, 1.8));
    I.scatter(6, { maxRho: 0.85, spacing: 6 }, (x, z) => bush(I, x, z, 1, "#6aa84f"));
  }
  bridge(kit.world, [cx - 20, cy + 0.2, cz - 14], [cx - 64, cy + 6.2, cz - 52], 3.4, 4);
  bridge(kit.world, [cx + 20, cy + 0.2, cz - 14], [cx + 72, cy - 5.8, cz - 44], 3.4, 4);
  bridge(kit.world, [cx - 4, cy + 0.2, cz + 25], [cx - 14, cy + 12.2, cz + 76], 3.4, 3);
  kit.anchor("balloon", cx, cy + 50, cz, { s: 0.9, data: { colors: ["#c46fc0", C.cream], path: { cx, cz, r: 90, speed: 0.035 } } });
}
