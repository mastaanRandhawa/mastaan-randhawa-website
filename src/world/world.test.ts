// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildWorldSync } from "./world";
import { REGIONS } from "./layout";
import { portfolio } from "@/content/portfolio";

describe("world build", () => {
  const w = buildWorldSync(1);

  it("builds every region with geometry", () => {
    expect(w.regions.length).toBeGreaterThanOrEqual(REGIONS.length);
    for (const r of w.regions) {
      for (const i of r.islands) {
        const pos = i.geometry.getAttribute("position");
        expect(pos.count).toBeGreaterThan(0);
        let bad = 0;
        for (let k = 0; k < pos.array.length; k++) if (!Number.isFinite(pos.array[k])) bad++;
        expect(bad, i.id).toBe(0);
      }
    }
  });

  it("gives every real project a destination", () => {
    for (const p of portfolio.projects) {
      expect(w.destinations.some((d) => d.kind === "project" && d.contentId === p.id), p.id).toBe(true);
    }
  });

  it("gives every skill category, plus about/experience/education/achievements/contact a destination", () => {
    for (const c of portfolio.skillCategories) expect(w.destinations.some((d) => d.kind === "skills" && d.contentId === c.id), c.id).toBe(true);
    for (const k of ["about", "experience", "education", "achievements", "contact"]) expect(w.destinations.some((d) => d.kind === k), k).toBe(true);
  });

  it("places every flight log as a collectible", () => {
    for (const l of portfolio.flightLogs) expect(w.collectibles.some((c) => c.id === l.id), l.id).toBe(true);
  });

  it("has a clear spawn runway", () => {
    // The takeoff path along the runway must not hit buildings.
    for (let z = 62; z > -80; z -= 2) {
      expect(w.collision.collide(0, 103.2, z, 2.6), `runway z=${z}`).toBeNull();
    }
  });

  it("reports ground under the launch island", () => {
    const g = w.collision.groundAt(0, 0);
    expect(g).toBeGreaterThan(99);
    expect(g).toBeLessThan(101);
  });
});

describe("layout clearance", () => {
  const w = buildWorldSync(1);
  const blocked = (x: number, y: number, z: number, r = 2.8) => w.collision.collide(x, y, z, r) !== null;

  it("keeps every course ring opening and the path between rings clear", () => {
    const problems: string[] = [];
    for (const c of w.courses) {
      c.rings.forEach((r, i) => {
        if (blocked(...r.pos)) problems.push(`${c.id} ring ${i} centre blocked`);
        const next = c.rings[i + 1];
        if (!next) return;
        for (let t = 0.1; t < 1; t += 0.1) {
          const p = r.pos.map((v, k) => v + (next.pos[k] - v) * t) as [number, number, number];
          if (blocked(...p)) {
            problems.push(`${c.id} path ${i}->${i + 1} blocked at t=${t.toFixed(1)} (${p.map((v) => v.toFixed(0)).join(",")})`);
            break;
          }
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it("keeps every destination arrival ring clear", () => {
    const problems = w.destinations.filter((d) => d.ring && blocked(...d.ring.pos)).map((d) => d.id);
    expect(problems).toEqual([]);
  });

  it("keeps every collectible reachable (not buried)", () => {
    const problems = w.collectibles.filter((c) => blocked(...c.pos, 1.5)).map((c) => c.id);
    expect(problems).toEqual([]);
  });
});

describe("landing sites", () => {
  const w = buildWorldSync(1);
  type P3 = [number, number, number];
  const lift = (p: P3, dy = 2.5): P3 => [p[0], p[1] + dy, p[2]];
  const firstHit = (a: P3, b: P3, step = 3, r = 2.2) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p: P3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      if (w.collision.collide(p[0], p[1], p[2], r)) return p.map((v) => v.toFixed(0)).join(",");
    }
    return null;
  };

  it("gives every destination a landing site", () => {
    expect(w.destinations.filter((d) => !d.landing).map((d) => d.id)).toEqual([]);
  });

  it("keeps every approach, rollout, parking spot and climb-out clear", async () => {
    const { landingPlan } = await import("./landing");
    const problems: string[] = [];
    for (const d of w.destinations) {
      if (!d.landing) continue;
      const L = landingPlan(d.landing);
      const checks: [string, P3, P3][] = [
        ["approach", lift(L.entry), lift(L.touchdown)],
        ["rollout", lift(L.touchdown), lift(L.stop)],
        ["park", lift(L.stop), lift(L.park)],
        ["takeoff", lift(L.park), lift(L.liftoff)],
        ["climb", lift(L.liftoff), L.climbOut],
      ];
      for (const [name, a, b] of checks) {
        const hit = firstHit(a, b);
        if (hit) problems.push(`${d.id} ${name} blocked at ${hit}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("gives every sizeable island a waterfall, none of them across a landing approach", async () => {
    const { landingPlan } = await import("./landing");
    const falls = w.regions.flatMap((r) => r.anchors.filter((a) => a.type === "waterfall"));
    const missing: string[] = [];
    for (const r of w.regions)
      for (const i of r.islands) {
        const p = i.terrain.p;
        const R = p.radius * Math.max(p.sx, p.sz);
        if (R < 20) continue;
        if (!falls.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < R * 1.4)) missing.push(i.id);
      }
    expect(missing).toEqual([]);
    // Horizontal distance from a fall to each approach / rollout segment.
    const segDist = (px: number, pz: number, a: P3, b: P3) => {
      const vx = b[0] - a[0];
      const vz = b[2] - a[2];
      const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[2]) * vz) / (vx * vx + vz * vz || 1)));
      return Math.hypot(px - (a[0] + vx * t), pz - (a[2] + vz * t));
    };
    const close: string[] = [];
    for (const d of w.destinations) {
      if (!d.landing) continue;
      const L = landingPlan(d.landing);
      for (const f of falls) {
        const dist = Math.min(segDist(f.x, f.z, L.entry, L.touchdown), segDist(f.x, f.z, L.touchdown, L.stop));
        if (dist < 9) close.push(`${d.id} ${dist.toFixed(1)}`);
      }
    }
    expect(close).toEqual([]);
  });
});
