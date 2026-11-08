import { useEffect, useRef } from "react";
import { Camera as CameraIcon, LayoutGrid, Map, Pause, Volume2, VolumeX, Video } from "lucide-react";
import { Vector3 } from "three";
import { useGame } from "@/game/store";
import { onFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { tuning } from "@/game/gameplay";
import { currentMission, completion } from "@/game/progression";
import { courseById, destinationById, type World } from "@/world/world";
import { IconButton, Kbd, Label } from "../kit";
import { currentTarget } from "./target";

const v = new Vector3();

function Instruments() {
  const spd = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const boost = useRef<HTMLDivElement>(null);
  const spdBar = useRef<HTMLDivElement>(null);
  const vs = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const f = runtime.flight;
        const t = tuning();
        if (spd.current) spd.current.textContent = String(Math.round(f.speed * 1.94));
        if (alt.current) alt.current.textContent = Math.round(Math.max(0, f.y) * 3.28).toLocaleString();
        if (vs.current) vs.current.textContent = `${f.vy >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(f.vy * 196.85 / 100) * 100)}`;
        if (boost.current) {
          boost.current.style.transform = `scaleX(${f.boostEnergy})`;
          boost.current.style.backgroundColor = f.boosting ? "#ffcf70" : f.boostEnergy < 0.15 ? "#f2735a" : "#7fe3d8";
        }
        if (spdBar.current) spdBar.current.style.transform = `scaleX(${Math.min(1, f.speed / (t.maxSpeed * 1.1))})`;
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute bottom-5 left-5 flex gap-3 font-mono text-white max-sm:bottom-auto max-sm:left-auto max-sm:right-3 max-sm:top-[3.4rem] max-sm:origin-top-right max-sm:scale-[0.62] max-sm:gap-2" aria-hidden>
      <div className="rounded-2xl bg-[#1f3552]/55 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md">
        <Label className="text-white/60">Airspeed</Label>
        <div className="flex items-baseline gap-1">
          <span ref={spd} className="text-3xl font-semibold tabular-nums">0</span>
          <span className="text-[11px] text-white/70">kt</span>
        </div>
        <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/15">
          <div ref={spdBar} className="h-full origin-left rounded-full bg-white/80" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-white/60">BOOST</span>
          <div className="h-1.5 w-[4.5rem] overflow-hidden rounded-full bg-white/15">
            <div ref={boost} className="h-full origin-left rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-[#1f3552]/55 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md">
        <Label className="text-white/60">Altitude</Label>
        <div className="flex items-baseline gap-1">
          <span ref={alt} className="text-3xl font-semibold tabular-nums">0</span>
          <span className="text-[11px] text-white/70">ft</span>
        </div>
        <span ref={vs} className="text-[11px] tabular-nums text-white/70" />
      </div>
    </div>
  );
}

const COMPASS_W = 360;
function Compass() {
  const tape = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const hdg = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const bearing = ((((-runtime.pose.heading * 180) / Math.PI) % 360) + 360) % 360;
        const pxPerDeg = 3;
        if (tape.current) tape.current.style.transform = `translateX(${-bearing * pxPerDeg - 360 * pxPerDeg + COMPASS_W / 2}px)`;
        if (hdg.current) hdg.current.textContent = String(Math.round(bearing)).padStart(3, "0");
        const t = currentTarget();
        if (marker.current) {
          if (!t) marker.current.style.opacity = "0";
          else {
            const tb = (Math.atan2(t.x - runtime.pose.x, -(t.z - runtime.pose.z)) * 180) / Math.PI;
            let d = ((tb - bearing + 540) % 360) - 180;
            d = Math.max(-58, Math.min(58, d));
            marker.current.style.opacity = "1";
            marker.current.style.transform = `translateX(${d * pxPerDeg}px)`;
            marker.current.style.color = t.accent;
          }
        }
      }),
    [],
  );
  const ticks = [];
  for (let d = 0; d < 360 * 3; d += 15) {
    const deg = d % 360;
    const name = { 0: "N", 90: "E", 180: "S", 270: "W" }[deg as 0];
    ticks.push(
      <div key={d} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: d * 3 }}>
        <div className={name ? "h-3 w-0.5 bg-white" : deg % 45 === 0 ? "h-2.5 w-px bg-white/80" : "h-1.5 w-px bg-white/50"} />
        {name ? <span className="mt-0.5 text-[11px] font-bold text-white">{name}</span> : deg % 45 === 0 ? <span className="mt-0.5 text-[9px] text-white/70">{deg}</span> : null}
      </div>,
    );
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 hidden -translate-x-1/2 font-mono sm:block" aria-hidden>
      <div className="relative h-9 overflow-hidden rounded-full bg-[#1f3552]/45 ring-1 ring-white/15 backdrop-blur-md" style={{ width: COMPASS_W, maskImage: "linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)" }}>
        <div ref={tape} className="absolute left-0 top-1.5 h-full" style={{ width: 360 * 9 }}>
          {ticks}
        </div>
        <div ref={marker} className="absolute left-1/2 top-0 -ml-1.5 text-[#ffcf70]" style={{ opacity: 0 }}>
          <svg width="12" height="10" viewBox="0 0 12 10">
            <path d="M6 10 L0 0 H12 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-[#ffcf70]" />
      </div>
      <div className="mt-1 text-center text-[10px] text-white/80">
        HDG <span ref={hdg}>000</span>
      </div>
    </div>
  );
}

function Objective() {
  const progress = useGame((s) => s.progress);
  const course = useGame((s) => s.course);
  const waypoint = useGame((s) => s.waypoint);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const m = currentMission(progress);
  const pct = Math.round(completion(progress) * 100);
  const custom = waypoint ? destinationById(waypoint) : null;
  const c = course ? courseById(course.id) : null;
  return (
    <div className="absolute left-5 top-4 w-[min(300px,calc(100vw-2.5rem))] rounded-2xl bg-[#1f3552]/55 p-3.5 text-white ring-1 ring-white/15 backdrop-blur-md max-sm:left-3 max-sm:top-[3.4rem] max-sm:w-[54vw] max-sm:p-2.5 max-sm:text-[13px]" aria-live="polite">
      <div className="flex items-center justify-between">
        <Label className="text-[#ffcf70]">{c ? (c.timed ? "Course" : "Tutorial") : custom ? "Waypoint" : "Objective"}</Label>
        <span className="font-mono text-[10px] text-white/70">{pct}% explored</span>
      </div>
      {c ? (
        <>
          <p className="mt-1 font-semibold leading-snug">{c.name}</p>
          <p className="text-xs text-white/75">
            Ring {course!.next + 1} of {c.rings.length}
            {c.timed ? "" : " — follow the glowing rings"}
          </p>
        </>
      ) : custom ? (
        <>
          <p className="mt-1 font-semibold leading-snug">{custom.label}</p>
          <button onClick={() => setWaypoint(null)} className="pointer-events-auto text-xs text-white/70 underline underline-offset-2 hover:text-white">
            Clear waypoint
          </button>
        </>
      ) : m ? (
        <>
          <p className="mt-1 font-semibold leading-snug">{m.title}</p>
          <p className="text-xs leading-snug text-white/75">
            {m.detail}
            {m.progress ? ` (${m.progress(progress)[0]}/${m.progress(progress)[1]})` : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm">Every destination explored. Free flight!</p>
      )}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-[#ffcf70] transition-[width] duration-700" style={{ width: `${pct}%` }} />
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
    <div className="pointer-events-none absolute left-1/2 top-[70px] -translate-x-1/2 max-sm:top-[8.6rem] rounded-full bg-[#1f3552]/60 px-5 py-1.5 text-center font-mono text-white ring-1 ring-[#ffcf70]/50 backdrop-blur-md">
      <span ref={el} className="text-xl font-semibold tabular-nums">00:00.0</span>
      <span className="ml-3 text-[11px] text-white/70">
        gold ≤ {c.medals[0]}s
      </span>
    </div>
  );
}

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
          node.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1, 300 / dist + 0.6))})`;
          const dEl = node.querySelector("[data-d]") as HTMLElement | null;
          if (dEl) dEl.textContent = `${Math.round(Math.hypot(d.pos[0] - runtime.pose.x, d.pos[1] - runtime.pose.y, d.pos[2] - runtime.pose.z))} m`;
        });
      }),
    [world, show],
  );
  return (
    <div ref={root} className="pointer-events-none absolute inset-0" aria-hidden>
      {world.destinations.map((d) => {
        const key = d.kind === "project" ? `project-${d.contentId}` : d.kind === "skills" ? `skills-${d.contentId}` : d.kind;
        const seen = viewed.includes(key);
        return (
          <div key={d.id} className="absolute left-0 top-0 whitespace-nowrap text-center" style={{ opacity: 0 }}>
            <div className="rounded-full bg-[#1f3552]/60 px-3 py-1 font-mono text-[11px] text-white ring-1 backdrop-blur-sm" style={{ borderColor: d.accent, boxShadow: `inset 0 0 0 1px ${d.accent}88` }}>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: seen ? "#7dffb0" : d.accent }} />
              {d.label}
              <span data-d className="ml-2 text-white/60" />
            </div>
            <div className="mx-auto h-3 w-px bg-white/60" />
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
        if (text.current) text.current.textContent = `${Math.round(dist)} m`;
        if (onScreen) {
          m.style.opacity = "1";
          a.style.opacity = "0";
          m.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px)`;
          m.style.color = t.accent;
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
          a.style.color = t.accent;
        }
      }),
    [],
  );
  return (
    <>
      <div ref={marker} className="pointer-events-none absolute left-0 top-0 -ml-3 -mt-3 font-mono text-[#ffcf70]" style={{ opacity: 0 }} aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
        <span ref={text} className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded bg-[#1f3552]/60 px-1.5 text-[10px] text-white" />
      </div>
      <div ref={arrow} className="pointer-events-none absolute left-0 top-0 -ml-4 -mt-4 text-[#ffcf70]" style={{ opacity: 0 }} aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          <path d="M30 16 L8 4 L13 16 L8 28 Z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
}

function InteractPrompt() {
  const nearby = useGame((s) => s.nearby);
  const isTouch = useGame((s) => s.isTouch);
  const d = nearby ? destinationById(nearby) : null;
  if (!d) return null;
  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 sm:bottom-8">
      <div className="flex items-center gap-3 rounded-full bg-[#1f3552]/70 py-2 pl-2 pr-5 text-white ring-1 backdrop-blur-md" style={{ boxShadow: `inset 0 0 0 1px ${d.accent}` }}>
        {isTouch ? <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2735a] font-mono text-xs font-bold">TAP</span> : <Kbd className="h-8 min-w-8 bg-[#f2735a] text-sm">F</Kbd>}
        <div className="leading-tight">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">{d.sublabel}</p>
          <p className="font-semibold">Explore {d.label}</p>
        </div>
      </div>
    </div>
  );
}

function Reticle() {
  const mode = useGame((s) => s.settings.controlMode);
  const el = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        // Reticle shows the plane's projected aim; pointer handled by CSS cursor.
      }),
    [],
  );
  if (mode !== "mouse") return null;
  return (
    <div ref={el} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <svg width="44" height="44" viewBox="0 0 44 44" className="opacity-70">
        <circle cx="22" cy="22" r="14" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 5" />
        <circle cx="22" cy="22" r="2" fill="white" />
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
        el.current.style.opacity = String(Math.max(0, Math.min(1, o)));
      }),
    [],
  );
  return <div ref={el} className="pointer-events-none absolute inset-0 bg-[#fdf6ec]" style={{ opacity: 0 }} />;
}

function Corner() {
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
    <div className="absolute right-4 top-4 flex flex-col items-end gap-2 max-sm:right-3 max-sm:top-2">
      <div className="flex gap-2 max-sm:gap-1.5 [&>button]:max-sm:h-9 [&>button]:max-sm:w-9">
        <IconButton label="View classic portfolio" onClick={() => setMode("portfolio")}>
          <LayoutGrid size={16} />
        </IconButton>
        <IconButton label="World map (M)" onClick={() => setOverlay("map")}>
          <Map size={16} />
        </IconButton>
        <IconButton label="Change camera (C)" onClick={cycle}>
          <Video size={16} />
        </IconButton>
        <IconButton label="Photo mode (O)" onClick={() => setPhoto(true)}>
          <CameraIcon size={16} />
        </IconButton>
        <IconButton label={muted ? "Unmute" : "Mute"} onClick={() => update({ muted: !muted })}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </IconButton>
        <IconButton label="Pause (Esc)" onClick={() => setOverlay("pause")}>
          <Pause size={16} />
        </IconButton>
      </div>
      {fps && <span ref={fpsEl} className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white" />}
    </div>
  );
}

export function HUD({ world }: { world: World }) {
  const panel = useGame((s) => s.panel);
  const overlay = useGame((s) => s.overlay);
  const hide = !!panel || !!overlay;
  return (
    <div className={`absolute inset-0 transition-opacity duration-300 ${hide ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <Labels world={world} />
      <WaypointArrow />
      <Compass />
      <CourseTimer />
      <Objective />
      <Corner />
      <Instruments />
      <InteractPrompt />
      <Reticle />
      <RespawnFade />
    </div>
  );
}
