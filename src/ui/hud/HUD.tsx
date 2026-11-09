import { useEffect, useMemo, useRef } from "react";
import { Camera as CameraIcon, LayoutGrid, Map, Pause, Video, Volume2, VolumeX } from "lucide-react";
import { Vector3 } from "three";
import { useGame } from "@/game/store";
import { onFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { currentMission, completion, MISSIONS } from "@/game/progression";
import { courseById, destinationById, type World } from "@/world/world";
import { IconButton, Kbd } from "../kit";
import { currentTarget } from "./target";

const v = new Vector3();
const CREAM = "#f4ead5";
const CORAL = "#f2735a";

// ── Instrument tapes ─────────────────────────────────────────────────────────

interface TapeSpec {
  /** Pixels per unit along the tape. */
  ppu: number;
  max: number;
  minor: number;
  major: number;
  label: number;
  fmt?: (n: number) => string;
}

const TAPE_H = 128;

/** A vertical scrolling scale with a fixed readout window, like a PFD tape. */
function Tape({ spec, valueRef, readoutRef, side }: { spec: TapeSpec; valueRef: React.RefObject<HTMLDivElement>; readoutRef: React.RefObject<HTMLSpanElement>; side: "left" | "right" }) {
  const ticks = useMemo(() => {
    const out: JSX.Element[] = [];
    for (let n = 0; n <= spec.max; n += spec.minor) {
      const major = n % spec.major === 0;
      const labelled = n % spec.label === 0;
      out.push(
        <div key={n} className="absolute flex items-center" style={{ bottom: n * spec.ppu, [side === "left" ? "right" : "left"]: 0, transform: "translateY(50%)", flexDirection: side === "left" ? "row" : "row-reverse" }}>
          {labelled && <span className="font-instrument px-1.5 text-[10px] text-[#f4ead5]/70">{spec.fmt ? spec.fmt(n) : n}</span>}
          <span className="block h-px bg-[#f4ead5]" style={{ width: major ? 9 : 5, opacity: major ? 0.75 : 0.4 }} />
        </div>,
      );
    }
    return out;
  }, [spec, side]);
  return (
    <div className="relative overflow-hidden" style={{ height: TAPE_H, width: 66, maskImage: "linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent)" }}>
      <div ref={valueRef} className="absolute inset-x-0 bottom-0" style={{ height: spec.max * spec.ppu, willChange: "transform" }}>
        {ticks}
      </div>
      {/* Readout window with a pointer toward the scale. */}
      <div className={`absolute top-1/2 flex h-[26px] -translate-y-1/2 items-center ${side === "left" ? "left-0 pr-2.5" : "right-0 pl-2.5"}`}>
        <div className="relative flex h-full items-center rounded-[4px] bg-[#0b1220] px-1.5 shadow-[inset_0_0_0_1px_rgba(244,234,213,0.55)]">
          <span ref={readoutRef} className="font-instrument min-w-[3ch] text-right text-[17px] font-semibold leading-none text-[#fbf6ec]">
            0
          </span>
          <span
            className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#0b1220] ${side === "left" ? "-right-[4.5px] shadow-[1px_-1px_0_rgba(244,234,213,0.55)]" : "-left-[4.5px] shadow-[-1px_1px_0_rgba(244,234,213,0.55)]"}`}
          />
        </div>
      </div>
    </div>
  );
}

const IAS: TapeSpec = { ppu: 2.4, max: 260, minor: 5, major: 10, label: 20 };
const ALT: TapeSpec = { ppu: 0.2, max: 6000, minor: 50, major: 100, label: 200, fmt: (n) => (n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, "0")}` : String(n)) };
const BOOST_SEGMENTS = 12;

/** Airspeed and altitude tapes, vertical speed, boost reserve. */
function Instruments() {
  const iasTape = useRef<HTMLDivElement>(null);
  const altTape = useRef<HTMLDivElement>(null);
  const ias = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const vs = useRef<HTMLSpanElement>(null);
  const boostSegs = useRef<HTMLDivElement>(null);
  const boostLabel = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const f = runtime.flight;
        const kt = f.speed * 1.94;
        const ft = Math.max(0, f.y) * 3.28;
        if (iasTape.current) iasTape.current.style.transform = `translateY(${kt * IAS.ppu - TAPE_H / 2}px)`;
        if (altTape.current) altTape.current.style.transform = `translateY(${ft * ALT.ppu - TAPE_H / 2}px)`;
        if (ias.current) ias.current.textContent = String(Math.round(kt));
        if (alt.current) alt.current.textContent = Math.round(ft).toLocaleString("en-US");
        if (vs.current) {
          const fpm = Math.round((f.vy * 196.85) / 50) * 50;
          vs.current.textContent = `${fpm > 0 ? "+" : fpm < 0 ? "−" : " "}${Math.abs(fpm)}`;
        }
        const segs = boostSegs.current?.children;
        if (segs) {
          const lit = Math.round(f.boostEnergy * BOOST_SEGMENTS);
          const color = f.boostLock ? "#d9573f" : f.boosting ? CORAL : CREAM;
          for (let i = 0; i < segs.length; i++) {
            const s = segs[i] as HTMLElement;
            s.style.backgroundColor = i < lit ? color : "rgba(244,234,213,0.14)";
          }
        }
        if (boostLabel.current) boostLabel.current.textContent = f.boostLock ? "Recharging" : f.boosting ? "Boost on" : "Boost";
      }),
    [],
  );
  return (
    <div
      className="font-sf mat-dark pointer-events-none absolute bottom-5 left-5 rounded-[12px] px-3 pb-2.5 pt-2 max-sm:bottom-auto max-sm:left-auto max-sm:right-3 max-sm:top-[3.6rem] max-sm:origin-top-right max-sm:scale-[0.62]"
      aria-hidden
    >
      <div className="flex gap-3">
        <div>
          <p className="legend mb-1 text-[#f4ead5]/55">Airspeed kt</p>
          <Tape spec={IAS} valueRef={iasTape} readoutRef={ias} side="left" />
        </div>
        <div className="w-px self-stretch bg-[#f4ead5]/10" />
        <div>
          <p className="legend mb-1 text-right text-[#f4ead5]/55">Alt ft</p>
          <Tape spec={ALT} valueRef={altTape} readoutRef={alt} side="right" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#f4ead5]/10 pt-2">
        <div className="flex flex-col gap-1">
          <span ref={boostLabel} className="legend text-[#f4ead5]/55">
            Boost
          </span>
          <div ref={boostSegs} className="flex gap-[2px]">
            {Array.from({ length: BOOST_SEGMENTS }, (_, i) => (
              <span key={i} className="h-[6px] w-[5px] rounded-[1px]" />
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className="legend block text-[#f4ead5]/55">V/S fpm</span>
          <span ref={vs} className="font-instrument text-[13px] text-[#fbf6ec]" />
        </div>
      </div>
    </div>
  );
}

// ── Heading tape ─────────────────────────────────────────────────────────────

const HDG_W = 380;
const PX_PER_DEG = 3.2;
function Compass() {
  const tape = useRef<HTMLDivElement>(null);
  const bug = useRef<HTMLDivElement>(null);
  const hdg = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const bearing = ((((-runtime.pose.heading * 180) / Math.PI) % 360) + 360) % 360;
        if (tape.current) tape.current.style.transform = `translateX(${-(bearing + 360) * PX_PER_DEG + HDG_W / 2}px)`;
        if (hdg.current) hdg.current.textContent = String(Math.round(bearing) % 360).padStart(3, "0");
        const t = currentTarget();
        if (bug.current) {
          if (!t) bug.current.style.opacity = "0";
          else {
            const tb = (Math.atan2(t.x - runtime.pose.x, -(t.z - runtime.pose.z)) * 180) / Math.PI;
            const d = ((tb - bearing + 540) % 360) - 180;
            const lim = HDG_W / 2 / PX_PER_DEG - 6;
            const c = Math.max(-lim, Math.min(lim, d));
            bug.current.style.opacity = "1";
            bug.current.style.transform = `translateX(${c * PX_PER_DEG}px)`;
            bug.current.dataset.edge = Math.abs(d) > lim ? (d > 0 ? "r" : "l") : "";
          }
        }
      }),
    [],
  );
  const ticks = useMemo(() => {
    const out: JSX.Element[] = [];
    for (let d = 0; d < 360 * 3; d += 5) {
      const deg = d % 360;
      const card = { 0: "N", 90: "E", 180: "S", 270: "W" }[deg as 0];
      const major = deg % 10 === 0;
      const lab = deg % 30 === 0;
      out.push(
        <div key={d} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: d * PX_PER_DEG }}>
          {lab && (
            <span className={`font-instrument mb-[3px] text-[10.5px] leading-none ${card ? "font-semibold text-[#fbf6ec]" : "text-[#f4ead5]/65"}`}>{card ?? String(deg / 10).padStart(2, "0")}</span>
          )}
          <span className="block w-px bg-[#f4ead5]" style={{ height: lab ? 8 : major ? 6 : 3.5, opacity: lab ? 0.8 : major ? 0.5 : 0.3 }} />
        </div>,
      );
    }
    return out;
  }, []);
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 hidden -translate-x-1/2 flex-col items-center sm:flex" aria-hidden>
      <div className="mat-dark relative h-[34px] overflow-hidden rounded-[8px]" style={{ width: HDG_W }}>
        <div className="absolute inset-0" style={{ maskImage: "linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)" }}>
          <div ref={tape} className="absolute bottom-[3px] left-0 h-full" style={{ width: 360 * 3 * PX_PER_DEG, willChange: "transform" }}>
            {ticks}
          </div>
        </div>
        {/* Target bug */}
        <div ref={bug} className="absolute left-1/2 top-0 -ml-[6px] h-full w-3" style={{ opacity: 0 }}>
          <svg width="12" height="9" viewBox="0 0 12 9" className="absolute top-0">
            <path d="M0 0 H12 V3 L6 9 L0 3 Z" fill={CORAL} />
          </svg>
        </div>
        {/* Lubber line */}
        <span className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[#f2735a]/80" />
      </div>
      <div className="mat-dark -mt-px flex items-baseline gap-1 rounded-b-[6px] px-2 pb-[3px] pt-[2px]">
        <span ref={hdg} className="font-instrument text-[13px] font-semibold text-[#fbf6ec]">
          000
        </span>
        <span className="font-instrument text-[10px] text-[#f4ead5]/55">°</span>
      </div>
    </div>
  );
}

// ── Flight strip (objective) ─────────────────────────────────────────────────

function Objective() {
  const progress = useGame((s) => s.progress);
  const course = useGame((s) => s.course);
  const waypoint = useGame((s) => s.waypoint);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const m = currentMission(progress);
  const pct = Math.round(completion(progress) * 100);
  const custom = waypoint ? destinationById(waypoint) : null;
  const c = course ? courseById(course.id) : null;
  const kind = c ? (c.timed ? "Timed course" : "Flight school") : custom ? "Waypoint" : "Next leg";
  const leg = m ? MISSIONS.indexOf(m) + 1 : MISSIONS.length;
  const [have, need] = c ? [course!.next, c.rings.length] : m?.progress ? m.progress(progress) : [0, 0];
  return (
    <div
      className="font-sf mat-light absolute left-5 top-4 flex w-[min(340px,calc(100vw-2.5rem))] overflow-hidden rounded-[6px] max-sm:left-3 max-sm:top-[3.6rem] max-sm:w-[58vw]"
      aria-live="polite"
    >
      <span className="w-[5px] shrink-0 bg-[#f2735a]" />
      <div className="flex w-[64px] shrink-0 flex-col justify-between border-r border-dashed border-[#1f3552]/20 px-2.5 py-2 max-sm:hidden">
        <span className="legend text-[9px] text-[#5d6b80]">Leg</span>
        <span className="font-instrument text-[19px] font-semibold leading-none text-[#1f3552]">
          {String(Math.min(leg, MISSIONS.length)).padStart(2, "0")}
          <span className="text-[11px] font-normal text-[#5d6b80]">/{MISSIONS.length}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="legend text-[9px] text-[#b4442c]">{kind}</span>
          <span className="font-instrument text-[10.5px] text-[#5d6b80]">{pct}% logged</span>
        </div>
        {c ? (
          <>
            <p className="mt-0.5 truncate text-[14.5px] font-semibold leading-snug text-[#1f3552]">{c.name}</p>
            <p className="text-[12px] leading-snug text-[#5d6b80]">Ring {course!.next + 1} of {c.rings.length}{c.timed ? "" : ", follow the lit rings"}</p>
          </>
        ) : custom ? (
          <>
            <p className="mt-0.5 truncate text-[14.5px] font-semibold leading-snug text-[#1f3552]">{custom.label}</p>
            <button onClick={() => setWaypoint(null)} className="pointer-events-auto text-[12px] font-medium text-[#2b5c8a] underline-offset-2 hover:underline">
              Clear waypoint
            </button>
          </>
        ) : m ? (
          <>
            <p className="mt-0.5 truncate text-[14.5px] font-semibold leading-snug text-[#1f3552]">{m.title}</p>
            <p className="line-clamp-2 text-[12px] leading-snug text-[#5d6b80]">{m.detail}</p>
          </>
        ) : (
          <p className="mt-0.5 text-[14px] font-semibold text-[#1f3552]">Every destination logged. Free flight.</p>
        )}
        {need > 0 && (
          <div className="mt-1.5 flex gap-[3px]" aria-label={`${have} of ${need}`}>
            {Array.from({ length: need }, (_, i) => (
              <span key={i} className="h-[5px] flex-1 rounded-[1px]" style={{ backgroundColor: i < have ? "#1f3552" : "rgba(31,53,82,0.13)" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseTimer() {
  const course = useGame((s) => s.course);
  const el = useRef<HTMLSpanElement>(null);
  const c = course ? courseById(course.id) : null;
  useEffect(
    () =>
      onFrame(() => {
        if (el.current) {
          const t = runtime.courseTime;
          el.current.textContent = `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
        }
      }),
    [],
  );
  if (!c?.timed) return null;
  return (
    <div className="font-sf mat-dark pointer-events-none absolute left-1/2 top-[76px] flex -translate-x-1/2 items-center gap-3 rounded-[8px] py-1.5 pl-3 pr-1.5 max-sm:top-[9rem]">
      <span ref={el} className="font-instrument text-[20px] font-semibold text-[#fbf6ec]">
        00:00.0
      </span>
      <span className="legend rounded-[5px] bg-[#e6b64c]/15 px-2 py-1 text-[#f1cd7a]">Gold ≤ {c.medals[0]}s</span>
    </div>
  );
}

// ── World markers ────────────────────────────────────────────────────────────

function Labels({ world }: { world: World }) {
  const root = useRef<HTMLDivElement>(null);
  const show = useGame((s) => s.settings.showLabels);
  const viewed = useGame((s) => s.progress.viewed);
  useEffect(
    () =>
      onFrame((camera) => {
        const el = root.current;
        if (!el) return;
        const W = window.innerWidth;
        const H = window.innerHeight;
        world.destinations.forEach((d, i) => {
          const node = el.children[i] as HTMLElement | undefined;
          if (!node) return;
          v.set(d.pos[0], d.pos[1] + 6, d.pos[2]);
          const dist = v.distanceTo(camera.position);
          v.project(camera);
          const on = show && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 1100 && dist > 25;
          if (!on) {
            node.style.opacity = "0";
            return;
          }
          const op = Math.min(1, (1100 - dist) / 300) * Math.min(1, (dist - 25) / 40);
          node.style.opacity = String(op);
          node.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -100%) scale(${Math.max(0.8, Math.min(1, 300 / dist + 0.6))})`;
          const dEl = node.querySelector("[data-d]") as HTMLElement | null;
          if (dEl) dEl.textContent = `${Math.round(Math.hypot(d.pos[0] - runtime.pose.x, d.pos[1] - runtime.pose.y, d.pos[2] - runtime.pose.z))}m`;
        });
      }),
    [world, show],
  );
  return (
    <div ref={root} className="font-sf pointer-events-none absolute inset-0" aria-hidden>
      {world.destinations.map((d) => {
        const key = d.kind === "project" ? `project-${d.contentId}` : d.kind === "skills" ? `skills-${d.contentId}` : d.kind;
        const seen = viewed.includes(key);
        return (
          <div key={d.id} className="absolute left-0 top-0 flex flex-col items-center whitespace-nowrap" style={{ opacity: 0 }}>
            <div className="mat-dark flex items-center gap-1.5 rounded-[5px] py-[3px] pl-1.5 pr-2 text-[11.5px] font-semibold">
              {seen ? (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M1.5 5.2 4 7.6 8.6 2.6" fill="none" stroke="#9fd8a8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: d.accent }} />
              )}
              <span className={seen ? "text-[#f4ead5]/70" : "text-[#fbf6ec]"}>{d.label}</span>
              <span data-d className="font-instrument text-[10px] font-normal text-[#f4ead5]/50" />
            </div>
            <div className="h-3.5 w-px bg-[#f4ead5]/60" />
            <div className="h-[7px] w-[7px] rotate-45 bg-[#fbf6ec] shadow-[0_0_0_1.5px_rgba(13,21,35,0.5)]" />
          </div>
        );
      })}
    </div>
  );
}

function WaypointArrow() {
  const marker = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame((camera) => {
        const t = currentTarget();
        const m = marker.current;
        const a = arrow.current;
        if (!m || !a) return;
        if (!t || runtime.phase !== "flying") {
          m.style.opacity = "0";
          a.style.opacity = "0";
          return;
        }
        const W = window.innerWidth;
        const H = window.innerHeight;
        v.set(t.x, t.y, t.z);
        const dist = Math.hypot(t.x - runtime.pose.x, t.y - runtime.pose.y, t.z - runtime.pose.z);
        v.project(camera);
        const behind = v.z > 1;
        const onScreen = !behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.88;
        if (text.current) text.current.textContent = `${Math.round(dist)}m`;
        if (onScreen) {
          m.style.opacity = "1";
          a.style.opacity = "0";
          m.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
        } else {
          m.style.opacity = "0";
          a.style.opacity = "1";
          let x = v.x;
          let y = v.y;
          if (behind) {
            x = -x;
            y = -y;
          }
          const ang = Math.atan2(y, x);
          const r = Math.min(W, H) * 0.42;
          const cx = W / 2 + Math.cos(ang) * r * (W / Math.min(W, H)) * 0.9;
          const cy = H / 2 - Math.sin(ang) * r;
          a.style.transform = `translate(${cx}px, ${cy}px) rotate(${-ang}rad)`;
        }
      }),
    [],
  );
  return (
    <>
      <div ref={marker} className="pointer-events-none absolute left-0 top-0 -ml-[13px] -mt-[13px]" style={{ opacity: 0 }} aria-hidden>
        <svg width="26" height="26" viewBox="0 0 26 26" className="drop-shadow-[0_2px_6px_rgba(13,21,35,0.55)]">
          <path d="M13 1.5 24.5 13 13 24.5 1.5 13Z" fill="none" stroke={CORAL} strokeWidth="2" />
          <path d="M13 8 18 13 13 18 8 13Z" fill="#fbf6ec" />
        </svg>
        <span ref={text} className="font-instrument mat-dark absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-1.5 py-px text-[10.5px]" />
      </div>
      <div ref={arrow} className="pointer-events-none absolute left-0 top-0 -ml-[17px] -mt-[17px]" style={{ opacity: 0 }} aria-hidden>
        <div className="mat-dark grid h-[34px] w-[34px] place-items-center rounded-[8px]">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M5 2.5 L11 8 L5 13.5" fill="none" stroke={CORAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}

function InteractPrompt() {
  const nearby = useGame((s) => s.nearby);
  const isTouch = useGame((s) => s.isTouch);
  const visiting = useGame((s) => !!s.visit);
  const d = nearby ? destinationById(nearby) : null;
  if (!d || visiting) return null;
  return (
    <div className="font-sf pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 sm:bottom-7">
      <div className="mat-dark flex items-stretch overflow-hidden rounded-[10px]">
        <span className="w-[4px] bg-[#f2735a]" />
        <div className="flex items-center gap-3 py-2 pl-3 pr-4">
          {isTouch ? <span className="keycap h-8 px-2.5 text-[12px]">Tap</span> : <Kbd className="h-8 min-w-8 text-[14px]">F</Kbd>}
          <div className="leading-tight">
            <p className="legend text-[9.5px] text-[#f4ead5]/55">{d.sublabel}</p>
            <p className="text-[14.5px] font-semibold text-[#fbf6ec]">Land at {d.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Reticle() {
  const mode = useGame((s) => s.settings.controlMode);
  if (mode !== "mouse") return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <svg width="46" height="46" viewBox="0 0 46 46" className="opacity-85 drop-shadow-[0_1px_2px_rgba(13,21,35,0.6)]">
        <path d="M23 6v8M23 32v8M6 23h8M32 23h8" stroke="#fbf6ec" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="23" cy="23" r="2" fill={CORAL} />
      </svg>
    </div>
  );
}

function RespawnFade() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        if (!el.current) return;
        const t = runtime.respawnT;
        const o = runtime.phase === "respawning" ? (t > 0.65 ? (1.3 - t) / 0.65 : t / 0.65) : 0;
        el.current.style.opacity = String(Math.max(0, Math.min(1, Math.max(o, runtime.flash * 0.85))));
      }),
    [],
  );
  return <div ref={el} className="pointer-events-none absolute inset-0 bg-[#fbf6ec]" style={{ opacity: 0 }} />;
}

/** Instrument-glass toolbar. */
function Toolbar() {
  const setOverlay = useGame((s) => s.setOverlay);
  const muted = useGame((s) => s.settings.muted);
  const update = useGame((s) => s.updateSettings);
  const cycle = useGame((s) => s.cycleCamera);
  const setPhoto = useGame((s) => s.setPhoto);
  const setMode = useGame((s) => s.setMode);
  const fps = useGame((s) => s.settings.showFps);
  const fpsEl = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        if (fpsEl.current) fpsEl.current.textContent = `${Math.round(runtime.fps)} fps`;
      }),
    [],
  );
  return (
    <div className="font-sf pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-1.5 max-sm:right-3 max-sm:top-2">
      <div className="mat-dark flex items-center gap-0.5 rounded-[10px] p-1">
        <IconButton label="View classic portfolio" onClick={() => setMode("portfolio")}>
          <LayoutGrid size={16} strokeWidth={1.9} />
        </IconButton>
        <IconButton label="World map (M)" onClick={() => setOverlay("map")}>
          <Map size={16} strokeWidth={1.9} />
        </IconButton>
        <IconButton label="Change camera (C)" onClick={cycle}>
          <Video size={16} strokeWidth={1.9} />
        </IconButton>
        <IconButton label="Photo mode (O)" onClick={() => setPhoto(true)}>
          <CameraIcon size={16} strokeWidth={1.9} />
        </IconButton>
        <IconButton label={muted ? "Unmute" : "Mute"} onClick={() => update({ muted: !muted })}>
          {muted ? <VolumeX size={16} strokeWidth={1.9} /> : <Volume2 size={16} strokeWidth={1.9} />}
        </IconButton>
        <span className="mx-1 h-5 w-px bg-[#f4ead5]/15" />
        <IconButton label="Pause (Esc)" onClick={() => setOverlay("pause")} className="text-[#f2735a] hover:text-[#ff8c75]">
          <Pause size={16} strokeWidth={2.4} />
        </IconButton>
      </div>
      {fps && <span ref={fpsEl} className="font-instrument mat-dark rounded-[5px] px-1.5 py-px text-[10px] text-[#f4ead5]/80" />}
    </div>
  );
}

export function HUD({ world }: { world: World }) {
  const panel = useGame((s) => s.panel);
  const overlay = useGame((s) => s.overlay);
  const hide = !!panel || !!overlay;
  return (
    // The HUD layer is click-through so drags and mouse steering reach the 3D canvas;
    // only its real controls opt back in to pointer events.
    <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${hide ? "opacity-0 [&_*]:!pointer-events-none" : "opacity-100"}`}>
      <Labels world={world} />
      <WaypointArrow />
      <Compass />
      <CourseTimer />
      <Objective />
      <Toolbar />
      <Instruments />
      <InteractPrompt />
      <Reticle />
      <RespawnFade />
    </div>
  );
}
