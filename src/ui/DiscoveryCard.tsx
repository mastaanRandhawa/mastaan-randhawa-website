import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { destinationById } from "@/world/world";
import { portfolio, projectById, skillCategoryById } from "@/content/portfolio";
import { panelFor } from "./panels/panelFor";
import { Kbd } from "./kit";
import type { Destination } from "@/world/defs";

function teaser(d: Destination): string {
  switch (d.kind) {
    case "about":
      return portfolio.profile.bio[0];
    case "project":
      return projectById(d.contentId!)?.summary ?? "";
    case "skills": {
      const c = skillCategoryById(d.contentId!);
      return c ? `${c.blurb} ${c.skills.map((s) => s.name).slice(0, 6).join(" · ")}${c.skills.length > 6 ? " …" : ""}` : "";
    }
    case "experience":
      return `${portfolio.company.roles[0].title} at ${portfolio.company.name} · ${portfolio.company.period}`;
    case "education":
      return `${portfolio.education.degree} · ${portfolio.education.school} · ${portfolio.education.period}`;
    case "achievements":
      return `${portfolio.credentials.filter((c) => c.kind === "certification").length} certifications and ${portfolio.credentials.filter((c) => c.kind === "badge").length} Databricks badges.`;
    case "contact":
      return portfolio.contact.intro;
  }
}

/** Non-blocking card shown when flying through a destination's ring. */
export function DiscoveryCard() {
  const id = useGame((s) => s.discoveryCard);
  const set = useGame((s) => s.setDiscoveryCard);
  const open = useGame((s) => s.openPanel);
  const panel = useGame((s) => s.panel);
  const isTouch = useGame((s) => s.isTouch);
  const d = id ? destinationById(id) : null;

  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => set(null), 11000);
    return () => clearTimeout(t);
  }, [id, set]);

  return (
    <AnimatePresence>
      {d && !panel && (
        <motion.aside
          key={d.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed left-5 top-[34%] z-20 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden max-sm:left-3 max-sm:top-[9.5rem] rounded-2xl bg-[#fbf6ec]/95 text-[#1f3552] shadow-2xl ring-1 ring-[#1f3552]/10 backdrop-blur"
          aria-live="polite"
        >
          <div className="h-1.5" style={{ backgroundColor: d.accent }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: d.accent }}>
                  {d.sublabel}
                </p>
                <h3 className="font-serif text-2xl italic leading-tight">{d.label}</h3>
              </div>
              <button onClick={() => set(null)} aria-label="Dismiss" className="rounded-full p-1 text-[#1f3552]/50 hover:bg-[#1f3552]/5 hover:text-[#1f3552]">
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#1f3552]/80">{teaser(d)}</p>
            <button
              onClick={() => open(panelFor(d))}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1f3552] px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#2b4a72]"
            >
              {!isTouch && <Kbd className="border-white/30 bg-white/10">F</Kbd>} Open details <ArrowRight size={14} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
