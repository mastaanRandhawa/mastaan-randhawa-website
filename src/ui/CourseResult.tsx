import { AnimatePresence, motion } from "framer-motion";
import { Medal, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";

const MEDAL = { gold: "#e6b64c", silver: "#b9c3cf", bronze: "#c98a5a", finish: "#3fb8af" };

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
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="fixed inset-x-0 top-[22%] z-30 mx-auto w-[min(360px,calc(100vw-2rem))] rounded-3xl bg-[#fbf6ec]/95 p-6 text-center text-[#1f3552] shadow-2xl ring-1 ring-[#1f3552]/10 backdrop-blur"
          role="status"
        >
          <button onClick={() => set(null)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-[#1f3552]/50 hover:text-[#1f3552]">
            <X size={16} />
          </button>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d9573f]">Course complete</p>
          <h3 className="mt-1 font-serif text-3xl italic">{r.name}</h3>
          <div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: `${MEDAL[r.medal]}33`, color: MEDAL[r.medal] }}>
            <Medal size={40} />
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">{r.time.toFixed(2)}s</p>
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: MEDAL[r.medal] }}>
            {r.medal === "finish" ? "Finished" : `${r.medal} medal`}
          </p>
          <p className="mt-2 text-xs text-[#1f3552]/60">{r.newBest ? "New personal best!" : `Best: ${r.best.toFixed(2)}s`}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
