// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ASSISTED, ADVANCED } from "@/config/flight";
import { createFlightState, stepFlight, stepTakeoff, type FlightEnv, type FlightInput } from "./flightModel";

const none: FlightInput = { pitch: 0, turn: 0, roll: 0, boost: false, brake: false };
const dt = 1 / 120;
const run = (s: ReturnType<typeof createFlightState>, inp: FlightInput, seconds: number, env: FlightEnv | null = null, t = ASSISTED) => {
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
  it("cruises stably with no input and never produces NaN", () => {
    const s = createFlightState(0, 200, 0, 0, ASSISTED.baseSpeed);
    run(s, none, 20);
    for (const v of Object.values(s)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    expect(s.speed).toBeCloseTo(ASSISTED.baseSpeed, 0);
    expect(Math.abs(s.pitch)).toBeLessThan(0.02);
    expect(Math.abs(s.roll)).toBeLessThan(0.02);
    expect(s.z).toBeLessThan(-900); // heading 0 flies toward -Z
  });

  it("W climbs, and assisted pitch is limited", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, pitch: 1 }, 6);
    expect(s.pitch).toBeGreaterThan(0.5);
    expect(s.pitch).toBeLessThanOrEqual(ASSISTED.maxPitch + 1e-6);
    expect(s.y).toBeGreaterThan(220);
  });

  it("D banks right and turns right; assist levels the wings on release", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, turn: 1 }, 2);
    expect(s.roll).toBeGreaterThan(0.6);
    expect(s.heading).toBeLessThan(-0.5); // right turn = heading decreases
    run(s, none, 3);
    expect(Math.abs(s.roll)).toBeLessThan(0.05);
  });

  it("advanced mode holds the bank when the stick is released", () => {
    const s = createFlightState(0, 300, 0);
    for (let i = 0; i < 1.2 / dt; i++) stepFlight(s, { ...none, turn: 1 }, ADVANCED, dt, null, { rollAutoLevel: 0, worldRadius: 1e9 });
    const bank = s.roll;
    for (let i = 0; i < 1 / dt; i++) stepFlight(s, none, ADVANCED, dt, null, { rollAutoLevel: 0, worldRadius: 1e9 });
    expect(Math.abs(s.roll - bank)).toBeLessThan(0.15);
  });

  it("Q/E performs a full barrel roll", () => {
    const s = createFlightState(0, 300, 0);
    const r = run(s, { ...none, roll: 1 }, 2.5);
    expect(r.rolls).toBeGreaterThanOrEqual(1);
  });

  it("boost accelerates to max speed, drains energy, then recharges", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, boost: true }, 2.5);
    expect(s.speed).toBeGreaterThan(ASSISTED.maxSpeed * 0.9);
    expect(s.boostEnergy).toBeLessThan(0.6);
    const e = s.boostEnergy;
    run(s, none, 3);
    expect(s.boostEnergy).toBeGreaterThan(e);
    expect(s.speed).toBeLessThan(ASSISTED.maxSpeed * 0.8);
  });

  it("brake slows toward minimum speed", () => {
    const s = createFlightState(0, 200, 0);
    run(s, { ...none, brake: true }, 3);
    expect(s.speed).toBeLessThan(ASSISTED.baseSpeed * 0.7);
    expect(s.speed).toBeGreaterThanOrEqual(ASSISTED.minSpeed * 0.85);
  });

  it("bounces off the ground on a shallow approach and crashes on a steep one", () => {
    const ground: FlightEnv = {
      groundAt: () => 0,
      collide: (_x, y, _z, r) => (y - r < 0 ? { nx: 0, ny: 1, nz: 0, depth: r - y } : null),
    };
    const shallow = createFlightState(0, 6, 0, 0, 48);
    shallow.pitch = -0.15;
    shallow.vy = -6;
    const a = run(shallow, none, 2, ground, { ...ASSISTED, terrainAssistClearance: 0 });
    expect(a.crashed).toBe(false);
    expect(shallow.y).toBeGreaterThan(0);

    const steep = createFlightState(0, 30, 0, 0, 90);
    steep.pitch = -1.0;
    steep.vy = -70;
    steep.vz = -55;
    const b = run(steep, { ...none, pitch: -1 }, 2, ground, { ...ADVANCED, terrainAssistClearance: 0, verticalSpeedLimit: 90 });
    expect(b.crashed).toBe(true);
  });

  it("terrain assist pulls the nose up near the ground", () => {
    const env: FlightEnv = { groundAt: () => 100, collide: () => null };
    const s = createFlightState(0, 108, 0);
    s.pitch = -0.2;
    run(s, none, 1.2, env);
    expect(s.pitch).toBeGreaterThan(-0.05);
  });

  it("scripted takeoff hands over control after liftoff", () => {
    const s = createFlightState(0, 101.9, 62, 0, 6);
    let t = 0;
    let done = false;
    while (!done && t < 12) {
      done = stepTakeoff(s, dt, 100.34, ASSISTED);
      t += dt;
    }
    expect(done).toBe(true);
    expect(t).toBeLessThan(9);
    expect(s.y - 100.34).toBeGreaterThan(20);
  });
});
