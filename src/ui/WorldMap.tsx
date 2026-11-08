import { motion } from "framer-motion";
import { Navigation, Plane, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { onFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { REGIONS } from "@/world/layout";
import { travelTo } from "@/game/gameplay";
import type { World } from "@/world/world";
import type { Destination } from "@/world/defs";
import { Button, Label } from "./kit";
import { audio } from "@/game/audio";

const VB = { x: -1150, y: -1080, w: 2300, h: 2000 };

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#1f3552]/45 p-3 backdrop-blur-[6px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="World map"
      onClick={(e) => e.target === e.currentTarget && setOverlay(null)}
    >
      <motion.div initial={{ scale: 0.97 }} animate={{ scale: 1 }} className="relative flex h-full max-h-[860px] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl bg-[#f6ecd9] shadow-2xl ring-1 ring-[#1f3552]/15">
        <div className="flex items-center justify-between border-b border-[#1f3552]/10 px-5 py-3">
          <div>
            <Label className="text-[#d9573f]">World map</Label>
            <p className="font-serif text-xl italic text-[#1f3552]">
              {progress.discoveredRegions.length} of {REGIONS.length} regions discovered
            </p>
          </div>
          <button onClick={() => setOverlay(null)} aria-label="Close map" className="grid h-9 w-9 place-items-center rounded-full bg-[#1f3552]/5 text-[#1f3552] hover:bg-[#1f3552]/10">
            <X size={16} />
          </button>
        </div>
        <div className="relative flex-1">
          <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="h-full w-full" role="img" aria-label="Map of regions">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M100 0H0V100" fill="none" stroke="#1f3552" strokeOpacity="0.06" strokeWidth="2" />
              </pattern>
              <radialGradient id="sea" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#fbf3e4" />
                <stop offset="100%" stopColor="#e7d6bb" />
              </radialGradient>
            </defs>
            <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="url(#sea)" />
            <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="url(#grid)" />
            {/* Routes from the airfield */}
            {REGIONS.filter((r) => r.id !== "launch").map((r) => (
              <line key={r.id} x1={0} y1={0} x2={r.center[0]} y2={r.center[2]} stroke="#1f3552" strokeOpacity="0.12" strokeWidth="4" strokeDasharray="14 18" />
            ))}
            {REGIONS.map((r) => {
              const found = progress.discoveredRegions.includes(r.id);
              return (
                <g key={r.id}>
                  <circle cx={r.center[0]} cy={r.center[2]} r={r.radius * 0.72} fill={r.accent} fillOpacity={found ? 0.16 : 0.06} stroke={r.accent} strokeOpacity={found ? 0.6 : 0.25} strokeWidth="4" strokeDasharray={found ? undefined : "10 10"} />
                  <text x={r.center[0]} y={r.center[2] - r.radius * 0.72 - 22} textAnchor="middle" fontFamily="'Playfair Display', serif" fontStyle="italic" fontSize="46" fill="#1f3552" fillOpacity={found ? 0.95 : 0.45}>
                    {found ? r.name : "Uncharted"}
                  </text>
                  {found && (
                    <text x={r.center[0]} y={r.center[2] - r.radius * 0.72 + 14} textAnchor="middle" fontFamily="'Azeret Mono', monospace" fontSize="22" fill="#1f3552" fillOpacity="0.55">
                      {r.subtitle}
                    </text>
                  )}
                </g>
              );
            })}
            {world.destinations.map((d) => {
              const seen = progress.viewed.includes(viewedKey(d));
              const isWp = waypoint === d.id;
              return (
                <g
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => {
                    audio.play("click");
                    setSel(d);
                  }}
                  role="button"
                  aria-label={`${d.label} — ${d.sublabel}`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSel(d)}
                >
                  <circle cx={d.pos[0]} cy={d.pos[2]} r={isWp ? 26 : 18} fill={seen ? "#3fb8af" : d.accent} stroke="#fff" strokeWidth="6" />
                  {isWp && <circle cx={d.pos[0]} cy={d.pos[2]} r={40} fill="none" stroke="#f2735a" strokeWidth="5" strokeDasharray="8 8" />}
                </g>
              );
            })}
            {world.collectibles
              .filter((c) => progress.collectibles.includes(c.id))
              .map((c) => (
                <path key={c.id} d={`M${c.pos[0]} ${c.pos[2] - 14} l12 14 l-12 14 l-12 -14 z`} fill="#e6b64c" stroke="#fff" strokeWidth="3" />
              ))}
            <g ref={player}>
              <circle r="34" fill="#f2735a" fillOpacity="0.2" />
              <path d="M0 -30 L18 22 L0 12 L-18 22 Z" fill="#f2735a" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
            </g>
          </svg>

          {sel && (
            <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md rounded-2xl bg-white/95 p-4 text-[#1f3552] shadow-xl ring-1 ring-[#1f3552]/10 sm:left-auto">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: sel.accent }}>
                    {sel.sublabel}
                  </p>
                  <p className="font-serif text-xl italic">{sel.label}</p>
                </div>
                <button onClick={() => setSel(null)} aria-label="Close" className="p-1 text-[#1f3552]/50">
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setWaypoint(sel.id);
                    setOverlay(null);
                  }}
                >
                  <Navigation size={13} /> Set waypoint
                </Button>
                <Button
                  size="sm"
                  disabled={!progress.discoveredRegions.includes(sel.regionId)}
                  title={progress.discoveredRegions.includes(sel.regionId) ? "" : "Discover this region first"}
                  onClick={() => {
                    setWaypoint(sel.id);
                    setOverlay(null);
                    travelTo(sel.id);
                  }}
                >
                  <Plane size={13} /> Fast travel
                </Button>
              </div>
              {!progress.discoveredRegions.includes(sel.regionId) && <p className="mt-2 text-[11px] text-[#1f3552]/55">Fast travel unlocks once you've flown to this region.</p>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 border-t border-[#1f3552]/10 px-5 py-2.5 font-mono text-[11px] text-[#1f3552]/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f2735a]" /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3fb8af]" /> Visited
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 bg-[#e6b64c]" /> Flight log found
          </span>
          <span className="ml-auto">Click a destination to set a waypoint · M to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
