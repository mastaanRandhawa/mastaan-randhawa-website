import { Fragment, useEffect, useState } from "react";
import { ArrowRight, Github, Linkedin } from "lucide-react";

import { portfolio } from "@/content/portfolio";

const P = portfolio.profile;
/** Hero illustration: an island under a clear sky, the same mood as the flyable version. */
const HERO_IMAGE = "imgs/hero-island.jpg";

const iconLink =
  "w-10 h-10 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-[#0d1b3e] hover:text-[#0d1b3e] dark:hover:border-white dark:hover:text-white transition-colors duration-200";

/** Types each line, pauses, deletes it, moves to the next. Shows the first line still if the user prefers reduced motion. */
function useTypewriter(lines: string[]) {
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduced) return;
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
  }, [chars, deleting, line, lines, reduced]);

  return reduced ? lines[0] : lines[line].slice(0, chars);
}

function HeroImage() {
  return (
    <figure className="order-first lg:order-none w-full max-w-sm lg:max-w-none lg:mx-auto">
      {/* Square frame to match the square illustration, so nothing is cropped. */}
      <div className="aspect-square overflow-hidden rounded-2xl border-2 border-zinc-700 dark:border-zinc-300 bg-sky-400">
        <img
          src={HERO_IMAGE}
          alt="Illustration of a small green island with a white lighthouse, in a turquoise sea under a bright blue sky"
          width={1199}
          height={1204}
          className="h-full w-full object-cover"
        />
      </div>
    </figure>
  );
}

export default function Hero() {
  const typed = useTypewriter(P.typewriterLines);

  return (
    <section className="pt-32 pb-24 sm:pt-40 sm:pb-28 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16 items-center">
        {/* Who: name, role, what I build, ways in. */}
        <div>
          <h1 className="font-serif font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-none text-[#0d1b3e] dark:text-white">
            {P.name}
          </h1>

          <p className="mt-4 text-base sm:text-lg font-semibold text-zinc-500 dark:text-zinc-400">
            {[...P.headline.split(" · "), P.location].map((part, i) => (
              <Fragment key={part}>
                {i > 0 && " · "}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </p>

          {/* Fixed height so wrapping lines don't push the buttons around. */}
          <p className="mt-8 min-h-[3.5rem] sm:min-h-[4rem] text-xl sm:text-2xl text-zinc-800 dark:text-zinc-200" aria-label={`I build ${P.typewriterLines.join(", ")}`}>
            <span aria-hidden="true">
              I build <span className="font-semibold text-accent-blue">{typed}</span>
              <span className="animate-blink border-r-2 border-accent-blue ml-0.5">&nbsp;</span>
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
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
            <span className="flex items-center gap-3">
              <a href={P.links.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={iconLink}>
                <Github size={17} />
              </a>
              <a href={P.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={iconLink}>
                <Linkedin size={17} />
              </a>
            </span>
          </div>
        </div>

        <HeroImage />
      </div>
    </section>
  );
}
