import { GEAR_HEIGHT, GLIDE, landingPlan, type LandingPlan } from "@/world/landing";
import { destinationById, getWorld, worldReady } from "@/world/world";
import { runtime } from "./runtime";
import { useGame } from "./store";
import { audio } from "./audio";
import { rumble } from "./input";
import { damp, wrapPi } from "./flight/flightModel";
import { currentMission } from "./progression";
import type { Destination } from "@/world/defs";

/**
 * Island-hopping autopilot. A visit flies the plane (kinematically, so it is
 * smooth and deterministic) from wherever it is to a destination's airstrip:
 * travel → final approach → flare & touchdown → rollout → U-turn → parked.
 * The panel opens once parked; closing it takes off and either hands control
 * back pointed at the next destination, or continues straight on to it.
 */
export type VisitStage = "travel" | "final" | "rollout" | "turn" | "landed" | "takeoff" | "climb" | "handoff";

type V3 = [number, number, number];

interface Curve {
  p: [V3, V3, V3, V3];
  lut: Float32Array;
  length: number;
  s: number;
}

export interface Visit {
  destId: string;
  plan: LandingPlan;
  stage: VisitStage;
  t: number;
  speed: number;
  curve: Curve | null;
  finalS: number;
  finalLen: number;
  rollS: number;
  rollLen: number;
  decel: number;
  theta: number;
  autoNext: boolean;
  nextId: string | null;
  handoffHeading: number;
  bounce: number;
  opened: boolean;
}

const LUT_N = 256;
/** Speed at the end of the landing roll; the U-turn then slows to a stop. */
const TAXI_SPEED = 3.6;
const GRAV = 9.81;
const smooth01 = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ── Cubic Bézier with arc-length lookup ──────────────────────────────────────
function bez(c: Curve["p"], u: number, out: V3): V3 {
  const a = 1 - u;
  const b0 = a * a * a;
  const b1 = 3 * a * a * u;
  const b2 = 3 * a * u * u;
  const b3 = u * u * u;
  for (let k = 0; k < 3; k++) out[k] = c[0][k] * b0 + c[1][k] * b1 + c[2][k] * b2 + c[3][k] * b3;
  return out;
}

function bezTangent(c: Curve["p"], u: number, out: V3): V3 {
  const a = 1 - u;
  for (let k = 0; k < 3; k++) out[k] = 3 * a * a * (c[1][k] - c[0][k]) + 6 * a * u * (c[2][k] - c[1][k]) + 3 * u * u * (c[3][k] - c[2][k]);
  return out;
}

function buildCurve(p0: V3, fwd: V3, p3: V3, dir: [number, number]): Curve {
  const dist = Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]);
  const k1 = Math.min(280, Math.max(50, dist * 0.38));
  const k2 = Math.min(300, Math.max(110, dist * 0.45));
  const tg = Math.tan(GLIDE);
  const p1: V3 = [p0[0] + fwd[0] * k1, p0[1] + fwd[1] * k1, p0[2] + fwd[2] * k1];
  const p2: V3 = [p3[0] - dir[0] * k2, p3[1] + k2 * tg, p3[2] - dir[1] * k2];
  // Keep the route above anything in the way.
  let maxG = -Infinity;
  if (worldReady()) {
    const col = getWorld().collision;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = p0[0] + (p3[0] - p0[0]) * t;
      const z = p0[2] + (p3[2] - p0[2]) * t;
      maxG = Math.max(maxG, col.groundAt(x, z), col.groundAt(p1[0] + (p2[0] - p1[0]) * t, p1[2] + (p2[2] - p1[2]) * t));
    }
  }
  const cruise = Math.max(p0[1], p3[1], maxG + 45);
  p1[1] = Math.max(p1[1], cruise);
  const c: Curve = { p: [p0, p1, p2, p3], lut: new Float32Array(LUT_N + 1), length: 0, s: 0 };
  const a: V3 = [0, 0, 0];
  const b: V3 = [0, 0, 0];
  bez(c.p, 0, a);
  for (let i = 1; i <= LUT_N; i++) {
    bez(c.p, i / LUT_N, b);
    c.lut[i] = c.lut[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];
  }
  c.length = c.lut[LUT_N];
  return c;
}

function uAt(c: Curve, s: number): number {
  if (s <= 0) return 0;
  if (s >= c.length) return 1;
  let lo = 0;
  let hi = LUT_N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c.lut[mid] < s) lo = mid;
    else hi = mid;
  }
  const seg = c.lut[hi] - c.lut[lo] || 1;
  return (lo + (s - c.lut[lo]) / seg) / LUT_N;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const tmp: V3 = [0, 0, 0];
const tan: V3 = [0, 0, 0];
const tan2: V3 = [0, 0, 0];

/** Heading change per metre along the curve at arc length s (geometric, so it never jitters). */
function turnPerMetre(c: Curve, s: number): number {
  const ds = 4;
  if (c.length <= ds) return 0;
  const s0 = Math.max(0, Math.min(c.length - ds, s - ds / 2));
  bezTangent(c.p, uAt(c, s0), tan);
  bezTangent(c.p, uAt(c, s0 + ds), tan2);
  const h0 = Math.atan2(-tan[0], -tan[2]);
  const h1 = Math.atan2(-tan2[0], -tan2[2]);
  return wrapPi(h1 - h0) / ds;
}

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

function beginTravel(v: Visit) {
  const f = runtime.flight;
  const fwd = forwardVec(f.heading, Math.max(-0.2, Math.min(0.25, f.pitch)));
  v.curve = buildCurve([f.x, f.y, f.z], fwd, v.plan.entry, v.plan.dir);
  v.speed = Math.max(30, f.speed);
  setStage(v, "travel");
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
    theta: 0,
    autoNext: false,
    nextId: null,
    handoffHeading: 0,
    bounce: 0,
    opened: false,
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
  setStage(v, "takeoff");
  if (v.nextId) useGame.getState().setWaypoint(v.nextId);
}

/** Player grabbed the controls mid-transit: hand over immediately. */
export function cancelVisit() {
  const v = runtime.visit;
  if (!v || v.stage !== "travel") return;
  finishVisit();
}

/** Skip ahead: long transits jump to the approach; landings jump to parked. */
export function skipVisit() {
  const v = runtime.visit;
  if (!v) return;
  runtime.flash = 1;
  if (v.stage === "travel" && v.curve) {
    v.curve.s = Math.max(v.curve.s, v.curve.length - 60);
  } else if (v.stage === "final" || v.stage === "rollout" || v.stage === "turn") {
    const p = v.plan.park;
    setPose(p[0], p[1], p[2], v.plan.parkHeading, 0.04, 0, 0, 1 / 120);
    runtime.flight.gear = 1;
    setStage(v, "landed");
  } else if (v.stage === "takeoff" || v.stage === "climb" || v.stage === "handoff") {
    const c = v.plan.climbOut;
    setPose(c[0], c[1], c[2], v.plan.parkHeading, 0.05, 0, 48, 1 / 120);
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
      const remaining = c.length - c.s;
      const cruise = Math.min(92, Math.max(52, 40 + c.length * 0.045));
      const target = Math.min(cruise, 40 + remaining * 0.28);
      v.speed = damp(v.speed, target, 0.7, h);
      c.s = Math.min(c.length, c.s + v.speed * h);
      const u = uAt(c, c.s);
      bez(c.p, u, tmp);
      bezTangent(c.p, u, tan);
      const hd = Math.atan2(-tan[0], -tan[2]);
      const pitch = Math.asin(Math.max(-1, Math.min(1, tan[1] / (Math.hypot(tan[0], tan[1], tan[2]) || 1))));
      // Coordinated turn: bank so that tan(bank) = v * yawRate / g (left turn = negative roll).
      const yawRate = turnPerMetre(c, c.s) * v.speed;
      const bank = Math.atan((v.speed * yawRate) / GRAV);
      const roll = damp(f.roll, Math.max(-0.75, Math.min(0.75, -bank)), 2.2, h);
      f.gear = damp(f.gear, 0, 2, h);
      setPose(tmp[0], tmp[1], tmp[2], hd, pitch, roll, v.speed, h);
      if (c.s >= c.length - 0.01) {
        v.finalS = 0;
        v.finalLen = Math.hypot(P.touchdown[0] - P.entry[0], P.touchdown[1] - P.entry[1], P.touchdown[2] - P.entry[2]);
        setStage(v, "final");
      }
      break;
    }
    case "final": {
      v.speed = damp(v.speed, 32, 0.9, h);
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
        v.decel = Math.max(4, (v.speed * v.speed - TAXI_SPEED * TAXI_SPEED) / (2 * v.rollLen));
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
      v.speed = Math.max(TAXI_SPEED, v.speed - v.decel * h);
      v.rollS = Math.min(v.rollLen, v.rollS + v.speed * h);
      const x = P.touchdown[0] + P.dir[0] * v.rollS;
      const z = P.touchdown[2] + P.dir[1] * v.rollS;
      const bounce = v.bounce * Math.abs(Math.sin(v.t * 13)) * Math.exp(-v.t * 6);
      setPose(x, g(v) + bounce, z, Math.atan2(-P.dir[0], -P.dir[1]), damp(f.pitch, 0.04, 2.5, h), damp(f.roll, 0, 4, h), v.speed, h);
      if (v.rollS >= v.rollLen - 0.01) {
        v.theta = 0;
        setStage(v, "turn");
      }
      break;
    }
    case "turn": {
      const R = P.turnRadius;
      const side = Math.sign(R) || 1;
      const r = Math.abs(R);
      const T = (2 * Math.PI * r) / TAXI_SPEED;
      const tt = Math.min(T, v.t);
      v.theta = Math.min(Math.PI, (TAXI_SPEED * tt - (TAXI_SPEED * tt * tt) / (2 * T)) / r);
      const [dx, dz] = P.dir;
      const rx = P.right[0] * side;
      const rz = P.right[1] * side;
      const cx = P.stop[0] + rx * r;
      const cz = P.stop[2] + rz * r;
      const x = cx - rx * r * Math.cos(v.theta) + dx * r * Math.sin(v.theta);
      const z = cz - rz * r * Math.cos(v.theta) + dz * r * Math.sin(v.theta);
      const hd = Math.atan2(-dx, -dz) - side * v.theta;
      // The nose follows the arc with a short lag, like a steered nosewheel, so the turn eases in.
      const steer = f.heading + wrapPi(hd - f.heading) * (1 - Math.exp(-7 * h));
      setPose(x, g(v), z, tt >= T ? hd : steer, 0.04, 0, TAXI_SPEED * (1 - tt / T), h);
      if (v.theta >= Math.PI - 1e-4 || tt >= T) setStage(v, "landed");
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
    case "takeoff": {
      v.speed += (21 - 9 * smooth01(30, 42, v.speed)) * smooth01(0, 0.8, v.t) * h;
      const hd = P.parkHeading;
      const rotating = v.speed > 34;
      const pitch = rotating ? damp(f.pitch, 0.2, 2.4, h) : 0.04;
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
