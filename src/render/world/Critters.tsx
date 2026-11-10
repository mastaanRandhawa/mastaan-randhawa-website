import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial } from "three";
import type { World } from "@/world/world";
import type { IslandTerrain } from "@/world/terrain";
import { SEA_LEVEL } from "@/world/layout";
import { mulberry32 } from "@/world/noise";
import { worldUniforms } from "../materials/worldMaterial";

/**
 * Small life in the air around the islands: butterflies fluttering over the
 * grass and swifts darting round the hillsides. Each is one instanced draw
 * call; flight paths and wingbeats run entirely in the vertex shader.
 */

interface Flier {
  x: number;
  y: number;
  z: number;
  radius: number;
  speed: number;
  flap: number;
  scale: number;
  color: Color;
}

/** Two wings either side of x = 0, nose toward +z. aWing marks how far out a vertex sits (it folds up with the beat). */
function wings(tris: number[]): BufferGeometry {
  const pos: number[] = [];
  for (const sign of [1, -1]) {
    for (let i = 0; i < tris.length; i += 3) pos.push(tris[i] * sign, tris[i + 1], tris[i + 2]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  return g;
}

// Fore and hind wing of a butterfly (one side).
const BUTTERFLY = [0, 0, 0.2, 1, 0, 0.55, 0.95, 0, -0.1, 0, 0, 0.05, 0.8, 0, -0.15, 0.35, 0, -0.65, -0.04, 0, 0.35, 0.04, 0, 0.35, 0, 0, -0.45];
// A swift: swept crescent wings and a forked tail.
const SWIFT = [0, 0, 0.5, 0.12, 0, -0.1, 0, 0, -0.1, 0.05, 0, 0.15, 1.5, 0, -0.55, 0.1, 0, -0.15, 0, 0, -0.1, 0.35, 0, -0.75, 0.05, 0, -0.3];

const BUTTERFLY_COLORS = ["#ffb347", "#ffe066", "#fffaf0", "#9fd3ff", "#ff9ec4", "#ff8a5c", "#c9a7ff"];
const SWIFT_COLORS = ["#3d4a5c", "#4a4f63", "#2f3b4d"];

function groundAt(t: IslandTerrain, lx: number, lz: number): number | null {
  if (t.rho(lx, lz) > 0.88) return null;
  return t.heightLocal(lx, lz);
}

function placeFliers(world: World, density: number) {
  const butterflies: Flier[] = [];
  const swifts: Flier[] = [];
  const terrains = world.regions.flatMap((r) => r.islands.map((i) => i.terrain));
  for (const t of terrains) {
    const p = t.p;
    if (p.y + t.maxTop < SEA_LEVEL + 2) continue;
    const rnd = mulberry32(p.seed * 29 + 11);
    const R = p.radius * Math.max(p.sx, p.sz);
    const area = Math.PI * R * R;
    // Butterflies in loose groups over the ground.
    const groups = Math.max(1, Math.min(10, Math.round((area / 2600) * density)));
    for (let g = 0; g < groups; g++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * R * 0.8;
      const gx = Math.cos(a) * r;
      const gz = Math.sin(a) * r;
      if (groundAt(t, gx, gz) === null) continue;
      const n = 3 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const lx = gx + (rnd() - 0.5) * 14;
        const lz = gz + (rnd() - 0.5) * 14;
        const radius = 2 + rnd() * 4;
        // Clear the highest ground the loop passes over.
        let top = -Infinity;
        for (let s = 0; s < 6; s++) {
          const h = groundAt(t, lx + Math.cos(s) * radius, lz + Math.sin(s) * radius);
          if (h !== null) top = Math.max(top, h);
        }
        const h0 = groundAt(t, lx, lz);
        if (h0 === null || !isFinite(top) || p.y + top < SEA_LEVEL + 0.5) continue;
        butterflies.push({
          x: p.x + lx,
          y: p.y + top + 1.6 + rnd() * 2.2,
          z: p.z + lz,
          radius,
          speed: (0.35 + rnd() * 0.35) * (rnd() < 0.5 ? 1 : -1),
          flap: 13 + rnd() * 6,
          scale: 0.55 + rnd() * 0.45,
          color: new Color(BUTTERFLY_COLORS[Math.floor(rnd() * BUTTERFLY_COLORS.length)]),
        });
      }
    }
    // Swifts wheeling round the island, a little above the treetops.
    const nSwift = Math.max(2, Math.min(12, Math.round((R / 14) * density)));
    for (let k = 0; k < nSwift; k++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * R * 0.6;
      const lx = Math.cos(a) * r;
      const lz = Math.sin(a) * r;
      const h = groundAt(t, lx, lz) ?? 0;
      const radius = 14 + rnd() * 26;
      swifts.push({
        x: p.x + lx,
        y: p.y + Math.max(h, t.maxTop * 0.6) + 12 + rnd() * 18,
        z: p.z + lz,
        radius,
        speed: (0.5 + rnd() * 0.4) * (rnd() < 0.5 ? 1 : -1),
        flap: 9 + rnd() * 5,
        scale: 1 + rnd() * 0.5,
        color: new Color(SWIFT_COLORS[Math.floor(rnd() * SWIFT_COLORS.length)]),
      });
    }
  }
  return { butterflies, swifts };
}

/**
 * Instanced fliers. `path` shapes the loop: butterflies wander in small
 * jittery figure-eights; swifts sweep wide, banking circles.
 */
function fliers(geo: BufferGeometry, list: Flier[], path: "flutter" | "sweep"): InstancedMesh {
  const n = list.length;
  const anchor = new Float32Array(n * 3);
  const motion = new Float32Array(n * 4);
  list.forEach((f, i) => {
    anchor.set([f.x, f.y, f.z], i * 3);
    motion.set([f.radius, f.speed, f.flap, f.scale], i * 4);
  });
  const g = geo.clone();
  g.setAttribute("aAnchor", new InstancedBufferAttribute(anchor, 3));
  g.setAttribute("aMotion", new InstancedBufferAttribute(motion, 4));
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) phase[i] = (i * 2.399) % 6.283;
  g.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));

  const mat = new MeshBasicMaterial({ side: DoubleSide });
  const offset =
    path === "flutter"
      ? `vec3 off = vec3(cos(t) * r, sin(t * 2.3) * 0.6 + sin(uTime * 3.1 + aPhase) * 0.35, sin(t * 2.0) * r * 0.6);
         vec3 vel = vec3(-sin(t), 0.0, cos(t * 2.0) * 1.2);
         float fold = 0.15 + 0.95 * (0.5 + 0.5 * flap);`
      : `vec3 off = vec3(cos(t) * r, sin(t * 0.7) * 4.0, sin(t) * r * 0.8);
         vec3 vel = vec3(-sin(t), 0.0, cos(t) * 0.8) * sign(aMotion.y);
         float fold = 0.35 * flap;`;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = worldUniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec3 aAnchor;\nattribute vec4 aMotion;\nattribute float aPhase;\nuniform float uTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `float r = aMotion.x;
         float t = uTime * aMotion.y + aPhase;
         float flap = sin(uTime * aMotion.z + aPhase * 7.0);
         ${offset}
         vec3 p = position * aMotion.w;
         // Wingbeat: each wing hinges up about the body.
         float side = p.x;
         float ang = fold;
         p.x = side * cos(ang);
         p.y += abs(side) * sin(ang);
         // Face along the path.
         float yaw = atan(vel.x, vel.z);
         float c = cos(yaw), sn = sin(yaw);
         p = vec3(c * p.x + sn * p.z, p.y, -sn * p.x + c * p.z);
         vec3 transformed = aAnchor + off + p;`,
      );
  };
  const mesh = new InstancedMesh(g, mat, n);
  list.forEach((f, i) => mesh.setColorAt(i, f.color));
  mesh.frustumCulled = false;
  return mesh;
}

export function Critters({ world, density }: { world: World; density: number }) {
  const meshes = useMemo(() => {
    const { butterflies, swifts } = placeFliers(world, density);
    const out: InstancedMesh[] = [];
    if (butterflies.length) out.push(fliers(wings(BUTTERFLY), butterflies, "flutter"));
    if (swifts.length) out.push(fliers(wings(SWIFT), swifts, "sweep"));
    return out;
  }, [world, density]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
