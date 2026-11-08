import type { RegionKit, Isl } from "../regionKit";
import type { RegionDef, Vec3 } from "../layout";
import type { RegionExtras, RingDef } from "../defs";
import type { IslandPalette, Pad } from "../terrain";
import { decorate, floatingRocks, type TreeKind } from "../prefabs/nature";
import { LANDMARKS } from "../prefabs/landmarks";
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
  /** Override where the arrival ring sits (world). */
  ring?: RingDef;
  depth?: number;
  hilliness?: number;
}

/** Ring placed between the region centre and the island, facing the island. */
export function approachRing(def: RegionDef, x: number, y: number, z: number, dist: number, height: number, radius = 11): RingDef {
  let dx = x - def.center[0];
  let dz = z - def.center[2];
  if (Math.hypot(dx, dz) < 1) {
    // Island sits at the region centre: approach from the Launch Airfield side.
    dx = x;
    dz = z;
  }
  const l = Math.hypot(dx, dz) || 1;
  dx /= l;
  dz /= l;
  return { pos: [x - dx * dist, y + height, z - dz * dist], dir: [dx, 0, dz], radius };
}

export function projectIsland(kit: RegionKit, def: RegionDef, out: RegionExtras, o: ProjectIslandOpts): Isl {
  const p = projectById(o.projectId)!;
  const I = kit.island({
    id: `isl-${o.projectId}`,
    x: o.x,
    y: o.y,
    z: o.z,
    radius: o.radius,
    sx: o.sx,
    sz: o.sz,
    seed: o.seed,
    hilliness: o.hilliness ?? 4,
    depth: o.depth ?? o.radius * 0.95,
    palette: o.palette,
    pads: [{ x: 0, z: 0, r: o.radius * 0.5, h: 0, blend: 10 }, ...(o.pads ?? [])],
  });
  const h = LANDMARKS[p.landmark](I, 0, 0, p);
  decorate(I, { trees: o.trees ?? 16, kinds: o.kinds, bushes: 12, flowers: 12, grass: 18, rocks: 6 });
  floatingRocks(I, 6);
  const ring = o.ring ?? approachRing(def, o.x, o.y, o.z, o.radius * Math.max(o.sx ?? 1, o.sz ?? 1) + 24, 18);
  out.destinations.push({
    id: `project-${p.id}`,
    regionId: def.id,
    kind: "project",
    contentId: p.id,
    label: p.title,
    sublabel: p.tagline,
    pos: [o.x, o.y + h + 8, o.z],
    interactRadius: o.radius + 60,
    ring,
    accent: p.color,
  });
  return I;
}

/** Medal thresholds from course length (gold needs boost, bronze is relaxed). */
export function medalsFor(points: Vec3[]): [number, number, number] {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
  return [Math.round((len / 68) * 10) / 10, Math.round((len / 54) * 10) / 10, Math.round((len / 42) * 10) / 10];
}
