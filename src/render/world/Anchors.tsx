import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from "three";
import type { Anchor } from "@/world/regionKit";
import { signTexture, type SignData } from "./signTexture";
import { worldUniforms } from "../materials/worldMaterial";
import { C } from "@/world/palette";

const std = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 }), extra);

// ── Signs ────────────────────────────────────────────────────────────────────
export function Signs({ anchors }: { anchors: Anchor[] }) {
  return (
    <>
      {anchors.map((a, i) => (
        <Sign key={i} a={a} />
      ))}
    </>
  );
}

function Sign({ a }: { a: Anchor }) {
  const d = a.data as SignData;
  const { front, back } = useMemo(() => {
    const mk = (flip: boolean) =>
      new MeshBasicMaterial({ map: signTexture({ ...d, flip }), transparent: !!d.arrow, alphaTest: d.arrow ? 0.5 : 0, toneMapped: true });
    return { front: mk(false), back: d.doubleSided ? mk(!!d.arrow) : null };
  }, [d]);
  return (
    <group position={[a.x, a.y, a.z]} rotation={[(d as SignData & { rx?: number }).rx ?? 0, a.ry ?? 0, 0]} rotation-order="YXZ">
      <mesh material={front}>
        <planeGeometry args={[d.w, d.h]} />
      </mesh>
      {back && (
        <mesh material={back} rotation={[0, Math.PI, 0]} position={[0, 0, -0.02]}>
          <planeGeometry args={[d.w, d.h]} />
        </mesh>
      )}
    </group>
  );
}

// ── Flags (vertex-shader wave) ───────────────────────────────────────────────
function flagMaterial(color: string) {
  const m = new MeshStandardMaterial({ color, side: DoubleSide, roughness: 0.7, flatShading: true });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = worldUniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float k = (position.x + 1.5) / 3.0;
transformed.z += sin(position.x * 2.2 - uTime * 7.0 + position.y) * 0.32 * k;
transformed.y += sin(position.x * 1.4 - uTime * 5.0) * 0.08 * k;`,
      );
  };
  return m;
}

export function Flags({ anchors }: { anchors: Anchor[] }) {
  const geo = useMemo(() => new PlaneGeometry(3, 1.9, 12, 4).translate(1.5, 0, 0), []);
  const mats = useMemo(() => anchors.map((a) => flagMaterial(a.data?.color ?? C.coral)), [anchors]);
  return (
    <>
      {anchors.map((a, i) => (
        <mesh key={i} geometry={geo} material={mats[i]} position={[a.x, a.y, a.z]} rotation={[0, 0.9 + (a.ry ?? 0), 0]} />
      ))}
    </>
  );
}

// ── Windsocks ────────────────────────────────────────────────────────────────
export function Windsocks({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const geo = useMemo(() => {
    const g = new LatheGeometry([new Vector2(0.55, 0), new Vector2(0.25, 3.2)], 10);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);
  const stripes = useMemo(() => {
    const g = geo.clone().toNonIndexed();
    const p = g.getAttribute("position");
    const col = new Float32Array(p.count * 3);
    const a = new Color(C.coral);
    const b = new Color(C.white);
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      const c = Math.floor(x / 0.64) % 2 ? b : a;
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
    return g;
  }, [geo]);
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, flatShading: true }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.y = 0.9 + Math.sin(t * 0.7 + i) * 0.25;
      g.rotation.z = -0.15 + Math.sin(t * 3.1 + i) * 0.06;
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)} position={[a.x, a.y, a.z]}>
          <mesh geometry={stripes} material={mat} />
        </group>
      ))}
    </>
  );
}

// ── Radar dishes (rotating) ──────────────────────────────────────────────────
export function Radars({ anchors, dishes = false }: { anchors: Anchor[]; dishes?: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ white: std(C.white), dark: std(C.metalDark), accent: std(C.coral) }), []);
  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (g) g.rotation.y += dt * (dishes ? 0.25 + (i % 3) * 0.08 : 1.1);
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} scale={a.s ?? 1}>
          <mesh material={m.dark} position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.25, 0.4, 1.2, 6]} />
          </mesh>
          <group ref={(g) => (refs.current[i] = g)}>
            <mesh material={m.white} rotation={[dishes ? -0.9 : -1.25, 0, 0]} position={[0, 0.5, 0]}>
              <sphereGeometry args={[dishes ? 2.2 : 1.6, 14, 6, 0, Math.PI * 2, 0, 0.9]} />
            </mesh>
            <mesh material={m.accent} position={[0, 0.5, dishes ? 1.2 : 0.9]}>
              <boxGeometry args={[0.15, 0.15, dishes ? 2.2 : 1.6]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

// ── Beacons (blinking) ───────────────────────────────────────────────────────
export function Beacons({ anchors }: { anchors: Anchor[] }) {
  // Steady obstruction lights. Pulsing them (even gently) made small, distant
  // beacons pop in and out of a pixel, which read as orange twinkling.
  const mats = useMemo(
    () => anchors.map((a) => new MeshBasicMaterial({ color: new Color(a.data?.color ?? "#ff4b3e").multiplyScalar(1.15), toneMapped: false })),
    [anchors],
  );
  return (
    <>
      {anchors.map((a, i) => (
        <mesh key={i} position={[a.x, a.y, a.z]} material={mats[i]}>
          <sphereGeometry args={[0.45 * (a.s ?? 1), 10, 8]} />
        </mesh>
      ))}
    </>
  );
}

// ── Windmills & turbines ─────────────────────────────────────────────────────
export function Windmills({ anchors, turbine = false }: { anchors: Anchor[]; turbine?: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ sail: std(C.cream), frame: std(C.woodDark), white: std(C.white), hub: std(C.coral) }), []);
  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z += dt * (turbine ? 0.9 + (i % 3) * 0.15 : 0.55);
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} rotation={[0, a.ry ?? 0, 0]} scale={a.s ?? 1}>
          <group ref={(g) => (refs.current[i] = g)} position={[0, 0, 0.4]}>
            <mesh material={m.hub}>
              <cylinderGeometry args={[0.45, 0.45, 0.6, 8]} />
            </mesh>
            {(turbine ? [0, 1, 2] : [0, 1, 2, 3]).map((k) => (
              <group key={k} rotation={[0, 0, (k * Math.PI * 2) / (turbine ? 3 : 4)]}>
                {turbine ? (
                  <mesh material={m.white} position={[0, 6.5, 0]}>
                    <boxGeometry args={[0.7, 13, 0.18]} />
                  </mesh>
                ) : (
                  <>
                    <mesh material={m.frame} position={[0, 4, 0]}>
                      <boxGeometry args={[0.25, 8, 0.2]} />
                    </mesh>
                    <mesh material={m.sail} position={[0.75, 4.6, 0.05]}>
                      <boxGeometry args={[1.3, 6.4, 0.08]} />
                    </mesh>
                  </>
                )}
              </group>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

// ── Ponds / water strips ─────────────────────────────────────────────────────
export function Ponds({ anchors }: { anchors: Anchor[] }) {
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ color: C.water, roughness: 0.08, metalness: 0.25, emissive: new Color("#1d6f8a"), emissiveIntensity: 0.25 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = worldUniforms.uTime;
      // Glints are anchored to the water (world space); view-space glints swam
      // across the surface whenever the camera moved.
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vWp;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xz;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec2 vWp;")
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
float sp = sin(vWp.x * 1.3 + uTime * 1.1) * sin(vWp.y * 1.7 - uTime * 0.9);
totalEmissiveRadiance += vec3(0.9, 0.95, 1.0) * smoothstep(0.9, 1.0, sp) * 0.35 * (1.0 - smoothstep(60.0, 180.0, length(vViewPosition)));`,
        );
    };
    m.customProgramCacheKey = () => "skybound-pond-v2";
    return m;
  }, []);
  return (
    <>
      {anchors.map((a, i) =>
        a.data?.w ? (
          <mesh key={i} material={mat} position={[a.x, a.y, a.z]} rotation={[-Math.PI / 2, 0, a.ry ?? 0]} receiveShadow>
            <planeGeometry args={[a.data.w, a.data.l]} />
          </mesh>
        ) : (
          <mesh key={i} material={mat} position={[a.x, a.y, a.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[a.s ?? 6, 28]} />
          </mesh>
        ),
      )}
    </>
  );
}

// ── Waterfalls ───────────────────────────────────────────────────────────────
const fallVert = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const fallFrag = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float n1(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main() {
  float y = vUv.y;
  float streak = n1(vec2(vUv.x * 14.0, y * 3.0 + uTime * 2.6)) * 0.6 + n1(vec2(vUv.x * 30.0, y * 7.0 + uTime * 4.0)) * 0.4;
  vec3 col = mix(vec3(0.33, 0.72, 0.84), vec3(0.95, 0.99, 1.0), smoothstep(0.45, 0.85, streak));
  col = mix(col, vec3(1.0), smoothstep(0.92, 1.0, y) * 0.8);
  float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  float alpha = edge * smoothstep(0.0, 0.45, y) * (0.72 + streak * 0.28);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function Waterfalls({ anchors }: { anchors: Anchor[] }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: fallVert,
        fragmentShader: fallFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        fog: true,
        uniforms: { ...UniformsUtils.clone(UniformsLib.fog), uTime: worldUniforms.uTime },
      }),
    [],
  );
  const geos = useMemo(
    () =>
      anchors.map((a) => {
        const w = a.data?.width ?? 5;
        const h = a.data?.height ?? 60;
        const [dx, , dz] = a.data?.dir ?? [1, 0, 0];
        const segs = 18;
        const g = new PlaneGeometry(w, h, 1, segs);
        const p = g.getAttribute("position");
        // Bend into a curtain that arcs outward off the cliff, then falls.
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const t = 1 - (p.getY(i) + h / 2) / h; // 0 top → 1 bottom
          const out = Math.sqrt(Math.max(0, t)) * 7 + 0.6;
          const lateral = x;
          p.setXYZ(i, dx * out - dz * lateral, -t * h, dz * out + dx * lateral);
        }
        g.computeBoundingSphere();
        return g;
      }),
    [anchors],
  );
  return (
    <>
      {anchors.map((a, i) => (
        <mesh key={i} geometry={geos[i]} material={mat} position={[a.x, a.y, a.z]} renderOrder={2} />
      ))}
    </>
  );
}

// ── Hot-air balloons ─────────────────────────────────────────────────────────
function balloonGeometry(colors: [string, string]) {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const y = t * 9;
    const r = Math.sin(Math.PI * Math.pow(t, 0.75)) * 4 * (t < 0.15 ? 0.6 + t * 2.6 : 1) + (t < 0.05 ? 0.6 : 0);
    pts.push(new Vector2(Math.max(0.6, r), y));
  }
  const g = new LatheGeometry(pts, 16).toNonIndexed();
  const p = g.getAttribute("position");
  const col = new Float32Array(p.count * 3);
  const A = new Color(colors[0]);
  const B = new Color(colors[1]);
  for (let i = 0; i < p.count; i += 3) {
    const ang = Math.atan2((p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3);
    const c = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8) % 2 ? A : B;
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}

export function Balloons({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const geos = useMemo(() => anchors.map((a) => balloonGeometry(a.data?.colors ?? [C.coral, C.cream])), [anchors]);
  const m = useMemo(
    () => ({ env: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.65 }), basket: std(C.wood), rope: std(C.woodDark) }),
    [],
  );
  const tethers = useMemo(
    () =>
      anchors.map((a) => {
        if (!a.data?.tether) return null;
        const g = new BufferGeometry();
        g.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 0, a.data.groundY - a.y, 0]), 3));
        return g;
      }),
    [anchors],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const a = anchors[i];
      const drift = a.data?.path;
      if (drift) {
        const ang = t * drift.speed + i;
        g.position.set(drift.cx + Math.cos(ang) * drift.r, a.y + Math.sin(t * 0.3 + i) * 3, drift.cz + Math.sin(ang) * drift.r);
      } else {
        g.position.set(a.x + Math.sin(t * 0.4 + i) * 0.8, a.y + Math.sin(t * 0.6 + i) * 1.2, a.z);
      }
      g.rotation.y = t * 0.05 + i;
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)} position={[a.x, a.y, a.z]} scale={a.s ?? 1}>
          <mesh geometry={geos[i]} material={m.env} position={[0, 2.2, 0]} />
          <mesh material={m.basket} position={[0, -0.6, 0]}>
            <boxGeometry args={[1.5, 1.2, 1.5]} />
          </mesh>
          {[-0.6, 0.6].map((x) =>
            [-0.6, 0.6].map((z) => (
              <mesh key={`${x}${z}`} material={m.rope} position={[x, 1.1, z]}>
                <boxGeometry args={[0.05, 2.4, 0.05]} />
              </mesh>
            )),
          )}
          {tethers[i] && (
            <lineSegments geometry={tethers[i]!}>
              <lineBasicMaterial color={C.woodDark} />
            </lineSegments>
          )}
        </group>
      ))}
    </>
  );
}
