import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector3, type Object3D } from "three";
import { runtime } from "@/game/runtime";
import { ASSISTED } from "@/config/flight";

const N = 46;

const vert = /* glsl */ `
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const frag = /* glsl */ `
uniform float uIntensity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), vAlpha * uIntensity);
}`;

class Ribbon {
  pts: Vector3[] = [];
  geo = new BufferGeometry();
  pos = new Float32Array(N * 2 * 3);
  alpha = new Float32Array(N * 2);
  mat: ShaderMaterial;
  mesh: Mesh;
  constructor() {
    this.geo.setAttribute("position", new BufferAttribute(this.pos, 3));
    this.geo.setAttribute("aAlpha", new BufferAttribute(this.alpha, 1));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geo.setIndex(idx);
    this.mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uIntensity: { value: 0 } },
    });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }
}

const tmp = new Vector3();
const side = new Vector3();
const dir = new Vector3();
const toCam = new Vector3();

export function Contrails({ tips }: { tips: Object3D[] }) {
  const ribbons = useMemo(() => tips.map(() => new Ribbon()), [tips]);
  const level = useRef(0);

  useFrame(({ camera }, dt) => {
    const f = runtime.flight;
    const flying = runtime.phase === "flying";
    const g = Math.abs(runtime.flight.yawRate) * 1.2 + Math.abs(runtime.flight.pitchRate) * 1.4;
    const fast = Math.max(0, (f.speed - ASSISTED.baseSpeed * 1.25) / (ASSISTED.maxSpeed - ASSISTED.baseSpeed * 1.25));
    const target = flying ? Math.min(1, fast * 1.2 + Math.max(0, g - 0.75) * 0.9) : 0;
    level.current += (target - level.current) * (1 - Math.exp(-4 * dt));
    const intensity = level.current;
    ribbons.forEach((r, k) => {
      tips[k].getWorldPosition(tmp);
      const last = r.pts[0];
      if (!last || last.distanceToSquared(tmp) > 0.5) {
        r.pts.unshift(tmp.clone());
        if (r.pts.length > N) r.pts.pop();
      } else last.copy(tmp);
      if (!flying) r.pts.length = Math.min(r.pts.length, 1);
      const n = r.pts.length;
      for (let i = 0; i < N; i++) {
        const p = r.pts[Math.min(i, n - 1)];
        const q = r.pts[Math.min(i + 1, n - 1)];
        dir.subVectors(p, q);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        toCam.subVectors(camera.position, p);
        side.crossVectors(dir, toCam).normalize();
        const t = i / (N - 1);
        const w = 0.12 + t * 0.55;
        tmp.copy(p).addScaledVector(side, w);
        r.pos.set([tmp.x, tmp.y, tmp.z], i * 6);
        tmp.copy(p).addScaledVector(side, -w);
        r.pos.set([tmp.x, tmp.y, tmp.z], i * 6 + 3);
        const a = i < n ? (1 - t) * (1 - t) * 0.55 : 0;
        r.alpha[i * 2] = a;
        r.alpha[i * 2 + 1] = a;
      }
      r.geo.attributes.position.needsUpdate = true;
      r.geo.attributes.aAlpha.needsUpdate = true;
      r.mat.uniforms.uIntensity.value = intensity;
      r.mesh.visible = intensity > 0.01;
    });
  });

  return (
    <>
      {ribbons.map((r, i) => (
        <primitive key={i} object={r.mesh} />
      ))}
    </>
  );
}
