// @vitest-environment node
import { describe, expect, it } from "vitest";
import { portfolio } from "./portfolio";
import { evidenceFor } from "./evidence";

describe("portfolio content", () => {
  it("has unique ids", () => {
    const ids = [...portfolio.projects.map((p) => p.id), ...portfolio.credentials.map((c) => c.id), ...portfolio.flightLogs.map((l) => l.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses well-formed links", () => {
    const urls = [
      ...portfolio.projects.flatMap((p) => (p.link ? [p.link] : [])),
      ...portfolio.credentials.map((c) => c.url),
      portfolio.profile.links.github,
      portfolio.profile.links.linkedin,
      portfolio.profile.links.credentials,
    ];
    for (const u of urls) expect(() => new URL(u), u).not.toThrow();
    expect(portfolio.profile.links.email).toMatch(/^mailto:.+@.+\..+/);
    expect(portfolio.profile.links.resume).toMatch(/\.pdf$/);
  });

  it("keeps every site project from the original portfolio", () => {
    const titles = portfolio.projects.filter((p) => p.showOnSite).map((p) => p.title);
    for (const t of ["BC Tigers Tournament Hub", "Bao Bei Chinese Brasserie", "Lumière Salon", "AK Wraps & Customs", "RISC-V Processor", "LS Command Implementation", "Multi-Level Cache System", "Concurrent Data Communication", "IPC Implementation", "Ferrari Website", "Roar Cycle Website", "Logo Design Website"]) {
      expect(titles).toContain(t);
    }
  });

  it("documents a source for every highlight and outcome", () => {
    for (const p of portfolio.projects) {
      for (const h of [...p.highlights, ...(p.outcomes ?? [])]) expect(["site", "resume"]).toContain(h.source);
    }
  });

  it("finds real evidence for skills used in projects or roles", () => {
    const react = portfolio.skillCategories.flatMap((c) => c.skills).find((s) => s.name === "React.js")!;
    expect(evidenceFor(react).projects.map((p) => p.id)).toEqual(expect.arrayContaining(["bc-tigers", "bao-bei", "lumiere"]));
    const sql = portfolio.skillCategories.flatMap((c) => c.skills).find((s) => s.name === "SQL")!;
    expect(evidenceFor(sql).roles.map((r) => r.id)).toContain("data-engineer");
  });
});
