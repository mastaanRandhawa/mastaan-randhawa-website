import { AnimatePresence, motion } from "framer-motion";
import { PlaneLanding, PlaneTakeoff, Navigation, FastForward } from "lucide-react";
import { useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import { onFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { cancelVisit, skipVisit } from "@/game/visit";
import { destinationById } from "@/world/world";

/** visionOS-style status capsule while the autopilot is flying, landing or taking off. */
export function VisitStatus() {
  const visit = useGame((s) => s.visit);
  const panel = useGame((s) => s.panel);
  const overlay = useGame((s) => s.overlay);
  const dist = useRef<HTMLSpanElement>(null);
  const d = visit ? destinationById(visit.destId) : null;
  const next = visit?.nextId ? destinationById(visit.nextId) : null;

  useEffect(
    () =>
      onFrame(() => {
        if (!dist.current || !d) return;
        const p = runtime.pose;
        dist.current.textContent = `${Math.round(Math.hypot(d.pos[0] - p.x, d.pos[2] - p.z))} m`;
      }),
    [d],
  );

  const show = visit && d && visit.stage !== "landed" && !panel && !overlay;
  let icon = <Navigation size={15} fill="white" />;
  let title = "";
  let sub: string | null = null;
  if (visit && d) {
    switch (visit.stage) {
      case "travel":
        title = `Flying to ${d.label}`;
        sub = "Steer to take the controls";
        break;
      case "final":
        icon = <PlaneLanding size={16} />;
        title = `Landing at ${d.label}`;
        sub = "Gear down · final approach";
        break;
      case "rollout":
      case "turn":
        icon = <PlaneLanding size={16} />;
        title = "Touchdown";
        sub = `Welcome to ${d.label}`;
        break;
      case "takeoff":
      case "climb":
        icon = <PlaneTakeoff size={16} />;
        title = `Taking off from ${d.label}`;
        sub = next ? `Next stop: ${next.label}` : null;
        break;
      case "handoff":
        icon = <PlaneTakeoff size={16} />;
        title = next ? `Turning toward ${next.label}` : "You have control";
        sub = next ? "You'll have control in a moment" : null;
        break;
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={`${visit!.destId}-${visit!.stage === "turn" ? "rollout" : visit!.stage === "climb" ? "takeoff" : visit!.stage}`}
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="font-sf safe-mt pointer-events-none fixed inset-x-0 top-[78px] z-20 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] max-sm:top-[8.8rem]"
        >
          <div className="mat-dark pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-2 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: d!.accent }}>
              {icon}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-semibold">{title}</p>
              <p className="truncate text-[12px] text-white/60">
                {visit!.stage === "travel" && <span ref={dist} className="inline-block min-w-[6ch] text-right tabular-nums" />}
                {visit!.stage === "travel" && sub ? " · " : ""}
                {sub}
              </p>
            </div>
            {visit!.stage === "travel" && (
              <button onClick={cancelVisit} className="ml-1 h-8 rounded-full bg-white/15 px-3 text-[13px] font-semibold hover:bg-white/25">
                Take Control
              </button>
            )}
            <button onClick={skipVisit} className="flex h-8 items-center gap-1 rounded-full bg-white/15 px-3 text-[13px] font-semibold hover:bg-white/25" aria-label="Skip ahead">
              <FastForward size={13} fill="white" /> Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
