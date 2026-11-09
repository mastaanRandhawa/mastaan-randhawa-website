import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { MeshBuilder, P, T } from "../geometry/MeshBuilder";
import { worldMaterial } from "../materials/worldMaterial";
import { mulberry32 } from "@/world/noise";
import { SEA_LEVEL } from "@/world/layout";
import { C } from "@/world/palette";
import type { World } from "@/world/world";
import type { IslandTerrain } from "@/world/terrain";

/** A little sailboat (bow → -Z) with a foam wake trailing behind. */
function sailboatGeometry() {
  const b = new MeshBuilder();
  b.add(P.box(), T(0, 0.45, 0.4, 2.2, 0.9, 4.6), C.white);
  b.add(P.wedge(), T(0, 0.45, -2.6, 2.2, 0.9, 1.6, Math.PI), C.white);
  b.add(P.box(), T(0, 0.2, 0.4, 2.26, 0.3, 4.66), C.coral);
  b.add(P.box(), T(0, 1.15, 0.9, 1.4, 0.6, 1.8), C.cream);
  b.add(P.cyl(6), T(0, 4.2, -0.3, 0.14, 7, 0.14), C.woodDark);
  // Main sail and jib: thin triangular prisms.
  b.add(P.prism(), T(0, 4.6, 0.75, 0.08, 6.2, 2.0, Math.PI / 2), C.cream);
  b.add(P.prism(), T(0, 3.6, -1.5, 0.06, 4.6, 1.6, Math.PI / 2), C.white);
  b.add(P.box(), T(0, 7.6, -0.3, 0.05, 0.5, 0.8), C.coral);
  // Foam wake, flat on the water.
  b.add(P.cone(3), T(0, 0.05, 6.5, 2.6, 7, 0.05, 0, -Math.PI / 2), "#f4fbf8", { ao: false });
  return b.build();
}

interface Route {
  cx: number;
  cz: number;
  r: number;
  speed: number;
  phase: number;
}

/** Is this point clear of every island's beach (plus a margin)? */
function onOpenWater(x: number, z: number, islands: IslandTerrain[], margin: number) {
  for (const t of islands) {
    const p = t.p;
    const lx = x - p.x;
    const lz = z - p.z;
    const th = t.thetaOf(lx, lz);
    const er = p.radius * t.edge(th);
    const coastR = er * (1 + (p.profile === "shore" ? t.coastExtra(th) / er : 0.1));
    if (Math.hypot(lx / p.sx, lz / p.sz) < coastR + margin) return false;
  }
  return true;
}

/** Sailboats cruising slow loops around the bigger islands. */
export function Boats({ world, count }: { world: World; count: number }) {
  const { mesh, routes } = useMemo(() => {
    const rnd = mulberry32(3131);
    const all = world.regions.flatMap((r) => r.islands.map((i) => i.terrain));
    const sea = all.filter((t) => t.p.profile === "shore" || (t.p.y < SEA_LEVEL && t.p.y + t.maxTop > SEA_LEVEL));
    const hosts = sea.filter((t) => t.meanRadius > 25);
    const routes: Route[] = [];
    for (let tries = 0; routes.length < count && tries < count * 40; tries++) {
      const t = hosts[Math.floor(rnd() * hosts.length)];
      if (!t) break;
      const base = t.meanRadius * (1 + t.p.irregularity) + (t.p.profile === "shore" ? t.flare : 0);
      const r = base + 30 + rnd() * 70;
      let ok = true;
      for (let k = 0; k < 36 && ok; k++) {
        const a = (k / 36) * Math.PI * 2;
        ok = onOpenWater(t.p.x + Math.cos(a) * r, t.p.z + Math.sin(a) * r, sea, 14);
      }
      if (!ok) continue;
      routes.push({ cx: t.p.x, cz: t.p.z, r, speed: (rnd() > 0.5 ? 1 : -1) * (3 + rnd() * 3), phase: rnd() * Math.PI * 2 });
    }
    const mesh = new InstancedMesh(sailboatGeometry(), worldMaterial(), Math.max(1, routes.length));
    mesh.count = routes.length;
    mesh.frustumCulled = false;
    return { mesh, routes };
  }, [world, count]);

  const o = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    routes.forEach((rt, i) => {
      const a = rt.phase + (t * rt.speed) / rt.r;
      const x = rt.cx + Math.cos(a) * rt.r;
      const z = rt.cz + Math.sin(a) * rt.r;
      // Velocity direction; the bow is local -Z.
      const vx = -Math.sin(a) * Math.sign(rt.speed);
      const vz = Math.cos(a) * Math.sign(rt.speed);
      o.position.set(x, SEA_LEVEL + Math.sin(t * 1.4 + i) * 0.12, z);
      o.rotation.set(Math.sin(t * 1.1 + i * 2) * 0.03, Math.atan2(-vx, -vz), Math.sin(t * 0.9 + i) * 0.05 - 0.08 * Math.sign(rt.speed), "YXZ");
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
