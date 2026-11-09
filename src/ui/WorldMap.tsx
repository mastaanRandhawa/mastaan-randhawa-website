import { motion } from "framer-motion";
import { MapPin, Navigation, PlaneLanding, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { onFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { REGIONS } from "@/world/layout";
import { startVisit } from "@/game/visit";
import type { World } from "@/world/world";
import type { Destination } from "@/world/defs";
import { Button, IconTile, NavBar } from "./kit";
import { audio } from "@/game/audio";

const VB = { x: -1150, y: -1080, w: 2300, h: 2000 };
const MONO = `"Azeret Mono", ui-monospace, monospace`;
const DISPLAY = `"Playfair Display", Georgia, serif`;

/** Irregular island outline around a centre (deterministic per seed). */
function islandPath(cx: number, cy: number, r: number, seed: number) {
  const pts: string[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + Math.sin(a * 3 + seed) * 0.07 + Math.sin(a * 5 + seed * 1.7) * 0.05 + Math.sin(a * 2 + seed * 0.3) * 0.04;
    pts.push(`${(cx + Math.cos(a) * r * k).toFixed(1)} ${(cy + Math.sin(a) * r * k).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

export function WorldMap({ world }: { world: World }) {
  const setOverlay = useGame((s) => s.setOverlay);
  const progress = useGame((s) => s.progress);
  const waypoint = useGame((s) => s.waypoint);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const [sel, setSel] = useState<Destination | null>(null);
  const player = useRef<SVGGElement>(null);

  useEffect(
    () =>
      onFrame(() => {
        const p = runtime.pose;
        player.current?.setAttribute("transform", `translate(${p.x} ${p.z}) rotate(${(-p.heading * 180) / Math.PI})`);
      }),
    [],
  );

  const viewedKey = (d: Destination) => (d.kind === "project" ? `project-${d.contentId}` : d.kind === "skills" ? `skills-${d.contentId}` : d.kind);
  const canFly = runtime.phase === "flying" || runtime.phase === "visit";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-sf fixed inset-0 z-40 flex items-center justify-center bg-[#0d1523]/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="World map"
      onClick={(e) => e.target === e.currentTarget && setOverlay(null)}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative flex h-full max-h-[860px] w-full max-w-[1100px] flex-col overflow-hidden rounded-[16px] bg-[#f3ecdf] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]"
      >
        <NavBar title="Chart" onDone={() => setOverlay(null)} />
        <p className="-mt-1 pb-2 text-center text-[13px] text-[#5d6b80]">
          {progress.discoveredRegions.length} of {REGIONS.length} regions charted · Select a field to fly there
        </p>
        <div className="relative mx-3 mb-3 flex-1 overflow-hidden rounded-[10px] bg-[#f6efe0] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.14)]">
          <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="h-full w-full" role="img" aria-label="Chart of regions">
            <defs>
              <pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="22" stroke="#1f3552" strokeOpacity="0.12" strokeWidth="4" />
              </pattern>
            </defs>
            <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="#f6efe0" />
            {/* Chart grid with lettered columns and numbered rows. */}
            {Array.from({ length: 12 }, (_, i) => VB.x + 50 + i * 200).map((x, i) => (
              <g key={`gx${i}`}>
                <line x1={x} y1={VB.y} x2={x} y2={VB.y + VB.h} stroke="#1f3552" strokeOpacity="0.07" strokeWidth="3" />
                <text x={x + 100} y={VB.y + 46} textAnchor="middle" fontFamily={MONO} fontSize="26" fill="#1f3552" fillOpacity="0.35">
                  {String.fromCharCode(65 + i)}
                </text>
              </g>
            ))}
            {Array.from({ length: 10 }, (_, i) => VB.y + 80 + i * 200).map((y, i) => (
              <g key={`gy${i}`}>
                <line x1={VB.x} y1={y} x2={VB.x + VB.w} y2={y} stroke="#1f3552" strokeOpacity="0.07" strokeWidth="3" />
                <text x={VB.x + 26} y={y + 110} fontFamily={MONO} fontSize="26" fill="#1f3552" fillOpacity="0.35">
                  {i + 1}
                </text>
              </g>
            ))}
            {/* Airways from the launch field. */}
            {REGIONS.filter((r) => r.id !== "launch").map((r) => (
              <line key={r.id} x1={0} y1={0} x2={r.center[0]} y2={r.center[2]} stroke="#1f3552" strokeOpacity="0.28" strokeWidth="3.5" strokeDasharray="22 14" />
            ))}
            {REGIONS.map((r) => {
              const found = progress.discoveredRegions.includes(r.id);
              const R = r.radius * 0.72;
              return (
                <g key={r.id}>
                  <path d={islandPath(r.center[0], r.center[2], R, r.order + 3)} fill={found ? r.accent : "url(#hatch)"} fillOpacity={found ? 0.2 : 1} stroke="#1f3552" strokeOpacity={found ? 0.55 : 0.25} strokeWidth="3.5" strokeDasharray={found ? undefined : "10 10"} />
                  {found && <path d={islandPath(r.center[0], r.center[2], R * 0.62, r.order + 9)} fill="none" stroke="#1f3552" strokeOpacity="0.16" strokeWidth="3" />}
                  <text x={r.center[0]} y={r.center[2] - R - 46} textAnchor="middle" fontFamily={DISPLAY} fontStyle="italic" fontWeight={700} fontSize="44" fill="#1f3552" fillOpacity={found ? 0.95 : 0.4}>
                    {found ? r.name : "Uncharted"}
                  </text>
                  {found && (
                    <text x={r.center[0]} y={r.center[2] - R - 14} textAnchor="middle" fontFamily={MONO} fontSize="19" letterSpacing="3" fill="#5d6b80">
                      {r.subtitle.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
            {world.destinations.map((d) => {
              const seen = progress.viewed.includes(viewedKey(d));
              const isWp = waypoint === d.id;
              const isSel = sel?.id === d.id;
              return (
                <g
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => {
                    audio.play("click");
                    setSel(d);
                  }}
                  role="button"
                  aria-label={`${d.label}, ${d.sublabel}`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSel(d)}
                >
                  {(isWp || isSel) && <circle cx={d.pos[0]} cy={d.pos[2]} r={40} fill="none" stroke="#f2735a" strokeWidth="6" />}
                  <circle cx={d.pos[0]} cy={d.pos[2]} r={isSel ? 24 : 19} fill={seen ? "#1f3552" : "#fbf6ec"} stroke="#1f3552" strokeWidth="5" />
                  {seen ? (
                    <path d={`M${d.pos[0] - 8} ${d.pos[2]} l6 6 l11 -12`} fill="none" stroke="#fbf6ec" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <circle cx={d.pos[0]} cy={d.pos[2]} r={8} fill={d.accent} />
                  )}
                </g>
              );
            })}
            {world.collectibles
              .filter((c) => progress.collectibles.includes(c.id))
              .map((c) => (
                <path key={c.id} d={`M${c.pos[0]} ${c.pos[2] - 14} l12 14 l-12 14 l-12 -14 z`} fill="#c8553d" stroke="#fbf6ec" strokeWidth="3" />
              ))}
            {/* Compass rose */}
            <g transform={`translate(${VB.x + VB.w - 170} ${VB.y + 190})`} aria-hidden>
              <circle r="105" fill="none" stroke="#1f3552" strokeOpacity="0.35" strokeWidth="3" />
              {Array.from({ length: 36 }, (_, i) => (
                <line key={i} y1={-105} y2={i % 9 === 0 ? -80 : -94} stroke="#1f3552" strokeOpacity="0.4" strokeWidth="3" transform={`rotate(${i * 10})`} />
              ))}
              <path d="M0 -72 L14 0 L0 72 L-14 0 Z" fill="#1f3552" fillOpacity="0.85" />
              <path d="M0 -72 L14 0 L-14 0 Z" fill="#f2735a" />
              <text y="-118" textAnchor="middle" fontFamily={MONO} fontSize="28" fontWeight={600} fill="#1f3552">
                N
              </text>
            </g>
            {/* Scale bar */}
            <g transform={`translate(${VB.x + 60} ${VB.y + VB.h - 70})`} aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={i * 100} y={0} width={100} height={14} fill={i % 2 ? "#fbf6ec" : "#1f3552"} stroke="#1f3552" strokeWidth="3" />
              ))}
              <text x={0} y={46} fontFamily={MONO} fontSize="22" fill="#1f3552">
                0
              </text>
              <text x={400} y={46} textAnchor="middle" fontFamily={MONO} fontSize="22" fill="#1f3552">
                400 m
              </text>
            </g>
            <g ref={player}>
              <circle r="44" fill="#f2735a" fillOpacity="0.16" />
              <path d="M0 -26 L5 -6 L24 4 L24 10 L5 4 L3 18 L10 24 L10 28 L0 25 L-10 28 L-10 24 L-3 18 L-5 4 L-24 10 L-24 4 L-5 -6 Z" fill="#f2735a" stroke="#1f3552" strokeWidth="3" strokeLinejoin="round" />
            </g>
          </svg>

          {sel && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mat-light absolute bottom-3 left-3 right-3 mx-auto max-w-md rounded-[12px] p-4 sm:left-auto">
              <div className="flex items-start gap-3">
                <IconTile icon={MapPin} color={sel.accent} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="legend text-[9.5px] text-[#5d6b80]">{sel.sublabel}</p>
                  <p className="font-sf-display text-[20px] font-bold leading-tight text-[#1f3552]">{sel.label}</p>
                </div>
                <button onClick={() => setSel(null)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-[6px] text-[#5d6b80] shadow-[inset_0_0_0_1px_rgba(31,53,82,0.2)] hover:bg-[#1f3552]/5">
                  <X size={14} strokeWidth={2.6} />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="filled"
                  size="md"
                  className="flex-1"
                  disabled={!canFly}
                  onClick={() => {
                    setOverlay(null);
                    if (!startVisit(sel.id)) setWaypoint(sel.id);
                  }}
                >
                  <PlaneLanding size={16} /> Fly There & Land
                </Button>
                <Button
                  variant="tinted"
                  size="md"
                  onClick={() => {
                    setWaypoint(sel.id);
                    setOverlay(null);
                  }}
                >
                  <Navigation size={14} /> Waypoint
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
