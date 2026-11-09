import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { runtime } from "@/game/runtime";

const N = 9;

/** Soft dust billows that spread from the wheels at touchdown. */
export function Dust() {
  const group = useRef<Group>(null);
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#efe3cf", roughness: 1, transparent: true, opacity: 0, depthWrite: false, flatShading: true }), []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2 + Math.random() * 0.5, s: 0.7 + Math.random() * 0.6 })), []);
  useFrame(() => {
    const g = group.current;
    const d = runtime.dust;
    if (!g) return;
    const age = d ? runtime.simTime - d.at : 99;
    const life = 1.4;
    g.visible = age < life;
    if (!g.visible || !d) return;
    const u = age / life;
    g.position.set(d.x, d.y + 0.6, d.z);
    mat.opacity = 0.55 * (1 - u) * (1 - u);
    g.children.forEach((c, i) => {
      const m = c as Mesh;
      const r = 1.5 + u * 7 * seeds[i].s;
      m.position.set(Math.cos(seeds[i].a) * r, u * 1.6, Math.sin(seeds[i].a) * r);
      m.scale.setScalar((0.9 + u * 2.6) * seeds[i].s);
    });
  });
  return (
    <group ref={group} visible={false}>
      {seeds.map((_, i) => (
        <mesh key={i} material={mat}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  );
}
