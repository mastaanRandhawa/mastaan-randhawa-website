import { motion } from "framer-motion";
import { FileText, Github, Linkedin, Mail, Play, RotateCcw, LayoutGrid, Settings2 } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/game/store";
import { BRAND } from "@/config/brand";
import { portfolio } from "@/content/portfolio";
import { audio } from "@/game/audio";
import { beginAirborne, beginTakeoff } from "@/game/gameplay";
import { completion } from "@/game/progression";
import { Button, Kbd } from "./kit";
import { SettingsPanel } from "./PauseMenu";

const P = portfolio.profile;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

export function TitleScreen() {
  const setMode = useGame((s) => s.setMode);
  const hadSave = useGame((s) => s.hadSave);
  const progress = useGame((s) => s.progress);
  const isTouch = useGame((s) => s.isTouch);
  const [settings, setSettings] = useState(false);

  const start = (resume: boolean) => {
    audio.init();
    audio.startMusic();
    audio.play("whoosh");
    setMode("flying");
    if (resume && progress.tutorialDone) beginAirborne();
    else beginTakeoff();
  };

  const links = [
    { icon: FileText, label: "Resume", href: P.links.resume },
    { icon: Github, label: "GitHub", href: P.links.github },
    { icon: Linkedin, label: "LinkedIn", href: P.links.linkedin },
    { icon: Mail, label: "Email", href: P.links.email },
  ];

  return (
    <motion.div className="fixed inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1f3552]/70 via-[#1f3552]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1f3552]/40 to-transparent" />
      <a href="?view=portfolio" onClick={(e) => (e.preventDefault(), setMode("portfolio"))} className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-mono focus:text-xs">
        Skip to portfolio
      </a>

      <motion.main variants={stagger} initial="hidden" animate="show" className="relative flex h-full max-w-[640px] flex-col justify-center gap-5 px-6 py-10 sm:px-12 lg:px-16">
        <motion.div variants={item} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] text-white ring-1 ring-white/25 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7dffb0]" /> {BRAND.tagline} · {P.availability}
        </motion.div>
        <motion.div variants={item}>
          <h1 className="font-serif text-[clamp(3.4rem,9vw,6.6rem)] italic leading-[0.9] text-white drop-shadow-[0_6px_30px_rgba(31,53,82,0.45)]">
            {BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase()}
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.35em] text-[#ffd9b0]">{BRAND.subtitle}</p>
        </motion.div>
        <motion.p variants={item} className="max-w-md text-[15px] leading-relaxed text-white/90">
          Fly through the work of <span className="font-semibold text-white">{P.name}</span> — {portfolio.company.roles[0].title} at {portfolio.company.name} and Computer Science student at {portfolio.education.school}.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center gap-3">
          <Button id="start-flying" variant="primary" size="lg" onClick={() => start(false)} autoFocus>
            <Play size={16} fill="currentColor" /> Start Flying
          </Button>
          {hadSave && (
            <Button variant="secondary" size="lg" onClick={() => start(true)}>
              <RotateCcw size={15} /> Continue · {Math.round(completion(progress) * 100)}%
            </Button>
          )}
          <Button variant="dark" size="lg" onClick={() => setMode("portfolio")}>
            <LayoutGrid size={15} /> View Portfolio
          </Button>
          <button aria-label="Settings" onClick={() => setSettings(true)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
            <Settings2 size={17} />
          </button>
        </motion.div>

        <motion.nav variants={item} aria-label="Quick links" className="flex flex-wrap gap-2">
          {links.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={() => label === "Resume" && useGame.getState().markViewed("resume")}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 font-mono text-[11px] text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
            >
              <Icon size={13} /> {label}
            </a>
          ))}
        </motion.nav>

        <motion.aside variants={item} className="max-w-md rounded-2xl bg-[#fbf6ec]/90 p-4 text-[#1f3552] shadow-xl ring-1 ring-white/40 backdrop-blur">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9573f]">In a hurry? The 20-second version</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug">
            <li>
              <b>Now:</b> {portfolio.company.roles[0].title} at {portfolio.company.name} ({portfolio.company.duration})
            </li>
            <li>
              <b>Study:</b> {portfolio.education.degree}, {portfolio.education.school}
            </li>
            <li>
              <b>Credentials:</b> Databricks Data Engineer Associate · Microsoft Security Operations Analyst
            </li>
            <li>
              <b>Built:</b> {portfolio.projects.filter((p) => p.showOnSite).length}+ projects — client platforms, a RISC-V processor, cache systems
            </li>
          </ul>
        </motion.aside>

        <motion.div variants={item} className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-white/85">
          {isTouch ? (
            <span>Touch controls: left stick to fly, buttons to boost & brake</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Kbd>W</Kbd>
                <Kbd>S</Kbd> pitch
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>A</Kbd>
                <Kbd>D</Kbd> turn
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Shift</Kbd> boost
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>F</Kbd> explore
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Esc</Kbd> pause
              </span>
            </>
          )}
        </motion.div>
      </motion.main>

      {settings && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#1f3552]/40 p-4 backdrop-blur-sm" onClick={() => setSettings(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
            <SettingsPanel onBack={() => setSettings(false)} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
