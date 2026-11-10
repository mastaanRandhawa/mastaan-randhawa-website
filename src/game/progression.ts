import { portfolio } from "@/content/portfolio";
import { REGIONS } from "@/world/layout";
import type { Progress, SkinId } from "./save";

export const projectKey = (id: string) => `project-${id}`;
export const skillKey = (id: string) => `skills-${id}`;

export const ALL_PROJECT_KEYS = portfolio.projects.map((p) => projectKey(p.id));
export const ALL_SKILL_KEYS = portfolio.skillCategories.map((c) => skillKey(c.id));
const byCategory = (cat: string) => portfolio.projects.filter((p) => p.category === cat).map((p) => projectKey(p.id));

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: "plane" | "ring" | "roll" | "zap" | "school" | "map" | "code" | "layers" | "medal" | "book" | "mail" | "camera";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-flight", title: "Wheels Up", description: "Take off from the Launch Airfield.", icon: "plane" },
  { id: "first-ring", title: "Ring Rookie", description: "Fly through your first ring.", icon: "ring" },
  { id: "tutorial", title: "Flight School", description: "Complete the First Flight course.", icon: "school" },
  { id: "barrel-roll", title: "Barrel Roll", description: "Complete a full roll with Q or E.", icon: "roll" },
  { id: "speed", title: "Afterburner", description: "Boost to top speed.", icon: "zap" },
  { id: "polyglot", title: "Polyglot", description: "Visit every island in the Skills Archipelago.", icon: "layers" },
  { id: "code-reviewer", title: "Code Reviewer", description: "Open every project.", icon: "code" },
  { id: "explorer", title: "Cartographer", description: "Discover every region.", icon: "map" },
  { id: "ace", title: "Ace Pilot", description: "Earn a gold medal on any timed course.", icon: "medal" },
  { id: "archivist", title: "Archivist", description: "Collect every flight log.", icon: "book" },
  { id: "hiring-signal", title: "Hiring Signal", description: "Open the resume or contact details.", icon: "mail" },
];

export interface SkinDef {
  id: SkinId;
  name: string;
  unlock: string;
  body: string;
  accent: string;
  trim: string;
  wing: string;
  canopy: string;
}

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic Explorer", unlock: "Available from the start", body: "#f4ebd9", accent: "#e97959", trim: "#264b68", wing: "#f7f0e2", canopy: "#8fb0c6" },
  { id: "sunset", name: "Sunset Racer", unlock: "Finish any timed course", body: "#f3b25e", accent: "#e2674a", trim: "#fff4e3", wing: "#f7cd7c", canopy: "#7f8fae" },
  { id: "midnight", name: "Midnight Engineer", unlock: "Open all five Systems Canyon projects", body: "#2f5577", accent: "#5cc6bd", trim: "#ecc15a", wing: "#3a6488", canopy: "#a8dbe6" },
  { id: "cloud", name: "Cloud Navigator", unlock: "Discover every region", body: "#fffaf0", accent: "#72c2ea", trim: "#2f6496", wing: "#fffdf8", canopy: "#93b8d0" },
];

export function unlockedSkins(p: Progress): SkinId[] {
  const out: SkinId[] = ["classic"];
  const timed = ["canyon-run", "skyline-sprint", "summit-spiral"];
  if (timed.some((c) => p.courses[c])) out.push("sunset");
  if (byCategory("systems").every((k) => p.viewed.includes(k))) out.push("midnight");
  if (REGIONS.every((r) => p.discoveredRegions.includes(r.id))) out.push("cloud");
  return out;
}

/** Achievements derivable purely from progress (others are event-driven). */
export function derivedAchievements(p: Progress): string[] {
  const out: string[] = [];
  if (ALL_SKILL_KEYS.every((k) => p.viewed.includes(k))) out.push("polyglot");
  if (ALL_PROJECT_KEYS.every((k) => p.viewed.includes(k))) out.push("code-reviewer");
  if (REGIONS.every((r) => p.discoveredRegions.includes(r.id))) out.push("explorer");
  if (Object.values(p.courses).some((c) => c.medal === "gold")) out.push("ace");
  if (portfolio.flightLogs.every((l) => p.collectibles.includes(l.id))) out.push("archivist");
  if (p.viewed.includes("contact")) out.push("hiring-signal");
  if (p.tutorialDone) out.push("tutorial");
  return out;
}

export interface Mission {
  id: string;
  title: string;
  detail: string;
  /** Destination ids that satisfy / guide this mission. */
  targets: string[];
  done: (p: Progress) => boolean;
  progress?: (p: Progress) => [number, number];
}

const countViewed = (keys: string[]) => (p: Progress): [number, number] => [keys.filter((k) => p.viewed.includes(k)).length, keys.length];

export const MISSIONS: Mission[] = [
  { id: "m-takeoff", title: "Take to the skies", detail: "Lift off from the runway.", targets: [], done: (p) => p.achievements.includes("first-flight") },
  { id: "m-tutorial", title: "First Flight", detail: "Fly through the rings around the airfield.", targets: [], done: (p) => p.tutorialDone },
  { id: "m-about", title: "Meet the pilot", detail: "Open the Launch Airfield briefing.", targets: ["about"], done: (p) => p.viewed.includes("about") },
  { id: "m-skills", title: "Survey the Skills Archipelago", detail: "Visit all four skill islands.", targets: ALL_SKILL_KEYS, done: (p) => ALL_SKILL_KEYS.every((k) => p.viewed.includes(k)), progress: countViewed(ALL_SKILL_KEYS) },
  { id: "m-harbor", title: "Tour Doxa Studios Harbor", detail: "Open the four client projects.", targets: byCategory("client"), done: (p) => byCategory("client").every((k) => p.viewed.includes(k)), progress: countViewed(byCategory("client")) },
  { id: "m-canyon", title: "Explore Systems Canyon", detail: "Open the five C/C++ systems projects.", targets: byCategory("systems"), done: (p) => byCategory("systems").every((k) => p.viewed.includes(k)), progress: countViewed(byCategory("systems")) },
  { id: "m-city", title: "Clock in at Experience City", detail: `Visit the ${portfolio.company.name} HQ.`, targets: ["experience"], done: (p) => p.viewed.includes("experience") },
  { id: "m-observatory", title: "Visit the Observatory", detail: "See the Amenity Recommender data project.", targets: byCategory("data"), done: (p) => byCategory("data").every((k) => p.viewed.includes(k)) },
  { id: "m-gardens", title: "Wander the Frontend Gardens", detail: "Open the three early web projects.", targets: byCategory("web"), done: (p) => byCategory("web").every((k) => p.viewed.includes(k)), progress: countViewed(byCategory("web")) },
  { id: "m-summit", title: "Reach the Education Summit", detail: "Land the campus checkpoint at the peak.", targets: ["education"], done: (p) => p.viewed.includes("education") },
  { id: "m-peaks", title: "Climb Achievement Peaks", detail: "See certifications and leadership.", targets: ["achievements"], done: (p) => p.viewed.includes("achievements") },
  { id: "m-contact", title: "Make contact", detail: "Finish at the Contact Airfield.", targets: ["contact"], done: (p) => p.viewed.includes("contact") },
];

export function currentMission(p: Progress): Mission | null {
  return MISSIONS.find((m) => !m.done(p)) ?? null;
}

export function completion(p: Progress): number {
  const total = REGIONS.length + ALL_PROJECT_KEYS.length + ALL_SKILL_KEYS.length + 5 + portfolio.flightLogs.length;
  const got =
    p.discoveredRegions.length +
    ALL_PROJECT_KEYS.filter((k) => p.viewed.includes(k)).length +
    ALL_SKILL_KEYS.filter((k) => p.viewed.includes(k)).length +
    ["about", "experience", "education", "achievements", "contact"].filter((k) => p.viewed.includes(k)).length +
    p.collectibles.length;
  return Math.min(1, got / total);
}
