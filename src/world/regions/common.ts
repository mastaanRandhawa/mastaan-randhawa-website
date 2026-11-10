import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef, Vec3 } from "../layout";
import type { RegionExtras, RingDef } from "../defs";
import type { IslandPalette, Pad } from "../terrain";
import { decorate, floatingRocks, type TreeKind } from "../prefabs/nature";
import { LANDMARKS } from "../prefabs/landmarks";
import { airstrip, bridge, corridorPad, stripPad } from "../prefabs/structures";
import { projectById } from "@/content/portfolio";

export interface ProjectIslandOpts {
  projectId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  seed: number;
  palette: IslandPalette;
  sx?: number;
  sz?: number;
  pads?: Pad[];
  trees?: number;
  kinds?: TreeKind[];
  depth?: number;
  hilliness?: number;
}

/** Project islands are drawn this much larger than their base radius. */
export const ISLAND_SCALE = 1.4;

/**
 * Airstrip placement for an island: on the side facing away from the region
 * hub, rolling toward the hub so approach and departure use open sky.
 */
export function stripFor(def: RegionDef, x: number, z: number, R: number, sz = 1) {
  const awayZ = Math.sign(z - def.center[2]) || 1;
  const towardX = Math.sign(def.center[0] - x) || 1;
  return {
    z: awayZ * R * 0.58 * sz,
    heading: towardX > 0 ? -Math.PI / 2 : Math.PI / 2,
    length: Math.round(Math.min(62, R * 1.1)),
  };
}

export function projectIsland(kit: RegionKit, def: RegionDef, out: RegionExtras, o: ProjectIslandOpts): Isl {
  const p = projectById(o.projectId)!;
  const R = o.radius * ISLAND_SCALE;
  const strip = stripFor(def, o.x, o.z, R, o.sz ?? 1);
  const I = kit.island({
    id: `isl-${o.projectId}`,
    x: o.x,
    y: o.y,
    z: o.z,
    radius: R,
    sx: o.sx,
    sz: o.sz,
    seed: o.seed,
    hilliness: o.hilliness ?? 5,
    depth: o.depth ?? R * 0.9,
    palette: o.palette,
    rings: 20,
    segments: 72,
    // Each project's landmark is the star: the land frames it with gentle shoulders.
    kind: "landmark",
    pads: [
      { x: 0, z: 0, r: o.radius * 0.5, h: 0, blend: 10 },
      corridorPad(0, strip.z, strip.heading, R * 1.4 * Math.max(o.sx ?? 1, 1)),
      stripPad(0, strip.z, strip.heading, strip.length),
      ...(o.pads ?? []),
    ],
  });
  const h = LANDMARKS[p.landmark](I, 0, 0, p);
  const landing = airstrip(I, 0, strip.z, strip.heading, strip.length);
  decorate(I, { trees: (o.trees ?? 16) * 2, kinds: o.kinds, bushes: 24, flowers: 24, grass: 34, rocks: 12 });
  floatingRocks(I, 9);
  out.destinations.push({
    id: `project-${p.id}`,
    regionId: def.id,
    kind: "project",
    contentId: p.id,
    label: p.title,
    sublabel: p.tagline,
    pos: [o.x, o.y + h + 8, o.z],
    interactRadius: R + 70,
    accent: p.color,
    landing,
  });
  return I;
}

/** Plank bridge between the facing edges of two islands. */
export function bridgeBetween(kit: RegionKit, a: Isl, b: Isl, width = 3.6, sag = 4) {
  const dx = b.ox - a.ox;
  const dz = b.oz - a.oz;
  const l = Math.hypot(dx, dz) || 1;
  const ux = dx / l;
  const uz = dz / l;
  const edge = (I: Isl, sx: number, sz: number) => {
    let r = 0;
    while (I.t.rho(sx * r, sz * r) < 0.9 && r < 400) r += 0.5;
    return [sx * r, sz * r] as const;
  };
  const [ax, az] = edge(a, ux, uz);
  const [bx, bz] = edge(b, -ux, -uz);
  bridge(kit.world, [a.ox + ax, a.oy + a.h(ax, az) + 0.2, a.oz + az], [b.ox + bx, b.oy + b.h(bx, bz) + 0.2, b.oz + bz], width, sag);
}

/** Medal thresholds from course length (gold at a brisk cruise, bronze for anyone who finishes without dawdling). */
export function medalsFor(points: Vec3[]): [number, number, number] {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
  return [Math.round((len / 52) * 10) / 10, Math.round((len / 40) * 10) / 10, Math.round((len / 28) * 10) / 10];
}
