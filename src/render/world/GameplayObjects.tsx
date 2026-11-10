import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3, AdditiveBlending, DoubleSide } from "three";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import type { World } from "@/world/world";
import type { RingDef } from "@/world/defs";

const Z = new Vector3(0, 0, 1);
function ringQuat(r: RingDef) {
  return new Quaternion().setFromUnitVectors(Z, new Vector3(...r.dir));
}

/**
 * Painted, softly self-lit material for gameplay markers: solid pastel colour
 * that stays readable in shade without neon glow. `k` sets how much it lights itself.
 */
const glowMat = (c: string, k: number, opacity = 1) =>
  new MeshStandardMaterial({
    color: new Color(c),
    emissive: new Color(c),
    emissiveIntensity: Math.min(0.85, k * 0.3),
    roughness: 0.6,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });

/** Course rings: next ring glows and pulses, upcoming ones are dim, passed hide. */
function CourseRings({ world }: { world: World }) {
  const course = useGame((s) => s.course);
  const tutorialDone = useGame((s) => s.progress.tutorialDone);
  const refs = useRef<Record<string, (Group | null)[]>>({});
  const mats = useMemo(
    () => ({
      next: glowMat("#ef7f5c", 2.4),
      upcoming: glowMat("#fff4db", 1.6, 0.6),
      start: glowMat("#3fbcc0", 2.2),
      band: glowMat("#fff7ea", 2.6),
      disc: new MeshBasicMaterial({ color: new Color("#fff4db"), transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
      chevron: glowMat("#fff7ea", 2.6),
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
                <torusGeometry args={[r.radius, isNext || isStart ? 0.7 : 0.36, 10, 56]} />
              </mesh>
              <group>
                {/* Cream racing bands painted around the active ring. */}
                {(isNext || isStart) &&
                  Array.from({ length: 8 }, (_, k) => (
                    <mesh key={`b${k}`} rotation={[0, 0, (k / 8) * Math.PI * 2]} material={mats.band}>
                      <torusGeometry args={[r.radius, 0.76, 10, 4, 0.16]} />
                    </mesh>
                  ))}
                {(isNext || isStart) &&
                  Array.from({ length: 8 }, (_, k) => (
                    <group key={k} rotation={[0, 0, (k / 8) * Math.PI * 2]}>
                      <mesh material={mats.chevron} position={[0, r.radius + 1.6, 0]} rotation={[0, 0, Math.PI]}>
                        <coneGeometry args={[0.45, 0.9, 3]} />
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

/** Flight-log collectibles: glowing, rotating capsules with an orbiting halo. */
function Collectibles({ world }: { world: World }) {
  const got = useGame((s) => s.progress.collectibles);
  const refs = useRef<(Group | null)[]>([]);
  const m = useMemo(() => ({ core: glowMat("#f6c55a", 2.8), halo: glowMat("#fff4db", 2.6, 0.85), beam: glowMat("#ffe2a0", 2.4, 0.2) }), []);
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
      <Collectibles world={world} />
    </>
  );
}

export type { Mesh };
