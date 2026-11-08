import { ADVANCED, ASSISTED, SIM, type FlightTuning } from "@/config/flight";
import { stepFlight, stepTakeoff, damp, wrapPi, type FlightInput } from "./flight/flightModel";
import { runtime, resetFlightAt, parkAtSpawn } from "./runtime";
import { useGame, simRunning } from "./store";
import { readFlightInput, rumble } from "./input";
import { audio } from "./audio";
import { getWorld, courseById, destinationById, worldReady } from "@/world/world";
import { REGIONS, WORLD } from "@/world/layout";
import type { RingDef } from "@/world/defs";

const input: FlightInput = { pitch: 0, turn: 0, roll: 0, boost: false, brake: false };
export const RUNWAY_Y = 100.34;

export const tuning = (): FlightTuning => (useGame.getState().settings.flightAssist ? ASSISTED : ADVANCED);

const env = {
  collide: (x: number, y: number, z: number, r: number) => (worldReady() ? getWorld().collision.collide(x, y, z, r) : null),
  groundAt: (x: number, z: number, maxY?: number) => (worldReady() ? getWorld().collision.groundAt(x, z, maxY) : -Infinity),
};

// ── Phase control ────────────────────────────────────────────────────────────
export function beginTakeoff() {
  parkAtSpawn();
  runtime.phase = "takeoff";
  runtime.phaseTime = 0;
  runtime.flight.speed = 6;
  runtime.airborneTime = 0;
  useGame.getState().setTutorialStep(0);
}

/** Skip the runway roll and start airborne (Continue / experienced players). */
export function beginAirborne() {
  const cp = runtime.checkpoint;
  resetFlightAt(cp.x, cp.y, cp.z, cp.heading, ASSISTED.baseSpeed);
  runtime.phase = "flying";
  runtime.phaseTime = 0;
}

export function respawn(reason: "crash" | "reset" | "lost") {
  if (runtime.phase === "respawning") return;
  runtime.phase = "respawning";
  runtime.respawnT = 1.3;
  if (reason === "crash") {
    audio.play("crash");
    rumble(1, 380);
    runtime.shake = 1.4;
  } else audio.play("whoosh");
  const st = useGame.getState();
  if (st.course && courseById(st.course.id)?.timed) {
    st.setCourse(null);
    st.toast({ kind: "info", title: "Course reset", body: "Fly through the start ring to try again." });
  }
}

function setCheckpointHere() {
  const f = runtime.flight;
  runtime.checkpoint = { x: f.x, y: f.y + 8, z: f.z, heading: f.heading };
}

// ── Fixed-step simulation ────────────────────────────────────────────────────
function simStep(h: number) {
  const f = runtime.flight;
  const t = tuning();
  runtime.phaseTime += h;
  switch (runtime.phase) {
    case "parked":
      break;
    case "takeoff": {
      const done = stepTakeoff(f, h, RUNWAY_Y, t);
      if (done) {
        runtime.phase = "flying";
        runtime.phaseTime = 0;
        runtime.checkpoint = { x: f.x, y: f.y + 20, z: f.z - 40, heading: f.heading };
        useGame.getState().unlock("first-flight");
        if (!useGame.getState().progress.tutorialDone) {
          startCourse("tutorial");
          useGame.getState().setTutorialStep(1);
        }
      }
      break;
    }
    case "flying": {
      const ev = stepFlight(f, input, t, h, env, { rollAutoLevel: useGame.getState().settings.flightAssist ? 1 : 0, worldRadius: WORLD.radius });
      if (ev.barrelRoll) useGame.getState().unlock("barrel-roll");
      if (ev.crashed) respawn(f.y < t.floor ? "lost" : "crash");
      else if (ev.impact > 4 && runtime.simTime - runtime.lastImpactAt > 0.25) {
        runtime.lastImpactAt = runtime.simTime;
        const s = Math.min(1, ev.impact / t.crashImpactSpeed);
        runtime.shake = Math.max(runtime.shake, 0.3 + s * 0.8);
        audio.play("bump", { strength: s });
        rumble(s, 140);
      }
      break;
    }
    case "respawning": {
      const before = runtime.respawnT;
      runtime.respawnT -= h;
      if (before > 0.65 && runtime.respawnT <= 0.65) {
        const cp = runtime.checkpoint;
        resetFlightAt(cp.x, cp.y, cp.z, cp.heading, t.baseSpeed);
      }
      if (runtime.respawnT <= 0) {
        runtime.phase = "flying";
        runtime.respawnT = 0;
      }
      break;
    }
  }
  runtime.simTime += h;
}

const lerpAngle = (a: number, b: number, t: number) => a + wrapPi(b - a) * t;

/** Called once per rendered frame by the R3F loop. */
export function tick(rawDt: number) {
  const dt = Math.min(rawDt, SIM.maxFrameDelta);
  const st = useGame.getState();
  const running = simRunning(st);
  const f = runtime.flight;

  readFlightInput(dt, st.settings, input);
  runtime.ctl.pitch = damp(runtime.ctl.pitch, running ? input.pitch : 0, 8, dt);
  runtime.ctl.turn = damp(runtime.ctl.turn, running ? input.turn : 0, 8, dt);
  runtime.ctl.roll = damp(runtime.ctl.roll, running ? input.roll : 0, 8, dt);

  if (running) {
    const h = 1 / SIM.hz;
    runtime.accumulator += dt;
    let steps = 0;
    while (runtime.accumulator >= h && steps < SIM.maxSubSteps) {
      Object.assign(runtime.prev, { x: f.x, y: f.y, z: f.z, heading: f.heading, pitch: f.pitch, roll: f.roll });
      simStep(h);
      runtime.accumulator -= h;
      steps++;
    }
    if (steps >= SIM.maxSubSteps) runtime.accumulator = 0;
    const a = runtime.accumulator / h;
    const cur = runtime.flight;
    const p = runtime.prev;
    const teleported = Math.hypot(cur.x - p.x, cur.z - p.z) > 50;
    const k = teleported ? 1 : a;
    runtime.pose.x = p.x + (cur.x - p.x) * k;
    runtime.pose.y = p.y + (cur.y - p.y) * k;
    runtime.pose.z = p.z + (cur.z - p.z) * k;
    runtime.pose.heading = lerpAngle(p.heading, cur.heading, k);
    runtime.pose.pitch = p.pitch + (cur.pitch - p.pitch) * k;
    runtime.pose.roll = lerpAngle(p.roll, cur.roll, k);
    frameGameplay(dt);
  } else {
    Object.assign(runtime.pose, { x: f.x, y: f.y, z: f.z, heading: f.heading, pitch: f.pitch, roll: f.roll });
  }
  runtime.shake = damp(runtime.shake, 0, 3.5, dt);

  const t = tuning();
  const speedT = Math.min(1, Math.max(0, (f.speed - t.minSpeed) / (t.maxSpeed - t.minSpeed)));
  const rpm = runtime.phase === "parked" ? 0.1 : Math.min(1, 0.35 + speedT * 0.55 + (f.boosting ? 0.1 : 0));
  audio.updateFlight(st.mode === "flying" || st.mode === "title", rpm, speedT, f.boosting && running, !running && st.mode === "flying");
}

// ── Per-frame gameplay checks ────────────────────────────────────────────────
const last = { x: 0, y: 0, z: 0, valid: false };
let checkpointTimer = 0;
let flightTimer = 0;
let tutorialInputTime = 0;

function crossed(r: RingDef, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const [cx, cy, cz] = r.pos;
  const [nx, ny, nz] = r.dir;
  const da = (ax - cx) * nx + (ay - cy) * ny + (az - cz) * nz;
  const db = (bx - cx) * nx + (by - cy) * ny + (bz - cz) * nz;
  if (da === db || da * db > 0) return false;
  const tt = da / (da - db);
  const px = ax + (bx - ax) * tt;
  const py = ay + (by - ay) * tt;
  const pz = az + (bz - az) * tt;
  return Math.hypot(px - cx, py - cy, pz - cz) < r.radius + 1.5;
}

export function startCourse(id: string) {
  const c = courseById(id);
  if (!c) return;
  useGame.getState().setCourse({ id, next: c.timed ? 1 : 0, startedAt: runtime.simTime, lastRingAt: runtime.simTime });
  runtime.courseTime = 0;
  if (c.timed) {
    audio.play("ring", { index: 0 });
    runtime.ringFlashAt = runtime.simTime;
    useGame.getState().toast({ kind: "course", title: c.name, body: "Go! Fly through every ring." });
  }
}

function frameGameplay(dt: number) {
  if (!worldReady()) return;
  const st = useGame.getState();
  const f = runtime.flight;
  const w = getWorld();
  if (!last.valid || runtime.phase !== "flying") {
    Object.assign(last, { x: f.x, y: f.y, z: f.z, valid: true });
    return;
  }
  const ax = last.x;
  const ay = last.y;
  const az = last.z;
  const bx = f.x;
  const by = f.y;
  const bz = f.z;
  Object.assign(last, { x: bx, y: by, z: bz });
  runtime.airborneTime += dt;

  // ── Courses ──
  const run = st.course;
  if (run) {
    const c = courseById(run.id)!;
    runtime.courseTime = runtime.simTime - run.startedAt;
    const ring = c.rings[run.next];
    if (ring && crossed(ring, ax, ay, az, bx, by, bz)) {
      audio.play("ring", { index: run.next });
      rumble(0.25, 60);
      runtime.ringFlashAt = runtime.simTime;
      if (run.next === 0 || (!c.timed && run.next === 0)) st.unlock("first-ring");
      st.unlock("first-ring");
      const next = run.next + 1;
      setCheckpointHere();
      if (next >= c.rings.length) {
        st.setCourse(null);
        audio.play("finish");
        if (c.timed) {
          const r = st.recordCourse(c.id, c.name, runtime.courseTime, c.medals);
          st.toast({ kind: "course", title: `${c.name} complete`, body: `${r.time.toFixed(2)}s · ${r.medal.toUpperCase()}${r.newBest ? " · New best!" : ""}` });
        } else {
          st.setTutorialDone();
          st.setTutorialStep(5);
          const about = destinationById("about");
          if (about) st.setDiscoveryCard("about");
        }
      } else {
        st.setCourse({ ...run, next, lastRingAt: runtime.simTime });
        if (!c.timed) {
          if (next === 2 && st.tutorialStep < 3) st.setTutorialStep(3);
          if (next === 4 && st.tutorialStep < 4) st.setTutorialStep(4);
        }
      }
    } else if (c.timed && runtime.simTime - run.lastRingAt > 28) {
      st.setCourse(null);
      st.toast({ kind: "info", title: `${c.name} abandoned`, body: "Fly through the start ring to try again." });
    }
  } else {
    for (const c of w.courses) {
      if (c.timed && crossed(c.rings[0], ax, ay, az, bx, by, bz)) {
        startCourse(c.id);
        break;
      }
    }
  }

  // ── Tutorial hints ──
  if (st.tutorialStep === 1) {
    if (Math.abs(input.pitch) > 0.3 || Math.abs(input.turn) > 0.3) tutorialInputTime += dt;
    if (tutorialInputTime > 1.6) st.setTutorialStep(2);
  }
  if (st.tutorialStep === 3 && f.boosting) st.setTutorialStep(4);

  // ── Destination arrival rings ──
  for (const d of w.destinations) {
    if (d.ring && crossed(d.ring, ax, ay, az, bx, by, bz)) {
      audio.play("open");
      st.setDiscoveryCard(d.id);
      runtime.ringFlashAt = runtime.simTime;
    }
  }

  // ── Collectibles ──
  for (const c of w.collectibles) {
    if (st.progress.collectibles.includes(c.id)) continue;
    const d = Math.hypot(c.pos[0] - bx, c.pos[1] - by, c.pos[2] - bz);
    if (d < 7.5) {
      if (st.collect(c.id)) {
        audio.play("collect");
        rumble(0.3, 80);
      }
    }
  }

  // ── Region discovery ──
  for (const r of REGIONS) {
    if (st.progress.discoveredRegions.includes(r.id)) continue;
    const d = Math.hypot(r.center[0] - bx, r.center[2] - bz);
    if (d < r.radius && (r.id !== "launch" || runtime.airborneTime > 4)) {
      if (st.discoverRegion(r.id, r.name, r.accent)) {
        audio.play("discover");
        if (r.id !== "launch" && !st.settings.reducedMotion) {
          runtime.glance = { x: r.center[0], y: r.center[1] + 10, z: r.center[2], t: 0, dur: 2.6 };
        }
      }
    }
  }

  // ── Nearby destination (interaction prompt) ──
  let best: string | null = null;
  let bestD = Infinity;
  for (const d of w.destinations) {
    const dist = Math.hypot(d.pos[0] - bx, d.pos[1] - by, d.pos[2] - bz);
    if (dist < d.interactRadius && dist < bestD) {
      best = d.id;
      bestD = dist;
    }
  }
  st.setNearby(best);

  // ── Speed achievement / checkpoints / play time ──
  if (f.speed > tuning().maxSpeed * 0.95) st.unlock("speed");
  checkpointTimer += dt;
  if (checkpointTimer > 2 && f.clearance > 35 && Math.abs(f.pitch) < 0.45 && Math.abs(f.roll) < 0.6) {
    checkpointTimer = 0;
    setCheckpointHere();
  }
  flightTimer += dt;
  if (flightTimer > 10) {
    st.addFlightTime(flightTimer);
    flightTimer = 0;
  }
  if (runtime.glance) {
    runtime.glance.t += dt;
    if (runtime.glance.t > runtime.glance.dur) runtime.glance = null;
  }
}

/** Fast-travel to just outside a destination, facing it. */
export function travelTo(destId: string) {
  const d = destinationById(destId);
  if (!d) return;
  const [x, y, z] = d.pos;
  const ang = Math.atan2(x, z);
  const dist = 120;
  const px = x - Math.sin(ang) * dist;
  const pz = z - Math.cos(ang) * dist;
  const heading = Math.atan2(-(x - px), -(z - pz));
  runtime.checkpoint = { x: px, y: y + 30, z: pz, heading };
  respawn("reset");
}

export function resetToCheckpoint() {
  if (runtime.phase === "flying") respawn("reset");
}
