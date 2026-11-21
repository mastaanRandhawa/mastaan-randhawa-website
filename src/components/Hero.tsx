import { Fragment, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, type Variants } from "motion/react";

import PortfolioHero from "@/components/ui/portfolio-hero-with-paper-shaders";
import { portfolio } from "@/content/portfolio";

const P = portfolio.profile;

/** "May 2026 – Present" → "2026 → now", "Sep – Dec 2025" → "2025", "May – Aug 2025, Dec 2025 – Apr 2026" → "2025 → 2026". */
function yearSpan(period: string) {
  const years = period.match(/\d{4}/g) ?? [];
  const start = years[0] ?? "";
  const end = years[years.length - 1] ?? start;
  if (/present/i.test(period)) return `${start} → now`;
  return end === start ? start : `${start} → ${end}`;
}

const startYear = (period: string) => Number(period.match(/\d{4}/)?.[0] ?? 0);

/** The short version of the timeline: every role, newest first, then school. */
const timeline = [
  ...portfolio.company.roles.map((r) => ({ org: portfolio.company.name, role: r.title, period: r.period, current: !!r.current })),
  ...portfolio.leadership.map((l) => ({ org: l.org, role: l.title, period: l.period, current: false })),
  { org: portfolio.education.school, role: portfolio.education.degree, period: portfolio.education.period, current: false },
]
  .sort((a, b) => startYear(b.period) - startYear(a.period))
  .map((row) => ({ ...row, years: yearSpan(row.period) }));

/** Children rise in one after another; nested lists (the timeline, the links) stagger their own items. */
const list = (gap: number, delay = 0): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } });
const rise: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const links = [
  { label: "GitHub", href: P.links.github, external: true },
  { label: "LinkedIn", href: P.links.linkedin, external: true },
  { label: "Email", href: P.links.email, external: false },
  { label: "Résumé", href: P.links.resume, external: true },
];

/**
 * Types each line, pauses, deletes it, moves to the next. Runs even with the OS
 * "reduce motion" setting on: it only changes text, nothing moves across the screen.
 */
function useTypewriter(lines: string[]) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const text = lines[line];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && chars < text.length) t = setTimeout(() => setChars((c) => c + 1), 45);
    else if (!deleting) t = setTimeout(() => setDeleting(true), 1800);
    else if (chars > 0) t = setTimeout(() => setChars((c) => c - 1), 22);
    else t = setTimeout(() => {
      setDeleting(false);
      setLine((i) => (i + 1) % lines.length);
    }, 250);
    return () => clearTimeout(t);
  }, [chars, deleting, line, lines]);

  return lines[line].slice(0, chars);
}

export default function Hero({ isDark }: { isDark: boolean }) {
  const typed = useTypewriter(P.typewriterLines);

  return (
    <PortfolioHero
      isDark={isDark}
      className="bg-white dark:bg-zinc-950"
      // Line the text up with the header logo and the sections below (the max-w-6xl container's left edge).
      contentClassName="px-4 sm:px-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-12 xl:pr-16 pt-2 sm:pt-4 lg:pt-36 pb-10 lg:pb-14 justify-between gap-12"
    >
      <motion.div variants={list(0.09, 0.15)} initial="hidden" animate="show">
        <motion.p variants={rise} className="font-instrument text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {P.availability}
        </motion.p>

        <motion.h1 variants={rise} className="mt-6 font-serif font-bold tracking-tight text-5xl sm:text-6xl xl:text-7xl leading-none text-[#0d1b3e] dark:text-white">{P.name}</motion.h1>

        <motion.p variants={rise} className="mt-4 text-base sm:text-lg font-semibold text-zinc-500 dark:text-zinc-400">
          {[...P.headline.split(" · "), P.location].map((part, i) => (
            <Fragment key={part}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">{part}</span>
            </Fragment>
          ))}
        </motion.p>

        {/* Fixed height so wrapping lines don't push everything below around. */}
        <motion.p variants={rise} className="mt-6 min-h-[3.5rem] sm:min-h-[4rem] text-xl sm:text-2xl text-zinc-800 dark:text-zinc-200" aria-label={`I build ${P.typewriterLines.join(", ")}`}>
          <span aria-hidden="true">
            I build <span className="font-semibold text-accent-blue dark:text-[#7d8aff]">{typed}</span>
            <span className="animate-blink border-r-2 border-accent-blue dark:border-[#7d8aff] ml-0.5">&nbsp;</span>
          </span>
        </motion.p>

        {/* Timeline, set like the section headings below: hairline rules, mono details. */}
        <motion.dl variants={list(0.07)} className="mt-8 font-instrument text-[13px] sm:text-sm text-zinc-700 dark:text-zinc-300">
          {timeline.map((row) => (
            <motion.div
              variants={rise}
              key={`${row.org}-${row.role}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-zinc-200 dark:border-zinc-800 py-2.5 last:border-b"
            >
              <div className="min-w-0">
                <dt className="text-zinc-900 dark:text-white">{row.org}</dt>
                <dd className="text-zinc-500 dark:text-zinc-400">{row.role}</dd>
              </div>
              <dd className="text-right tabular text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {row.current && <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-accent-blue dark:bg-[#7d8aff] align-middle" />}
                {row.years}
              </dd>
            </motion.div>
          ))}
        </motion.dl>

        <motion.div variants={rise} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href="#portfolio"
            className="inline-flex items-center gap-2 bg-[#0d1b3e] dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm px-6 py-3 rounded-full hover:bg-accent-blue dark:hover:bg-accent-blue dark:hover:text-white transition-colors duration-200 group"
          >
            See the projects
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a href={P.links.email} className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 hover:text-accent-blue transition-colors">
            {P.email}
          </a>
        </motion.div>
      </motion.div>

      {/* Links row along the bottom of the panel, as in the original layout. */}
      <motion.nav aria-label="Elsewhere" variants={list(0.06, 0.9)} initial="hidden" animate="show" className="font-instrument text-sm flex flex-wrap items-center gap-x-5 gap-y-2">
        <motion.span variants={rise} className="text-zinc-400 dark:text-zinc-500">Links</motion.span>
        {links.map((l) => (
          <motion.a
            variants={rise}
            key={l.label}
            href={l.href}
            {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group inline-flex items-center gap-0.5 text-zinc-700 dark:text-zinc-300 hover:text-accent-blue dark:hover:text-[#7d8aff] transition-colors"
          >
            {l.label}
            <ArrowUpRight size={13} className="opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </motion.a>
        ))}
      </motion.nav>
    </PortfolioHero>
  );
}
