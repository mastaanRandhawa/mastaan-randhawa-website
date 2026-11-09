// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FLIGHT } from "@/config/flight";
import { createFlightState, stepFlight, stepTakeoff, type FlightEnv, type FlightInput } from "./flightModel";

const none: FlightInput = { pitch: 0, turn: 0, roll: 0, boost: false, brake: false };
const dt = 1 / 120;
const run = (s: ReturnType<typeof createFlightState>, inp: FlightInput, seconds: number, env: FlightEnv | null = null, t = FLIGHT) => {
  let crashed = false;
  let impact = 0;
  let rolls = 0;
  for (let i = 0; i < seconds / dt; i++) {
    const ev = stepFlight(s, inp, t, dt, env);
    crashed ||= ev.crashed;
    impact = Math.max(impact, ev.impact);
    if (ev.barrelRoll) rolls++;
  }
  return { crashed, impact, rolls };
};

describe("flight model", () => {
  it("cruises straight and level with no input and never produces NaN", () => {
    const s = createFlightState(0, 200, 0, 0, FLIGHT.baseSpeed);
    run(s, none, 20);
    for (const v of Object.values(s)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    expect(s.speed).toBeCloseTo(FLIGHT.baseSpeed, 0);
    expect(Math.abs(s.roll)).toBeLessThan(0.01);
    expect(s.z).toBeLessThan(-900); // heading 0 flies toward -Z
  });

  it("pitch input climbs, is limited near vertical, and eases back to level when released", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, pitch: 1 }, 0.6);
    expect(s.pitch).toBeGreaterThan(0.4);
    run(s, none, 3);
    expect(Math.abs(s.pitch)).toBeLessThan(0.06);
    run(s, { ...none, pitch: 1 }, 6);
    expect(s.pitch).toBeLessThanOrEqual(FLIGHT.maxPitch + 1e-6);
  });

  it("D banks right and turns right; the wings roll back to level on release", () => {
    const s = createFlightState(0, 300, 0);
    run(s, { ...none, turn: 1 }, 1.2);
    expect(s.roll).toBeGreaterThan(0.6);
    expect(s.heading).toBeLessThan(-0.3); // right turn = heading decreases
    run(s, none, 1.6);
    expect(Math.abs(s.roll)).toBeLessThan(0.05);
    // Levelling is smooth: no overshoot past level to the other side.
    let minRoll = Infinity;
    const t = createFlightState(0, 300, 0);
    run(t, { ...none, turn: 1 }, 1.2);
    for (let i = 0; i < 2 / dt; i++) {
      stepFlight(t, none, FLIGHT, dt, null);
      minRoll = Math.min(minRoll, t.roll);
    }
    expect(minRoll).toBeGreaterThan(-0.03);
  });

  it("recovers from inverted flight the short way round", () => {
    const s = createFlightState(0, 400, 0);
    s.roll = 2.8;
    run(s, none, 2.5);
    expect(Math.abs(s.roll)).toBeLessThan(0.05);
  });

  it("mouse steering is absolute: a centred cursor levels the wings", () => {
    const s = createFlightState(0, 300, 0);
    run(s, { ...none, turn: 1, absolute: true }, 1.2);
    expect(s.roll).toBeGreaterThan(0.6);
    run(s, { ...none, turn: 0, absolute: true }, 2);
    expect(Math.abs(s.roll)).toBeLessThan(0.05);
  });

  it("Q/E performs a full barrel roll", () => {
    const s = createFlightState(0, 300, 0);
    const r = run(s, { ...none, roll: 1 }, 2.5);
    expect(r.rolls).toBeGreaterThanOrEqual(1);
  });

  it("boost accelerates to max speed, drains energy, then recharges", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, boost: true }, 2.5);
    expect(s.speed).toBeGreaterThan(FLIGHT.maxSpeed * 0.9);
    expect(s.boostEnergy).toBeLessThan(0.6);
    const e = s.boostEnergy;
    run(s, none, 3);
    expect(s.boostEnergy).toBeGreaterThan(e);
    expect(s.speed).toBeLessThan(FLIGHT.maxSpeed * 0.8);
  });

  it("boost does not chatter on and off when the tank runs dry", () => {
    const s = createFlightState(0, 200, 0);
    let toggles = 0;
    let prev = false;
    for (let i = 0; i < 8 / dt; i++) {
      stepFlight(s, { ...none, boost: true }, FLIGHT, dt, null);
      if (s.boosting !== prev) toggles++;
      prev = s.boosting;
    }
    // On, off when empty, back on after recharging to 30% — not a flicker every frame.
    expect(toggles).toBeLessThanOrEqual(4);
  });

  it("brake slows toward minimum speed", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, brake: true }, 3);
    expect(s.speed).toBeLessThan(FLIGHT.baseSpeed * 0.7);
    expect(s.speed).toBeGreaterThanOrEqual(FLIGHT.minSpeed * 0.85);
  });

  it("levels the nose but never pulls up on its own near the ground", () => {
    const env: FlightEnv = { groundAt: () => 100, collide: () => null };
    const s = createFlightState(0, 140, 0);
    s.pitch = -0.2;
    let maxPitch = -Infinity;
    for (let i = 0; i < 2 / dt; i++) {
      stepFlight(s, none, FLIGHT, dt, env);
      maxPitch = Math.max(maxPitch, s.pitch);
    }
    expect(maxPitch).toBeLessThanOrEqual(1e-6); // eases toward level, never climbs
    expect(s.pitch).toBeGreaterThan(-0.05);
  });

  it("bounces off the ground on a shallow approach and crashes on a steep one", () => {
    const ground: FlightEnv = {
      groundAt: () => 0,
      collide: (_x, y, _z, r) => (y - r < 0 ? { nx: 0, ny: 1, nz: 0, depth: r - y } : null),
    };
    const shallow = createFlightState(0, 6, 0, 0, 48);
    shallow.pitch = -0.15;
    shallow.vy = -6;
    const a = run(shallow, none, 2, ground);
    expect(a.crashed).toBe(false);
    expect(shallow.y).toBeGreaterThan(0);

    const steep = createFlightState(0, 30, 0, 0, 90);
    steep.pitch = -1.0;
    steep.vy = -70;
    steep.vz = -55;
    const b = run(steep, { ...none, pitch: -1 }, 2, ground, { ...FLIGHT, verticalSpeedLimit: 90 });
    expect(b.crashed).toBe(true);
  });

  it("scripted takeoff hands over control after liftoff", () => {
    const s = createFlightState(0, 101.9, 62, 0, 6);
    let t = 0;
    let done = false;
    while (!done && t < 12) {
      done = stepTakeoff(s, dt, 100.34, FLIGHT);
      t += dt;
    }
    expect(done).toBe(true);
    expect(t).toBeLessThan(9);
    expect(s.y - 100.34).toBeGreaterThan(20);
  });
});
