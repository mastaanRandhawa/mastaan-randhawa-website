import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef } from "../layout";
import type { RegionExtras } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, tree } from "../prefabs/nature";
import { flagpole } from "../prefabs/structures";
import { approachRing } from "./common";
import { portfolio } from "@/content/portfolio";

const ISSUER: Record<string, string> = { Databricks: "#ff5a36", Microsoft: "#2f8ae0", Anthropic: "#d97757" };

function spire(kit: RegionKit, id: string, x: number, y: number, z: number, r: number, seed: number): Isl {
  return kit.island({ id, x, y, z, radius: r, seed, hilliness: 0.6, depth: y - 20, profile: "column", rings: 4, segments: 18, layers: 12, irregularity: 0.24, palette: PALETTES.spire, pads: [{ x: 0, z: 0, r: r * 0.7, h: 0, blend: 3, color: "#cfc6b6", colorStrength: 0.6 }] });
}

function monument(I: Isl, color: string, title: string, issuer: string, date: string, big: boolean) {
  const y = I.h(0, 0);
  const b = I.b;
  const s = big ? 1.45 : 1;
  b.add(P.box(), T(0, y + 0.8 * s, 0, 7 * s, 1.6 * s, 7 * s), C.stone);
  b.add(P.frustum(0.7, 4), T(0, y + 3.4 * s, 0, 5 * s, 3.6 * s, 5 * s, Math.PI / 4), C.white);
  b.add(P.cyl(16), T(0, y + 5.5 * s, 0, 4.6 * s, 0.4, 4.6 * s), color, { emissive: 0.5 });
  I.anchor("spinner", 0, y + 10 * s, 0, { data: { kind: big ? "octa" : "ring", color, glow: big ? 2.2 : 1.6, size: big ? 2.6 : 1.8, speed: 0.6, tumble: big ? 0 : 0.4, bob: 0.5 } });
  I.anchor("sign", 0, y + 3.4 * s, 2.1 * s, {
    data: { lines: [issuer.toUpperCase(), title.length > 34 ? title.slice(0, 33) + "…" : title, date], w: 6.8 * s, h: 2.6 * s, bg: "#fbf6ec", fg: "#1f3552", accent: color, doubleSided: true },
  });
  I.cyl(0, 0, y, y + 7 * s, 3.4 * s);
}

/** Achievement Peaks — rock spires crowned with glowing credential monuments. */
export function buildPeaks(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const certs = portfolio.credentials.filter((c) => c.kind === "certification");
  const badges = portfolio.credentials.filter((c) => c.kind === "badge");
  // Base plateau the spires rise from.
  const base = kit.island({ id: "peaks-base", x: cx, y: cy - 40, z: cz, radius: 60, seed: 5501, hilliness: 6, depth: 70, palette: PALETTES.spire, pads: [{ x: 0, z: 0, r: 16, h: 0, color: "#cfc6b6", colorStrength: 0.5 }] });
  base.scatter(16, { maxRho: 0.85, spacing: 8, minRho: 0.35 }, (x, z, y) => tree(base, x, z, "pine", 1.2, y));
  floatingRocks(base, 10, 1.5);
  base.b.add(P.cyl(10), T(0, base.h(0, 0) + 1, 0, 10, 2, 10), C.stone);
  base.anchor("spinner", 0, base.h(0, 0) + 7, 0, { data: { kind: "knot", color: def.accent, glow: 1.2, size: 2, speed: 0.4 } });

  certs.forEach((c, i) => {
    const a = -Math.PI / 2 + (i - 1) * 0.95;
    const I = spire(kit, `peak-${c.id}`, cx + Math.cos(a) * 54, cy + 26 + (i === 0 ? 14 : 0), cz + Math.sin(a) * 54, 13, 5510 + i);
    monument(I, ISSUER[c.issuer], c.title, c.issuer, `Issued ${c.issued}`, true);
  });
  badges.forEach((c, i) => {
    const a = Math.PI / 2 + (i - 1.5) * 0.62;
    const I = spire(kit, `peak-${c.id}`, cx + Math.cos(a) * 58, cy - 4 + (i % 2) * 8, cz + Math.sin(a) * 58, 8, 5520 + i);
    monument(I, ISSUER[c.issuer], c.title, "Databricks badge", c.issued, false);
  });
  // Leadership spire: GDSC banners.
  const g = portfolio.leadership[0];
  const G = spire(kit, "peak-gdsc", cx - 78, cy + 8, cz + 6, 10, 5530);
  const gy = G.h(0, 0);
  G.b.add(P.box(), T(0, gy + 1, 0, 6, 2, 6), C.stone);
  flagpole(G, -2, 0, "#4285f4", 10);
  flagpole(G, 2, 0, "#ea4335", 10);
  flagpole(G, 0, -2, "#fbbc05", 11);
  flagpole(G, 0, 2, "#34a853", 9);
  G.anchor("sign", 0, gy + 3.2, 3.05, { data: { lines: [g.title.toUpperCase(), g.org], w: 7, h: 2, bg: "#fbf6ec", fg: "#1f3552", accent: "#4285f4", doubleSided: true } });
  G.box(0, gy + 1, 0, 3, 1, 3);
  out.collectibles.push({ id: "log-gdsc", pos: G.w(-17, -18, 4), hint: "Tucked against the leadership spire's cliff" });

  out.destinations.push({
    id: "achievements",
    regionId: "peaks",
    kind: "achievements",
    label: "Achievement Peaks",
    sublabel: `${certs.length} certifications · ${badges.length} badges`,
    pos: [cx, cy + 30, cz],
    interactRadius: 120,
    ring: approachRing({ ...def, center: [cx + 300, cy, cz + 300] }, cx, cy + 4, cz, 0, 0, 13),
    accent: def.accent,
  });
}
