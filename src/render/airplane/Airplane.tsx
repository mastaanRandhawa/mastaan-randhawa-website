import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { fuselageGeometry, finGeometry, paintAircraft, stabilizerGeometry, wingGeometry } from "./airplaneGeometry";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { SKINS } from "@/game/progression";
import { ASSISTED } from "@/config/flight";
import { Contrails } from "./Contrails";

function propDiscTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(40,40,46,0.0)");
  grad.addColorStop(0.25, "rgba(40,40,46,0.35)");
  grad.addColorStop(0.8, "rgba(40,40,46,0.22)");
  grad.addColorStop(0.93, "rgba(242,115,90,0.45)");
  grad.addColorStop(1, "rgba(242,115,90,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function tailDecal(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.font = "700 76px 'Azeret Mono', ui-monospace, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = color;
  g.fillText(text, 128, 70);
  const t = new CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function Airplane() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const prop = useRef<Group>(null);
  const blades = useRef<Group>(null);
  const disc = useRef<Mesh>(null);
  const aileronL = useRef<Group>(null);
  const aileronR = useRef<Group>(null);
  const elevator = useRef<Group>(null);
  const rudder = useRef<Group>(null);
  const gearL = useRef<Group>(null);
  const gearR = useRef<Group>(null);
  const gearT = useRef<Group>(null);
  const strobe = useRef<Mesh>(null);
  const navL = useRef<Mesh>(null);
  const navR = useRef<Mesh>(null);
  const scarf = useRef<Mesh>(null);
  const canopyGroup = useRef<Group>(null);
  const tipL = useMemo(() => new Object3D(), []);
  const tipR = useMemo(() => new Object3D(), []);

  const skinId = useGame((s) => s.progress.skin);
  const cameraMode = useGame((s) => s.cameraMode);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const skin = SKINS.find((s) => s.id === skinId) ?? SKINS[0];

  const geo = useMemo(
    () => ({
      fuselage: fuselageGeometry(),
      wings: [wingGeometry(false), wingGeometry(true)],
      stabs: [stabilizerGeometry(false), stabilizerGeometry(true)],
      fin: finGeometry(),
    }),
    [],
  );

  const mats = useMemo(
    () => ({
      paint: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.08, side: DoubleSide }),
      accent: new MeshStandardMaterial({ color: skin.accent, flatShading: true, roughness: 0.45, metalness: 0.1 }),
      trim: new MeshStandardMaterial({ color: skin.trim, flatShading: true, roughness: 0.5 }),
      body: new MeshStandardMaterial({ color: skin.body, flatShading: true, roughness: 0.5, metalness: 0.05 }),
      glass: new MeshStandardMaterial({ color: skin.canopy, roughness: 0.06, metalness: 0.55, transparent: true, opacity: 0.82, emissive: new Color(skin.canopy).multiplyScalar(0.15) }),
      dark: new MeshStandardMaterial({ color: "#2a2c33", roughness: 0.75, flatShading: true }),
      metal: new MeshStandardMaterial({ color: "#c9ced6", roughness: 0.3, metalness: 0.7, flatShading: true }),
      blade: new MeshStandardMaterial({ color: "#3a3330", roughness: 0.55, flatShading: true }),
      leather: new MeshStandardMaterial({ color: "#7a4a2b", roughness: 0.8, flatShading: true }),
      goggles: new MeshStandardMaterial({ color: "#9fd6ea", roughness: 0.1, metalness: 0.6 }),
      red: new MeshBasicMaterial({ color: new Color(4, 0.5, 0.4), toneMapped: false }),
      green: new MeshBasicMaterial({ color: new Color(0.4, 4, 0.9), toneMapped: false }),
      white: new MeshBasicMaterial({ color: new Color(5, 5, 5), toneMapped: false }),
      disc: new MeshBasicMaterial({ map: propDiscTexture(), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }),
      decal: new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Repaint on skin change.
  useEffect(() => {
    paintAircraft(geo, skin);
    mats.accent.color.set(skin.accent);
    mats.trim.color.set(skin.trim);
    mats.body.color.set(skin.body);
    mats.glass.color.set(skin.canopy);
    mats.glass.emissive.set(skin.canopy).multiplyScalar(0.15);
    mats.decal.map?.dispose();
    mats.decal.map = tailDecal("MR", skin.trim);
    mats.decal.needsUpdate = true;
  }, [skin, geo, mats]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const p = runtime.pose;
    const f = runtime.flight;
    const t = state.clock.elapsedTime;
    g.position.set(p.x, p.y, p.z);
    g.rotation.set(p.pitch, p.heading, -p.roll, "YXZ");

    // Engine vibration + idle bob.
    const parked = runtime.phase === "parked";
    const rpmT = parked ? 0.18 : Math.min(1, 0.45 + (f.speed / ASSISTED.maxSpeed) * 0.55 + (f.boosting ? 0.15 : 0));
    if (body.current) {
      const vib = reduced ? 0 : 0.012 * rpmT;
      body.current.position.set(Math.sin(t * 61) * vib, Math.sin(t * 53) * vib + (parked ? 0 : Math.sin(t * 1.3) * 0.04), 0);
    }
    // Propeller
    const spin = parked ? 9 : 34 + rpmT * 46;
    if (prop.current) prop.current.rotation.z -= spin * dt;
    const blur = Math.min(1, Math.max(0, (spin - 12) / 30));
    if (blades.current) blades.current.visible = blur < 0.95;
    mats.blade.opacity = 1;
    mats.disc.opacity = blur * 0.85;
    if (disc.current) disc.current.visible = blur > 0.02;

    // Control surfaces follow smoothed inputs.
    const c = runtime.ctl;
    const ail = (c.turn * 0.35 + c.roll * 0.45) * 0.55;
    if (aileronL.current) aileronL.current.rotation.x = ail;
    if (aileronR.current) aileronR.current.rotation.x = -ail;
    if (elevator.current) elevator.current.rotation.x = -c.pitch * 0.4;
    if (rudder.current) rudder.current.rotation.y = -c.turn * 0.35;

    // Gear retraction: fold back and tuck.
    const gear = f.gear;
    for (const gr of [gearL.current, gearR.current, gearT.current]) {
      if (!gr) continue;
      gr.rotation.x = (1 - gear) * -1.35;
      gr.scale.setScalar(0.25 + gear * 0.75);
      gr.visible = gear > 0.02;
    }
    // Lights
    const blink = (t % 1.4) < 0.07;
    if (strobe.current) strobe.current.visible = blink;
    const navOn = 0.75 + Math.sin(t * 2.2) * 0.05;
    if (navL.current) navL.current.scale.setScalar(navOn);
    if (navR.current) navR.current.scale.setScalar(navOn);
    if (scarf.current) scarf.current.rotation.y = Math.sin(t * 14) * 0.25 * rpmT + wrap(p.roll) * 0.1;
    if (canopyGroup.current) canopyGroup.current.visible = cameraMode !== "cockpit" || useGame.getState().mode !== "flying";
  });

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          {/* Airframe */}
          <mesh geometry={geo.fuselage} material={mats.paint} castShadow />
          <mesh geometry={geo.wings[0]} material={mats.paint} castShadow />
          <mesh geometry={geo.wings[1]} material={mats.paint} castShadow />
          <mesh geometry={geo.stabs[0]} material={mats.paint} castShadow />
          <mesh geometry={geo.stabs[1]} material={mats.paint} castShadow />
          <mesh geometry={geo.fin} material={mats.paint} castShadow />
          {/* Tail decals */}
          <mesh position={[0.085, 1.0, 3.2]} rotation={[0, Math.PI / 2, 0]} material={mats.decal}>
            <planeGeometry args={[1.0, 0.5]} />
          </mesh>
          <mesh position={[-0.085, 1.0, 3.2]} rotation={[0, -Math.PI / 2, 0]} material={mats.decal}>
            <planeGeometry args={[1.0, 0.5]} />
          </mesh>

          {/* Control surfaces (hinged at trailing edges) */}
          <group ref={aileronR} position={[3.3, -0.24, 0.46]}>
            <mesh position={[0, 0, 0.17]} material={mats.accent} castShadow>
              <boxGeometry args={[1.6, 0.06, 0.34]} />
            </mesh>
          </group>
          <group ref={aileronL} position={[-3.3, -0.24, 0.46]}>
            <mesh position={[0, 0, 0.17]} material={mats.accent} castShadow>
              <boxGeometry args={[1.6, 0.06, 0.34]} />
            </mesh>
          </group>
          <group ref={elevator} position={[0, 0.16, 3.82]}>
            <mesh position={[0, 0, 0.14]} material={mats.trim}>
              <boxGeometry args={[3.1, 0.05, 0.28]} />
            </mesh>
          </group>
          <group ref={rudder} position={[0, 0.95, 3.98]}>
            <mesh position={[0, 0, 0.16]} material={mats.trim}>
              <boxGeometry args={[0.07, 1.25, 0.32]} />
            </mesh>
          </group>

          {/* Cowling details */}
          <mesh position={[0, 0, -3.02]} rotation={[0, 0, 0]} material={mats.dark}>
            <torusGeometry args={[0.47, 0.06, 6, 20]} />
          </mesh>
          <mesh position={[0, 0, -3.0]} material={mats.dark}>
            <circleGeometry args={[0.44, 18]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.7, -0.28, -2.15]} rotation={[Math.PI / 2 - 0.3, 0, 0]} material={mats.metal}>
              <cylinderGeometry args={[0.07, 0.09, 0.4, 6]} />
            </mesh>
          ))}

          {/* Canopy + pilot */}
          <group ref={canopyGroup}>
            <mesh position={[0, 0.56, -0.35]} scale={[0.6, 0.6, 1.35]} material={mats.glass}>
              <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, 0.58, -0.35]} scale={[0.62, 0.62, 1.37]} rotation={[0, 0, 0]} material={mats.trim}>
              <torusGeometry args={[1, 0.03, 4, 24, Math.PI]} />
            </mesh>
            <group position={[0, 0.78, -0.2]}>
              <mesh material={mats.leather}>
                <sphereGeometry args={[0.24, 10, 8]} />
              </mesh>
              <mesh position={[0, 0.02, -0.17]} material={mats.goggles}>
                <boxGeometry args={[0.34, 0.09, 0.08]} />
              </mesh>
              <mesh ref={scarf} position={[0, -0.18, 0.18]} material={mats.accent}>
                <boxGeometry args={[0.1, 0.05, 0.42]} />
              </mesh>
            </group>
          </group>
          <mesh position={[0, 0.56, 0.95]} material={mats.body}>
            <boxGeometry args={[0.5, 0.18, 0.6]} />
          </mesh>

          {/* Landing gear */}
          {[
            [gearL, -1.55],
            [gearR, 1.55],
          ].map(([ref, x]) => (
            <group key={x as number} ref={ref as React.RefObject<Group>} position={[x as number, -0.45, -0.45]}>
              <mesh position={[0, -0.4, 0]} material={mats.metal}>
                <boxGeometry args={[0.1, 0.8, 0.14]} />
              </mesh>
              <mesh position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
                <cylinderGeometry args={[0.3, 0.3, 0.18, 12]} />
              </mesh>
              <mesh position={[0, -0.72, 0.02]} scale={[0.17, 0.3, 0.55]} material={mats.accent}>
                <sphereGeometry args={[1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              </mesh>
            </group>
          ))}
          <group ref={gearT} position={[0, -0.25, 3.55]}>
            <mesh position={[0, -0.2, 0]} material={mats.metal}>
              <boxGeometry args={[0.06, 0.4, 0.08]} />
            </mesh>
            <mesh position={[0, -0.38, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 10]} />
            </mesh>
          </group>

          {/* Nav + strobe lights */}
          <mesh ref={navL} position={[-4.8, -0.12, -0.45]} material={mats.red}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <mesh ref={navR} position={[4.8, -0.12, -0.45]} material={mats.green}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <mesh ref={strobe} position={[0, 1.92, 3.5]} material={mats.white}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
          <primitive object={tipL} position={[-4.8, -0.12, -0.2]} />
          <primitive object={tipR} position={[4.8, -0.12, -0.2]} />

          {/* Propeller */}
          <group ref={prop} position={[0, 0, -3.1]}>
            <mesh position={[0, 0, -0.3]} rotation={[-Math.PI / 2, 0, 0]} material={mats.accent} castShadow>
              <coneGeometry args={[0.32, 0.72, 14]} />
            </mesh>
            <group ref={blades}>
              {[0, Math.PI].map((r) => (
                <group key={r} rotation={[0, 0, r]}>
                  <mesh position={[0, 0.85, -0.05]} rotation={[0, 0.38, 0]} material={mats.blade} castShadow>
                    <boxGeometry args={[0.22, 1.5, 0.05]} />
                  </mesh>
                  <mesh position={[0, 1.55, -0.05]} rotation={[0, 0.38, 0]} material={mats.accent}>
                    <boxGeometry args={[0.2, 0.14, 0.06]} />
                  </mesh>
                </group>
              ))}
            </group>
            <mesh ref={disc} position={[0, 0, -0.06]} material={mats.disc}>
              <circleGeometry args={[1.68, 32]} />
            </mesh>
          </group>
        </group>
      </group>
      <Contrails tips={[tipL, tipR]} />
    </>
  );
}
