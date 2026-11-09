import type { RegionKit } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree, rock } from "../prefabs/nature";
import { projectIsland } from "./common";

export function buildObservatory(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const I = projectIsland(kit, def, out, { projectId: "amenity", x: cx, y: cy, z: cz, radius: 44, seed: 8101, palette: PALETTES.lavender, trees: 14, kinds: ["pine", "birch", "round"] });
  out.collectibles.push({ id: "log-amenity", pos: I.w(-14, I.h(-14, 8) + 13, 8), hint: "Hovering over the Observatory's radio dish" });
  // A weather-station islet with a balloon on a tether.
  const S = kit.island({ id: "obs-islet", x: cx + 104, y: cy + 22, z: cz - 62, radius: 15, seed: 8102, hilliness: 1, depth: 22, palette: PALETTES.lavender });
  tree(S, -3, 2, "pine", 1);
  rock(S, 4, -2, 1.2);
  S.anchor("balloon", 0, 18, 0, { s: 0.6, data: { colors: ["#7a5cd6", C.white], tether: true, groundY: S.oy + S.h(0, 0) } });
  floatingRocks(S, 3, 1.6);
}
