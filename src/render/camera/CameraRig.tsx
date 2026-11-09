import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { runtime, photoOrbit, look } from "@/game/runtime";
import { useGame } from "@/game/store";
import { CAMERA } from "@/config/flight";
import { tuning } from "@/game/gameplay";
import { destinationById, getWorld, worldReady } from "@/world/world";
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
      viewShift: 0,
      blendT: 1,
      blendDur: 1,
      q: new Quaternion(),
      e: new Euler(),
      tmp: new Vector3(),
      desired: new Vector3(),
      lookDesired: new Vector3(),
      lookPlane: new Vector3(),
      lookQ: new Quaternion(),
      lookE: new Euler(),
    }),
    [],
  );

  // Pointer controls: photo-mode orbit, and free-look while flying.
  useEffect(() => {
    const el = gl.domElement;
    let mode: "photo" | "look" | null = null;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      const g = useGame.getState();
      if (g.photoMode) mode = "photo";
      else if (g.mode === "flying" && e.pointerType === "mouse") {
        // In Mouse steering the left button steers, so look with the right button.
        const allowed = g.settings.controlMode === "mouse" ? e.button === 2 : e.button === 0 || e.button === 2;
        if (!allowed) return;
        mode = "look";
        look.dragging = true;
      } else return;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!mode) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (mode === "photo") {
        photoOrbit.yaw -= dx * 0.006;
        photoOrbit.pitch = Math.max(-0.4, Math.min(1.2, photoOrbit.pitch + dy * 0.005));
      } else {
        look.yaw -= dx * 0.006;
        look.pitch = Math.max(-0.6, Math.min(1.0, look.pitch + dy * 0.004));
        look.lastInput = performance.now() / 1000;
      }
    };
    const up = () => {
      if (mode === "look") {
        look.dragging = false;
        look.lastInput = performance.now() / 1000;
      }
      mode = null;
    };
    const wheel = (e: WheelEvent) => {
      const g = useGame.getState();
      const k = 1 + Math.sign(e.deltaY) * 0.08;
      if (g.photoMode) photoOrbit.dist = Math.max(7, Math.min(140, photoOrbit.dist * k));
      else if (g.mode === "flying") look.zoom = Math.max(0.55, Math.min(2.4, look.zoom * k));
    };
    const context = (e: MouseEvent) => {
      if (useGame.getState().mode === "flying") e.preventDefault();
    };
    const reset = () => {
      look.yaw = 0;
      look.pitch = 0;
      look.zoom = 1;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("contextmenu", context);
    el.addEventListener("dblclick", reset);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", context);
      el.removeEventListener("dblclick", reset);
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
    const vstage = runtime.visit?.stage;
    if (g.mode === "title" || g.mode === "loading") mode = "title";
    else if (g.photoMode) mode = "photo";
    else if (vstage === "landed") mode = "parked";
    else if (g.panel) mode = "showcase";
    else if (vstage === "final" || vstage === "rollout" || vstage === "turn") mode = "landing";
    else if (vstage === "takeoff") mode = "departure";

    if (mode !== st.lastMode) {
      st.blendDur = mode === "cockpit" || st.lastMode === "cockpit" ? 0.2 : st.lastMode === "title" ? 2.4 : mode === "landing" || mode === "parked" || st.lastMode === "departure" ? 1.8 : 0.9;
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
      case "landing":
      case "departure": {
        // Side-quarter tracking shot: shows the island sliding past the wheels.
        const v = runtime.visit!;
        const [dx, dz] = mode === "departure" ? [-v.plan.dir[0], -v.plan.dir[1]] : v.plan.dir;
        const side = mode === "departure" ? -1 : 1;
        desiredOffset.set(-dx * 17 - dz * 9 * side, 5.5, -dz * 17 + dx * 9 * side);
        lookOffset.set(dx * 9, 1.2, dz * 9);
        posK = 3;
        lookK = 5;
        fovTarget = 55;
        break;
      }
      case "parked": {
        // Slow orbit that keeps both the plane and the island's landmark in frame.
        const v = runtime.visit!;
        const dest = destinationById(v.destId);
        st.orbit += dt * 0.06 * (reduced ? 0.4 : 1);
        const tx = dest ? (dest.pos[0] - p.x) * 0.3 : 0;
        const tz = dest ? (dest.pos[2] - p.z) * 0.3 : 0;
        const ty = dest ? Math.min(10, Math.max(2, (dest.pos[1] - p.y) * 0.25)) : 2;
        const r = 40 + Math.hypot(tx, tz) * 0.6;
        desiredOffset.set(tx + Math.sin(st.orbit) * r, ty + 24, tz + Math.cos(st.orbit) * r);
        lookOffset.set(tx, ty, tz);
        posK = 1.6;
        lookK = 2.2;
        fovTarget = 52;
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

    // Mouse free-look: orbit the follow offset, zoom it, and look at the plane.
    const nowS = performance.now() / 1000;
    if (!look.dragging && nowS - look.lastInput > 1.4) {
      look.yaw = damp(look.yaw, 0, 2.2, dt);
      look.pitch = damp(look.pitch, 0, 2.2, dt);
    }
    if (mode !== "title" && mode !== "photo" && mode !== "cockpit") {
      if (Math.abs(look.yaw) > 1e-4 || Math.abs(look.pitch) > 1e-4 || look.zoom !== 1) {
        const c = Math.cos(look.yaw);
        const sn = Math.sin(look.yaw);
        const ox = desiredOffset.x;
        const oz = desiredOffset.z;
        desiredOffset.x = ox * c + oz * sn;
        desiredOffset.z = -ox * sn + oz * c;
        const hl = Math.hypot(desiredOffset.x, desiredOffset.z) || 1;
        const len = desiredOffset.length();
        const el = Math.max(-0.35, Math.min(1.35, Math.atan2(desiredOffset.y, hl) + look.pitch));
        desiredOffset.set((desiredOffset.x / hl) * Math.cos(el) * len, Math.sin(el) * len, (desiredOffset.z / hl) * Math.cos(el) * len).multiplyScalar(look.zoom);
        const w = Math.min(1, (Math.abs(look.yaw) + Math.abs(look.pitch)) * 1.8);
        lookOffset.lerp(st.lookPlane.set(0, 1.2, 0), w);
      }
      if (look.dragging) {
        posK = Math.max(posK, 10);
        lookK = Math.max(lookK, 12);
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
      st.q.multiply(st.lookQ.setFromEuler(st.lookE.set(-look.pitch * 0.8, look.yaw, 0, "YXZ")));
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
    const W = state.size.width;
    const panelW = g.panel && W >= 640 ? Math.min(620, W * 0.46) : 0;
    st.viewShift = damp(st.viewShift, panelW / 2, 4, dt);
    if (st.viewShift > 0.5) camera.setViewOffset(W, state.size.height, st.viewShift, 0, W, state.size.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
    st.fov = damp(st.fov, fovTarget, 3, dt);
    if (Math.abs(camera.fov - st.fov) > 0.01) {
      camera.fov = st.fov;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
