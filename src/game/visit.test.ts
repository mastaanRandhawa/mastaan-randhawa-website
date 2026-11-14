// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildWorldSync } from "@/world/world";
import { runtime } from "./runtime";
import { departVisit, startVisit, stepVisit, type Visit } from "./visit";
import { wrapPi } from "./flight/flightModel";

const H = 1 / 120;
/** Read through a function so TypeScript doesn't narrow it after the reset. */
const vis = () => runtime.visit as Visit | null;

describe("landing autopilot", () => {
  const w = buildWorldSync(1);
  const dests = w.destinations.filter((d) => d.landing);

  // Start points around each strip, near and far, including ones pointing straight away from the runway.
  const starts: [number, number, number][] = [];
  for (const a of [0, 2.1, 4.2]) for (const dh of [0, Math.PI / 2, Math.PI]) starts.push([a, 520, dh]);
  starts.push([1, 160, Math.PI], [3, 1400, 2]);

  it("lands within 5 seconds of being selected, smoothly, and departs clear of terrain", () => {
    let worstRollRate = 0;
    let worstYawJerk = 0;
    let worstSlip = 0;
    let worstClimbClear = Infinity;
    const times: number[] = [];
    const stageT: Record<string, number> = {};
    for (const d of dests) {
      const L = d.landing!;
      for (const [a, r, dh] of starts) {
        const label = `${d.id} from ${a},${r},${dh.toFixed(2)}`;
        const f = runtime.flight;
        f.x = L.x + Math.cos(a) * r;
        f.z = L.z + Math.sin(a) * r;
        f.y = Math.max(L.y + 60, w.collision.groundAt(f.x, f.z) + 60);
        // Heading relative to the runway: dh = π means flying the opposite way to landing.
        f.heading = L.heading + dh;
        f.pitch = 0;
        f.roll = 0;
        f.speed = 55;
        runtime.phase = "flying";
        runtime.visit = null;
        expect(startVisit(d.id), d.id).toBe(true);

        // ── Landing ──
        let prevRoll = f.roll;
        let prevHd = f.heading;
        let prevRate = 0;
        let first = true;
        let t = 0;
        while (vis() && vis()!.stage !== "landed" && t < 20) {
          const stage = vis()!.stage;
          stepVisit(H);
          stageT[stage] = (stageT[stage] ?? 0) + H;
          t += H;
          const rate = wrapPi(f.heading - prevHd) / H;
          if (!first && stage === "travel" && vis()!.stage === "travel") {
            worstRollRate = Math.max(worstRollRate, Math.abs(f.roll - prevRoll) / H);
            worstYawJerk = Math.max(worstYawJerk, Math.abs(rate - prevRate) / H);
          }
          first = vis()?.stage !== stage;
          prevRoll = f.roll;
          prevHd = f.heading;
          prevRate = rate;
        }
        expect(vis()?.stage, label).toBe("landed");
        times.push(t);

        // ── Departure (straight on, or U-turn and back out over the approach) ──
        departVisit(false);
        let dt = 0;
        while (vis() && dt < 30) {
          const stage = vis()!.stage;
          stepVisit(H);
          dt += H;
          if (stage === "turn" && Math.hypot(f.vx, f.vz) > 0.5) worstSlip = Math.max(worstSlip, Math.abs(wrapPi(Math.atan2(-f.vx, -f.vz) - f.heading)));
          if (stage === "climb" || stage === "handoff") worstClimbClear = Math.min(worstClimbClear, f.y - w.collision.groundAt(f.x, f.z));
          // (1 m sphere: the plane's origin sits 1.55 m over the strip while rolling.)
          if (w.collision.collide(f.x, f.y, f.z, 1)) throw new Error(`${label}: departure hit terrain at ${f.x.toFixed(0)},${f.y.toFixed(0)},${f.z.toFixed(0)} (${stage})`);
        }
        expect(vis(), `${label}: departure finished`).toBe(null);
      }
    }
    times.sort((a, b) => a - b);
    const n = times.length;
    console.log({ landingMedian: +times[n >> 1].toFixed(2), landingMax: +times[n - 1].toFixed(2), perStageAvg: Object.fromEntries(Object.entries(stageT).map(([k, v]) => [k, +(v / n).toFixed(2)])) });
    console.log({ worstRollRate, worstYawJerk, worstSlip, worstClimbClear });
    // Every landing is parked within 5 s of being selected.
    expect(times[n - 1]).toBeLessThanOrEqual(5);
    // Brisk, but nothing snaps: roll rate is capped and yaw rate stays continuous
    // (the old Bézier autopilot spiked to ~45,000 rad/s³ here).
    expect(worstRollRate).toBeLessThan(2.5);
    expect(worstYawJerk).toBeLessThan(10);
    // The nose follows the taxi U-turn instead of skidding round it.
    expect(worstSlip).toBeLessThan(0.05);
  });
});
