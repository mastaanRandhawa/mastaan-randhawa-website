import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { portfolio } from "@/content/portfolio";

/** Small card revealing a freshly collected flight log's story. */
export function LogReader() {
  const id = useGame((s) => s.openLog);
  const set = useGame((s) => s.setOpenLog);
  const count = useGame((s) => s.progress.collectibles.length);
  const log = portfolio.flightLogs.find((l) => l.id === id);
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => set(null), 9000);
    return () => clearTimeout(t);
  }, [id, set]);
  return (
    <AnimatePresence>
      {log && (
        <motion.aside
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-28 right-5 z-20 w-[min(340px,calc(100vw-2.5rem))] rounded-2xl bg-[#fff7e6]/95 p-4 text-[#1f3552] shadow-2xl ring-1 ring-[#e6b64c]/50 backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b88a1c]">
              <BookOpen size={13} /> Flight log {count}/{portfolio.flightLogs.length}
            </p>
            <button onClick={() => set(null)} aria-label="Close log" className="rounded-full p-1 text-[#1f3552]/50 hover:text-[#1f3552]">
              <X size={14} />
            </button>
          </div>
          <h4 className="mt-1 font-serif text-xl italic">{log.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-[#1f3552]/80">{log.body}</p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
