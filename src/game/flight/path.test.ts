// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildFlatPath } from "./path";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

describe("buildFlatPath", () => {
  const cases: [number, number, number, number, number, number][] = [];
  for (const h0 of [0, 1, 2.5, Math.PI, -2]) for (const h1 of [0, Math.PI / 2, Math.PI, -1.2]) cases.push([0, 0, h0, 420, -310, h1], [0, 0, h0, 60, 40, h1]);

  it.each(cases)("from (%d,%d) h%d to (%d,%d) h%d stays smooth and lands on target", (x0, z0, h0, x1, z1, h1) => {
    const R = 150;
    const p = buildFlatPath(x0, z0, h0, x1, z1, h1, { radius: R, blend: 70, tail: 110, step: 2 });
    const n = p.x.length;
    expect(p.x[0]).toBeCloseTo(x0, 3);
    expect(p.z[0]).toBeCloseTo(z0, 3);
    expect(Math.hypot(p.x[n - 1] - x1, p.z[n - 1] - z1)).toBeLessThan(0.05);
    expect(Math.abs(wrap(p.hd[0] - h0))).toBeLessThan(0.02);
    expect(Math.abs(wrap(p.hd[n - 1] - h1))).toBeLessThan(0.02);
    let maxK = 0;
    let maxJump = 0;
    for (let i = 0; i < n; i++) {
      maxK = Math.max(maxK, Math.abs(p.k[i]));
      if (i) maxJump = Math.max(maxJump, Math.abs(p.k[i] - p.k[i - 1]));
    }
    // Never tighter than the turn radius (a little slack for the end correction)...
    expect(maxK).toBeLessThan(1.15 / R);
    // ...and curvature changes gradually: no step from straight to full turn.
    expect(maxJump).toBeLessThan((1 / R) * 0.12);
    // Starts and ends straight, so bank is zero at the joins.
    expect(Math.abs(p.k[0])).toBeLessThan(0.05 / R);
    expect(Math.abs(p.k[n - 1])).toBeLessThan(0.05 / R);
  });

  it("makes a ground U-turn a smooth semicircle onto the parallel lane", () => {
    const p = buildFlatPath(0, 0, 0, 5, 0, Math.PI, { radius: 2.5, blend: 3, step: 0.1 });
    const n = p.x.length;
    expect(Math.hypot(p.x[n - 1] - 5, p.z[n - 1])).toBeLessThan(0.02);
    expect(p.length).toBeLessThan(Math.PI * 2.5 + 4);
  });
});
