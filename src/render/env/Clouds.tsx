import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, Object3D, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ENV } from "./environment";
import { mulberry32, noise2 } from "@/world/noise";
import { worldUniforms } from "../materials/worldMaterial";
import { CLOUD_DRIFT, CLOUD_WRAP, cloudLayout } from "./cloudLayout";

/**
 * Painterly clouds: a few big, soft silhouettes instead of piles of spheres.
 * Each cloud is a handful of large smooth lobes on a flat base, shaded in two
 * soft tones (creamy white, pale blue shade) with a brushy, world-anchored
 * texture and ragged edges. Opaque (no sorting); they dissolve near the camera.
 */
const cloudVert = /* glsl */ `
uniform float uTime;
uniform float uDrift;
uniform float uWrap;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  vec3 ip = instanceMatrix[3].xyz;
  float nx = mod(ip.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
  vec3 p = position;
  p += normal * sin(uTime * 0.25 + position.x * 1.3 + position.z * 1.1 + ip.x * 0.01) * 0.02;
  vec4 wp = instanceMatrix * vec4(p, 1.0);
  wp.x += nx - ip.x;
  vWorld = wp.xyz;
  vLocal = position;
  vN = normalize(mat3(instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  vFade = smoothstep(14.0, 60.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const cloudFrag = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
varying float vFade;
#include <fog_pars_fragment>
float h31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWorld);
  float brush = vnoise(vLocal * 6.0) * 0.6 + vnoise(vLocal * 15.0) * 0.4;
  // Dissolve near the camera in world-anchored wisps.
  if (vFade < 0.999 && vFade < vnoise(vWorld * 0.35) * 0.6 + brush * 0.4) discard;
  // Ragged, brushy silhouette.
  float edge = 1.0 - abs(dot(n, v));
  if (edge * 1.35 - brush * 0.55 > 0.86) discard;
  // Two soft tones: lit cream and pale-blue shade, with a painted transition.
  float ndl = dot(n, uSunDir) + (brush - 0.5) * 0.35;
  float lit = smoothstep(-0.18, 0.32, ndl);
  vec3 col = mix(uShadow, uLit, lit);
  // Flat undersides sit in shade.
  col = mix(col, uShadow * 0.96, smoothstep(0.12, -0.25, vLocal.y) * 0.6);
  // Soft bright rim and gentle paper texture.
  col = mix(col, uRim, pow(edge, 3.0) * 0.35 * lit);
  col *= 0.97 + brush * 0.06;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function makeCloudMaterial(drift: number) {
  return new ShaderMaterial({
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    fog: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: worldUniforms.uTime,
      uDrift: { value: drift },
      uWrap: { value: CLOUD_WRAP },
      uSunDir: { value: ENV.sunDir },
      uLit: { value: ENV.cloudLit },
      uShadow: { value: ENV.cloudShadow },
      uRim: { value: ENV.cloudRim },
    },
  });
}

/**
 * One cloud in a unit box (x ±1.5, z ±1, y 0..1.2): a wide flat base of three
 * or four lobes with one to three big rounded domes on top. Few, large, smooth
 * shapes read as a single painted silhouette.
 */
function cloudGeometry(seed: number, puffy: number): BufferGeometry {
  const rnd = mulberry32(seed);
  const lobes: { c: Vector3; r: Vector3 }[] = [];
  const nb = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < nb; i++) {
    const t = nb === 1 ? 0 : i / (nb - 1) - 0.5;
    const r = 0.55 + rnd() * 0.2;
    lobes.push({ c: new Vector3(t * 1.9, 0.18, (rnd() - 0.5) * 0.5), r: new Vector3(r * 1.25, r * 0.7, r) });
  }
  const nt = 1 + Math.floor(rnd() * 2 + puffy);
  for (let i = 0; i < nt; i++) {
    const t = nt === 1 ? 0 : i / (nt - 1) - 0.5;
    const r = 0.5 + rnd() * 0.2 + puffy * 0.08;
    lobes.push({ c: new Vector3(t * 1.1 + (rnd() - 0.5) * 0.3, 0.5 + rnd() * 0.15 * puffy, (rnd() - 0.5) * 0.3), r: new Vector3(r, r * (0.85 + puffy * 0.15), r * 0.9) });
  }
  const centroid = new Vector3();
  lobes.forEach((l) => centroid.add(l.c));
  centroid.divideScalar(lobes.length);
  const parts = lobes.map((l, k) => {
    const g = new IcosahedronGeometry(1, 3);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const m = mergeVertices(g);
    const pos = m.getAttribute("position");
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const lump = 1 + noise2(v.x * 1.6 + k * 5.3, v.y * 1.6 + v.z * 1.3, seed) * 0.07;
      v.multiply(l.r).multiplyScalar(lump).add(l.c);
      if (v.y < 0.02) v.y = 0.02 + (v.y - 0.02) * 0.12; // flat base
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    return m;
  });
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  // Blend normals toward the cluster's outward direction: one soft volume, not lobes.
  const pos = merged.getAttribute("position");
  const nrm = merged.getAttribute("normal") as BufferAttribute;
  const v = new Vector3();
  const n = new Vector3();
  const o = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    o.copy(v).sub(centroid).multiply(new Vector3(0.6, 1, 0.8)).normalize();
    n.lerp(o, 0.55).normalize();
    nrm.setXYZ(i, n.x, n.y, n.z);
  }
  return merged;
}

interface CloudLayer {
  geo: BufferGeometry;
  mat: ShaderMaterial;
  matrices: Matrix4[];
}

export function Clouds({ density }: { density: number; world?: unknown }) {
  const layers = useMemo<CloudLayer[]>(() => {
    const variants = [cloudGeometry(11, 0.9), cloudGeometry(23, 0.5), cloudGeometry(37, 1.3), cloudGeometry(41, 0.6), cloudGeometry(59, 1.0)];
    const drifting = variants.map((geo) => ({ geo, mat: makeCloudMaterial(CLOUD_DRIFT), matrices: [] as Matrix4[] }));
    const still = variants.map((geo) => ({ geo, mat: makeCloudMaterial(0), matrices: [] as Matrix4[] }));
    const o = new Object3D();
    for (const c of cloudLayout(density)) {
      o.position.set(c.x, c.y, c.z);
      o.rotation.set(0, c.ry, 0);
      // Unit cloud spans x ±1.5, z ±1, y 0..~1.2.
      o.scale.set(c.sx / 1.5, c.sy, c.sz);
      o.updateMatrix();
      (c.shadow ? drifting : still)[c.variant % variants.length].matrices.push(o.matrix.clone());
    }
    return [...drifting, ...still].filter((l) => l.matrices.length);
  }, [density]);

  return (
    <>
      {layers.map((l, i) => (
        <CloudInstances key={i} layer={l} />
      ))}
    </>
  );
}

function CloudInstances({ layer }: { layer: CloudLayer }) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(layer.geo, layer.mat, layer.matrices.length);
    layer.matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [layer]);
  return <primitive object={mesh} />;
}
