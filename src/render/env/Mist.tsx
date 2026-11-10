import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, Fog, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, ShaderMaterial } from "three";
import type { World } from "@/world/world";
import type { IslandTerrain } from "@/world/terrain";
import { SEA_LEVEL } from "@/world/layout";
import { mulberry32 } from "@/world/noise";
import { useGame } from "@/game/store";

interface Bank {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  /** Opacity multiplier: shore banks are faint, mountain clouds dense. */
  a?: number;
}

/**
 * Where the mist sits: low banks drifting just off each island's real
 * coastline (with gaps, so it reads as patches, not a ring), wisps clinging
 * to the slopes of the tall mountains, and a skirt around the crags' feet.
 */
function placeBanks(world: World, density: number): Bank[] {
  const out: Bank[] = [];
  const terrains = world.regions.flatMap((r) => r.islands.map((i) => i.terrain));
  for (const t of terrains) {
    const p = t.p;
    const rnd = mulberry32(p.seed * 17 + 3);
    const top = p.y + t.maxTop;
    if (p.profile === "shore") {
      const perim = 2 * Math.PI * (t.meanRadius + t.flare * t.meanScale);
      const n = Math.max(5, Math.min(44, Math.round((perim / 34) * density)));
      for (let k = 0; k < n; k++) {
        if (rnd() < 0.3) continue; // gaps between patches
        const th = ((k + rnd() * 0.7) / n) * Math.PI * 2;
        const [lx, lz] = t.coastPoint(th);
        const l = Math.hypot(lx, lz) || 1;
        const off = 4 + rnd() * 18;
        out.push({ x: p.x + lx + (lx / l) * off, y: SEA_LEVEL + 3 + rnd() * 8, z: p.z + lz + (lz / l) * off, w: 40 + rnd() * 45, h: 13 + rnd() * 10 });
      }
      // Taller islands also get a few wisps hanging on their hillsides.
      if (top - SEA_LEVEL > 45) {
        const m = Math.round((n / 4) * (0.6 + rnd() * 0.6));
        for (let k = 0; k < m; k++) {
          const th = rnd() * Math.PI * 2;
          const [sx, sy, sz] = t.slopePoint(th, 0.3 + rnd() * 0.4, false);
          const l = Math.hypot(sx, sz) || 1;
          out.push({ x: p.x + sx + (sx / l) * (22 + rnd() * 14), y: p.y + sy + 6, z: p.z + sz + (sz / l) * (22 + rnd() * 14), w: 30 + rnd() * 25, h: 9 + rnd() * 6 });
        }
      }
    } else if (p.profile === "column" && p.y - p.depth < SEA_LEVEL) {
      // Crags and sea stacks: mist pooling around their feet and drifting past their flanks.
      const height = top - SEA_LEVEL;
      for (let k = 0; k < Math.round(6 * density) + 2; k++) {
        const a = rnd() * Math.PI * 2;
        const r = t.boundRadius * (0.6 + rnd() * 0.4) + 4;
        out.push({ x: p.x + Math.cos(a) * r, y: SEA_LEVEL + 5 + rnd() * height * 0.25, z: p.z + Math.sin(a) * r, w: 34 + rnd() * 28, h: 11 + rnd() * 8, a: 1.3 });
      }
      // A cloud collar wrapped round each column's upper flanks (two on the tallest).
      if (height > 40) {
        const collars = height > 75 ? [0.45, 0.75] : [0.6];
        for (const f of collars) {
          const y = SEA_LEVEL + height * f;
          const n = Math.max(5, Math.round(9 * density));
          for (let k = 0; k < n; k++) {
            if (rnd() < 0.15) continue;
            const th = ((k + rnd() * 0.5) / n) * Math.PI * 2;
            const r = t.boundRadius * 0.65 + 4 + rnd() * 8;
            out.push({ x: p.x + Math.cos(th) * r, y: y + (rnd() - 0.5) * 6, z: p.z + Math.sin(th) * r, w: 34 + rnd() * 26, h: 11 + rnd() * 7, a: 1.8 });
          }
        }
      }
    } else if (p.profile === "taper" && p.y > SEA_LEVEL) {
      // Floating islands: a ring of cloud hugging the rim, more drifting
      // round the rocky underside, and a wisp trailing below its tip.
      const R = t.boundRadius;
      const big = R > 12;
      const rim = big ? Math.max(8, Math.round(12 * density)) : 3;
      for (let k = 0; k < rim; k++) {
        const th = ((k + rnd() * 0.6) / rim) * Math.PI * 2;
        const r = R * (big ? 0.85 : 0.9) + 3 + rnd() * 7;
        const s = big ? 1 : 0.55;
        out.push({ x: p.x + Math.cos(th) * r, y: p.y - 3 - rnd() * 5, z: p.z + Math.sin(th) * r, w: (36 + rnd() * 28) * s, h: (11 + rnd() * 7) * s, a: 1.8 });
      }
      if (big) {
        const under = Math.max(4, Math.round(7 * density));
        for (let k = 0; k < under; k++) {
          const th = rnd() * Math.PI * 2;
          const d = 0.25 + rnd() * 0.45;
          const r = R * (1 - d) * 0.7 + 4;
          out.push({ x: p.x + Math.cos(th) * r, y: p.y - p.depth * d, z: p.z + Math.sin(th) * r, w: 30 + rnd() * 24, h: 10 + rnd() * 6, a: 1.4 });
        }
        out.push({ x: p.x, y: p.y - p.depth * 0.95, z: p.z, w: 40, h: 14, a: 1.2 });
      }
    } else if (p.profile === "taper" && p.y < SEA_LEVEL && top > SEA_LEVEL + 60) {
      // A mountain rising from the sea (the summit): dense cloud bands wrapping
      // its flanks at several heights, a cap of cloud round the peak, and banks
      // along its shore.
      const height = top - SEA_LEVEL;
      const bands: [number, number, number][] = [
        // [height fraction, count, opacity]
        [0.04, 16, 1.2],
        [0.28, 14, 1.9],
        [0.5, 14, 2.1],
        [0.7, 12, 2.1],
        [0.86, 9, 1.9],
      ];
      for (const [f, count, a] of bands) {
        const y = SEA_LEVEL + height * f;
        const n = Math.round(count * density);
        for (let k = 0; k < n; k++) {
          if (rnd() < 0.15) continue;
          const th = ((k + rnd() * 0.6) / n) * Math.PI * 2;
          const r = radiusAtHeight(t, th, y - p.y) + 4 + rnd() * 14;
          const big = f > 0.2 ? 1.35 : 1;
          out.push({ x: p.x + Math.cos(th) * r * p.sx, y: y + rnd() * 8, z: p.z + Math.sin(th) * r * p.sz, w: (55 + rnd() * 50) * big, h: (16 + rnd() * 12) * big, a });
        }
      }
      // A cloud cap sitting just over the peak.
      for (let k = 0; k < 4; k++) {
        const th = rnd() * Math.PI * 2;
        out.push({ x: p.x + Math.cos(th) * 12, y: top + 4 + rnd() * 8, z: p.z + Math.sin(th) * 12, w: 70 + rnd() * 30, h: 22 + rnd() * 8, a: 1.6 });
      }
    }
  }
  return out;
}

/** Distance from a mountain's centre (along th) where its surface drops below local height h. */
function radiusAtHeight(t: IslandTerrain, th: number, h: number): number {
  const R = t.p.radius;
  for (let r = 0; r < R * 1.2; r += 4) {
    if (t.heightLocal(Math.cos(th) * r * t.p.sx, Math.sin(th) * r * t.p.sz) < h) return r;
  }
  return R;
}

const vert = /* glsl */ `
attribute vec3 iCenter;
attribute vec2 iSize;
attribute float iPhase;
attribute float iAlpha;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vDepth;
varying float vPhase;
varying float vAlpha;
void main() {
  vec3 c = iCenter;
  vAlpha = iAlpha;
  // Slow drift and breathing.
  c.x += sin(uTime * 0.045 + iPhase) * 7.0;
  c.z += cos(uTime * 0.037 + iPhase * 1.3) * 7.0;
  float breathe = 1.0 + 0.07 * sin(uTime * 0.18 + iPhase * 3.0);
  // Seen from above, a bank reads as a patch rather than a horizontal streak.
  vec3 toC = normalize(c - cameraPosition);
  float steep = smoothstep(0.35, 0.9, abs(toC.y));
  vec2 size = vec2(iSize.x, mix(iSize.y, iSize.x * 0.75, steep)) * breathe;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * size;
  vUv = position.xy + 0.5;
  vPhase = iPhase;
  vDepth = -mv.z;
  // Thins out as you fly into it, so it never whites out the view.
  vFade = smoothstep(30.0, 110.0, vDepth);
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying float vFade;
varying float vDepth;
varying float vPhase;
varying float vAlpha;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // Billowy edge: soft ellipse broken up by drifting noise.
  float n = noise(vUv * vec2(4.0, 2.5) + vec2(uTime * 0.02 + vPhase, vPhase * 1.7)) * 0.65
          + noise(vUv * vec2(9.0, 6.0) + vec2(vPhase * 3.1 - uTime * 0.03, 0.0)) * 0.35;
  float r = length(p);
  float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.7);
  // Denser toward the bottom, wispy on top.
  a *= mix(1.0, 0.65, vUv.y);
  a = min(a * uOpacity * vAlpha, 0.92) * vFade;
  float fog = smoothstep(fogNear, fogFar, vDepth);
  vec3 col = mix(uShade, uLit, smoothstep(0.0, 1.0, vUv.y * 0.8 + n * 0.3));
  col = mix(col, fogColor, fog);
  a *= 1.0 - fog * 0.6;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Soft drifting mist around the islands: one instanced draw call. */
export function Mist({ world, density }: { world: World; density: number }) {
  const scene = useThree((s) => s.scene);
  const { geometry, material } = useMemo(() => {
    const banks = placeBanks(world, density);
    const g = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute("position", quad.getAttribute("position"));
    const c = new Float32Array(banks.length * 3);
    const s = new Float32Array(banks.length * 2);
    const ph = new Float32Array(banks.length);
    const al = new Float32Array(banks.length);
    banks.forEach((b, i) => {
      c.set([b.x, b.y, b.z], i * 3);
      s.set([b.w, b.h], i * 2);
      ph[i] = (i * 2.399) % (Math.PI * 2);
      al[i] = b.a ?? 1;
    });
    g.setAttribute("iCenter", new InstancedBufferAttribute(c, 3));
    g.setAttribute("iSize", new InstancedBufferAttribute(s, 2));
    g.setAttribute("iPhase", new InstancedBufferAttribute(ph, 1));
    g.setAttribute("iAlpha", new InstancedBufferAttribute(al, 1));
    g.instanceCount = banks.length;
    const m = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.4 },
        uLit: { value: new Color("#fbfaf6") },
        uShade: { value: new Color("#d3e5ec") },
        fogColor: { value: new Color("#cfe6ee") },
        fogNear: { value: 420 },
        fogFar: { value: 3000 },
      },
    });
    return { geometry: g, material: m };
  }, [world, density]);

  useFrame((_, dt) => {
    // Held still when the player asks for reduced motion.
    if (!useGame.getState().settings.reducedMotion) material.uniforms.uTime.value += dt;
    const f = scene.fog as Fog | null;
    if (f) {
      material.uniforms.fogColor.value.copy(f.color);
      material.uniforms.fogNear.value = f.near;
      material.uniforms.fogFar.value = f.far;
    }
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
