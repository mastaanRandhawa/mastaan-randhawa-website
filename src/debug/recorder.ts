/**
 * Flight recorder for hunting visual glitches (open the game with ?debug=frames,
 * or set localStorage "skybound-debug" to "1"). It keeps a ring of recent frame
 * summaries and a log of notable events; warnings are always recorded, routine
 * events only while debugging. Everything can be copied or downloaded as JSON.
 */
export type Level = "info" | "warn";

export interface DiagEvent {
  /** Seconds since page load. */
  t: number;
  frame: number;
  level: Level;
  kind: string;
  detail?: Record<string, unknown>;
}

export interface FrameSummary {
  f: number;
  t: number;
  gapMs: number;
  calls: number;
  tris: number;
  blank: boolean;
  phase: string;
  stage: string | null;
  cam: [number, number, number];
}

function readDebugFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "frames") return true;
    return window.localStorage.getItem("skybound-debug") === "1";
  } catch {
    return false;
  }
}

export const DEBUG = readDebugFlag();

const MAX_EVENTS = 600;
const MAX_FRAMES = 240;

export const recorder = {
  frame: 0,
  events: [] as DiagEvent[],
  frames: [] as FrameSummary[],
  counts: {} as Record<string, number>,
  /** Static facts about this machine and session, filled in once the renderer exists. */
  env: {} as Record<string, unknown>,
};

const now = () => (typeof performance !== "undefined" ? performance.now() / 1000 : 0);

export function logEvent(kind: string, detail?: Record<string, unknown>, level: Level = "info") {
  if (level === "info" && !DEBUG) return;
  const e: DiagEvent = { t: +now().toFixed(3), frame: recorder.frame, level, kind, detail };
  recorder.events.push(e);
  if (recorder.events.length > MAX_EVENTS) recorder.events.splice(0, recorder.events.length - MAX_EVENTS);
  recorder.counts[kind] = (recorder.counts[kind] ?? 0) + 1;
  const tag = `%c[skybound] ${kind}`;
  const css = level === "warn" ? "color:#d9573f;font-weight:600" : "color:#2b5c8a";
  if (level === "warn") console.warn(tag, css, detail ?? "");
  else if (DEBUG) console.log(tag, css, detail ?? "");
}

export function pushFrame(s: FrameSummary) {
  recorder.frames.push(s);
  if (recorder.frames.length > MAX_FRAMES) recorder.frames.splice(0, recorder.frames.length - MAX_FRAMES);
}

export function exportLog(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      url: typeof location !== "undefined" ? location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      env: recorder.env,
      counts: recorder.counts,
      events: recorder.events,
      lastFrames: recorder.frames.slice(-90),
    },
    null,
    1,
  );
}

export function clearLog() {
  recorder.events.length = 0;
  recorder.frames.length = 0;
  for (const k of Object.keys(recorder.counts)) delete recorder.counts[k];
}

/** Short CSS-ish description of a DOM element for the log. */
export function describeEl(el: Element): string {
  const h = el as HTMLElement;
  const id = h.id ? `#${h.id}` : "";
  const cls = typeof h.className === "string" && h.className ? `.${h.className.trim().split(/\s+/).slice(0, 4).join(".")}` : "";
  const label = h.getAttribute?.("aria-label") ? `[${h.getAttribute("aria-label")}]` : "";
  const cs = typeof getComputedStyle !== "undefined" ? getComputedStyle(h) : null;
  const vis = cs ? ` op=${cs.opacity} bg=${cs.backgroundColor}` : "";
  return `${el.tagName.toLowerCase()}${id}${label}${cls}`.slice(0, 110) + vis;
}

/** What is stacked on screen at a few points (top-most first). */
export function screenStack(): Record<string, string[]> {
  if (typeof document === "undefined") return {};
  const W = window.innerWidth;
  const H = window.innerHeight;
  const pts: [string, number, number][] = [
    ["centre", W * 0.5, H * 0.5],
    ["upper-left", W * 0.25, H * 0.3],
    ["lower-right", W * 0.75, H * 0.72],
  ];
  const out: Record<string, string[]> = {};
  for (const [name, x, y] of pts) out[name] = document.elementsFromPoint(x, y).slice(0, 6).map(describeEl);
  return out;
}

if (typeof window !== "undefined") {
  (window as unknown as { __skyboundLog?: unknown }).__skyboundLog = { recorder, exportLog, clearLog, DEBUG };
}
