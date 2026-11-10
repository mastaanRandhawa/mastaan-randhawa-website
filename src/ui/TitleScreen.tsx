import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileText, Github, LayoutGrid, Linkedin, Mail, RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { BRAND } from "@/config/brand";
import { portfolio } from "@/content/portfolio";
import { audio } from "@/game/audio";
import { beginAirborne, beginTakeoff } from "@/game/gameplay";
import { completion } from "@/game/progression";
import { REGIONS } from "@/world/layout";
import { Button, Kbd } from "./kit";
import { SettingsPanel } from "./PauseMenu";
import { useTriggerOrigin } from "./origin";

const P = portfolio.profile;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

/** Decorative barcode derived from the pilot's name (aria-hidden). */
function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 34; i++) out.push(1 + ((seed.charCodeAt(i % seed.length) * (i + 7)) % 3));
    return out;
  }, [seed]);
  return (
    <div className="flex h-12 items-stretch gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className="bg-[#1f3552]" style={{ width: w, opacity: i % 5 === 4 ? 0.35 : 0.9 }} />
      ))}
    </div>
  );
}

/** Settings sheet over the title: grows from the gear button, Esc closes, focus returns to the trigger. */
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const origin = useTriggerOrigin(sheet);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>("button, [href], input, [tabindex]")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      opener?.focus?.();
    };
  }, [onClose]);
  return (
    <motion.div
      className="safe-pad fixed inset-0 z-40 grid place-items-center bg-[#0d1523]/55"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="w-full max-w-[460px]"
        style={{ transformOrigin: origin }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 30, stiffness: 380, mass: 0.8 }}
      >
        <SettingsPanel onBack={onClose} closeLabel="Done" />
      </motion.div>
    </motion.div>
  );
}

function Field({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="legend text-[9px] text-[#5d6b80]">{k}</p>
      <div className="mt-0.5 text-[14px] font-semibold leading-tight text-[#1f3552]">{children}</div>
    </div>
  );
}

export function TitleScreen() {
  const setMode = useGame((s) => s.setMode);
  const hadSave = useGame((s) => s.hadSave);
  const progress = useGame((s) => s.progress);
  const isTouch = useGame((s) => s.isTouch);
  const [settings, setSettings] = useState(false);
  const closeSettings = useMemo(() => () => setSettings(false), []);

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
  const certs = portfolio.credentials.filter((c) => c.kind === "certification");
  const manifest = [
    { k: "Now", v: `${portfolio.company.roles[0].title} · ${portfolio.company.duration} of industry experience` },
    { k: "Studying", v: `${portfolio.education.degree} · ${portfolio.education.school}` },
    { k: "Certified", v: `${certs[0].title.replace("Databricks Certified ", "Databricks ")} · ${certs[1].title.replace("Microsoft Certified: ", "Microsoft ")}` },
    { k: "Built", v: `${portfolio.projects.filter((p) => p.showOnSite).length}+ projects: client platforms, a RISC-V processor, cache systems` },
  ];
  const from = REGIONS[0];
  const to = REGIONS[REGIONS.length - 1];
  const pct = Math.round(completion(progress) * 100);

  return (
    <motion.div className="font-sf fixed inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d1523]/75 via-[#0d1523]/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d1523]/45 to-transparent" />
      <a
        href="?view=portfolio"
        onClick={(e) => (e.preventDefault(), setMode("portfolio"))}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[8px] focus:bg-[#fbf6ec] focus:px-4 focus:py-2 focus:text-[15px] focus:text-[#1f3552]"
      >
        Skip to portfolio
      </a>

      <motion.main variants={stagger} initial="hidden" animate="show" className="relative h-full max-w-[720px] overflow-y-auto pl-[max(1.5rem,var(--sal))] pr-6 pt-[var(--sat)] pb-[var(--sab)] sm:pl-[max(3rem,var(--sal))] sm:pr-12 lg:pl-[max(4rem,var(--sal))] lg:pr-16">
        <div className="flex min-h-full flex-col justify-center gap-4 py-7">
        <motion.div variants={item}>
          <p className="legend text-[#f4ead5]/70">
            A playable portfolio <span className="mx-1.5 text-[#f2735a]">/</span> {BRAND.subtitle}
          </p>
          <h1 className="font-sf-display mt-1 text-[clamp(3.2rem,7.2vw,5.3rem)] leading-[0.95] text-[#fbf6ec] drop-shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            {BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase()}
            <span className="text-[#f2735a]">.</span>
          </h1>
          <p className="mt-2.5 max-w-[34rem] text-[15.5px] leading-relaxed text-[#f4ead5]/90">
            A playable portfolio by <span className="font-semibold text-[#fbf6ec]">{P.name}</span>. {P.intro}
          </p>
        </motion.div>

        {/* Boarding pass */}
        <motion.div variants={item} className="max-w-[37rem] drop-shadow-[0_18px_28px_rgba(8,12,22,0.45)]">
        <section aria-label="Boarding pass" className="mat-light ticket flex rounded-[12px]" style={{ ["--notch-x" as string]: "calc(100% - 7.2rem - 6px)" }}>
          <div className="min-w-0 flex-1 px-4 pb-3.5 pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="legend text-[#b4442c]">Boarding pass</span>
              <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#3f8f5a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3f8f5a]" /> {P.availability}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-[1.25fr_1fr] gap-3 border-b border-dashed border-[#1f3552]/20 pb-3">
              <Field k="Pilot">
                <span className="font-sf-display text-[19px]">{P.name}</span>
              </Field>
              <Field k="Route">
                <span className="flex items-center gap-1.5 text-[13px]">
                  {from.name.replace(" Airfield", "")} <ArrowRight size={13} className="text-[#f2735a]" /> {to.name.replace(" Airfield", "")}
                </span>
              </Field>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {manifest.map((g) => (
                <li key={g.k} className="grid grid-cols-[4.9rem_1fr] items-baseline gap-2">
                  <span className="legend text-[9px] text-[#5d6b80]">{g.k}</span>
                  <span className="text-[13px] leading-snug text-[#1f3552]">{g.v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="perforated w-3 shrink-0" aria-hidden />
          <div className="flex w-[7.2rem] shrink-0 flex-col justify-between px-3 pb-3.5 pt-3 max-[420px]:hidden">
            <div>
              <p className="legend text-[9px] text-[#5d6b80]">Stops</p>
              <p className="font-instrument text-[26px] font-semibold leading-none text-[#1f3552]">{String(REGIONS.length).padStart(2, "0")}</p>
              <p className="legend mt-2 text-[9px] text-[#5d6b80]">{hadSave ? "Logged" : "Projects"}</p>
              <p className="font-instrument text-[15px] font-semibold leading-none text-[#1f3552]">{hadSave ? `${pct}%` : portfolio.projects.length}</p>
            </div>
            <Barcode seed={P.name} />
          </div>
        </section>
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap items-center gap-2.5">
          <Button id="start-flying" variant="paper" size="lg" onClick={() => start(false)} autoFocus>
            Start flying <ArrowRight size={17} strokeWidth={2.4} className="text-[#f2735a]" />
          </Button>
          {hadSave && (
            <Button variant="glass" size="lg" onClick={() => start(true)}>
              <RotateCcw size={16} /> Continue
            </Button>
          )}
          <Button variant="glass" size="lg" onClick={() => setMode("portfolio")}>
            <LayoutGrid size={16} /> View Portfolio
          </Button>
          <button aria-label="Settings" aria-haspopup="dialog" title="Settings" onClick={() => setSettings(true)} className="mat-glass grid h-[50px] w-[50px] place-items-center rounded-[10px] transition-[background-color,transform] duration-150 hover:bg-[rgba(20,31,49,0.6)] active:translate-y-px">
            <Settings2 size={18} />
          </button>
        </motion.div>

        <motion.nav variants={item} aria-label="Quick links" className="-ml-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Icons delimit the links, so wrapping never strands a divider at a line start. */}
          {links.map(({ icon: Icon, label, href }) => (
            <span key={label} className="flex items-center">
              <a
                href={href}
                target={href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                onClick={() => label === "Resume" && useGame.getState().markViewed("resume")}
                className="hit-area inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13.5px] font-medium text-[#f4ead5] underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                <Icon size={14} className="text-[#f2735a]" /> {label}
              </a>
            </span>
          ))}
        </motion.nav>

        <motion.div variants={item} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] font-medium text-[#f4ead5]/85">
          {isTouch ? (
            <span>Touch controls: pull the stick back to climb, push to dive; Boost and Brake on the right.</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <Kbd>S</Kbd> climb
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>W</Kbd> dive
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>A</Kbd>
                <Kbd>D</Kbd> turn
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>⇧</Kbd> boost
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>F</Kbd> land
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>esc</Kbd> pause
              </span>
            </>
          )}
        </motion.div>
        </div>
      </motion.main>

      <AnimatePresence>{settings && <SettingsDialog key="settings" onClose={closeSettings} />}</AnimatePresence>
    </motion.div>
  );
}
