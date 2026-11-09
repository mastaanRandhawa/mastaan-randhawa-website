import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ENV } from "./environment";
import { mulberry32, noise2 } from "@/world/noise";
import { REGIONS } from "@/world/layout";
import { worldUniforms } from "../materials/worldMaterial";
import type { World } from "@/world/world";

/**
 * Stylised cumulus. Each cloud is a merged cluster of lumpy puffs (wide flat
 * base, billowing top) with baked crevice occlusion. Shading uses wrap
 * lighting, lavender shadows and a forward-scattering silver lining. Clouds
 * are opaque and dither-faded near the camera (no sorting or overdraw), plus a
 * light layer of soft wisps for depth.
 */
const cloudVert = /* glsl */ `
uniform float uTime;
uniform float uDrift;
uniform float uWrap;
attribute float aOcc;
varying vec3 vN;
varying vec3 vWorld;
varying float vOcc;
varying float vLocalY;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  vec3 ip = instanceMatrix[3].xyz;
  float nx = mod(ip.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
  vec3 p = position;
  // Slow billowing.
  p += normal * sin(uTime * 0.35 + position.x * 1.7 + position.z * 1.3 + ip.x * 0.01) * 0.035;
  vec4 wp = instanceMatrix * vec4(p, 1.0);
  wp.x += nx - ip.x;
  vWorld = wp.xyz;
  vLocalY = position.y;
  vOcc = aOcc;
  vN = normalize(mat3(instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  vFade = smoothstep(12.0, 42.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const cloudFrag = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uRim;
uniform vec3 uGlow;
varying vec3 vN;
varying vec3 vWorld;
varying float vOcc;
varying float vLocalY;
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
  // Dissolve near the camera in soft, world-anchored wisps: stable while you
  // fly, where a screen-space dither pattern crawls across the cloud.
  if (vFade < 0.999) {
    float w = vnoise(vWorld * 1.5) * 0.55 + vnoise(vWorld * 4.2) * 0.45;
    if (vFade < w) discard;
  }
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWorld);
  // Wrap lighting: soft terminator, never pitch-dark.
  float ndl = dot(n, uSunDir);
  float wrap = clamp((ndl + 0.55) / 1.55, 0.0, 1.0);
  vec3 col = mix(uShadow, uLit, smoothstep(0.05, 0.95, wrap));
  // Crevices and flat undersides sit in shade.
  col *= mix(0.74, 1.0, vOcc);
  col = mix(col, uShadow * 0.92, smoothstep(0.15, -0.55, vLocalY) * 0.45);
  // Rim + forward scattering (silver lining when looking toward the sun).
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  float toward = pow(max(dot(-v, uSunDir), 0.0), 5.0);
  col += uRim * rim * 0.22 + uGlow * rim * toward * 0.9;
  col += uGlow * toward * 0.06;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function makeCloudMaterial(drift: number, wrap: number) {
  return new ShaderMaterial({
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    fog: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: worldUniforms.uTime,
      uDrift: { value: drift },
      uWrap: { value: wrap },
      uSunDir: { value: ENV.sunDir },
      uLit: { value: ENV.cloudLit },
      uShadow: { value: ENV.cloudShadow },
      uRim: { value: ENV.cloudRim },
      uGlow: { value: ENV.sunGlow },
    },
  });
}

/**
 * One cumulus: base puffs spread wide and flat, upper puffs smaller and
 * higher toward the middle. Vertices get noise for a cauliflower surface, a
 * blended "volumetric" normal, and an occlusion value from neighbouring puffs.
 */
function cumulusGeometry(seed: number, tall: number, detail: number): BufferGeometry {
  const rnd = mulberry32(seed);
  const puffs: { c: Vector3; r: number }[] = [];
  const base = 6 + Math.floor(rnd() * 3);
  for (let i = 0; i < base; i++) {
    const t = i / (base - 1) - 0.5;
    puffs.push({ c: new Vector3(t * 2.4 + (rnd() - 0.5) * 0.3, 0.15 + rnd() * 0.1, (rnd() - 0.5) * 0.9), r: 0.42 + rnd() * 0.22 });
  }
  const mid = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < mid; i++) {
    const t = i / Math.max(1, mid - 1) - 0.5;
    puffs.push({ c: new Vector3(t * 1.5 + (rnd() - 0.5) * 0.3, 0.55 + rnd() * 0.15 * tall, (rnd() - 0.5) * 0.6), r: 0.45 + rnd() * 0.2 });
  }
  const top = 1 + Math.floor(rnd() * 2 * tall);
  for (let i = 0; i < top; i++) puffs.push({ c: new Vector3((rnd() - 0.5) * 0.8, 0.95 + rnd() * 0.35 * tall, (rnd() - 0.5) * 0.4), r: 0.38 + rnd() * 0.18 });

  const centroid = new Vector3();
  puffs.forEach((p) => centroid.add(p.c));
  centroid.divideScalar(puffs.length);

  const parts = puffs.map((p, k) => {
    const g = new IcosahedronGeometry(1, detail);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const m = mergeVertices(g);
    const pos = m.getAttribute("position");
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const lump = 1 + noise2(v.x * 2.3 + k * 7.1, v.y * 2.3 + v.z * 1.7, seed) * 0.13;
      v.multiplyScalar(p.r * lump).add(p.c);
      if (v.y < 0) v.y *= 0.3; // flat-ish base
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    return m;
  });
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  const pos = merged.getAttribute("position");
  const nrm = merged.getAttribute("normal");
  const occ = new Float32Array(pos.count);
  const v = new Vector3();
  const n = new Vector3();
  const out = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    // Soften: blend the surface normal with the outward direction from the cluster centre.
    out.copy(v).sub(centroid).normalize();
    n.lerp(out, 0.45).normalize();
    nrm.setXYZ(i, n.x, n.y, n.z);
    // Occlusion: how buried this point is among the other puffs.
    let o = 0;
    for (const p of puffs) {
      const d = v.distanceTo(p.c);
      if (d < p.r * 1.35) o += (1 - d / (p.r * 1.35)) * 0.6;
    }
    occ[i] = Math.max(0, Math.min(1, 1.25 - o)) * (0.75 + 0.25 * Math.min(1, (v.y + 0.2) / 1.2));
  }
  merged.setAttribute("aOcc", new BufferAttribute(occ, 1));
  return merged;
}

interface CloudLayer {
  geo: BufferGeometry;
  mat: ShaderMaterial;
  matrices: Matrix4[];
}

function farFromRegions(x: number, z: number, y: number) {
  for (const r of REGIONS) {
    const d = Math.hypot(x - r.center[0], z - r.center[2]);
    if (d < r.radius * 0.8 && Math.abs(y - r.center[1]) < 150) return false;
  }
  return true;
}

/**
 * Cloud banks that wrap every island just below its rim, plus mist where each
 * waterfall disappears, so the islands look like they float in their own
 * weather. Static (no drift); they dissolve near the camera like every cloud.
 */
function islandCloudLayers(world: World, density: number): CloudLayer[] {
  const rnd = mulberry32(9091);
  const o = new Object3D();
  const variants = [cumulusGeometry(53, 0.5, 1), cumulusGeometry(67, 0.8, 1), cumulusGeometry(71, 0.35, 1)];
  const layers = variants.map((geo) => ({ geo, mat: makeCloudMaterial(0, 1e6), matrices: [] as Matrix4[] }));
  let i = 0;
  const put = (x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number) => {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    layers[i++ % layers.length].matrices.push(o.matrix.clone());
  };
  for (const region of world.regions) {
    for (const isl of region.islands) {
      const p = isl.terrain.p;
      const R = p.radius * Math.max(p.sx, p.sz);
      if (R < 14) continue;
      const n = Math.max(5, Math.round((R / 8) * (0.5 + density * 0.5)));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
        const d = 0.86 + rnd() * 0.3;
        const s = Math.min(40, Math.max(9, R * (0.13 + rnd() * 0.09)));
        const sy = s * (0.45 + rnd() * 0.25);
        // Long axis along the rim; tops stay a few units under the edge.
        const y = p.y - 6 - sy * 1.35 - rnd() * p.depth * 0.3;
        put(p.x + Math.cos(a) * p.radius * p.sx * d, y, p.z + Math.sin(a) * p.radius * p.sz * d, -a - Math.PI / 2 + (rnd() - 0.5) * 0.5, s * 1.5, sy, s * 0.95);
      }
      // A thinner, wider skirt further down the underside.
      const m = Math.max(3, Math.round(n * 0.5));
      for (let k = 0; k < m; k++) {
        const a = (k / m) * Math.PI * 2 + rnd() * 0.8;
        const s = Math.min(46, Math.max(12, R * (0.18 + rnd() * 0.1)));
        const y = p.y - p.depth * (0.55 + rnd() * 0.25);
        put(p.x + Math.cos(a) * p.radius * p.sx * 0.7, y, p.z + Math.sin(a) * p.radius * p.sz * 0.7, -a - Math.PI / 2, s * 1.7, s * 0.4, s);
      }
    }
    // Mist where each waterfall fades out.
    for (const a of region.anchors) {
      if (a.type !== "waterfall" || !a.data?.height) continue;
      const [dx, , dz] = a.data.dir ?? [1, 0, 0];
      const h = a.data.height as number;
      put(a.x + dx * 6.8, a.y - h * 0.66, a.z + dz * 6.8, Math.atan2(dx, dz), 15, 8, 12);
      put(a.x + dx * 8.5, a.y - h * 0.86, a.z + dz * 8.5, Math.atan2(dx, dz) + 1, 22, 9, 17);
    }
  }
  return layers.filter((l) => l.matrices.length);
}

export function Clouds({ density, world }: { density: number; world?: World }) {
  const islandLayers = useMemo(() => (world ? islandCloudLayers(world, density) : []), [world, density]);
  const layers = useMemo<CloudLayer[]>(() => {
    const rnd = mulberry32(4242);
    const o = new Object3D();
    const detail = density > 0.8 ? 2 : 1;
    const variants = [cumulusGeometry(11, 1.2, detail), cumulusGeometry(23, 0.7, detail), cumulusGeometry(37, 1.6, detail), cumulusGeometry(41, 0.4, 1)];
    const wrap = 2600;
    const out: CloudLayer[] = [];

    // Mid-altitude cumulus between regions and along routes.
    const mid = variants.map((geo) => ({ geo, mat: makeCloudMaterial(2.2, wrap), matrices: [] as Matrix4[] }));
    const nMid = Math.round(95 * density);
    for (let i = 0, tries = 0; i < nMid && tries < 2500; tries++) {
      const a = rnd() * Math.PI * 2;
      const d = 140 + Math.sqrt(rnd()) * 1750;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = 35 + rnd() * 240;
      if (!farFromRegions(x, z, y)) continue;
      const s = 16 + rnd() * 30;
      o.position.set(x, y, z);
      o.rotation.set(0, rnd() * Math.PI * 2, 0);
      o.scale.set(s * (1.1 + rnd() * 0.5), s * (0.75 + rnd() * 0.35), s * (0.9 + rnd() * 0.3));
      o.updateMatrix();
      mid[i % variants.length].matrices.push(o.matrix.clone());
      i++;
    }
    out.push(...mid);

    // Towering cumulus on the horizon for scale.
    const towers = [variants[2], variants[0]].map((geo) => ({ geo, mat: makeCloudMaterial(0.6, wrap), matrices: [] as Matrix4[] }));
    for (let i = 0; i < Math.round(14 * density) + 4; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd() * 0.3;
      const d = 1700 + rnd() * 600;
      const s = 120 + rnd() * 110;
      o.position.set(Math.cos(a) * d, -40 + rnd() * 30, Math.sin(a) * d);
      o.rotation.set(0, rnd() * Math.PI * 2, 0);
      o.scale.set(s * 1.3, s * (1.1 + rnd() * 0.6), s);
      o.updateMatrix();
      towers[i % 2].matrices.push(o.matrix.clone());
    }
    out.push(...towers);

    // Big soft mounds on the cloud sea.
    const sea = [variants[1], variants[3], variants[0]].map((geo) => ({ geo, mat: makeCloudMaterial(1.1, wrap), matrices: [] as Matrix4[] }));
    const nSea = Math.round(160 * density);
    for (let i = 0; i < nSea; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * 2500;
      const s = 40 + rnd() * 75;
      o.position.set(Math.cos(a) * d, -16 + rnd() * 12, Math.sin(a) * d);
      o.rotation.set(0, rnd() * Math.PI * 2, 0);
      o.scale.set(s * 1.7, s * (0.35 + rnd() * 0.3), s * 1.2);
      o.updateMatrix();
      sea[i % 3].matrices.push(o.matrix.clone());
    }
    out.push(...sea);
    return out.filter((l) => l.matrices.length);
  }, [density]);

  return (
    <>
      {layers.map((l, i) => (
        <CloudInstances key={i} layer={l} />
      ))}
      {islandLayers.map((l, i) => (
        <CloudInstances key={`isl${i}`} layer={l} />
      ))}
      <Wisps count={Math.round(70 * density)} />
      {world && <IslandMist world={world} density={density} />}
      <CloudSea />
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

// ── Soft wisps: camera-facing translucent sprites around the islands ─────────
const wispVert = /* glsl */ `
uniform float uTime;
attribute vec4 aWisp; // xyz centre, w size
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec3 c = aWisp.xyz + vec3(sin(uTime * 0.05 + aSeed * 6.0) * 20.0, sin(uTime * 0.2 + aSeed * 3.0) * 2.0, 0.0);
  vec4 mvPosition = viewMatrix * vec4(c, 1.0);
  mvPosition.xy += position.xy * aWisp.w * vec2(1.8, 0.7);
  float d = -mvPosition.z;
  vAlpha = smoothstep(25.0, 120.0, d) * (1.0 - smoothstep(1400.0, 2200.0, d));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const wispFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uLit;
uniform vec3 uShadow;
varying vec2 vUv;
varying float vSeed;
varying float vAlpha;
#include <fog_pars_fragment>
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p * vec2(1.0, 1.6));
  float fb = n(vUv * 4.0 + vSeed * 13.0 + uTime * 0.01) * 0.6 + n(vUv * 9.0 - vSeed * 7.0) * 0.4;
  float a = smoothstep(0.5, 0.05, r) * smoothstep(0.25, 0.75, fb) * vAlpha * 0.42;
  if (a < 0.01) discard;
  vec3 col = mix(uShadow, uLit, 0.55 + vUv.y * 0.45);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function Wisps({ count }: { count: number }) {
  const field = useMemo(() => {
    const rnd = mulberry32(777);
    const centres = new Float32Array(count * 4);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = REGIONS[i % REGIONS.length];
      const a = rnd() * Math.PI * 2;
      const d = r.radius * (0.6 + rnd() * 0.9);
      centres.set([r.center[0] + Math.cos(a) * d, Math.max(30, r.center[1]) - 30 + rnd() * 90, r.center[2] + Math.sin(a) * d, 40 + rnd() * 60], i * 4);
      seeds[i] = rnd();
    }
    return { centres, seeds };
  }, [count]);
  return <WispField centres={field.centres} seeds={field.seeds} />;
}

/** A veil of soft translucent mist hugging each island's rim. */
function IslandMist({ world, density }: { world: World; density: number }) {
  const field = useMemo(() => {
    const rnd = mulberry32(5150);
    const c: number[] = [];
    const s: number[] = [];
    for (const region of world.regions)
      for (const isl of region.islands) {
        const p = isl.terrain.p;
        const R = p.radius * Math.max(p.sx, p.sz);
        if (R < 14) continue;
        const k = Math.max(2, Math.round((R / 15) * (0.6 + density * 0.4)));
        for (let i = 0; i < k; i++) {
          const a = (i / k) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
          const d = 0.8 + rnd() * 0.4;
          c.push(p.x + Math.cos(a) * p.radius * p.sx * d, p.y - 3 - rnd() * p.depth * 0.32, p.z + Math.sin(a) * p.radius * p.sz * d, Math.min(48, 18 + R * 0.22));
          s.push(rnd());
        }
      }
    return { centres: new Float32Array(c), seeds: new Float32Array(s) };
  }, [world, density]);
  return <WispField centres={field.centres} seeds={field.seeds} />;
}

function WispField({ centres, seeds }: { centres: Float32Array; seeds: Float32Array }) {
  const count = seeds.length;
  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    geo.setAttribute("aWisp", new InstancedBufferAttribute(centres, 4));
    geo.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    const mat = new ShaderMaterial({
      vertexShader: wispVert,
      fragmentShader: wispFrag,
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: { ...UniformsUtils.clone(UniformsLib.fog), uTime: worldUniforms.uTime, uLit: { value: ENV.cloudLit }, uShadow: { value: ENV.cloudShadow } },
    });
    const m = new InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    m.renderOrder = 3;
    return m;
  }, [centres, seeds, count]);
  return <primitive object={mesh} />;
}

// ── Cloud sea: a soft, slowly churning floor far below the islands ──
const seaVert = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const seaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uGlow;
uniform vec3 uSunDir;
varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vWorld.xz * 0.0032 + vec2(uTime * 0.006, uTime * 0.002);
  float n = fbm(p + fbm(p * 1.7 - uTime * 0.004) * 0.9);
  // Pseudo-relief: brighter billow tops, lavender troughs.
  float lit = smoothstep(0.28, 0.78, n);
  vec3 col = mix(uShadow * 0.96, uLit, lit);
  float crest = smoothstep(0.62, 0.8, n);
  col += uGlow * crest * 0.08;
  vec3 toSun = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  vec3 vd = normalize(vWorld - cameraPosition);
  float glow = pow(max(dot(normalize(vec3(vd.x, 0.0, vd.z)), toSun), 0.0), 6.0);
  col += uGlow * glow * 0.2;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function CloudSea() {
  const ref = useRef<Mesh>(null);
  const { geo, mat } = useMemo(() => {
    const geo = new PlaneGeometry(9000, 9000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new ShaderMaterial({
      vertexShader: seaVert,
      fragmentShader: seaFrag,
      fog: true,
      uniforms: {
        ...UniformsUtils.clone(UniformsLib.fog),
        uTime: worldUniforms.uTime,
        uLit: { value: new Color("#fdf5ee") },
        uShadow: { value: new Color("#b3b2d8") },
        uGlow: { value: ENV.sunGlow },
        uSunDir: { value: ENV.sunDir },
      },
    });
    return { geo, mat };
  }, []);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.set(Math.round(camera.position.x / 50) * 50, -8, Math.round(camera.position.z / 50) * 50);
  });
  return <mesh ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
