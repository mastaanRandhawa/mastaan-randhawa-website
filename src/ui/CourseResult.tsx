import { AnimatePresence, motion } from "framer-motion";
import { Medal } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";

const MEDAL = { gold: "#b8862b", silver: "#AEAEB2", bronze: "#C7864B", finish: "#3f8f5a" };

/** iOS alert-style result card. */
export function CourseResult() {
  const r = useGame((s) => s.courseResult);
  const set = useGame((s) => s.setCourseResult);
  useEffect(() => {
    if (!r) return;
    const t = setTimeout(() => set(null), 7000);
    return () => clearTimeout(t);
  }, [r, set]);
  return (
    <AnimatePresence>
      {r && (
        <motion.div
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
          className="font-sf mat-light fixed inset-x-0 top-[24%] z-30 mx-auto w-[min(290px,calc(100vw-2rem))] overflow-hidden rounded-[16px] text-center"
          role="alertdialog"
          aria-label={`${r.name} complete`}
        >
          <div className="px-5 pb-4 pt-5">
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full" style={{ backgroundColor: `${MEDAL[r.medal]}2e`, color: MEDAL[r.medal] }}>
              <Medal size={30} strokeWidth={2.2} />
            </div>
            <h3 className="text-[17px] font-semibold text-[#1f3552]">{r.name} complete</h3>
            <p className="font-instrument mt-1 text-[30px] font-semibold text-[#1f3552]">{r.time.toFixed(2)}s</p>
            <p className="text-[13px] text-[#33425a]">
              {r.medal === "finish" ? "Finished" : `${r.medal[0].toUpperCase()}${r.medal.slice(1)} medal`} · {r.newBest ? "New personal best" : `Best ${r.best.toFixed(2)}s`}
            </p>
          </div>
          <button onClick={() => set(null)} className="h-11 w-full text-[17px] font-semibold text-[#2b5c8a] shadow-[inset_0_0.5px_0_rgba(60,60,67,0.3)] hover:bg-black/[0.03]">
            Done
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
