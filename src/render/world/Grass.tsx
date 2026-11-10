import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, DoubleSide, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, Sphere, Vector3 } from "three";
import type { World } from "@/world/world";
import { GRASS_STRIDE } from "@/world/grassField";
import { worldUniforms } from "../materials/worldMaterial";

/** Grass shrinks into the ground between these camera distances (m), so its edge never pops. */
const FADE_START = 150;
const FADE_END = 260;

/**
 * One clump: four thin blades fanned around the centre, each a single
 * tapered triangle. aTip runs 0 at the root to 1 at the tip (colour and wind).
 */
function clumpGeometry(): BufferGeometry {
  const pos: number[] = [];
  const tip: number[] = [];
  const blades = [
    [0, 0, 0, 1.35],
    [1.9, 0.2, 0.1, 1.05],
    [3.6, -0.17, 0.15, 1.2],
    [5.2, 0.06, -0.19, 0.95],
    [0.9, -0.08, -0.22, 0.8],
  ];
  for (const [a, ox, oz, h] of blades) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 0.13;
    // Root left, root right, tip (leaning a little outward).
    pos.push(ox - c * w, 0, oz + s * w, ox + c * w, 0, oz - s * w, ox + s * 0.18, h, oz + c * 0.18);
    tip.push(0, 0, 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aTip", new BufferAttribute(new Float32Array(tip), 1));
  return g;
}

function grassMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = worldUniforms.uTime;
    s.uniforms.uWind = worldUniforms.uWind;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aTip;
uniform float uTime;
uniform float uWind;
varying vec3 vGrass;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`,
      )
      // Lit like the ground it grows from, never dark on its back faces.
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
      .replace(
        "#include <begin_vertex>",
        `float h1 = gHash(aPos.xz);
float h2 = gHash(aPos.zx + 3.1);
float yaw = h1 * 6.2832;
float cy = cos(yaw), sy = sin(yaw);
vec3 p = position;
p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
float dist = distance(aPos, cameraPosition);
float size = (0.75 + h2 * 0.7) * (1.0 - smoothstep(${FADE_START.toFixed(1)}, ${FADE_END.toFixed(1)}, dist));
p *= size;
// Wind: tips sway in slow gusts that roll across the islands.
float gust = sin(uTime * 1.7 + aPos.x * 0.11 + aPos.z * 0.07) * 0.6 + sin(uTime * 3.1 + aPos.x * 0.37) * 0.2;
p.x += gust * aTip * 0.22 * uWind * size;
p.z += cos(uTime * 1.3 + aPos.z * 0.09) * aTip * 0.12 * uWind * size;
vec3 transformed = aPos + p;
// Root matches the ground beneath; tips catch the light, some a touch yellower.
vec3 tipCol = aCol * vec3(1.22, 1.28, 1.05) + vec3(0.02, 0.03, 0.0);
tipCol = mix(tipCol, tipCol * vec3(1.18, 1.05, 0.7), step(0.82, h2) * 0.6);
vGrass = mix(aCol * 0.92, tipCol, aTip);`,
      );
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGrass;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vGrass;")
      .replace(
        "#include <normal_fragment_begin>",
        "float faceDirection = 1.0;\nvec3 normal = normalize( vNormal );\nvec3 nonPerturbedNormal = normal;",
      );
  };
  m.customProgramCacheKey = () => "skybound-grass-v1";
  return m;
}

interface Patch {
  mesh: InstancedMesh;
  center: Vector3;
  radius: number;
}

/** Dense instanced grass over every island's open green ground. */
export function Grass({ world, density }: { world: World; density: number }) {
  const patches = useMemo(() => {
    const geo = clumpGeometry();
    const mat = grassMaterial();
    const out: Patch[] = [];
    for (const r of world.regions) {
      for (const isl of r.islands) {
        const all = isl.grass;
        // Clumps are pre-shuffled, so a prefix is an even thinning.
        const n = Math.floor((all.length / GRASS_STRIDE) * density);
        if (n < 1) continue;
        const posA = new Float32Array(n * 3);
        const colA = new Float32Array(n * 3);
        const min = new Vector3(Infinity, Infinity, Infinity);
        const max = new Vector3(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < n; i++) {
          const o = i * GRASS_STRIDE;
          posA[i * 3] = all[o];
          posA[i * 3 + 1] = all[o + 1];
          posA[i * 3 + 2] = all[o + 2];
          colA.set([all[o + 3], all[o + 4], all[o + 5]], i * 3);
          min.min(new Vector3(all[o], all[o + 1], all[o + 2]));
          max.max(new Vector3(all[o], all[o + 1], all[o + 2]));
        }
        const g = geo.clone();
        g.setAttribute("aPos", new InstancedBufferAttribute(posA, 3));
        g.setAttribute("aCol", new InstancedBufferAttribute(colA, 3));
        const mesh = new InstancedMesh(g, mat, n);
        const center = min.clone().add(max).multiplyScalar(0.5);
        const radius = min.distanceTo(max) / 2 + 2;
        // Instances are placed in the shader, so give culling the real bounds.
        g.boundingSphere = new Sphere(center, radius);
        mesh.boundingSphere = new Sphere(center, radius);
        out.push({ mesh, center, radius });
      }
    }
    return out;
  }, [world, density]);

  // Skip whole islands that are beyond the fade distance.
  useFrame(({ camera }) => {
    for (const p of patches) p.mesh.visible = camera.position.distanceTo(p.center) - p.radius < FADE_END;
  });

  return (
    <>
      {patches.map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
    </>
  );
}
