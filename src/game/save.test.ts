import { beforeEach, describe, expect, it } from "vitest";
import { loadSave, migrate, sanitizeProgress, sanitizeSettings, writeSave, defaultProgress, defaultSettings, SAVE_VERSION } from "./save";

const KEY = "skybound.test";

describe("save system", () => {
  beforeEach(() => localStorage.clear());

  it("returns defaults when nothing is saved", () => {
    const s = loadSave(KEY);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.progress).toEqual(defaultProgress());
  });

  it("round-trips progress and settings", () => {
    const p = { ...defaultProgress(), viewed: ["about", "project-risc-v"], tutorialDone: true, courses: { "canyon-run": { best: 42.5, medal: "silver" as const } } };
    const st = { ...defaultSettings(), quality: "low" as const, invertPitch: true };
    expect(writeSave({ v: 1, progress: p, settings: st }, KEY)).toBe(true);
    const back = loadSave(KEY);
    expect(back.progress.viewed).toEqual(p.viewed);
    expect(back.progress.courses["canyon-run"]).toEqual({ best: 42.5, medal: "silver" });
    expect(back.settings.quality).toBe("low");
    expect(back.settings.invertPitch).toBe(true);
  });

  it("survives corrupt JSON and keeps a copy for debugging", () => {
    localStorage.setItem(KEY, "{not json");
    const s = loadSave(KEY);
    expect(s.progress).toEqual(defaultProgress());
    expect(localStorage.getItem(`${KEY}.corrupt`)).toBe("{not json");
  });

  it("sanitises field-by-field instead of discarding everything", () => {
    const p = sanitizeProgress({
      viewed: ["about", 42, null, "about", "x".repeat(200)],
      collectibles: "nope",
      skin: "gold-plated",
      flightSeconds: Infinity,
      courses: { "canyon-run": { best: "fast" }, ok: { best: 30, medal: "platinum" } },
      tutorialDone: true,
    });
    expect(p.viewed).toEqual(["about"]);
    expect(p.collectibles).toEqual([]);
    expect(p.skin).toBe("classic");
    expect(p.flightSeconds).toBe(0);
    expect(p.courses).toEqual({ ok: { best: 30, medal: "finish" } });
    expect(p.tutorialDone).toBe(true);
    const s = sanitizeSettings({ quality: "ultra", masterVolume: 7, mouseSensitivity: -2, muted: "yes" });
    expect(s.quality).toBe("auto");
    expect(s.masterVolume).toBe(1);
    expect(s.mouseSensitivity).toBe(0.3);
    expect(s.muted).toBe(false);
  });

  it("migrates an unversioned (v0) save", () => {
    const m = migrate({ viewed: ["contact"], tutorialDone: true });
    expect(m.v).toBe(SAVE_VERSION);
    expect(m.progress.viewed).toEqual(["contact"]);
    expect(m.progress.tutorialDone).toBe(true);
  });
});
