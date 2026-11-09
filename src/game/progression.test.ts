// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ALL_PROJECT_KEYS, ALL_SKILL_KEYS, MISSIONS, completion, currentMission, derivedAchievements, unlockedSkins } from "./progression";
import { defaultProgress } from "./save";
import { REGIONS } from "@/world/layout";
import { portfolio } from "@/content/portfolio";

describe("progression", () => {
  it("starts at the first mission with 0% completion", () => {
    const p = defaultProgress();
    expect(currentMission(p)?.id).toBe("m-takeoff");
    expect(completion(p)).toBe(0);
    expect(unlockedSkins(p)).toEqual(["classic"]);
  });

  it("walks the mission list in order", () => {
    const p = { ...defaultProgress(), achievements: ["first-flight"], tutorialDone: true };
    expect(currentMission(p)?.id).toBe("m-about");
    p.viewed = ["about"];
    expect(currentMission(p)?.id).toBe("m-skills");
  });

  it("derives achievements and skins from progress", () => {
    const p = {
      ...defaultProgress(),
      viewed: [...ALL_PROJECT_KEYS, ...ALL_SKILL_KEYS, "contact"],
      discoveredRegions: REGIONS.map((r) => r.id),
      collectibles: portfolio.flightLogs.map((l) => l.id),
      courses: { "canyon-run": { best: 20, medal: "gold" as const } },
    };
    const a = derivedAchievements(p);
    for (const id of ["polyglot", "code-reviewer", "explorer", "ace", "archivist", "hiring-signal"]) expect(a).toContain(id);
    expect(unlockedSkins(p).sort()).toEqual(["classic", "cloud", "midnight", "sunset"]);
  });

  it("reaches 100% only when everything is done", () => {
    const p = {
      ...defaultProgress(),
      viewed: [...ALL_PROJECT_KEYS, ...ALL_SKILL_KEYS, "about", "experience", "education", "achievements", "contact"],
      discoveredRegions: REGIONS.map((r) => r.id),
      collectibles: portfolio.flightLogs.map((l) => l.id),
    };
    expect(completion(p)).toBe(1);
    expect(MISSIONS.every((m) => m.id === "m-takeoff" || m.id === "m-tutorial" || m.done(p))).toBe(true);
  });
});
