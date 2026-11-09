import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { fuselageGeometry, finGeometry, paintAircraft, stabilizerGeometry, wingGeometry } from "./airplaneGeometry";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { SKINS } from "@/game/progression";
import { FLIGHT } from "@/config/flight";
import { Contrails } from "./Contrails";

function propDiscTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(52,58,69,0.0)");
  grad.addColorStop(0.25, "rgba(52,58,69,0.3)");
  grad.addColorStop(0.78, "rgba(52,58,69,0.18)");
  grad.addColorStop(0.88, "rgba(233,121,89,0.35)");
  grad.addColorStop(1, "rgba(233,121,89,0)");
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

/**
 * The player's aircraft: a chubby, hand-painted toy plane (see
 * airplaneGeometry). Position and attitude come straight from the flight
 * model; on top of that the body floats with a soft bob, the control surfaces
 * follow the inputs and the propeller winds up with engine speed.
 */
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
  const canopyGroup = useRef<Group>(null);
  const spinRate = useRef(0);
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
      // Soft, matte, hand-painted surfaces: no metal, no gloss.
      paint: new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: DoubleSide }),
      accent: new MeshStandardMaterial({ color: skin.accent, roughness: 0.6, metalness: 0 }),
      spinner: new MeshStandardMaterial({ color: skin.body, roughness: 0.5, metalness: 0 }),
      body: new MeshStandardMaterial({ color: skin.body, roughness: 0.6, metalness: 0 }),
      glass: new MeshStandardMaterial({ color: skin.canopy, roughness: 0.32, metalness: 0, emissive: new Color(skin.canopy).multiplyScalar(0.12) }),
      glint: new MeshBasicMaterial({ color: new Color("#f6fbff"), transparent: true, opacity: 0.55, depthWrite: false }),
      dark: new MeshStandardMaterial({ color: "#2f3540", roughness: 0.8 }),
      strut: new MeshStandardMaterial({ color: "#3a404b", roughness: 0.7 }),
      hub: new MeshStandardMaterial({ color: "#efe6d4", roughness: 0.6 }),
      blade: new MeshStandardMaterial({ color: "#343a45", roughness: 0.7, flatShading: true }),
      red: new MeshBasicMaterial({ color: new Color(1.5, 0.35, 0.3), toneMapped: false }),
      green: new MeshBasicMaterial({ color: new Color(0.35, 1.4, 0.6), toneMapped: false }),
      white: new MeshBasicMaterial({ color: new Color(1.3, 1.28, 1.2), toneMapped: false }),
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
    mats.spinner.color.set(skin.body);
    mats.body.color.set(skin.body);
    mats.glass.color.set(skin.canopy);
    mats.glass.emissive.set(skin.canopy).multiplyScalar(0.12);
    mats.decal.map?.dispose();
    mats.decal.map = tailDecal("MR", skin.body);
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

    const vs = runtime.visit?.stage;
    const parked = runtime.phase === "parked" || vs === "landed" || vs === "turn";
    const rpmT = parked ? 0.18 : Math.min(1, 0.45 + (f.speed / FLIGHT.maxSpeed) * 0.55 + (f.boosting ? 0.15 : 0));
    // Gentle toy-like float: a slow bob with a little rock and nod while flying.
    if (body.current) {
      const calm = parked || reduced ? 0 : 1;
      body.current.position.set(0, Math.sin(t * 1.3) * 0.05 * calm, 0);
      body.current.rotation.set(Math.sin(t * 1.1 + 0.6) * 0.012 * calm, 0, Math.sin(t * 0.9) * 0.02 * calm);
    }
    // Propeller: the engine winds down while parked and spins up for takeoff.
    const spinTarget = parked ? 0 : 34 + rpmT * 46;
    spinRate.current += (spinTarget - spinRate.current) * (1 - Math.exp(-(parked ? 1.2 : 2.5) * dt));
    const spin = spinRate.current;
    if (prop.current) prop.current.rotation.z -= spin * dt;
    const blur = Math.min(1, Math.max(0, (spin - 14) / 22));
    if (blades.current) blades.current.visible = blur < 0.95;
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
          {/* Tail initials */}
          <mesh position={[0.16, 1.05, 2.95]} rotation={[0, Math.PI / 2, 0]} material={mats.decal}>
            <planeGeometry args={[0.9, 0.45]} />
          </mesh>
          <mesh position={[-0.16, 1.05, 2.95]} rotation={[0, -Math.PI / 2, 0]} material={mats.decal}>
            <planeGeometry args={[0.9, 0.45]} />
          </mesh>

          {/* Control surfaces (hinged at trailing edges) */}
          <group ref={aileronR} position={[3.15, -0.05, 0.86]}>
            <mesh position={[0, 0, 0.14]} material={mats.accent} castShadow>
              <boxGeometry args={[1.4, 0.1, 0.28]} />
            </mesh>
          </group>
          <group ref={aileronL} position={[-3.15, -0.05, 0.86]}>
            <mesh position={[0, 0, 0.14]} material={mats.accent} castShadow>
              <boxGeometry args={[1.4, 0.1, 0.28]} />
            </mesh>
          </group>
          <group ref={elevator} position={[0, 0.38, 3.48]}>
            <mesh position={[0, 0, 0.13]} material={mats.accent}>
              <boxGeometry args={[2.9, 0.09, 0.26]} />
            </mesh>
          </group>
          <group ref={rudder} position={[0, 1.15, 3.55]}>
            <mesh position={[0, 0, 0.13]} material={mats.accent}>
              <boxGeometry args={[0.12, 1.3, 0.26]} />
            </mesh>
          </group>

          {/* Cowling face and exhaust stubs */}
          <mesh position={[0, 0, -2.88]} material={mats.dark}>
            <torusGeometry args={[0.5, 0.08, 8, 24]} />
          </mesh>
          <mesh position={[0, 0, -2.87]} rotation={[0, Math.PI, 0]} material={mats.dark}>
            <circleGeometry args={[0.48, 24]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.66, -0.36, -1.7]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={mats.dark}>
              <cylinderGeometry args={[0.09, 0.11, 0.36, 8]} />
            </mesh>
          ))}

          {/* Bubble canopy: soft grey-blue, with a painted glint */}
          <group ref={canopyGroup}>
            <mesh position={[0, 0.6, -0.45]} scale={[0.66, 0.6, 1.2]} material={mats.glass}>
              <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, 0.62, -0.45]} scale={[0.68, 0.62, 1.22]} material={mats.body}>
              <torusGeometry args={[1, 0.035, 6, 28, Math.PI]} />
            </mesh>
            <mesh position={[-0.24, 0.98, -0.78]} rotation={[-0.6, -0.35, 0.2]} material={mats.glint}>
              <planeGeometry args={[0.15, 0.48]} />
            </mesh>
          </group>

          {/* Gear: chunky tyres under coral wheel spats */}
          {(
            [
              [gearL, -1.3],
              [gearR, 1.3],
            ] as const
          ).map(([ref, x]) => (
            <group key={x} ref={ref} position={[x, -0.5, -0.7]}>
              <mesh position={[0, -0.32, 0]} rotation={[0, 0, x > 0 ? -0.2 : 0.2]} material={mats.strut}>
                <boxGeometry args={[0.14, 0.7, 0.18]} />
              </mesh>
              <mesh position={[0, -0.72, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
                <cylinderGeometry args={[0.38, 0.38, 0.28, 16]} />
              </mesh>
              <mesh position={[x > 0 ? 0.15 : -0.15, -0.72, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hub}>
                <cylinderGeometry args={[0.15, 0.15, 0.04, 12]} />
              </mesh>
              <mesh position={[0, -0.6, 0.02]} scale={[0.24, 0.42, 0.62]} material={mats.accent}>
                <sphereGeometry args={[1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              </mesh>
            </group>
          ))}
          <group ref={gearT} position={[0, 0.0, 3.2]}>
            <mesh position={[0, -0.18, 0]} material={mats.strut}>
              <boxGeometry args={[0.08, 0.36, 0.1]} />
            </mesh>
            <mesh position={[0, -0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dark}>
              <cylinderGeometry args={[0.15, 0.15, 0.1, 10]} />
            </mesh>
          </group>

          {/* Position lights (steady) */}
          <mesh position={[-4.66, 0.0, -0.45]} material={mats.red}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <mesh position={[4.66, 0.0, -0.45]} material={mats.green}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
          <mesh position={[0, 2.38, 3.25]} material={mats.white}>
            <sphereGeometry args={[0.07, 8, 6]} />
          </mesh>
          <primitive object={tipL} position={[-4.66, 0.0, -0.2]} />
          <primitive object={tipR} position={[4.66, 0.0, -0.2]} />

          {/* Propeller: rounded spinner and two paddle blades with coral tips */}
          <group ref={prop} position={[0, 0, -2.95]}>
            <mesh position={[0, 0, -0.2]} scale={[1, 1, 1.45]} material={mats.spinner} castShadow>
              <sphereGeometry args={[0.34, 20, 14]} />
            </mesh>
            <group ref={blades}>
              {[0, Math.PI].map((r) => (
                <group key={r} rotation={[0, 0, r]}>
                  <mesh position={[0, 0.78, -0.08]} rotation={[0, 0.35, 0]} material={mats.blade} castShadow>
                    <boxGeometry args={[0.3, 1.25, 0.07]} />
                  </mesh>
                  <mesh position={[0, 1.46, -0.08]} rotation={[0, 0.35, 0]} material={mats.accent}>
                    <boxGeometry args={[0.31, 0.2, 0.08]} />
                  </mesh>
                </group>
              ))}
            </group>
            <mesh ref={disc} position={[0, 0, -0.1]} material={mats.disc}>
              <circleGeometry args={[1.58, 32]} />
            </mesh>
          </group>
        </group>
      </group>
      <Contrails tips={[tipL, tipR]} />
    </>
  );
}
