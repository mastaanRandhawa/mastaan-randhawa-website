import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree, flowers } from "../prefabs/nature";
import { bench, bridge, flagpole, streetlight } from "../prefabs/structures";
import { projectIsland } from "./common";

export function lighthouse(I: Isl, x: number, z: number, h = 18, stripe: string = C.coral) {
  const y = I.h(x, z);
  const b = I.b;
  b.add(P.cyl(10), T(x, y + 0.6, z, 7, 1.2, 7), C.stone);
  for (let k = 0; k < 5; k++) b.add(P.frustum(0.93, 10), T(x, y + 1.2 + (h / 5) * (k + 0.5), z, 4.6 - k * 0.35, h / 5, 4.6 - k * 0.35), k % 2 ? stripe : C.white);
  b.add(P.cyl(10), T(x, y + h + 1.6, z, 3.6, 0.5, 3.6), C.metalDark);
  b.add(P.cyl(10), T(x, y + h + 3, z, 2.6, 2.4, 2.6), "#fff1c9", { emissive: 0.9 });
  b.add(P.cone(10), T(x, y + h + 5.2, z, 3.4, 2, 3.4), stripe);
  I.anchor("spinner", x, y + h + 3, z, { data: { kind: "cone", color: "#fff1c9", glow: 1.4, size: 0.8, speed: 1.6 } });
  I.cyl(x, z, y, y + h + 6, 2.6);
  I.block(x, z, 5);
}

export function buildHarbor(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const hub = kit.island({ id: "harbor-hub", x: cx, y: cy - 6, z: cz, radius: 22, seed: 510, hilliness: 1.5, depth: 34, palette: PALETTES.lush, pads: [{ x: 0, z: 0, r: 9, h: 0, color: "#cfc6b6", colorStrength: 0.8 }] });
  lighthouse(hub, 0, 0, 20, "#f97316");
  hub.anchor("sign", 6.3, hub.h(6, 6) + 3.2, 6.3, { ry: Math.PI / 4, data: { lines: ["DOXA STUDIOS", "client web projects"], w: 7, h: 2, bg: "#1f3552", fg: "#fff", accent: "#f97316", doubleSided: true } });
  hub.b.add(P.box(), T(6, hub.h(6, 6) + 1.2, 6, 0.3, 2.4, 0.3), C.woodDark);
  bench(hub, -6, 7, 0.4);
  flowers(hub, -7, -6, 6);
  tree(hub, 8, -8, "round", 1);
  floatingRocks(hub, 6, 1.6);

  const islands = [
    projectIsland(kit, def, out, { projectId: "bc-tigers", x: cx - 105, y: cy + 4, z: cz - 70, radius: 46, sz: 1.2, seed: 521, palette: PALETTES.meadow, trees: 10, kinds: ["round", "poplar"] }),
    projectIsland(kit, def, out, { projectId: "bao-bei", x: cx + 100, y: cy + 10, z: cz - 85, radius: 30, seed: 522, palette: PALETTES.lush, trees: 12, kinds: ["blossom", "pine", "round"] }),
    projectIsland(kit, def, out, { projectId: "lumiere", x: cx + 112, y: cy - 4, z: cz + 70, radius: 28, seed: 523, palette: PALETTES.lavender, trees: 10, kinds: ["birch", "round", "blossom"] }),
    projectIsland(kit, def, out, { projectId: "ak-wraps", x: cx - 90, y: cy - 2, z: cz + 92, radius: 32, seed: 524, palette: PALETTES.tech, trees: 10, kinds: ["pine", "poplar"] }),
  ];
  const ak = islands[3];
  out.collectibles.push({ id: "log-akwraps-scale", pos: ak.w(0, ak.h(0, -8) + 15, -16), hint: "Above the AK Wraps workshop roof" });
  flagpole(islands[0], 0, -48, "#f97316", 10);
  streetlight(islands[1], -12, 12, 0);
  streetlight(islands[2], 12, 10, Math.PI);

  // Boardwalk bridges from the hub to two islands.
  bridge(kit.world, [cx - 15, cy - 5.8, cz - 10], [cx - 66, cy + 4.2, cz - 44], 3.6, 5);
  bridge(kit.world, [cx + 15, cy - 5.8, cz + 10], [cx + 88, cy - 3.8, cz + 52], 3.6, 5);

  // Balloons drifting around the harbour.
  kit.anchor("balloon", cx, cy + 40, cz, { data: { colors: ["#f97316", C.cream], path: { cx, cz, r: 120, speed: 0.04 } } });
  kit.anchor("balloon", cx, cy + 60, cz, { s: 0.8, data: { colors: [C.turquoise, C.white], path: { cx: cx + 30, cz: cz - 20, r: 150, speed: -0.03 } } });
}
