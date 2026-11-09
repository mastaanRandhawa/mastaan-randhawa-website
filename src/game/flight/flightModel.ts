import type { FlightTuning } from "@/config/flight";

/**
 * Arcade flight model. Orientation is (heading, pitch, roll) — robust, easy to
 * assist, and loop-free in assisted mode. Pitch input rotates around the wing
 * axis by `pitchBankCoupling`, so pulling back in a bank tightens the turn
 * like a real aircraft while W still means "up" for beginners.
 *
 * Conventions: heading 0 flies toward -Z; positive heading turns left.
 * Positive pitch = nose up. Positive roll = right wing down.
 */
export interface FlightState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  pitch: number;
  roll: number;
  pitchRate: number;
  yawRate: number;
  rollRate: number;
  speed: number;
  boostEnergy: number;
  boosting: boolean;
  /** Set when boost runs dry; cleared once it recharges to 30% (no on/off chatter). */
  boostLock: boolean;
  /** Landing gear extension 0 (up) … 1 (down). */
  gear: number;
  onGround: boolean;
  clearance: number;
  /** Accumulated manual roll (for barrel-roll detection). */
  rollAccum: number;
}

export interface FlightInput {
  pitch: number;
  turn: number;
  roll: number;
  boost: boolean;
  brake: boolean;
  /** Mouse steering: turn is an absolute bank target (centred = wings level). */
  absolute?: boolean;
}

export interface FlightEnv {
  collide(x: number, y: number, z: number, r: number): { nx: number; ny: number; nz: number; depth: number } | null;
  groundAt(x: number, z: number, maxY?: number): number;
}

export interface StepEvents {
  impact: number;
  crashed: boolean;
  barrelRoll: boolean;
}

export const TWO_PI = Math.PI * 2;
export const wrapPi = (a: number) => {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
};
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** Frame-rate independent exponential approach. */
export const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
const approach = (cur: number, target: number, maxDelta: number) =>
  cur < target ? Math.min(cur + maxDelta, target) : Math.max(cur - maxDelta, target);

export function createFlightState(x = 0, y = 140, z = 0, heading = 0, speed = 48): FlightState {
  return {
    x,
    y,
    z,
    vx: -Math.sin(heading) * speed,
    vy: 0,
    vz: -Math.cos(heading) * speed,
    heading,
    pitch: 0,
    roll: 0,
    pitchRate: 0,
    yawRate: 0,
    rollRate: 0,
    speed,
    boostEnergy: 1,
    boosting: false,
    boostLock: false,
    gear: 0,
    onGround: false,
    clearance: 100,
    rollAccum: 0,
  };
}

export function forwardOf(s: Pick<FlightState, "heading" | "pitch">): [number, number, number] {
  const cp = Math.cos(s.pitch);
  return [-Math.sin(s.heading) * cp, Math.sin(s.pitch), -Math.cos(s.heading) * cp];
}

export function stepFlight(
  s: FlightState,
  inp: FlightInput,
  t: FlightTuning,
  dt: number,
  env: FlightEnv | null,
): StepEvents {
  const ev: StepEvents = { impact: 0, crashed: false, barrelRoll: false };
  const speedT = clamp((s.speed - t.baseSpeed) / (t.maxSpeed - t.baseSpeed), 0, 1);

  // ── Roll / bank ──
  const manualRoll = Math.abs(inp.roll) > 0.05;
  if (manualRoll) {
    s.rollRate = damp(s.rollRate, inp.roll * t.rollRate, 9, dt);
    s.rollAccum += s.rollRate * dt;
    if (Math.abs(s.rollAccum) >= TWO_PI * 0.97) {
      ev.barrelRoll = true;
      s.rollAccum = 0;
    }
  } else {
    s.rollAccum = 0;
    // Steering banks toward the stick; letting go rolls the wings back to level
    // (the short way round, so it also recovers from inverted).
    const steering = inp.absolute || Math.abs(inp.turn) > 0.02;
    const desired = steering
      ? clamp(wrapPi(inp.turn * t.maxBank - s.roll) * t.bankResponse, -t.rollRate, t.rollRate)
      : clamp(wrapPi(-s.roll) * t.bankAutoLevel, -t.bankLevelRate, t.bankLevelRate);
    s.rollRate = damp(s.rollRate, desired, steering ? 10 : 6, dt);
  }
  s.roll = wrapPi(s.roll + s.rollRate * dt);

  // ── Pitch (coupled with bank) ──
  s.pitchRate = damp(s.pitchRate, inp.pitch * t.pitchRate, t.pitchResponse, dt);
  const c = t.pitchBankCoupling;
  const cr = Math.cos(s.roll);
  const sr = Math.sin(s.roll);
  s.pitch += s.pitchRate * dt * (1 - c + c * cr);
  const coupledYaw = -s.pitchRate * dt * c * sr;
  if (Math.abs(inp.pitch) < 0.05) s.pitch -= s.pitch * t.pitchAutoLevel * dt;
  if (s.pitch > t.maxPitch) {
    s.pitch = t.maxPitch;
    if (s.pitchRate > 0) s.pitchRate *= 0.5;
  } else if (s.pitch < -t.maxPitch) {
    s.pitch = -t.maxPitch;
    if (s.pitchRate < 0) s.pitchRate *= 0.5;
  }

  // ── Yaw: coordinated turn from bank + a little direct yaw ──
  const turnScale = 1.1 - speedT * 0.25;
  // Banked right → heading decreases (turn right). Inverted flight turns weakly.
  const liftTurn = -sr * t.turnRate * turnScale * (cr < 0 ? 0.35 : 1);
  const direct = -inp.turn * t.directYaw;
  s.yawRate = damp(s.yawRate, liftTurn + direct, 6, dt);
  s.heading = wrapPi(s.heading + s.yawRate * dt + coupledYaw);

  // ── Speed / energy ──
  if (s.boostEnergy <= 0.02) s.boostLock = true;
  else if (s.boostLock && s.boostEnergy >= 0.3) s.boostLock = false;
  const boosting = inp.boost && !s.boostLock;
  s.boosting = boosting;
  let target = t.baseSpeed;
  if (boosting) target = t.maxSpeed;
  if (inp.brake) target = t.minSpeed;
  const rate = s.speed < target ? (boosting ? t.acceleration * 1.7 : t.acceleration) : t.deceleration;
  s.speed = approach(s.speed, target, rate * dt);
  s.speed -= Math.sin(s.pitch) * t.gravityEffect * dt;
  s.speed = clamp(s.speed, t.minSpeed * 0.85, t.maxSpeed * 1.12);
  s.boostEnergy = clamp(s.boostEnergy + (boosting ? -t.boostDrain : t.boostRecharge) * dt, 0, 1);

  // ── Velocity with inertia ──
  const [fx, fy, fz] = forwardOf(s);
  const k = 1 - Math.exp(-t.grip * dt);
  s.vx += (fx * s.speed - s.vx) * k;
  s.vy += (fy * s.speed - s.vy) * k;
  s.vz += (fz * s.speed - s.vz) * k;
  s.vy = clamp(s.vy, -t.verticalSpeedLimit, t.verticalSpeedLimit);

  // ── Ground clearance (for checkpoints; no automatic pull-up) ──
  if (env) {
    const g = env.groundAt(s.x, s.z, s.y + 4);
    s.clearance = g === -Infinity ? 999 : s.y - g;
  }
  if (s.y > t.ceiling) s.pitch = Math.min(s.pitch, s.pitch - (s.y - t.ceiling) * 0.01 * dt);

  // ── Integrate ──
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.z += s.vz * dt;
  s.gear = damp(s.gear, 0, 1.5, dt);

  // ── Collisions ──
  if (env) {
    for (let iter = 0; iter < 2; iter++) {
      const ct = env.collide(s.x, s.y, s.z, t.collisionRadius);
      if (!ct) break;
      s.x += ct.nx * ct.depth;
      s.y += ct.ny * ct.depth;
      s.z += ct.nz * ct.depth;
      const vn = s.vx * ct.nx + s.vy * ct.ny + s.vz * ct.nz;
      if (vn < 0) {
        ev.impact = Math.max(ev.impact, -vn);
        const j = (1 + t.bounce) * vn;
        s.vx -= j * ct.nx;
        s.vy -= j * ct.ny;
        s.vz -= j * ct.nz;
        // Bias upward so glancing hits skip off rather than stick.
        if (ct.ny > -0.2) s.vy += 6;
        const sp = Math.hypot(s.vx, s.vy, s.vz) || 1;
        s.heading = Math.atan2(-s.vx / sp, -s.vz / sp);
        s.pitch = clamp(Math.asin(clamp(s.vy / sp, -1, 1)), -t.maxPitch, t.maxPitch);
        s.roll *= 0.5;
        s.rollRate *= 0.3;
        s.pitchRate = 0;
        s.speed = Math.max(t.minSpeed, s.speed * (1 - Math.min(0.45, -vn / 90)));
      }
    }
    if (ev.impact > t.crashImpactSpeed) ev.crashed = true;
  }
  if (s.y < t.floor) ev.crashed = true;
  return ev;
}

/** Scripted takeoff roll. Returns true when the player should get control. */
export function stepTakeoff(s: FlightState, dt: number, groundY: number, t: FlightTuning): boolean {
  const gearH = 1.55;
  const rotateSpeed = 36;
  s.speed = Math.min(t.baseSpeed + 4, s.speed + (s.speed < rotateSpeed ? 15 : 10) * dt);
  s.roll = damp(s.roll, 0, 4, dt);
  if (s.speed > rotateSpeed) {
    s.pitch = damp(s.pitch, 0.2, 2.2, dt);
    s.onGround = false;
  } else {
    s.onGround = true;
    s.pitch = 0;
  }
  const [fx, fy, fz] = forwardOf(s);
  s.vx = fx * s.speed;
  s.vy = s.onGround ? 0 : fy * s.speed;
  s.vz = fz * s.speed;
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y = s.onGround ? groundY + gearH : s.y + s.vy * dt;
  s.gear = s.y - groundY > 12 ? damp(s.gear, 0, 1.2, dt) : 1;
  s.pitchRate = 0;
  s.rollRate = 0;
  s.yawRate = 0;
  return s.y - groundY > 22;
}
