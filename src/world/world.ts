import type { BufferGeometry } from "three";
import { CollisionWorld } from "./collision";
import { RegionKit, type Anchor, type BuiltIsland } from "./regionKit";
import { REGIONS, type RegionDef, type RegionId } from "./layout";
import type { CollectibleDef, CourseDef, Destination, RegionExtras } from "./defs";
import { buildLaunch } from "./regions/launch";
import { buildSkills } from "./regions/skills";
import { buildHarbor } from "./regions/harbor";
import { buildCanyon } from "./regions/canyon";
import { buildCity } from "./regions/city";
import { buildObservatory } from "./regions/observatory";
import { buildGardens } from "./regions/gardens";
import { buildSummit } from "./regions/summit";
import { buildPeaks } from "./regions/peaks";
import { buildContact } from "./regions/contact";
import { buildSecrets } from "./regions/secrets";
import { landingPlan } from "./landing";
import type { KeepClear } from "./prefabs/shore";

export interface RegionOut {
  def: RegionDef;
  islands: BuiltIsland[];
  world: BufferGeometry | null;
  anchors: Anchor[];
}

export interface World {
  regions: RegionOut[];
  collision: CollisionWorld;
  destinations: Destination[];
  courses: CourseDef[];
  collectibles: CollectibleDef[];
}

type Builder = (kit: RegionKit, def: RegionDef, out: RegionExtras) => void;

const BUILDERS: Record<RegionId, Builder> = {
  launch: buildLaunch,
  skills: buildSkills,
  harbor: buildHarbor,
  canyon: buildCanyon,
  city: buildCity,
  observatory: buildObservatory,
  gardens: buildGardens,
  summit: buildSummit,
  peaks: buildPeaks,
  contact: buildContact,
};

let world: World | null = null;

function emptyWorld(): World {
  return { regions: [], collision: new CollisionWorld(), destinations: [], courses: [], collectibles: [] };
}

export const buildTimings: Record<string, number> = {};

function buildRegion(w: World, def: RegionDef, density: number, builder: Builder) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const kit = new RegionKit(def.id, density);
  const extras: RegionExtras = { destinations: [], courses: [], collectibles: [] };
  builder(kit, def, extras);
  const built = w.regions.flatMap((r) => r.islands.map((i) => i.terrain));
  kit.fitShores(gameplaySpaces(extras), built);
  const done = kit.finish();
  for (const c of kit.colliders) w.collision.add(c);
  w.regions.push({ def, islands: done.islands, world: done.world, anchors: kit.anchors });
  w.destinations.push(...extras.destinations);
  w.courses.push(...extras.courses);
  w.collectibles.push(...extras.collectibles);
  if (typeof performance !== "undefined") buildTimings[def.name] = Math.round(performance.now() - t0);
}

/** Spheres along every ring course, collectible and landing path that island bases must keep clear of. */
function gameplaySpaces(x: RegionExtras): KeepClear[] {
  const out: KeepClear[] = [];
  const seg = (a: number[], b: number[], r: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + (b[2] - a[2]) * t, r });
    }
  };
  for (const c of x.courses) {
    c.rings.forEach((r, i) => {
      out.push({ x: r.pos[0], y: r.pos[1], z: r.pos[2], r: r.radius + 4 });
      if (i) seg(c.rings[i - 1].pos, r.pos, 6);
    });
  }
  for (const c of x.collectibles) out.push({ x: c.pos[0], y: c.pos[1], z: c.pos[2], r: 7 });
  for (const d of x.destinations) {
    if (!d.landing) continue;
    const L = landingPlan(d.landing);
    seg(L.entry, L.touchdown, 8);
    seg(L.stop, L.park, 6);
    seg(L.park, L.liftoff, 6);
    seg(L.liftoff, L.climbOut, 8);
  }
  return out;
}

const SECRET_DEF: RegionDef = { id: "launch", name: "Secrets", subtitle: "", center: [0, 0, 0], radius: 0, accent: "#fff", order: 99 };

/** Synchronous build (tests, SSR-less tooling). */
export function buildWorldSync(density = 1): World {
  const w = emptyWorld();
  for (const def of REGIONS) buildRegion(w, def, density, BUILDERS[def.id]);
  buildRegion(w, SECRET_DEF, density, buildSecrets);
  world = w;
  return w;
}

/** Builds region by region, yielding to the browser between each. */
export async function buildWorld(density: number, onProgress: (f: number) => void): Promise<World> {
  if (world) return world;
  const w = emptyWorld();
  const jobs: [RegionDef, Builder][] = [...REGIONS.map((d) => [d, BUILDERS[d.id]] as [RegionDef, Builder]), [SECRET_DEF, buildSecrets]];
  for (let i = 0; i < jobs.length; i++) {
    buildRegion(w, jobs[i][0], density, jobs[i][1]);
    onProgress((i + 1) / jobs.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  world = w;
  return w;
}

export function getWorld(): World {
  if (!world) throw new Error("World not built yet");
  return world;
}

export function worldReady() {
  return world !== null;
}

export const destinationById = (id: string) => world?.destinations.find((d) => d.id === id);
export const courseById = (id: string) => world?.courses.find((c) => c.id === id);
