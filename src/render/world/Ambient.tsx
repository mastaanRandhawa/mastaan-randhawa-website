import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Vector3,
  BoxGeometry,
  InstancedBufferAttribute,
} from "three";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { mulberry32 } from "@/world/noise";
import { REGIONS } from "@/world/layout";
import type { QualityPreset } from "@/config/quality";
import { worldUniforms } from "../materials/worldMaterial";
import { C } from "@/world/palette";

// ── Birds: instanced, wing flap in the vertex shader ─────────────────────────
function birdGeometry() {
  // Body + two wings (aWing = -1 / +1 marks wing tips for flapping).
  const v = [
    0, 0, -0.6, 0.12, 0, 0.5, -0.12, 0, 0.5, // body
    0, 0, -0.2, 0, 0, 0.3, 1.4, 0, 0.1, // right wing
    0, 0, -0.2, -1.4, 0, 0.1, 0, 0, 0.3, // left wing
  ];
  const w = [0, 0, 0, 0, 0, 1, 0, -1, 0];
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(v), 3));
  g.setAttribute("aWing", new BufferAttribute(new Float32Array(w), 1));
  return g;
}

function Birds({ count }: { count: number }) {
  const { mesh, flocks } = useMemo(() => {
    const geo = birdGeometry();
    const phases = new Float32Array(count);
    const rnd = mulberry32(99);
    for (let i = 0; i < count; i++) phases[i] = rnd() * 6.28;
    geo.setAttribute("aPhase", new InstancedBufferAttribute(phases, 1));
    const mat = new MeshStandardMaterial({ color: "#4a4552", side: 2, flatShading: true });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uTime = worldUniforms.uTime;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aWing;\nattribute float aPhase;\nuniform float uTime;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += abs(aWing) * sin(uTime * 9.0 + aPhase) * 0.9;");
    };
    const mesh = new InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    const fl: { cx: number; cy: number; cz: number; r: number; speed: number; members: [number, number, number][] }[] = [];
    const per = 7;
    for (let f = 0; f < Math.ceil(count / per); f++) {
      const reg = REGIONS[f % REGIONS.length];
      const members: [number, number, number][] = [];
      for (let k = 0; k < per; k++) members.push([(rnd() - 0.5) * 10, (rnd() - 0.5) * 4, (rnd() - 0.5) * 10]);
      fl.push({ cx: reg.center[0] + (rnd() - 0.5) * 80, cy: Math.max(60, reg.center[1]) + 30 + rnd() * 40, cz: reg.center[2] + (rnd() - 0.5) * 80, r: 60 + rnd() * 60, speed: (0.08 + rnd() * 0.05) * (rnd() > 0.5 ? 1 : -1), members });
    }
    return { mesh, flocks: fl };
  }, [count]);
  const o = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let i = 0;
    for (const f of flocks) {
      const a = t * f.speed;
      const x = f.cx + Math.cos(a) * f.r;
      const z = f.cz + Math.sin(a) * f.r;
      const heading = Math.atan2(-Math.sin(a) * f.speed, Math.cos(a) * f.speed);
      for (const [mx, my, mz] of f.members) {
        if (i >= mesh.count) break;
        o.position.set(x + mx, f.cy + my + Math.sin(t + mx) * 0.8, z + mz);
        o.rotation.set(0, -heading + Math.PI, Math.sin(t * 0.5 + mz) * 0.2);
        o.scale.setScalar(1.4);
        o.updateMatrix();
        mesh.setMatrixAt(i++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

// ── Pollen / dust motes drifting around the camera ───────────────────────────
function Motes({ count }: { count: number }) {
  const ref = useRef<Points>(null);
  const { geo, base } = useMemo(() => {
    const rnd = mulberry32(5);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) base[i] = (rnd() - 0.5) * 160;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return { geo, base };
  }, [count]);
  const mat = useMemo(() => new PointsMaterial({ color: new Color("#fff1d6"), size: 0.35, transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true }), []);
  useFrame(({ camera, clock }) => {
    const p = geo.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    const S = 160;
    for (let i = 0; i < count; i++) {
      const bx = base[i * 3] + Math.sin(t * 0.3 + i) * 2;
      const by = base[i * 3 + 1] + Math.sin(t * 0.21 + i * 1.3) * 1.5;
      const bz = base[i * 3 + 2] + t * 1.2;
      const wrap = (v: number, c: number) => c + (((v - c) % S) + S * 1.5) % S - S / 2;
      p.setXYZ(i, wrap(bx, camera.position.x), wrap(by, camera.position.y), wrap(bz, camera.position.z));
    }
    p.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

// ── Boost speed lines (camera-space streaks) ─────────────────────────────────
function SpeedLines() {
  const group = useRef<Group>(null);
  const n = 48;
  const { mesh, seeds } = useMemo(() => {
    const mat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const mesh = new InstancedMesh(new BoxGeometry(0.03, 0.03, 6), mat, n);
    mesh.frustumCulled = false;
    const rnd = mulberry32(17);
    const seeds = Array.from({ length: n }, () => ({ a: rnd() * Math.PI * 2, r: 4 + rnd() * 9, z: rnd() * 60, s: 50 + rnd() * 40 }));
    return { mesh, seeds };
  }, []);
  const o = useMemo(() => new Object3D(), []);
  const level = useRef(0);
  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const reduced = useGame.getState().settings.reducedMotion;
    const target = runtime.flight.boosting && runtime.phase === "flying" && !reduced ? 1 : 0;
    level.current += (target - level.current) * (1 - Math.exp(-5 * dt));
    const intensity = level.current;
    (mesh.material as MeshBasicMaterial).opacity = intensity * 0.35;
    mesh.visible = intensity > 0.02;
    seeds.forEach((s, i) => {
      s.z += s.s * dt;
      if (s.z > 60) s.z -= 60;
      o.position.set(Math.cos(s.a) * s.r, Math.sin(s.a) * s.r, -60 + s.z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group}>
      <primitive object={mesh} />
    </group>
  );
}

// ── Airship + courier plane (dynamic world events) ───────────────────────────
function Airship() {
  const ref = useRef<Group>(null);
  const m = useMemo(
    () => ({
      env: new MeshStandardMaterial({ color: C.cream, roughness: 0.6, flatShading: true }),
      band: new MeshStandardMaterial({ color: C.coral, roughness: 0.6, flatShading: true }),
      gondola: new MeshStandardMaterial({ color: C.woodDark, flatShading: true }),
      fin: new MeshStandardMaterial({ color: C.teal, flatShading: true }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const a = clock.elapsedTime * 0.012;
    g.position.set(Math.cos(a) * 900, 300 + Math.sin(a * 3) * 10, Math.sin(a) * 900);
    g.rotation.y = -a + Math.PI;
  });
  return (
    <group ref={ref} scale={3}>
      <mesh material={m.env} scale={[1, 1, 3.2]} castShadow>
        <sphereGeometry args={[4, 16, 10]} />
      </mesh>
      <mesh material={m.band} scale={[1.02, 1.02, 0.5]}>
        <sphereGeometry args={[4, 16, 10]} />
      </mesh>
      <mesh material={m.gondola} position={[0, -4.6, 0]}>
        <boxGeometry args={[2, 1.2, 5]} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
        <group key={r} rotation={[0, 0, r]} position={[0, 0, 11]}>
          <mesh material={m.fin} position={[0, 3, 0]}>
            <boxGeometry args={[0.3, 3, 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Courier() {
  const ref = useRef<Group>(null);
  const m = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: C.turquoise, flatShading: true, roughness: 0.5 }),
      wing: new MeshStandardMaterial({ color: C.white, flatShading: true }),
      smoke: new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false }),
    }),
    [],
  );
  const pos = useMemo(() => new Vector3(), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * 0.045;
    // Figure-eight through the world so it periodically crosses the player's area.
    pos.set(Math.sin(t) * 620, 175 + Math.sin(t * 2) * 25, Math.sin(t * 2) * 380);
    const nx = Math.cos(t) * 620;
    const nz = Math.cos(t * 2) * 760;
    g.position.copy(pos);
    g.rotation.set(0, Math.atan2(-nx, -nz), -Math.cos(t * 2) * 0.4, "YXZ");
  });
  return (
    <group ref={ref} scale={1.1}>
      <mesh material={m.body} scale={[0.7, 0.7, 3]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh material={m.wing} position={[0, 0, -0.4]}>
        <boxGeometry args={[9, 0.18, 1.6]} />
      </mesh>
      <mesh material={m.wing} position={[0, 0.3, 2.6]}>
        <boxGeometry args={[3.4, 0.12, 0.9]} />
      </mesh>
      <mesh material={m.body} position={[0, 1, 2.6]}>
        <boxGeometry args={[0.15, 1.6, 1]} />
      </mesh>
    </group>
  );
}

export function Ambient({ preset }: { preset: QualityPreset }) {
  return (
    <>
      <Birds count={Math.round(70 * preset.propDensity)} />
      <Motes count={preset.particles} />
      <SpeedLines />
      <Airship />
      <Courier />
    </>
  );
}
