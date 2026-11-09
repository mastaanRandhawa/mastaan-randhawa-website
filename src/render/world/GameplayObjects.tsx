import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3, AdditiveBlending, DoubleSide } from "three";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import type { World } from "@/world/world";
import type { RingDef } from "@/world/defs";

const Z = new Vector3(0, 0, 1);
function ringQuat(r: RingDef) {
  return new Quaternion().setFromUnitVectors(Z, new Vector3(...r.dir));
}

const glowMat = (c: string, k: number, opacity = 1) =>
  new MeshBasicMaterial({ color: new Color(c).multiplyScalar(k), toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Course rings: next ring glows and pulses, upcoming ones are dim, passed hide. */
function CourseRings({ world }: { world: World }) {
  const course = useGame((s) => s.course);
  const tutorialDone = useGame((s) => s.progress.tutorialDone);
  const refs = useRef<Record<string, (Group | null)[]>>({});
  const mats = useMemo(
    () => ({
      next: glowMat("#ffcf70", 2.6),
      upcoming: glowMat("#ffe9c7", 1.1, 0.55),
      start: glowMat("#7fffd4", 2.2),
      disc: new MeshBasicMaterial({ color: new Color("#fff1c9"), transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
      chevron: glowMat("#ffffff", 1.6),
    }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const [id, arr] of Object.entries(refs.current)) {
      arr.forEach((g, i) => {
        if (!g) return;
        const isNext = course?.id === id && course.next === i;
        const s = isNext ? 1 + Math.sin(t * 5) * 0.05 + Math.max(0, 0.25 - (runtime.simTime - runtime.ringFlashAt)) : 1;
        g.scale.setScalar(s);
        const spin = g.children[1];
        if (spin) spin.rotation.z = t * (isNext ? 1.4 : 0.3);
      });
    }
  });
  return (
    <>
      {world.courses.map((c) => {
        const active = course?.id === c.id;
        if (!c.timed && (tutorialDone || !active)) return null;
        return c.rings.map((r, i) => {
          const passed = active && i < course!.next;
          if (passed) return null;
          const isNext = active && course!.next === i;
          const isStart = !active && i === 0;
          if (!active && !isStart) {
            // Inactive timed courses only show their start gate + faint path.
            return (
              <group key={`${c.id}${i}`} position={r.pos} quaternion={ringQuat(r)} ref={(g) => ((refs.current[c.id] ??= [])[i] = g)}>
                <mesh material={mats.upcoming}>
                  <torusGeometry args={[r.radius, 0.22, 6, 40]} />
                </mesh>
              </group>
            );
          }
          return (
            <group key={`${c.id}${i}`} position={r.pos} quaternion={ringQuat(r)} ref={(g) => ((refs.current[c.id] ??= [])[i] = g)}>
              <mesh material={isStart ? mats.start : isNext ? mats.next : mats.upcoming}>
                <torusGeometry args={[r.radius, isNext || isStart ? 0.55 : 0.32, 8, 48]} />
              </mesh>
              <group>
                {(isNext || isStart) &&
                  Array.from({ length: 8 }, (_, k) => (
                    <group key={k} rotation={[0, 0, (k / 8) * Math.PI * 2]}>
                      <mesh material={mats.chevron} position={[0, r.radius + 1.25, 0]}>
                        <boxGeometry args={[0.55, 1.3, 0.2]} />
                      </mesh>
                    </group>
                  ))}
              </group>
              {(isNext || isStart) && (
                <mesh material={mats.disc}>
                  <circleGeometry args={[r.radius * 0.95, 40]} />
                </mesh>
              )}
            </group>
          );
        });
      })}
    </>
  );
}

/** Destination arrival rings in each region's accent colour. */
function DestinationRings({ world }: { world: World }) {
  const refs = useRef<(Group | null)[]>([]);
  const ds = world.destinations.filter((d) => d.ring);
  const mats = useMemo(() => ds.map((d) => glowMat(d.accent, 1.9)), [ds]);
  const inner = useMemo(() => ds.map((d) => glowMat(d.accent, 1.2, 0.5)), [ds]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.children[1].rotation.z = t * 0.5 + i;
      g.scale.setScalar(1 + Math.sin(t * 1.6 + i) * 0.03);
    });
  });
  return (
    <>
      {ds.map((d, i) => (
        <group key={d.id} position={d.ring!.pos} quaternion={ringQuat(d.ring!)} ref={(g) => (refs.current[i] = g)}>
          <mesh material={mats[i]}>
            <torusGeometry args={[d.ring!.radius, 0.45, 8, 56]} />
          </mesh>
          <mesh material={inner[i]}>
            <torusGeometry args={[d.ring!.radius * 0.86, 0.12, 4, 56, Math.PI * 1.5]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Flight-log collectibles: glowing, rotating capsules with an orbiting halo. */
function Collectibles({ world }: { world: World }) {
  const got = useGame((s) => s.progress.collectibles);
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ core: glowMat("#ffc65a", 1.9), halo: glowMat("#fff2cf", 1.6, 0.8), beam: glowMat("#ffd27a", 0.9, 0.18) }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.children[0].rotation.y = t * 1.6;
      g.children[1].rotation.x = t * 1.1;
      g.children[1].rotation.y = t * 0.7;
      g.position.y = world.collectibles[i].pos[1] + Math.sin(t * 2 + i) * 0.6;
    });
  });
  return (
    <>
      {world.collectibles.map((c, i) =>
        got.includes(c.id) ? null : (
          <group key={c.id} ref={(g) => (refs.current[i] = g)} position={c.pos}>
            <mesh material={m.core}>
              <octahedronGeometry args={[1.3, 0]} />
            </mesh>
            <mesh material={m.halo}>
              <torusGeometry args={[2.2, 0.08, 4, 32]} />
            </mesh>
            <mesh material={m.beam} position={[0, 18, 0]}>
              <cylinderGeometry args={[0.25, 0.6, 36, 6, 1, true]} />
            </mesh>
          </group>
        ),
      )}
    </>
  );
}

export function GameplayObjects({ world }: { world: World }) {
  return (
    <>
      <CourseRings world={world} />
      <DestinationRings world={world} />
      <Collectibles world={world} />
    </>
  );
}

export type { Mesh };
