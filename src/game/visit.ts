import { GEAR_HEIGHT, GLIDE, landingPlan, straightDepartureClear, type LandingPlan } from "@/world/landing";
import { destinationById, getWorld, worldReady } from "@/world/world";
import { runtime } from "./runtime";
import { useGame } from "./store";
import { audio } from "./audio";
import { rumble } from "./input";
import { damp, wrapPi } from "./flight/flightModel";
import { buildFlatPath, sampleArr, sampleHeading, type FlatPath } from "./flight/path";
import { currentMission } from "./progression";
import type { Destination } from "@/world/defs";

/**
 * Island-hopping autopilot. A visit flies the plane (kinematically, so it is
 * smooth and deterministic) from wherever it is to a destination's airstrip:
 * travel → final approach → flare & touchdown → rollout → parked, all within ~5 s.
 * The panel opens once parked; closing it takes off and either hands control
 * back pointed at the next destination, or continues straight on to it.
 */
export type VisitStage = "travel" | "final" | "rollout" | "turn" | "landed" | "takeoff" | "climb" | "handoff";

type V3 = [number, number, number];

/** The travel leg: a smooth flat path plus an altitude profile. */
interface Route extends FlatPath {
  y: Float32Array;
  s: number;
}

export interface Visit {
  destId: string;
  plan: LandingPlan;
  stage: VisitStage;
  t: number;
  speed: number;
  curve: Route | null;
  finalS: number;
  finalLen: number;
  rollS: number;
  rollLen: number;
  decel: number;
  autoNext: boolean;
  nextId: string | null;
  handoffHeading: number;
  bounce: number;
  opened: boolean;
  /** Departing back over the approach (after a taxi U-turn) because straight on is blocked. */
  back: boolean;
  taxi: FlatPath | null;
}

/** Departure taxi U-turn: holds TAXI_SPEED, then brakes over the last TAXI_BRAKE metres. */
const TAXI_SPEED = 5;
const TAXI_BRAKE = 3;

const depHeading = (v: Visit) => (v.back ? v.plan.laneHeading : v.plan.parkHeading);
const depClimbOut = (v: Visit) => (v.back ? v.plan.backClimbOut : v.plan.climbOut);

/**
 * A selected landing is parked within ~5 s: at most TRAVEL_TIME flying the
 * last CUT_LEN metres of the route (longer trips flash-cut ahead, like Skip),
 * a short final glide, then a hard brake to a stop.
 */
const TRAVEL_TIME = 1.8;
const CUT_LEN = 200;
/** Speed at the approach entry, and at touchdown. */
const ENTRY_SPEED = 50;
const TOUCH_SPEED = 36;
/** Bank is drawn as if turning at this speed, so fast legs don't pin the wings at the stop. */
const BANK_REF_SPEED = 60;
const GRAV = 9.81;
/** Tightest turn the autopilot flies, and how gradually it rolls into it. */
const TURN_RADIUS = 120;
const TURN_BLEND = 60;
/** Straight, wings-level run lined up with the runway before the glide starts. */
const LINEUP = 70;
/** Bank the autopilot is willing to hold; turn speed is limited to keep under it. */
const MAX_BANK = 1;
/** Fastest the autopilot rolls the wings (rad/s). */
const ROLL_RATE = 2.4;
const smooth01 = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
/** Smooth minimum (polynomial, blend width k). */
const smin = (a: number, b: number, k: number) => {
  const hh = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b + (a - b) * hh - k * hh * (1 - hh);
};

/**
 * Travel route from the plane's pose to the approach entry: a turn of at least
 * TURN_RADIUS that rolls in and out gradually, lines up LINEUP metres before
 * the entry, climbs over anything in the way and descends onto the glide slope.
 */
function buildRoute(p0: V3, heading: number, speed: number, p3: V3, dir: [number, number]): Route {
  const hEnd = Math.atan2(-dir[0], -dir[1]);
  // Fly straight long enough to bleed off speed before rolling into the first turn.
  const lead = TURN_BLEND / 2 + Math.max(0, Math.min(60, (speed - 45) * 2));
  const flat = buildFlatPath(p0[0], p0[2], heading, p3[0], p3[2], hEnd, { radius: TURN_RADIUS, blend: TURN_BLEND, lead, tail: LINEUP + TURN_BLEND / 2, step: 2 });
  const n = flat.x.length;
  const S = flat.length;
  const ds = flat.ds;
  const tg = Math.tan(GLIDE);
  // Terrain under the route (the glide into the strip is clear by design).
  const floor = new Float32Array(n).fill(-Infinity);
  let maxG = -Infinity;
  if (worldReady()) {
    const col = getWorld().collision;
    for (let i = 0; i < n; i++) {
      if (i * ds >= S - 260) break;
      const gnd = col.groundAt(flat.x[i], flat.z[i]);
      floor[i] = gnd + 40;
      maxG = Math.max(maxG, gnd);
    }
  }
  const cruise = Math.max(p0[1], p3[1], maxG + 45);
  // Ease toward cruise, then follow the glide line extended back from the entry.
  const climbLen = Math.min(S * 0.5, Math.max(80, Math.abs(cruise - p0[1]) / 0.16));
  const raw = (s: number) => smin(p0[1] + (cruise - p0[1]) * smooth01(0, climbLen, s), p3[1] + (S - s) * tg, 30);
  const c0 = p0[1] - raw(0);
  const c1 = p3[1] - raw(S);
  const fix0 = Math.min(S * 0.6, Math.max(120, Math.abs(c0) / 0.15));
  // Start climbing early enough to clear high ground ahead (backward envelope at a set climb gradient).
  const env = new Float32Array(n);
  env[n - 1] = floor[n - 1];
  for (let i = n - 2; i >= 0; i--) env[i] = Math.max(floor[i], env[i + 1] - ds * 0.28);
  let y64 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = i * ds;
    y64[i] = Math.max(env[i], raw(s) + c0 * (1 - smooth01(0, fix0, s)) + c1 * smooth01(S - 140, S, s));
  }
  // Round off the corners the envelope leaves, then pin both ends again.
  const half = Math.max(1, Math.round(20 / ds));
  for (let pass = 0; pass < 2; pass++) {
    const pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + y64[i];
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const lo = Math.max(0, i - half);
      const hi = Math.min(n - 1, i + half);
      out[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
    }
    y64 = out;
  }
  const d0 = p0[1] - y64[0];
  const d1 = p3[1] - y64[n - 1];
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = i * ds;
    y[i] = y64[i] + d0 * (1 - smooth01(0, 80, s)) + d1 * smooth01(S - 80, S, s);
  }
  return { ...flat, y, s: 0 };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setPose(x: number, y: number, z: number, heading: number, pitch: number, roll: number, speed: number, h: number) {
  const f = runtime.flight;
  f.vx = (x - f.x) / h;
  f.vy = (y - f.y) / h;
  f.vz = (z - f.z) / h;
  f.x = x;
  f.y = y;
  f.z = z;
  f.heading = wrapPi(heading);
  f.pitch = pitch;
  f.roll = wrapPi(roll);
  f.speed = speed;
  f.pitchRate = 0;
  f.rollRate = 0;
  f.yawRate = 0;
}

function forwardVec(heading: number, pitch: number): V3 {
  const cp = Math.cos(pitch);
  return [-Math.sin(heading) * cp, Math.sin(pitch), -Math.cos(heading) * cp];
}

const g = (v: Visit) => v.plan.groundY + GEAR_HEIGHT;

function syncStore(v: Visit | null) {
  const st = useGame.getState();
  const next = v ? { destId: v.destId, stage: v.stage, nextId: v.nextId } : null;
  const cur = st.visit;
  if (!cur || !next || cur.destId !== next.destId || cur.stage !== next.stage || cur.nextId !== next.nextId) st.setVisit(next);
}

function setStage(v: Visit, stage: VisitStage) {
  v.stage = stage;
  v.t = 0;
  syncStore(v);
}

/** Next destination: the current mission's next unvisited target, else the nearest unvisited one. */
export function pickNext(fromId: string): string | null {
  if (!worldReady()) return null;
  const st = useGame.getState();
  const w = getWorld();
  const viewedKey = (d: Destination) => (d.kind === "project" ? `project-${d.contentId}` : d.kind === "skills" ? `skills-${d.contentId}` : d.kind);
  const unvisited = w.destinations.filter((d) => d.id !== fromId && d.landing && !st.progress.viewed.includes(viewedKey(d)));
  const m = currentMission(st.progress);
  const fromMission = m?.targets.map((id) => unvisited.find((d) => d.id === id)).find(Boolean);
  if (fromMission) return fromMission.id;
  const here = destinationById(fromId);
  if (!here || !unvisited.length) return null;
  unvisited.sort((a, b) => Math.hypot(a.pos[0] - here.pos[0], a.pos[2] - here.pos[2]) - Math.hypot(b.pos[0] - here.pos[0], b.pos[2] - here.pos[2]));
  return unvisited[0].id;
}

/** Pose on the travel route at its current arc length. `snap` skips the pitch/roll smoothing (after a cut). */
function poseOnRoute(v: Visit, h: number, snap: boolean) {
  const f = runtime.flight;
  const c = v.curve!;
  const x = sampleArr(c, c.x, c.s);
  const z = sampleArr(c, c.z, c.s);
  const y = sampleArr(c, c.y, c.s);
  const hd = sampleHeading(c, c.s);
  const slope = (sampleArr(c, c.y, c.s + 2) - sampleArr(c, c.y, c.s - 2)) / 4;
  const pitchT = Math.atan(slope);
  // Coordinated-turn bank from the path's curvature (left turn = negative roll). The curvature already
  // ramps in and out, so the wings roll smoothly; the rate cap just stops any flick.
  const vb = Math.min(v.speed, BANK_REF_SPEED);
  const rollT = Math.max(-MAX_BANK, Math.min(MAX_BANK, -Math.atan((vb * vb * sampleArr(c, c.k, c.s)) / GRAV)));
  const pitch = snap ? pitchT : damp(f.pitch, pitchT, 4, h);
  const want = snap ? rollT : damp(f.roll, rollT, 6, h);
  const roll = snap ? rollT : f.roll + Math.max(-ROLL_RATE * h, Math.min(ROLL_RATE * h, want - f.roll));
  f.gear = damp(f.gear, 0, 2, h);
  setPose(x, y, z, hd, pitch, roll, v.speed, h);
}

function beginTravel(v: Visit) {
  const f = runtime.flight;
  const c = buildRoute([f.x, f.y, f.z], f.heading, Math.max(30, f.speed), v.plan.entry, v.plan.dir);
  v.curve = c;
  let rem = c.length;
  if (rem > CUT_LEN) {
    // Long trip: cut ahead (under a white flash) to the last stretch of the same smooth route.
    c.s = c.length - CUT_LEN;
    rem = CUT_LEN;
    runtime.flash = 1;
  }
  // Brake evenly from vStart to ENTRY_SPEED over what's left, arriving in TRAVEL_TIME.
  v.speed = Math.max(ENTRY_SPEED, (2 * rem) / TRAVEL_TIME - ENTRY_SPEED);
  v.decel = (v.speed * v.speed - ENTRY_SPEED * ENTRY_SPEED) / (2 * rem);
  setStage(v, "travel");
  if (c.s > 0) {
    poseOnRoute(v, 1 / 120, true);
    const [fx, fy, fz] = forwardVec(f.heading, f.pitch);
    f.vx = fx * v.speed;
    f.vy = fy * v.speed;
    f.vz = fz * v.speed;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
export function canVisit() {
  return runtime.phase === "flying" || (runtime.phase === "visit" && runtime.visit?.stage === "travel");
}

/** Fly to and land at a destination. Returns false if that isn't possible now. */
export function startVisit(destId: string): boolean {
  const d = destinationById(destId);
  if (!d?.landing || !canVisit()) return false;
  const st = useGame.getState();
  st.setDiscoveryCard(null);
  st.setWaypoint(destId);
  if (st.course) st.setCourse(null);
  const v: Visit = {
    destId,
    plan: landingPlan(d.landing),
    stage: "travel",
    t: 0,
    speed: runtime.flight.speed,
    curve: null,
    finalS: 0,
    finalLen: 1,
    rollS: 0,
    rollLen: 1,
    decel: 0,
    autoNext: false,
    nextId: null,
    handoffHeading: 0,
    bounce: 0,
    opened: false,
    back: false,
    taxi: null,
  };
  runtime.visit = v;
  runtime.phase = "visit";
  beginTravel(v);
  audio.play("whoosh");
  return true;
}

/** Take off from the parked strip. continueToNext flies straight on to the next destination. */
export function departVisit(continueToNext: boolean) {
  const v = runtime.visit;
  if (!v || v.stage !== "landed") return;
  v.nextId = pickNext(v.destId);
  v.autoNext = continueToNext && !!v.nextId;
  v.speed = 0;
  const P = v.plan;
  v.back = worldReady() && !straightDepartureClear(P, (x, y, z, r) => getWorld().collision.collide(x, y, z, r));
  if (v.back) {
    // Straight on runs into terrain: taxi round onto the parallel lane and leave back over the approach.
    const r = Math.abs(P.turnRadius);
    v.rollS = 0;
    v.taxi = buildFlatPath(P.park[0], P.park[2], P.parkHeading, P.lane[0], P.lane[2], P.laneHeading, { radius: r, blend: r * 2.4, step: 0.05 });
    setStage(v, "turn");
  } else setStage(v, "takeoff");
  if (v.nextId) useGame.getState().setWaypoint(v.nextId);
}

/** Player grabbed the controls mid-transit: hand over immediately. */
export function cancelVisit() {
  const v = runtime.visit;
  if (!v || v.stage !== "travel") return;
  finishVisit();
}

/** Skip ahead: long transits jump to the line-up; landings jump to parked. */
export function skipVisit() {
  const v = runtime.visit;
  if (!v) return;
  runtime.flash = 1;
  if (v.stage === "travel" && v.curve) {
    v.curve.s = Math.max(v.curve.s, v.curve.length - LINEUP);
    v.speed = Math.min(v.speed, 48);
  } else if (v.stage === "final" || v.stage === "rollout") {
    const p = v.plan.park;
    setPose(p[0], p[1], p[2], v.plan.parkHeading, 0.04, 0, 0, 1 / 120);
    runtime.flight.gear = 1;
    setStage(v, "landed");
  } else if (v.stage === "turn" || v.stage === "takeoff" || v.stage === "climb" || v.stage === "handoff") {
    const c = depClimbOut(v);
    v.taxi = null;
    setPose(c[0], c[1], c[2], depHeading(v), 0.05, 0, 48, 1 / 120);
    runtime.flight.gear = 0;
    afterClimb(v);
  }
}

function afterClimb(v: Visit) {
  if (v.autoNext && v.nextId) {
    const d = destinationById(v.nextId);
    if (d?.landing) {
      v.destId = v.nextId;
      v.plan = landingPlan(d.landing);
      v.opened = false;
      v.nextId = null;
      v.autoNext = false;
      beginTravel(v);
      return;
    }
  }
  const f = runtime.flight;
  const next = v.nextId ? destinationById(v.nextId) : null;
  v.handoffHeading = next ? Math.atan2(-(next.pos[0] - f.x), -(next.pos[2] - f.z)) : f.heading;
  setStage(v, "handoff");
}

function finishVisit() {
  const f = runtime.flight;
  const sp = Math.max(40, f.speed);
  const [fx, fy, fz] = forwardVec(f.heading, f.pitch);
  f.vx = fx * sp;
  f.vy = fy * sp;
  f.vz = fz * sp;
  f.speed = sp;
  f.onGround = false;
  runtime.visit = null;
  runtime.phase = "flying";
  runtime.phaseTime = 0;
  runtime.checkpoint = { x: f.x, y: f.y + 6, z: f.z, heading: f.heading };
  syncStore(null);
}

// ── Per-step update (called by the fixed-timestep sim) ──────────────────────
export function stepVisit(h: number) {
  const v = runtime.visit;
  if (!v) {
    runtime.phase = "flying";
    return;
  }
  const f = runtime.flight;
  const P = v.plan;
  v.t += h;
  switch (v.stage) {
    case "travel": {
      const c = v.curve!;
      v.speed = Math.max(ENTRY_SPEED, v.speed - v.decel * h);
      c.s = Math.min(c.length, c.s + v.speed * h);
      poseOnRoute(v, h, false);
      if (c.s >= c.length - 0.01) {
        v.finalS = 0;
        v.finalLen = Math.hypot(P.touchdown[0] - P.entry[0], P.touchdown[1] - P.entry[1], P.touchdown[2] - P.entry[2]);
        setStage(v, "final");
      }
      break;
    }
    case "final": {
      v.speed = damp(v.speed, TOUCH_SPEED, 2.5, h);
      v.finalS = Math.min(v.finalLen, v.finalS + v.speed * h);
      const u = v.finalS / v.finalLen;
      const r = 1 - u;
      // Linear glide that eases into a flare (cubic, zero sink at touchdown).
      const flare = r >= 0.15 ? r : 0.15 * (2 * (r / 0.15) ** 2 - (r / 0.15) ** 3);
      const x = P.entry[0] + (P.touchdown[0] - P.entry[0]) * u;
      const z = P.entry[2] + (P.touchdown[2] - P.entry[2]) * u;
      const y = P.touchdown[1] + (P.entry[1] - P.touchdown[1]) * flare;
      // Nose slightly down on the glide, easing up into the flare.
      const pitch = -GLIDE * 0.55 + (0.1 + GLIDE * 0.55) * smooth01(0.22, 0.0, r);
      const hd = Math.atan2(-P.dir[0], -P.dir[1]);
      f.gear = damp(f.gear, 1, 2.2, h);
      setPose(x, y, z, f.heading + wrapPi(hd - f.heading) * Math.min(1, h * 2.2), damp(f.pitch, pitch, 2.5, h), damp(f.roll, 0, 2.2, h), v.speed, h);
      if (u >= 1) {
        v.rollS = 0;
        v.rollLen = Math.hypot(P.stop[0] - P.touchdown[0], P.stop[2] - P.touchdown[2]);
        // Constant braking to a stop exactly at the park point.
        v.decel = (v.speed * v.speed) / (2 * v.rollLen);
        v.bounce = 0.12;
        runtime.dust = { x: f.x, y: P.groundY, z: f.z, at: runtime.simTime };
        runtime.shake = Math.max(runtime.shake, 0.18);
        audio.play("touchdown");
        rumble(0.25, 90);
        setStage(v, "rollout");
      }
      break;
    }
    case "rollout": {
      v.speed = Math.max(0.8, v.speed - v.decel * h);
      v.rollS = Math.min(v.rollLen, v.rollS + v.speed * h);
      const x = P.touchdown[0] + P.dir[0] * v.rollS;
      const z = P.touchdown[2] + P.dir[1] * v.rollS;
      const bounce = v.bounce * Math.abs(Math.sin(v.t * 13)) * Math.exp(-v.t * 6);
      const stopped = v.rollS >= v.rollLen - 0.01;
      setPose(x, g(v) + bounce, z, Math.atan2(-P.dir[0], -P.dir[1]), damp(f.pitch, 0.04, 2.5, h), damp(f.roll, 0, 4, h), stopped ? 0 : v.speed, h);
      if (stopped) setStage(v, "landed");
      break;
    }
    case "landed": {
      f.vx = f.vy = f.vz = 0;
      f.speed = 0;
      if (!v.opened && v.t > 0.45) {
        v.opened = true;
        const d = destinationById(v.destId);
        if (d) useGame.getState().openPanel({ kind: d.kind, id: d.contentId });
      }
      break;
    }
    case "turn": {
      const p = v.taxi!;
      const left = p.length - v.rollS;
      const sp = Math.max(0.4, TAXI_SPEED * Math.min(1, Math.sqrt(Math.max(0, left) / TAXI_BRAKE)));
      v.rollS = Math.min(p.length, v.rollS + sp * h);
      const s = v.rollS;
      setPose(sampleArr(p, p.x, s), g(v), sampleArr(p, p.z, s), sampleHeading(p, s), 0.04, 0, s >= p.length ? 0 : sp, h);
      if (s >= p.length - 1e-3) {
        v.taxi = null;
        v.speed = 0;
        setStage(v, "takeoff");
      }
      break;
    }
    case "takeoff": {
      // Short-field take-off: hard acceleration and an early rotation, so even the shortest strips
      // are airborne well before their end.
      v.speed += (32 - 12 * smooth01(26, 40, v.speed)) * smooth01(0, 0.35, v.t) * h;
      const hd = depHeading(v);
      const rotating = v.speed > 26;
      const pitch = rotating ? damp(f.pitch, 0.24, 4, h) : 0.04;
      const [fx, fy, fz] = forwardVec(hd, rotating ? pitch : 0);
      const airborne = f.y - g(v) > 0.05 || (rotating && pitch > 0.08);
      const y = airborne ? f.y + Math.max(0, fy) * v.speed * h : g(v);
      if (airborne && f.y - g(v) > 8) f.gear = damp(f.gear, 0, 1.6, h);
      setPose(f.x + fx * v.speed * h, y, f.z + fz * v.speed * h, hd, pitch, 0, v.speed, h);
      if (f.y - g(v) > 10) setStage(v, "climb");
      break;
    }
    case "climb": {
      v.speed = damp(v.speed, 50, 1.2, h);
      const pitch = damp(f.pitch, 0.17, 2, h);
      const [fx, fy, fz] = forwardVec(f.heading, pitch);
      f.gear = damp(f.gear, 0, 2, h);
      setPose(f.x + fx * v.speed * h, f.y + fy * v.speed * h, f.z + fz * v.speed * h, f.heading, pitch, 0, v.speed, h);
      if (f.y - g(v) > 30 || v.t > 3.5) afterClimb(v);
      break;
    }
    case "handoff": {
      v.speed = damp(v.speed, 48, 1.5, h);
      const err = wrapPi(v.handoffHeading - f.heading);
      // Ease into the turn toward the next destination instead of snapping to full rate.
      const rate = Math.max(-0.7, Math.min(0.7, err * 1.3)) * smooth01(0, 1.4, v.t);
      const hd = f.heading + rate * h;
      const roll = damp(f.roll, Math.max(-0.6, Math.min(0.6, -rate * 0.9)), 2.4, h);
      const pitch = damp(f.pitch, 0.04, 2, h);
      const [fx, fy, fz] = forwardVec(hd, pitch);
      setPose(f.x + fx * v.speed * h, f.y + fy * v.speed * h, f.z + fz * v.speed * h, hd, pitch, roll, v.speed, h);
      if ((Math.abs(err) < 0.05 && Math.abs(f.roll) < 0.08) || v.t > 6) finishVisit();
      break;
    }
  }
}
