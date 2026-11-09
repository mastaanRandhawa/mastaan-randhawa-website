import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { portfolio } from "@/content/portfolio";
import { IconTile, SYSTEM } from "./kit";

/** Card revealing a freshly collected flight log's story. */
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
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="font-sf mat-light fixed bottom-28 right-5 z-20 w-[min(340px,calc(100vw-2.5rem))] rounded-[14px] p-4"
        >
          <div className="flex items-start gap-3">
            <IconTile icon={BookOpen} color={SYSTEM.orange} size={38} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#5d6b80]">
                Flight log {count} of {portfolio.flightLogs.length}
              </p>
              <h4 className="text-[17px] font-semibold leading-snug text-[#1f3552]">{log.title}</h4>
            </div>
            <button onClick={() => set(null)} aria-label="Close log" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(120,120,128,0.14)] text-[#5d6b80]">
              <X size={14} strokeWidth={2.6} />
            </button>
          </div>
          <p className="mt-2 text-[15px] leading-snug text-[#33425a]">{log.body}</p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
