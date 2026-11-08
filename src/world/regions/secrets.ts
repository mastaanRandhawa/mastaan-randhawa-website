import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree, flowers, rock } from "../prefabs/nature";
import { gazebo } from "../prefabs/structures";

/** Off-route discoveries: a hidden sky garden and floating ruins. */
export function buildSecrets(kit: RegionKit, _def: RegionDef, out: RegionExtras) {
  // Hidden island high above the north-west cloud bank.
  const S = kit.island({ id: "secret-garden", x: -860, y: 250, z: -820, radius: 24, seed: 9901, hilliness: 2, depth: 34, palette: PALETTES.lavender, pads: [{ x: 0, z: 0, r: 7, h: 0 }] });
  gazebo(S, 0, 0, 3.4, "#c9a6e8");
  for (const [x, z] of [[-10, 6], [9, -8], [6, 11]] as const) tree(S, x, z, "blossom", 1.3);
  for (let k = 0; k < 6; k++) flowers(S, Math.cos(k) * 14, Math.sin(k) * 14, 6, 2);
  S.anchor("sign", 0, S.h(0, 6) + 1.6, 6.5, { data: { lines: ["YOU FOUND THE", "SECRET GARDEN"], w: 4.6, h: 1.6, bg: "#fbf6ec", fg: "#7a5cd6", doubleSided: true } });
  floatingRocks(S, 6, 1.7);
  out.collectibles.push({ id: "log-credentials", pos: S.w(0, S.h(0, 0) + 10, 0), hint: "In a secret garden above the north-west clouds" });

  // Floating ruins between the airfield and the harbour.
  const R = kit.island({ id: "ruins", x: 260, y: 190, z: -210, radius: 20, seed: 9902, hilliness: 1, depth: 40, palette: PALETTES.desert, pads: [{ x: 0, z: 0, r: 12, h: 0, color: "#d8c9a8", colorStrength: 0.7 }] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const h = k % 3 === 0 ? 2.5 : 6 + (k % 2) * 3;
    R.b.add(P.cyl(8), T(Math.cos(a) * 9, R.h(0, 0) + h / 2, Math.sin(a) * 9, 1.6, h, 1.6), C.stone);
    R.cyl(Math.cos(a) * 9, Math.sin(a) * 9, R.h(0, 0), R.h(0, 0) + h, 1);
  }
  R.b.add(P.box(), T(-4, R.h(0, 0) + 9.6, 6, 12, 1.2, 2, 0.6), C.stone);
  rock(R, 3, -3, 2.2, C.stoneDark);
  floatingRocks(R, 8, 1.8);
}
