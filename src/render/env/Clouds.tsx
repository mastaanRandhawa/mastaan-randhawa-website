import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ENV } from "./environment";
import { mulberry32 } from "@/world/noise";
import { REGIONS } from "@/world/layout";
import { worldUniforms } from "../materials/worldMaterial";

/**
 * Stylised low-poly cumulus. Instanced, opaque, and dither-faded near the
 * camera so flying through them never shows sorting artefacts or overdraw.
 */
const cloudVert = /* glsl */ `
uniform float uTime;
uniform float uDrift;
uniform float uWrap;
varying vec3 vN;
varying vec3 vView;
varying float vLocalY;
varying float vFade;
#include <fog_pars_vertex>
void main() {
  vec3 ip = instanceMatrix[3].xyz;
  float nx = mod(ip.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  wp.x += nx - ip.x;
  vLocalY = position.y;
  vN = normalize(mat3(instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  vView = normalize(cameraPosition - wp.xyz);
  float d = -mvPosition.z;
  vFade = smoothstep(14.0, 60.0, d);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const cloudFrag = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShadow;
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vView;
varying float vLocalY;
varying float vFade;
#include <fog_pars_fragment>
float bayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x + q.y * 4.0);
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return (m[i] + 0.5) / 16.0;
}
void main() {
  if (vFade < bayer(gl_FragCoord.xy)) discard;
  vec3 n = normalize(vN);
  float ndl = dot(n, uSunDir) * 0.5 + 0.5;
  vec3 col = mix(uShadow, uLit, smoothstep(0.18, 0.92, ndl));
  col *= mix(0.86, 1.0, smoothstep(-0.45, 0.35, vLocalY));
  float rim = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.0);
  col += uRim * rim * 0.32;
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
    },
  });
}

/** A puffy cluster of merged spheres, flattened underneath. */
function puffGeometry(seed: number, puffs: number, detail: number): BufferGeometry {
  const rnd = mulberry32(seed);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const g = new IcosahedronGeometry(1, detail);
    const t = puffs === 1 ? 0 : i / (puffs - 1);
    const r = 0.45 + rnd() * 0.45 * (1 - Math.abs(t - 0.5));
    g.scale(r, r * (0.8 + rnd() * 0.25), r);
    g.translate((t - 0.5) * 1.9 + (rnd() - 0.5) * 0.3, r * 0.35 + rnd() * 0.15, (rnd() - 0.5) * 0.6);
    g.deleteAttribute("uv");
    parts.push(g);
  }
  const merged = mergeVertices(mergeGeometries(parts));
  const p = merged.getAttribute("position");
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.25);
  merged.computeVertexNormals();
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
    if (d < r.radius * 0.75 && Math.abs(y - r.center[1]) < 140) return false;
  }
  return true;
}

export function Clouds({ density }: { density: number }) {
  const layers = useMemo<CloudLayer[]>(() => {
    const rnd = mulberry32(4242);
    const o = new Object3D();
    const variants = [puffGeometry(1, 5, 1), puffGeometry(2, 7, 1), puffGeometry(3, 4, 1)];
    const out: CloudLayer[] = [];
    const wrap = 2600;

    // Mid-altitude cumulus scattered between regions and along routes.
    const mid = variants.map((geo) => ({ geo, mat: makeCloudMaterial(2.2, wrap), matrices: [] as Matrix4[] }));
    const nMid = Math.round(110 * density);
    for (let i = 0, tries = 0; i < nMid && tries < 2000; tries++) {
      const a = rnd() * Math.PI * 2;
      const d = 150 + Math.sqrt(rnd()) * 1700;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const y = 40 + rnd() * 230;
      if (!farFromRegions(x, z, y)) continue;
      const s = 14 + rnd() * 30;
      o.position.set(x, y, z);
      o.rotation.set(0, rnd() * Math.PI * 2, 0);
      o.scale.set(s * (1.2 + rnd() * 0.6), s * (0.55 + rnd() * 0.3), s);
      o.updateMatrix();
      mid[i % 3].matrices.push(o.matrix.clone());
      i++;
    }
    out.push(...mid);

    // Big mounds sitting on the cloud sea.
    const sea = variants.map((geo) => ({ geo, mat: makeCloudMaterial(1.1, wrap), matrices: [] as Matrix4[] }));
    const nSea = Math.round(150 * density);
    for (let i = 0; i < nSea; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * 2500;
      const s = 40 + rnd() * 70;
      o.position.set(Math.cos(a) * d, -14 + rnd() * 12, Math.sin(a) * d);
      o.rotation.set(0, rnd() * Math.PI * 2, 0);
      o.scale.set(s * 1.6, s * (0.35 + rnd() * 0.25), s * 1.1);
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
      <CloudSea />
    </>
  );
}

function CloudInstances({ layer }: { layer: CloudLayer }) {
  const ref = useRef<InstancedMesh>(null);
  const mesh = useMemo(() => {
    const m = new InstancedMesh(layer.geo, layer.mat, layer.matrices.length);
    layer.matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [layer]);
  return <primitive ref={ref} object={mesh} />;
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
  vec2 p = vWorld.xz * 0.0035 + vec2(uTime * 0.006, uTime * 0.002);
  float n = fbm(p + fbm(p * 1.7 - uTime * 0.004) * 0.8);
  float lit = smoothstep(0.3, 0.75, n);
  vec3 col = mix(uShadow, uLit, lit);
  vec3 toSun = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  vec3 vd = normalize(vWorld - cameraPosition);
  float glow = pow(max(dot(normalize(vec3(vd.x, 0.0, vd.z)), toSun), 0.0), 6.0);
  col += uGlow * glow * 0.18;
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
        uLit: { value: new Color("#fdf4ec") },
        uShadow: { value: new Color("#b7b5d9") },
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
