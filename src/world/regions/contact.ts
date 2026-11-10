import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { decorate, floatingRocks } from "../prefabs/nature";
import { antenna, cottage, flagpole, frame, runway, streetlight, windsock } from "../prefabs/structures";
import { lighthouse } from "./harbor";
import { TP } from "@/render/geometry/MeshBuilder";
import { portfolio } from "@/content/portfolio";

/** Contact Airfield — the final destination: resume, links, and a mailbox. */
export function buildContact(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const P0 = portfolio.profile;
  const I = kit.island({
    id: "contact",
    x: cx,
    y: cy,
    z: cz,
    radius: 66,
    sz: 1.5,
    seed: 3301,
    hilliness: 5,
    depth: 80,
    palette: PALETTES.meadow,
    kind: "landmark",
    pads: [
      { x: 0, z: 0, r: 0, w: 9, l: 70, h: 0, blend: 10 },
      { x: -26, z: 0, r: 0, w: 12, l: 30, h: 0, blend: 8, color: "#cfc6b6", colorStrength: 0.5 },
    ],
  });
  runway(I, 0, 0, 120, 12);
  windsock(I, 12, -50);
  // Terminal building
  const tx = -28;
  const ty = I.h(tx, 0);
  const M = frame(tx, ty, 0, Math.PI / 2);
  I.b.add(P.box(), TP(M, 0, 4, 0, 26, 8, 12), C.cream);
  I.b.add(P.box(), TP(M, 0, 3.6, 6.05, 22, 4.4, 0.1), C.glass, { emissive: 0.3 });
  I.b.add(P.box(), TP(M, 0, 8.4, 0, 27, 0.8, 13), def.accent);
  I.box(tx, ty + 4.5, 0, 6.5, 4.5, 13, Math.PI / 2);
  I.anchor("sign", tx + 6.15, ty + 10.6, 0, { ry: Math.PI / 2, data: { lines: ["CONTACT AIRFIELD", "let's build something"], w: 14, h: 2.6, bg: "#1f3552", fg: "#ffffff", accent: def.accent } });
  I.b.add(P.box(), TP(M, 0, 10.6, 5.9, 14.4, 3, 0.2), "#1f3552");
  // Giant mailbox
  const mx = 22;
  const mz = 30;
  const my = I.h(mx, mz);
  I.b.add(P.box(), T(mx, my + 3, mz, 0.8, 6, 0.8), C.woodDark);
  I.b.add(P.box(), T(mx, my + 7.2, mz, 4, 3, 7), C.red);
  I.b.add(P.arch(12), T(mx, my + 8.7, mz, 4, 7, 3, 0, -Math.PI / 2), C.red);
  I.b.add(P.box(), T(mx + 2.1, my + 9.4, mz - 1.5, 0.2, 3, 0.6), "#ffcf70");
  I.box(mx, my + 7, mz, 2.2, 3.5, 3.8);
  I.anchor("sign", mx - 2.05, my + 7.4, mz, { ry: -Math.PI / 2, data: { lines: ["MAIL", P0.email], w: 6.4, h: 2.4, bg: C.red, fg: "#fff" } });
  // Billboards for each contact channel along the runway
  const boards: [string, string, string][] = [
    ["RESUME", "download the PDF", "#1f3552"],
    ["GITHUB", "github.com/mastaanRandhawa", "#2a2c33"],
    ["LINKEDIN", "in/MastaanRandhawa", "#0a66c2"],
  ];
  boards.forEach(([t, s, c], i) => {
    const bx = 22;
    const bz = -40 + i * 22;
    const by = I.h(bx, bz);
    for (const o of [-3.6, 3.6]) I.b.add(P.box(), T(bx, by + 3, bz + o, 0.5, 6, 0.5), C.metalDark);
    I.b.add(P.box(), T(bx, by + 7.5, bz, 0.4, 4.4, 9.6), c);
    I.anchor("sign", bx - 0.25, by + 7.5, bz, { ry: -Math.PI / 2, data: { lines: [t, s], w: 9, h: 3.8, bg: c, fg: "#fff", accent: def.accent } });
    I.box(bx, by + 6, bz, 0.6, 4, 5);
  });
  lighthouse(I, -20, -62, 22, def.accent);
  antenna(I, -34, 40, 24);
  cottage(I, -40, 26, 0.3, { roof: C.roofBlue });
  flagpole(I, -14, 22, def.accent, 9);
  for (const z of [-30, -10, 10, 30]) streetlight(I, -10, z, Math.PI);
  decorate(I, { trees: 26, kinds: ["pine", "round", "autumn"], bushes: 14, flowers: 18, grass: 20, rocks: 8 });
  floatingRocks(I, 10);
  kit.anchor("balloon", cx + 40, cy + 34, cz, { data: { colors: [def.accent, C.cream], path: { cx, cz, r: 110, speed: 0.03 } } });

  out.destinations.push({
    id: "contact",
    regionId: "contact",
    kind: "contact",
    label: "Contact Airfield",
    sublabel: "Resume · links · email",
    pos: [cx, cy + 22, cz],
    interactRadius: 120,
    accent: def.accent,
    landing: { x: cx, y: cy + 0.34, z: cz, heading: 0, length: 120 },
  });
}
