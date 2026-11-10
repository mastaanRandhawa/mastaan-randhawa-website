import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ClampToEdgeWrapping, DataTexture, LinearFilter, Mesh, PlaneGeometry, RGBAFormat, ShaderMaterial, UnsignedByteType, Vector2, Vector4 } from "three";
import { ENV } from "./environment";
import { CLOUD_DRIFT, CLOUD_WRAP, MAX_CLOUD_SHADOWS, cloudLayout } from "./cloudLayout";
import { worldUniforms } from "../materials/worldMaterial";
import { runtime } from "@/game/runtime";
import { SEA_LEVEL } from "@/world/layout";
import type { World } from "@/world/world";
import type { IslandTerrain } from "@/world/terrain";

/**
 * The painted ocean. No reflections or simulation: broad, soft colour shapes
 * suggest depth, turquoise shallows and a foam line hug every coast (from a
 * distance-to-land map baked once from the real coastlines), sparse white wave
 * dashes drift on the surface, and clouds and the plane cast soft shadows.
 */

const MAP_EXTENT = 1450; // map covers [-extent, extent] on X and Z
const MAP_SIZE = 1536;
const MAX_DIST = 200; // metres encoded in the map

/** Coastline (world XZ) of an island at sea level, or null if it never meets the sea. */
function coastline(t: IslandTerrain): [number, number][] | null {
  const p = t.p;
  // Fine enough to follow peninsulas and coves.
  const S = 160;
  const pts: [number, number][] = [];
  if (p.profile === "taper" && p.y > SEA_LEVEL) return null; // floating
  if (p.profile === "taper" && p.y + t.maxTop < SEA_LEVEL) return null; // fully submerged
  for (let j = 0; j < S; j++) {
    const th = (j / S) * Math.PI * 2;
    const er = p.radius * t.edge(th);
    const lx = Math.cos(th) * er * p.sx;
    const lz = Math.sin(th) * er * p.sz;
    const d = Math.hypot(lx, lz) || 1;
    let f = 1;
    if (p.profile === "shore") f = 1 + t.coastExtra(th) / er;
    else if (p.profile === "column") {
      if (p.y - p.depth > SEA_LEVEL) return null;
      const ts = Math.min(1, Math.max(0, (p.y - p.rimDrop - 2.5 - SEA_LEVEL) / Math.max(1, p.depth - 2.5)));
      f = t.profileAt(ts, t.thetaOf(lx, lz));
    } else {
      // A low island (or a mountain whose foothills are underwater): march in to the waterline.
      let k = 1;
      while (k > 0 && p.y + t.heightLocal(lx * k, lz * k) < SEA_LEVEL) k -= 0.01;
      f = k;
      if (k <= 0.01) continue;
    }
    pts.push([p.x + lx * f, p.z + lz * f]);
  }
  return pts.length > 2 ? pts : null;
}

/** Bakes a distance-to-land map (metres, chamfer transform) from all coastlines. */
function bakeCoastMap(world: World): DataTexture {
  const N = MAP_SIZE;
  const scale = N / (MAP_EXTENT * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, N, N);
  g.fillStyle = "#fff";
  for (const r of world.regions)
    for (const isl of r.islands) {
      const c = coastline(isl.terrain);
      if (!c) continue;
      g.beginPath();
      c.forEach(([x, z], i) => {
        const px = (x + MAP_EXTENT) * scale;
        const pz = (z + MAP_EXTENT) * scale;
        if (i) g.lineTo(px, pz);
        else g.moveTo(px, pz);
      });
      g.closePath();
      g.fill();
    }
  const img = g.getImageData(0, 0, N, N).data;
  const INF = 1e9;
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = img[i * 4] > 127 ? 0 : INF;
  const D = Math.SQRT2;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - N] + 1);
        if (x > 0) v = Math.min(v, d[i - N - 1] + D);
        if (x < N - 1) v = Math.min(v, d[i - N + 1] + D);
      }
      d[i] = v;
    }
  for (let y = N - 1; y >= 0; y--)
    for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < N - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < N - 1) {
        v = Math.min(v, d[i + N] + 1);
        if (x < N - 1) v = Math.min(v, d[i + N + 1] + D);
        if (x > 0) v = Math.min(v, d[i + N - 1] + D);
      }
      d[i] = v;
    }
  const out = new Uint8Array(N * N * 4);
  const mPerPx = 1 / scale;
  for (let i = 0; i < N * N; i++) {
    const m = Math.min(MAX_DIST, d[i] * mPerPx);
    out[i * 4] = Math.round((m / MAX_DIST) * 255);
    out[i * 4 + 3] = 255;
  }
  const tex = new DataTexture(out, N, N, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const vert = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const frag = /* glsl */ `
#define CLOUDS ${MAX_CLOUD_SHADOWS}
uniform float uTime;
uniform sampler2D uCoast;
uniform float uExtent;
uniform float uMaxDist;
uniform vec3 uDeep;
uniform vec3 uOpen;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uLagoon;
uniform vec3 uFoam;
uniform vec3 uShade;
uniform vec3 uFar;
uniform vec3 uSunDir;
uniform vec3 uGlow;
uniform vec4 uClouds[CLOUDS];
uniform int uCloudCount;
uniform float uDrift;
uniform float uWrap;
uniform vec4 uPlane;     // shadow x, z, heading, roll
uniform vec2 uPlaneInfo; // height above sea, visibility
varying vec3 vWorld;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = vWorld.xz;
  float dist = length(cameraPosition.xz - p);
  float aa = 0.35 + dist * 0.0025;

  // Distance to land (m); far from the map counts as open ocean.
  vec2 cuv = (p + uExtent) / (2.0 * uExtent);
  float d = uMaxDist;
  if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) d = texture2D(uCoast, cuv).r * uMaxDist;

  // Broad painted depth: large soft dark shapes over open blue.
  float n1 = fbm(p * 0.0011 + 4.2);
  float n2 = fbm(p * 0.0045 - 1.7);
  float n3 = vn(p * 0.05);
  vec3 col = mix(uOpen, uDeep, smoothstep(0.44, 0.6, n1) * 0.9);
  col = mix(col, uMid, smoothstep(0.58, 0.74, n2) * 0.22);

  // Shallows: turquoise rings with irregular painted edges.
  float dn = d + (n2 - 0.5) * 26.0 + (n3 - 0.5) * 3.0;
  col = mix(col, uMid, 1.0 - smoothstep(55.0, 130.0, dn));
  col = mix(col, uShallow, 1.0 - smoothstep(12.0, 52.0, dn));
  col = mix(col, uLagoon, (1.0 - smoothstep(1.0, 14.0, dn)) * 0.75);

  // Foam: a bright line at the beach plus a slow second swell line.
  float df = d + (n3 - 0.5) * 2.2;
  float foam = 1.0 - smoothstep(0.6, 2.6 + aa, df);
  float swell = 5.5 + sin(uTime * 0.7 + n2 * 9.0) * 1.6;
  foam = max(foam, (1.0 - smoothstep(0.0, 0.7 + aa, abs(df - swell))) * 0.55 * smoothstep(0.3, 0.6, n3));
  col = mix(col, uFoam, foam * (1.0 - smoothstep(500.0, 1100.0, dist)));

  // Wave dashes: short white strokes that fade in and out, aligned with the wind.
  vec2 wdir = normalize(vec2(0.85, 0.53));
  vec2 q = vec2(dot(p, wdir), dot(p, vec2(-wdir.y, wdir.x)));
  q.x += uTime * 0.6;
  vec2 cellSize = vec2(17.0, 9.0);
  vec2 cell = floor(q / cellSize);
  vec2 f = q - cell * cellSize;
  float rid = h21(cell);
  vec2 c = vec2(0.25 + 0.5 * h21(cell + 7.3), 0.3 + 0.4 * h21(cell + 3.1)) * cellSize;
  vec2 dd = f - c;
  float len = 1.4 + 2.4 * h21(cell + 11.7);
  float seg = length(vec2(max(abs(dd.x) - len, 0.0), dd.y));
  float dash = 1.0 - smoothstep(0.14, 0.14 + aa * 0.5, seg);
  float life = smoothstep(0.2, 0.85, sin(uTime * 0.55 + rid * 40.0));
  dash *= life * step(0.72, rid) * (1.0 - smoothstep(140.0, 420.0, dist)) * smoothstep(8.0, 30.0, d);
  col = mix(col, uFoam, dash * 0.6);

  // Cloud shadows drift with the clouds.
  float sh = 0.0;
  for (int i = 0; i < CLOUDS; i++) {
    if (i >= uCloudCount) break;
    vec4 cl = uClouds[i];
    float cx = mod(cl.x + uTime * uDrift + uWrap, uWrap * 2.0) - uWrap;
    vec2 rel = (p - vec2(cx, cl.y)) / cl.zw;
    float r = length(rel) + (vn(p * 0.02 + float(i) * 7.0) - 0.5) * 0.35;
    sh = max(sh, 1.0 - smoothstep(0.55, 1.0, r));
  }
  col = mix(col, uShade, sh * 0.32);

  // The plane's soft silhouette, projected along the sun.
  if (uPlaneInfo.y > 0.0) {
    vec2 rp = p - uPlane.xy;
    float ch = cos(uPlane.z), sn = sin(uPlane.z);
    vec2 lp = vec2(rp.x * ch - rp.y * sn, rp.x * sn + rp.y * ch);
    float span = 4.7 * max(0.25, abs(cos(uPlane.w)));
    float sdf = box(lp - vec2(0.0, -0.2), vec2(span, 0.95), 0.6);
    sdf = min(sdf, box(lp - vec2(0.0, 0.3), vec2(0.75, 3.1), 0.7));
    sdf = min(sdf, box(lp - vec2(0.0, 3.0), vec2(2.0 * max(0.3, abs(cos(uPlane.w))), 0.5), 0.35));
    float soft = 0.4 + uPlaneInfo.x * 0.012;
    float a = 1.0 - smoothstep(-soft, soft, sdf);
    col = mix(col, uShade, a * uPlaneInfo.y);
  }

  // A broad, gentle sheen toward the sun; no sharp glints.
  vec3 vd = normalize(vWorld - cameraPosition);
  float sun = pow(max(dot(normalize(vec3(vd.x, 0.0, vd.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 4.0);
  col = mix(col, uGlow, sun * smoothstep(300.0, 2500.0, dist) * 0.18);

  // Paper grain and distance haze.
  col *= 0.985 + vn(p * 0.9) * 0.03;
  col = mix(col, uFar, smoothstep(700.0, 3600.0, dist) * 0.85);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function Ocean({ world, density }: { world: World; density: number }) {
  const ref = useRef<Mesh>(null);
  const { geo, mat } = useMemo(() => {
    const geo = new PlaneGeometry(9000, 9000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const clouds = Array.from({ length: MAX_CLOUD_SHADOWS }, () => new Vector4());
    const sd = ENV.sunDir;
    let n = 0;
    for (const c of cloudLayout(density)) {
      if (!c.shadow || n >= MAX_CLOUD_SHADOWS) continue;
      // Offset along the sun so shadows fall where the light would put them.
      const h = c.y - SEA_LEVEL;
      clouds[n++].set(c.x - (sd.x / sd.y) * h, c.z - (sd.z / sd.y) * h, c.sx * 0.9, c.sz * 0.9);
    }
    const o = ENV.ocean;
    const mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: worldUniforms.uTime,
        uCoast: { value: bakeCoastMap(world) },
        uExtent: { value: MAP_EXTENT },
        uMaxDist: { value: MAX_DIST },
        uDeep: { value: o.deep },
        uOpen: { value: o.open },
        uMid: { value: o.mid },
        uShallow: { value: o.shallow },
        uLagoon: { value: o.lagoon },
        uFoam: { value: o.foam },
        uShade: { value: o.shade },
        uFar: { value: o.far },
        uSunDir: { value: ENV.sunDir },
        uGlow: { value: ENV.sunGlow },
        uClouds: { value: clouds },
        uCloudCount: { value: n },
        uDrift: { value: CLOUD_DRIFT },
        uWrap: { value: CLOUD_WRAP },
        uPlane: { value: new Vector4() },
        uPlaneInfo: { value: new Vector2() },
      },
    });
    return { geo, mat };
  }, [world, density]);

  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.set(Math.round(camera.position.x / 50) * 50, SEA_LEVEL, Math.round(camera.position.z / 50) * 50);
    const p = runtime.pose;
    const h = Math.max(0, p.y - SEA_LEVEL);
    const sd = ENV.sunDir;
    mat.uniforms.uPlane.value.set(p.x - (sd.x / sd.y) * h, p.z - (sd.z / sd.y) * h, p.heading, p.roll);
    // Crisp and dark when skimming the water, fading out with altitude.
    mat.uniforms.uPlaneInfo.value.set(h, 0.42 * (1 - Math.min(1, Math.max(0, (h - 25) / 330))));
  });

  return <mesh ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-5} />;
}
