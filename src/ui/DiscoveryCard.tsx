import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { destinationById } from "@/world/world";
import { portfolio, projectById, skillCategoryById } from "@/content/portfolio";
import { panelFor } from "./panels/panelFor";
import { startVisit } from "@/game/visit";
import { Button, IconTile, Kbd } from "./kit";
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

/** Widget-style card shown when arriving near a destination. */
export function DiscoveryCard() {
  const id = useGame((s) => s.discoveryCard);
  const set = useGame((s) => s.setDiscoveryCard);
  const open = useGame((s) => s.openPanel);
  const panel = useGame((s) => s.panel);
  const isTouch = useGame((s) => s.isTouch);
  const d = id ? destinationById(id) : null;

  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => set(null), isTouch ? 8000 : 11000);
    return () => clearTimeout(t);
  }, [id, set, isTouch]);

  return (
    <AnimatePresence>
      {d && !panel && (
        <motion.aside
          key={d.id}
          initial={{ opacity: 0, x: -24, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="font-sf mat-light safe-ml fixed left-5 top-[34%] z-20 w-[min(360px,calc(100vw-2.5rem))] rounded-[14px] p-4 max-sm:left-3 max-sm:top-[9.5rem] max-sm:p-3 short:inset-x-0 short:left-0 short:top-[8.75rem] short:mx-auto short:w-[340px] short:p-3"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <IconTile icon={MapPin} color={d.accent} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#5d6b80]">{d.sublabel}</p>
              <h3 className="font-sf-display text-[22px] font-bold leading-tight text-[#1f3552] max-sm:text-[19px] short:text-[18px]">{d.label}</h3>
            </div>
            <button onClick={() => set(null)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(120,120,128,0.14)] text-[#5d6b80] hover:bg-[rgba(120,120,128,0.22)]">
              <X size={14} strokeWidth={2.6} />
            </button>
          </div>
          <p className="mt-2.5 line-clamp-4 text-[15px] leading-snug text-[#33425a] max-sm:line-clamp-2 max-sm:text-[13.5px] short:hidden">{teaser(d)}</p>
          <div className="mt-3.5 flex items-center gap-2 short:mt-2.5">
            <Button variant="filled" size="md" onClick={() => (startVisit(d.id) ? undefined : open(panelFor(d)))} className="flex-1">
              Fly There & Land
            </Button>
            <Button variant="gray" size="md" onClick={() => set(null)}>
              Later
            </Button>
          </div>
          {!isTouch && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-[#5d6b80]">
              or press <Kbd>F</Kbd>
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
