import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Box3,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Euler,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Texture,
} from "three";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { SKINS, type SkinDef } from "@/game/progression";
import { FLIGHT } from "@/config/flight";
import { GEAR_HEIGHT } from "@/world/landing";
import { Contrails } from "./Contrails";

/**
 * "Mitsubishi B2M2 - Game Art 1 Stylized Plane" by Pyush Chamoli
 * (https://sketchfab.com/bladesides), Sketchfab Standard licence. Converted
 * from spec-gloss to metal-rough materials for three r169.
 */
const MODEL_URL = `${import.meta.env.BASE_URL}models/plane.glb`;
useLoader.preload(GLTFLoader, MODEL_URL);

/**
 * Wingspan (m) the model is fitted to. A biplane carries more height than the
 * old monoplane, so it is fitted a little narrower to keep the same on-screen bulk.
 */
const WINGSPAN = 8.6;

function propDiscTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(52,58,69,0.0)");
  grad.addColorStop(0.3, "rgba(52,58,69,0.26)");
  grad.addColorStop(0.8, "rgba(52,58,69,0.16)");
  grad.addColorStop(0.9, "rgba(240,236,226,0.3)");
  grad.addColorStop(1, "rgba(240,236,226,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/**
 * Livery shader: the painted texture has red wings and a teal fuselage. A
 * livery recolours each paint group to the skin's accent / body colour while
 * keeping the brush shading (luminance), so outlines, metal and glass stay.
 */
interface Livery {
  uniforms: { uLivery: { value: number }; uWing: { value: Color }; uBody: { value: Color } };
}
function liveryMaterial(map: Texture | null): MeshStandardMaterial & { livery: Livery } {
  // A little of the painted texture as emissive keeps the hand-painted colours
  // bright in shade, matching the world's soft, sunny look.
  const m = new MeshStandardMaterial({ map, emissive: new Color(0.28, 0.28, 0.28), roughness: 0.72, metalness: 0, side: DoubleSide }) as MeshStandardMaterial & { livery: Livery };
  m.livery = { uniforms: { uLivery: { value: 0 }, uWing: { value: new Color() }, uBody: { value: new Color() } } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, m.livery.uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uLivery;\nuniform vec3 uWing;\nuniform vec3 uBody;",
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
        if (uLivery > 0.5) {
          vec3 c = diffuseColor.rgb;
          float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
          // Hue tests as ratios, so dark, shadowed brush strokes still classify.
          float red = smoothstep(0.3, 0.55, (c.r - max(c.g, c.b)) / (c.r + 1e-3));
          float teal = smoothstep(0.25, 0.5, (min(c.g, c.b) - c.r) / (max(c.g, c.b) + 1e-3));
          // Brush shading relative to each paint's measured mean luminance (red ≈ 0.03,
          // teal ≈ 0.10 linear), compressed so the livery reads clean, not blotchy.
          // Wings are big: a touch quieter than the accent, with more of the brushwork kept.
          vec3 wing = uWing * 0.86 * clamp(pow(lum / 0.03, 0.8), 0.5, 1.15);
          vec3 body = uBody * clamp(pow(lum / 0.10, 0.7), 0.55, 1.12);
          diffuseColor.rgb = mix(mix(c, wing, red), body, teal * (1.0 - red));
        }`,
      )
      // Emissive follows the (recoloured) paint rather than a flat colour.
      .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance = diffuseColor.rgb * emissive;");
  };
  m.customProgramCacheKey = () => "plane-livery";
  return m;
}

function applySkin(m: MeshStandardMaterial & { livery: Livery }, skin: SkinDef) {
  // Every livery, Classic included, repaints the model in the game's palette
  // (wings take the accent, the fuselage the body colour).
  const on = true;
  m.livery.uniforms.uLivery.value = on ? 1 : 0;
  m.livery.uniforms.uWing.value.set(skin.accent);
  m.livery.uniforms.uBody.value.set(skin.body);
}

interface Rig {
  root: Object3D;
  prop: Object3D | null;
  blades: Object3D[];
  disc: Mesh;
  paint: MeshStandardMaterial & { livery: Livery };
  /** Wingtip positions in plane space (for lights and contrails). */
  tip: Vector3;
}

/** Fits, orients and dresses the loaded model once. */
function buildRig(scene: Group, discTex: Texture): Rig {
  const model = scene.clone(true);
  let paint: Rig["paint"] | null = null;
  let hull: Mesh | null = null;
  // The shell's winding is already flipped in the file, so FrontSide draws only its far side.
  const outline = new MeshBasicMaterial({ color: "#1d2430", side: FrontSide });
  model.traverse((o) => {
    // Baked wind-streak cards: the game draws its own contrails.
    if (/^(Wind|pasted__)/.test(o.name)) o.visible = false;
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const src = mesh.material as MeshStandardMaterial;
    if (src.name === "Outline") {
      // Inverted-hull ink lines from a slightly larger, inside-out shell.
      mesh.material = outline;
      mesh.castShadow = false;
    } else {
      paint ??= liveryMaterial(src.map);
      mesh.material = paint;
      mesh.castShadow = true;
    }
    if (o.name === "Plane_lambert1_0") hull = mesh;
  });
  if (!paint || !hull) throw new Error("plane.glb: unexpected structure");

  // Fit: wingspan → WINGSPAN, centred, wheels GEAR_HEIGHT below the pivot, nose toward -Z.
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(hull);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const s = WINGSPAN / size.x;
  const inner = new Group();
  inner.add(model);
  model.position.set(-centre.x, -box.min.y, -centre.z);
  const root = new Group();
  root.add(inner);
  root.scale.setScalar(s);
  root.rotation.y = Math.PI;
  root.position.y = -GEAR_HEIGHT;

  // Wingtip: the hull vertex furthest out along +X, in plane space.
  root.updateMatrixWorld(true);
  const pos = (hull as Mesh).geometry.getAttribute("position");
  const v = new Vector3();
  const tip = new Vector3();
  let best = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.x > best) {
      best = v.x;
      tip.copy(v);
    }
  }
  tip.applyMatrix4((hull as Mesh).matrixWorld);
  tip.x = Math.abs(tip.x);

  const prop = model.getObjectByName("Propellor") ?? null;
  const blades = prop ? prop.children.slice() : [];
  // Blur disc in the propeller's own frame (it spins with it; the disc is radial).
  // Blade meshes sit untransformed under the propeller node, so their bounds are in its units.
  const bladeMesh = blades.find((b) => (b as Mesh).isMesh) as Mesh | undefined;
  bladeMesh?.geometry.computeBoundingBox();
  const bladeR = bladeMesh?.geometry.boundingBox ? Math.max(bladeMesh.geometry.boundingBox.max.y, bladeMesh.geometry.boundingBox.max.x) : 3;
  const disc = new Mesh(
    new CircleGeometry(bladeR * 1.06, 40),
    new MeshBasicMaterial({ map: discTex, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }),
  );
  disc.position.z = 0.45; // just ahead of the blades (the model's nose is +Z)
  prop?.add(disc);
  return { root, prop, blades, disc, paint, tip };
}

const visualQ = new Quaternion();
const targetQ = new Quaternion();
const euler = new Euler(0, 0, 0, "YXZ");

/**
 * The player's aircraft (see MODEL_URL). Position comes straight from the
 * interpolated flight pose; attitude is eased by a short critically-damped
 * follow so collisions and snaps never pop, and the body floats with a soft
 * bob. The propeller winds up with engine speed.
 */
export function Airplane() {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const spinRate = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, init: false });

  const skinId = useGame((s) => s.progress.skin);
  const cameraMode = useGame((s) => s.cameraMode);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const skin = SKINS.find((s) => s.id === skinId) ?? SKINS[0];

  const discTex = useMemo(() => propDiscTexture(), []);
  const rig = useMemo(() => buildRig(gltf.scene, discTex), [gltf, discTex]);
  const lights = useMemo(
    () => ({
      red: new MeshBasicMaterial({ color: new Color(1.5, 0.35, 0.3), toneMapped: false }),
      green: new MeshBasicMaterial({ color: new Color(0.35, 1.4, 0.6), toneMapped: false }),
    }),
    [],
  );
  const tipL = useMemo(() => new Object3D(), []);
  const tipR = useMemo(() => new Object3D(), []);

  useEffect(() => applySkin(rig.paint, skin), [rig, skin]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const p = runtime.pose;
    const f = runtime.flight;
    const t = state.clock.elapsedTime;
    g.position.set(p.x, p.y, p.z);

    // Attitude: ease toward the flight pose (≈45 ms time constant). Snap on
    // teleports/respawns, and in the cockpit, where the camera is rigidly mounted.
    euler.set(p.pitch, p.heading, -p.roll, "YXZ");
    targetQ.setFromEuler(euler);
    const L = last.current;
    const jumped = !L.init || Math.hypot(p.x - L.x, p.y - L.y, p.z - L.z) > 40;
    if (jumped || cameraMode === "cockpit") visualQ.copy(targetQ);
    else visualQ.slerp(targetQ, 1 - Math.exp(-22 * Math.min(dt, 0.1)));
    Object.assign(L, { x: p.x, y: p.y, z: p.z, init: true });
    g.quaternion.copy(visualQ);

    const vs = runtime.visit?.stage;
    const parked = runtime.phase === "parked" || vs === "landed" || vs === "turn";
    const rpmT = parked ? 0.18 : Math.min(1, 0.45 + (f.speed / FLIGHT.maxSpeed) * 0.55 + (f.boosting ? 0.15 : 0));
    // Gentle toy-like float, plus a small lean into the controls for life.
    if (body.current) {
      const calm = parked || reduced ? 0 : 1;
      const c = runtime.ctl;
      body.current.position.set(0, Math.sin(t * 1.3) * 0.05 * calm, 0);
      body.current.rotation.set(Math.sin(t * 1.1 + 0.6) * 0.012 * calm + c.pitch * 0.03 * calm, -c.turn * 0.035 * calm, Math.sin(t * 0.9) * 0.02 * calm);
    }
    // Propeller: the engine winds down while parked and spins up for takeoff.
    const spinTarget = parked ? 0 : 34 + rpmT * 46;
    spinRate.current += (spinTarget - spinRate.current) * (1 - Math.exp(-(parked ? 1.2 : 2.5) * dt));
    const spin = spinRate.current;
    if (rig.prop) rig.prop.rotation.z += spin * dt;
    const blur = Math.min(1, Math.max(0, (spin - 14) / 22));
    for (const b of rig.blades) if (b !== rig.disc) b.visible = blur < 0.95;
    (rig.disc.material as MeshBasicMaterial).opacity = blur * 0.8;
    rig.disc.visible = blur > 0.02;
    // In the cockpit the camera sits inside the fuselage, so the airframe is hidden.
    rig.root.visible = cameraMode !== "cockpit" || useGame.getState().mode !== "flying";
  });

  const { tip } = rig;
  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <primitive object={rig.root} />
          {/* Position lights (steady) at the wingtips */}
          <mesh position={[-tip.x, tip.y, tip.z]} material={lights.red}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <mesh position={[tip.x, tip.y, tip.z]} material={lights.green}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <primitive object={tipL} position={[-tip.x, tip.y, tip.z + 0.25]} />
          <primitive object={tipR} position={[tip.x, tip.y, tip.z + 0.25]} />
        </group>
      </group>
      <Contrails tips={[tipL, tipR]} />
    </>
  );
}
