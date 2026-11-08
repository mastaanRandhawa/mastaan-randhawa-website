import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { runtime, photoOrbit } from "@/game/runtime";
import { useGame } from "@/game/store";
import { CAMERA } from "@/config/flight";
import { tuning } from "@/game/gameplay";
import { getWorld, worldReady } from "@/world/world";
import { damp } from "@/game/flight/flightModel";

const UP = new Vector3(0, 1, 0);


export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const st = useMemo(
    () => ({
      offset: new Vector3(0, 6, 22),
      look: new Vector3(),
      pos: new Vector3(),
      fov: CAMERA.fovBase,
      roll: 0,
      orbit: 0.8,
      lastMode: "",
      blendT: 1,
      blendDur: 1,
      q: new Quaternion(),
      e: new Euler(),
      tmp: new Vector3(),
      desired: new Vector3(),
      lookDesired: new Vector3(),
    }),
    [],
  );

  // Photo-mode controls.
  useEffect(() => {
    const el = gl.domElement;
    let drag = false;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if (!useGame.getState().photoMode) return;
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      photoOrbit.yaw -= (e.clientX - lx) * 0.006;
      photoOrbit.pitch = Math.max(-0.4, Math.min(1.2, photoOrbit.pitch + (e.clientY - ly) * 0.005));
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = () => (drag = false);
    const wheel = (e: WheelEvent) => {
      if (!useGame.getState().photoMode) return;
      photoOrbit.dist = Math.max(7, Math.min(140, photoOrbit.dist * (1 + Math.sign(e.deltaY) * 0.08)));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = useGame.getState();
    const p = runtime.pose;
    const f = runtime.flight;
    const reduced = g.settings.reducedMotion;
    const t = tuning();
    const speedT = Math.max(0, Math.min(1, (f.speed - t.baseSpeed) / (t.maxSpeed - t.baseSpeed)));
    const slowT = Math.max(0, Math.min(1, (t.baseSpeed - f.speed) / (t.baseSpeed - t.minSpeed)));
    const ch = CAMERA.chase;

    const fwd = st.tmp.set(-Math.sin(p.heading), 0, -Math.cos(p.heading));
    const right = new Vector3(Math.cos(p.heading), 0, -Math.sin(p.heading));
    let mode: string = g.cameraMode;
    if (g.mode === "title" || g.mode === "loading") mode = "title";
    else if (g.photoMode) mode = "photo";
    else if (g.panel) mode = "showcase";

    if (mode !== st.lastMode) {
      st.blendDur = mode === "cockpit" || st.lastMode === "cockpit" ? 0.2 : st.lastMode === "title" ? 2.4 : 0.9;
      st.blendT = 0;
      st.lastMode = mode;
    }
    st.blendT = Math.min(st.blendDur, st.blendT + dt);
    const blend = st.blendT / st.blendDur;
    const blendEase = blend * blend * (3 - 2 * blend);

    let fovTarget = CAMERA.fovBase;
    let posK = ch.posDamping;
    let lookK = ch.lookDamping;
    let rollTarget = 0;
    const desiredOffset = st.desired;
    const lookOffset = st.lookDesired;

    switch (mode) {
      case "title":
      case "showcase": {
        st.orbit += dt * (mode === "title" ? 0.045 : 0.08) * (reduced ? 0.4 : 1);
        const r = mode === "title" ? 21 : 24;
        const a = st.orbit;
        desiredOffset.set(Math.sin(a) * r, mode === "title" ? 5.5 : 7, Math.cos(a) * r);
        // Frame the plane right-of-centre on the title screen to leave room for UI.
        const side = new Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(mode === "title" ? -5.5 : -3);
        lookOffset.set(side.x, 1.6, side.z);
        posK = 2;
        lookK = 3;
        fovTarget = mode === "title" ? 50 : 55;
        break;
      }
      case "photo": {
        const { yaw, pitch, dist } = photoOrbit;
        desiredOffset.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 1.5, Math.cos(yaw) * Math.cos(pitch) * dist);
        lookOffset.set(0, 1, 0);
        posK = 8;
        lookK = 12;
        fovTarget = 50;
        break;
      }
      case "cinematic": {
        const c = CAMERA.cinematic;
        desiredOffset
          .copy(fwd)
          .multiplyScalar(-c.distance)
          .addScaledVector(UP, c.height)
          .addScaledVector(right, c.lateral * (Math.sin(state.clock.elapsedTime * 0.07) > 0 ? 1 : -1));
        lookOffset.copy(fwd).multiplyScalar(14);
        posK = c.posDamping;
        lookK = c.lookDamping;
        fovTarget = 52 + speedT * 6;
        break;
      }
      case "cockpit":
        break;
      default: {
        // Chase (also takeoff intro): offset is damped in the plane's frame.
        const pf = p.pitch * ch.pitchFollow;
        const back = ch.distance + speedT * ch.boostPullback - slowT * 2.5;
        desiredOffset
          .set(Math.sin(p.heading) * Math.cos(pf) * back, -Math.sin(pf) * back + ch.height, Math.cos(p.heading) * Math.cos(pf) * back)
          .addScaledVector(right, -Math.sin(p.roll) * ch.lateralShift);
        lookOffset.set(-Math.sin(p.heading) * Math.cos(p.pitch) * ch.lookAhead, Math.sin(p.pitch) * ch.lookAhead + 1.4, -Math.cos(p.heading) * Math.cos(p.pitch) * ch.lookAhead);
        rollTarget = -p.roll * ch.rollFollow * (reduced ? 0.4 : 1);
        fovTarget = CAMERA.fovBase + speedT * (reduced ? 4 : CAMERA.fovBoost) + (f.boosting && !reduced ? 3 : 0);
      }
    }

    // Glance toward a newly discovered landmark (keeps player in control).
    let glanceW = 0;
    if (runtime.glance && mode === "chase") {
      const gl2 = runtime.glance;
      glanceW = Math.sin(Math.min(1, gl2.t / gl2.dur) * Math.PI) * 0.4;
      fovTarget += glanceW * 10;
    }

    if (mode === "cockpit") {
      const [ox, oy, oz] = CAMERA.cockpit.offset;
      st.e.set(p.pitch, p.heading, -p.roll * (reduced ? 0.5 : 1), "YXZ");
      st.q.setFromEuler(st.e);
      const off = new Vector3(ox, oy, oz).applyQuaternion(st.q);
      camera.position.set(p.x + off.x, p.y + off.y, p.z + off.z);
      camera.quaternion.slerp(st.q, blend < 1 ? 0.35 + blendEase * 0.65 : 1);
      st.offset.copy(off);
      fovTarget = 68 + speedT * 8;
    } else {
      // Blend from a gentle follow rate up to the mode's rate over blendDur.
      const kp = 1 - Math.exp(-(1.2 + (posK - 1.2) * blendEase) * dt);
      st.offset.lerp(desiredOffset, kp);
      st.pos.set(p.x + st.offset.x, p.y + st.offset.y, p.z + st.offset.z);
      // Keep the camera out of the terrain.
      if (worldReady() && mode !== "title") {
        const ground = getWorld().collision.groundAt(st.pos.x, st.pos.z, st.pos.y + 30);
        if (ground !== -Infinity && st.pos.y < ground + 3) st.pos.y = ground + 3;
      }
      const lookTarget = st.desired.set(p.x + lookOffset.x, p.y + lookOffset.y, p.z + lookOffset.z);
      if (glanceW > 0 && runtime.glance) {
        lookTarget.lerp(new Vector3(runtime.glance.x, runtime.glance.y, runtime.glance.z), glanceW);
      }
      if (st.look.lengthSq() === 0) st.look.copy(lookTarget);
      st.look.lerp(lookTarget, 1 - Math.exp(-(1.5 + (lookK - 1.5) * blendEase) * dt));
      // Shake
      const sh = g.settings.cameraShake && !reduced ? runtime.shake : 0;
      const tt = state.clock.elapsedTime;
      const speedRumble = g.settings.cameraShake && !reduced && f.boosting ? 0.04 : 0;
      camera.position.set(
        st.pos.x + (Math.sin(tt * 47) * 0.35 + Math.sin(tt * 23) * 0.2) * (sh + speedRumble),
        st.pos.y + Math.sin(tt * 39) * 0.3 * (sh + speedRumble),
        st.pos.z + Math.cos(tt * 41) * 0.3 * (sh + speedRumble),
      );
      camera.up.copy(UP);
      camera.lookAt(st.look);
      st.roll = damp(st.roll, rollTarget, 4, dt);
      camera.rotateZ(st.roll);
    }
    st.fov = damp(st.fov, fovTarget, 3, dt);
    if (Math.abs(camera.fov - st.fov) > 0.01) {
      camera.fov = st.fov;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
