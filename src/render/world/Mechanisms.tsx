import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Anchor } from "@/world/regionKit";
import { C } from "@/world/palette";

const std = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 }), extra);
const glow = (color: string, k = 3) => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), toneMapped: false });

function gearGeometry(r: number, teeth: number, w: number): BufferGeometry {
  const parts: BufferGeometry[] = [new CylinderGeometry(r, r, w, 24)];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new BoxGeometry(r * 0.28, w, r * 0.32);
    t.translate(0, 0, r + r * 0.12);
    t.rotateY(a);
    parts.push(t);
  }
  const hole = new CylinderGeometry(r * 0.3, r * 0.3, w * 1.4, 12);
  parts.push(hole);
  for (const p of parts) p.deleteAttribute("uv");
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
}

const axisRot = (axis: string): [number, number, number] => (axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]);

export function Gears({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const geos = useMemo(() => anchors.map((a) => gearGeometry(a.data?.r ?? 3, a.data?.teeth ?? 12, a.data?.w ?? 0.8)), [anchors]);
  const mats = useMemo(() => anchors.map((a) => std(a.data?.color ?? C.metal, { metalness: 0.4, roughness: 0.45 })), [anchors]);
  useFrame((_, dt) => refs.current.forEach((m, i) => m && (m.rotation.y += dt * (anchors[i].data?.speed ?? 0.4))));
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} rotation={[0, a.ry ?? 0, 0]}>
          <group rotation={axisRot(a.data?.axis ?? "z")}>
            <mesh ref={(m) => (refs.current[i] = m)} geometry={geos[i]} material={mats[i]} />
          </group>
        </group>
      ))}
    </>
  );
}

/** A stylised car: used on the wrap-studio turntable and the racetrack. */
function Car({ body, accent, scale = 1 }: { body: MeshStandardMaterial; accent: MeshStandardMaterial; scale?: number }) {
  const dark = useMemo(() => std("#26272c"), []);
  const glass = useMemo(() => std("#9fd6ea", { roughness: 0.1, metalness: 0.5 }), []);
  return (
    <group scale={scale}>
      <mesh material={body} position={[0, 0.7, 0]}>
        <boxGeometry args={[2.2, 0.8, 4.6]} />
      </mesh>
      <mesh material={accent} position={[0, 0.72, 0]}>
        <boxGeometry args={[2.24, 0.25, 4.64]} />
      </mesh>
      <mesh material={glass} position={[0, 1.35, 0.2]}>
        <boxGeometry args={[1.8, 0.6, 2.2]} />
      </mesh>
      <mesh material={body} position={[0, 1.68, 0.25]}>
        <boxGeometry args={[1.7, 0.08, 1.9]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1.45, 1.45].map((z) => (
          <mesh key={`${sx}${z}`} material={dark} position={[sx * 1.1, 0.42, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.35, 12]} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Turntables({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(
    () =>
      anchors.map((a) => ({
        plate: std(C.metalDark),
        ring: glow(a.data?.glow ?? "#7fd8ff", 2),
        body: std(a.data?.colors?.[0] ?? "#2f5bff", { roughness: 0.25, metalness: 0.5 }),
        accent: std(a.data?.colors?.[1] ?? "#f2735a", { roughness: 0.3, metalness: 0.3 }),
      })),
    [anchors],
  );
  useFrame(({ clock }, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.y += dt * 0.35;
      // The "wrap" colour slowly cycles — a nod to the studio's craft.
      const t = (Math.sin(clock.elapsedTime * 0.4 + i) + 1) / 2;
      m[i].body.color.lerpColors(new Color(anchors[i].data?.colors?.[0] ?? "#2f5bff"), new Color(anchors[i].data?.colors?.[2] ?? "#3fb8af"), t);
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} scale={a.s ?? 1}>
          <mesh material={m[i].plate} position={[0, 0.15, 0]} receiveShadow>
            <cylinderGeometry args={[4, 4.2, 0.3, 28]} />
          </mesh>
          <mesh material={m[i].ring} position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.7, 3.9, 32]} />
          </mesh>
          <group ref={(g) => (refs.current[i] = g)} position={[0, 0.3, 0]}>
            <Car body={m[i].body} accent={m[i].accent} />
          </group>
        </group>
      ))}
    </>
  );
}

export function OrbitCars({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => anchors.map((a) => ({ body: std(a.data?.color ?? C.red, { roughness: 0.25, metalness: 0.4 }), accent: std(C.yellow) })), [anchors]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const d = anchors[i].data;
      const ang = t * (d?.speed ?? 0.5) + (d?.phase ?? 0);
      const x = Math.cos(ang) * d.rx;
      const z = Math.sin(ang) * d.rz;
      g.position.set(anchors[i].x + x, anchors[i].y, anchors[i].z + z);
      // Face along the tangent.
      g.rotation.y = Math.atan2(-Math.sin(ang) * d.rx, Math.cos(ang) * d.rz) + Math.PI;
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} ref={(g) => (refs.current[i] = g)}>
          <Car body={m[i].body} accent={m[i].accent} scale={a.s ?? 0.8} />
        </group>
      ))}
    </>
  );
}

/** Glowing packets travelling along a path (data flow, pipelines, signals). */
export function Pulses({ anchors }: { anchors: Anchor[] }) {
  const items = useMemo(
    () =>
      anchors.flatMap((a) => {
        const pts = (a.data.points as [number, number, number][])
          .filter((p) => p.every(Number.isFinite))
          .map((p) => new Vector3(...p))
          .filter((p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]) > 0.05);
        if (pts.length < 2) return [];
        const curve = new CatmullRomCurve3(pts, !!a.data.closed, "catmullrom", 0.1);
        if (!Number.isFinite(curve.getLength()) || curve.getLength() < 0.1) return [];
        const count = a.data.count ?? 6;
        const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), glow(a.data.color ?? "#7fe3ff", 1.25), count);
        mesh.frustumCulled = false;
        return [{ curve, count, mesh, speed: a.data.speed ?? 0.12, size: a.data.size ?? 0.7 }];
      }),
    [anchors],
  );
  const o = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const it of items) {
      for (let k = 0; k < it.count; k++) {
        const u = (t * it.speed + k / it.count) % 1;
        it.curve.getPointAt(u, o.position);
        o.scale.setScalar(it.size * (0.7 + 0.3 * Math.sin(u * Math.PI)));
        o.rotation.set(t + k, t * 0.7 + k, 0);
        o.updateMatrix();
        it.mesh.setMatrixAt(k, o.matrix);
      }
      it.mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      {items.map((it, i) => (
        <primitive key={i} object={it.mesh} />
      ))}
    </>
  );
}

export function Domes({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ dome: std(C.white, { roughness: 0.4, metalness: 0.2 }), slit: std(C.navy), tube: std(C.metal, { metalness: 0.5 }) }), []);
  useFrame((_, dt) => refs.current.forEach((g) => g && (g.rotation.y += dt * 0.12)));
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} scale={a.s ?? 1}>
          <group ref={(g) => (refs.current[i] = g)}>
            <mesh material={m.dome}>
              <sphereGeometry args={[6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={m.slit} position={[0, 3.2, 3.6]} rotation={[-0.75, 0, 0]}>
              <boxGeometry args={[1.6, 5.8, 0.4]} />
            </mesh>
            <mesh material={m.tube} position={[0, 4.6, 4.2]} rotation={[-0.85, 0, 0]}>
              <cylinderGeometry args={[0.55, 0.7, 4.5, 10]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

export function Wheels({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ tire: std("#2a2b30"), rim: std(C.metal, { metalness: 0.6, roughness: 0.3 }), hub: std(C.coral) }), []);
  useFrame((_, dt) => refs.current.forEach((g, i) => g && (g.rotation.x -= dt * (anchors[i].data?.speed ?? 0.8))));
  return (
    <>
      {anchors.map((a, i) => {
        const r = a.data?.r ?? 4;
        return (
          <group key={i} position={[a.x, a.y, a.z]} rotation={[0, a.ry ?? 0, 0]}>
            <group ref={(g) => (refs.current[i] = g)}>
              <mesh material={m.tire} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[r, r * 0.09, 8, 32]} />
              </mesh>
              <mesh material={m.rim} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[r * 0.88, r * 0.03, 4, 32]} />
              </mesh>
              {Array.from({ length: 12 }, (_, k) => (
                <mesh key={k} material={m.rim} rotation={[(k * Math.PI) / 12, 0, 0]}>
                  <boxGeometry args={[0.06, r * 1.76, 0.06]} />
                </mesh>
              ))}
              <mesh material={m.hub} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[r * 0.1, r * 0.1, r * 0.25, 10]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}

export function Spinners({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const mats = useMemo(
    () => anchors.map((a) => (a.data?.glow ? glow(a.data.color ?? C.turquoise, a.data.glow) : std(a.data?.color ?? C.coral, { roughness: 0.35, metalness: 0.2 }))),
    [anchors],
  );
  useFrame(({ clock }, dt) =>
    refs.current.forEach((m, i) => {
      if (!m) return;
      const d = anchors[i].data ?? {};
      m.rotation.y += dt * (d.speed ?? 0.5);
      m.rotation.x += dt * (d.tumble ?? 0);
      m.position.y = Math.sin(clock.elapsedTime * 0.8 + i) * (d.bob ?? 0);
    }),
  );
  return (
    <>
      {anchors.map((a, i) => {
        const s = a.data?.size ?? 2;
        const k = a.data?.kind ?? "octa";
        return (
          <group key={i} position={[a.x, a.y, a.z]}>
            <mesh ref={(m) => (refs.current[i] = m)} material={mats[i]}>
              {k === "torus" && <torusGeometry args={[s, s * 0.32, 10, 28]} />}
              {k === "cube" && <boxGeometry args={[s * 1.4, s * 1.4, s * 1.4]} />}
              {k === "sphere" && <icosahedronGeometry args={[s, 1]} />}
              {k === "octa" && <octahedronGeometry args={[s, 0]} />}
              {k === "cone" && <coneGeometry args={[s, s * 2, 6]} />}
              {k === "ring" && <torusGeometry args={[s, s * 0.08, 6, 40]} />}
              {k === "knot" && <torusKnotGeometry args={[s, s * 0.28, 64, 8]} />}
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function Bobbers({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const mats = useMemo(() => anchors.map((a) => (a.data?.glow ? glow(a.data.color, a.data.glow) : std(a.data?.color ?? C.turquoise))), [anchors]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const d = anchors[i].data ?? {};
      m.position.y = Math.sin(t * (d.speed ?? 1) + i * 1.3) * (d.amp ?? 0.8);
      m.rotation.y = t * 0.3 + i;
    });
  });
  return (
    <>
      {anchors.map((a, i) => {
        const s = a.data?.size ?? 1;
        return (
          <group key={i} position={[a.x, a.y, a.z]}>
            <mesh ref={(m) => (refs.current[i] = m)} material={mats[i]}>
              {a.data?.kind === "cyl" ? <cylinderGeometry args={[s, s, s * 0.7, 16]} /> : <boxGeometry args={[s, s, s]} />}
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Server-rack LED fields: steady cool lights with a slow, smooth breathing (no random blinking). */
export function Blinkers({ anchors }: { anchors: Anchor[] }) {
  const items = useMemo(
    () =>
      anchors.map((a) => {
        const pts = a.data.points as [number, number, number][];
        const mesh = new InstancedMesh(new BoxGeometry(0.28, 0.12, 0.08), new MeshBasicMaterial({ toneMapped: false }), pts.length);
        const o = new Object3D();
        pts.forEach((p, k) => {
          o.position.set(p[0], p[1], p[2]);
          o.rotation.set(0, a.data.ry?.[k] ?? a.ry ?? 0, 0);
          o.updateMatrix();
          mesh.setMatrixAt(k, o.matrix);
        });
        const palette = [new Color("#7fe3ff"), new Color("#7dffb0")];
        return { mesh, n: pts.length, palette };
      }),
    [anchors],
  );
  const c = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const it of items) {
      for (let k = 0; k < it.n; k++) {
        const level = 0.75 + 0.25 * Math.sin(t * 0.8 + k * 0.7);
        it.mesh.setColorAt(k, c.copy(it.palette[k % 2]).multiplyScalar(1.15 * level));
      }
      if (it.mesh.instanceColor) it.mesh.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      {items.map((it, i) => (
        <primitive key={i} object={it.mesh} />
      ))}
    </>
  );
}

export function Smokes({ anchors }: { anchors: Anchor[] }) {
  const refs = useRef<(Mesh | null)[][]>([]);
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#f3efe8", transparent: true, opacity: 0.6, roughness: 1, depthWrite: false }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((puffs) =>
      puffs.forEach((m, k) => {
        if (!m) return;
        const u = (t * 0.18 + k / puffs.length) % 1;
        m.position.set(Math.sin(u * 4 + k) * 0.6 + u * 2, u * 9, Math.cos(u * 3) * 0.5);
        m.scale.setScalar(0.6 + u * 2.2);
      }),
    );
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]}>
          {Array.from({ length: 5 }, (_, k) => (
            <mesh key={k} ref={(m) => ((refs.current[i] ??= [])[k] = m)} material={mat}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

export function Fountains({ anchors }: { anchors: Anchor[] }) {
  const items = useMemo(
    () =>
      anchors.map(() => {
        const mesh = new InstancedMesh(new BoxGeometry(0.25, 0.25, 0.25), new MeshBasicMaterial({ color: new Color(1.2, 1.6, 1.9), toneMapped: false }), 40);
        mesh.frustumCulled = false;
        return mesh;
      }),
    [anchors],
  );
  const o = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    items.forEach((mesh, i) => {
      const a = anchors[i];
      for (let k = 0; k < 40; k++) {
        const u = (t * 0.6 + k / 40) % 1;
        const ang = k * 2.4;
        const r = u * 2.2;
        o.position.set(a.x + Math.cos(ang) * r, a.y + 4 * u * (1 - u) * 3.2, a.z + Math.sin(ang) * r);
        o.scale.setScalar(1 - u * 0.6);
        o.updateMatrix();
        mesh.setMatrixAt(k, o.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {items.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
