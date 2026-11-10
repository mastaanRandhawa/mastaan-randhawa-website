// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodeBaked, encodeBaked, type BakedEntry } from "./bakedModels";

const tri = (scale: number, col: number[]): BakedEntry["t"] => ({
  pos: new Float32Array([0, 0, 0, scale, 0, 0, 0, scale, 0.5]),
  col: new Float32Array(col),
  idx: new Uint32Array([0, 1, 2]),
  aspect: 0.8,
});

describe("baked model file", () => {
  it("round-trips shapes, colours and kinds, sharing shapes between colour variants", () => {
    const a = tri(1, [0.2, 0.5, 0.1, 0.9, 0.9, 0.9, 1.2, 0.3, 0.05]);
    const b = { ...a, col: new Float32Array([0.8, 0.4, 0.1, 0.8, 0.4, 0.1, 0.8, 0.4, 0.1]) };
    const entries: BakedEntry[] = [
      { kind: "round", t: a },
      { kind: "autumn", t: b },
      { prop: "rock", t: tri(2.5, [0.5, 0.5, 0.5, 0.4, 0.4, 0.4, 0.6, 0.6, 0.6]) },
    ];
    const buf = encodeBaked(entries);
    const out = decodeBaked(buf);
    expect(out.map((e) => e.kind ?? e.prop)).toEqual(["round", "autumn", "rock"]);
    // The two variants share one stored shape.
    expect(out[0].t.pos).toBe(out[1].t.pos);
    for (let i = 0; i < entries.length; i++) {
      const s = entries[i].t;
      const d = out[i].t;
      expect(Array.from(d.idx)).toEqual(Array.from(s.idx));
      expect(d.aspect).toBeCloseTo(s.aspect);
      for (let k = 0; k < s.pos.length; k++) expect(d.pos[k]).toBeCloseTo(s.pos[k], 3);
      // Colours within one sRGB step, including values above 1.
      for (let k = 0; k < s.col.length; k++) expect(Math.abs(d.col[k] - s.col[k])).toBeLessThan(0.02 * Math.max(1, s.col[k]));
    }
  });
});
