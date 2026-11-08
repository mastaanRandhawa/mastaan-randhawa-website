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
