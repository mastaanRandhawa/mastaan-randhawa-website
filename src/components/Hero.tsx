import { useEffect, useState } from "react";
import { ArrowRight, Github, Linkedin } from "lucide-react";

const typewriterLines = [
  "I am passionate about C and C++ development.",
  "I am experienced with JavaScript and modern web technologies.",
  "I enjoy crafting clean and responsive designs with HTML and CSS.",
  "I love bringing ideas to life through Figma and creative design work.",
  "I am comfortable working with React, Three.js, and Spring Boot.",
  "I am familiar with managing data using MongoDB, MySQL, and SQLite.",
  "I have hands-on experience deploying projects with Render and AWS.",
  "I have worked with Azure, Event Grid, and Event Hubs.",
];

function useTypewriter(lines: string[]) {
  const [displayed, setDisplayed] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = lines[lineIndex];

    if (!deleting && charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 45);
      return () => clearTimeout(t);
    }

    if (!deleting && charIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex > 0) {
      const t = setTimeout(() => setCharIndex((c) => c - 1), 22);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setLineIndex((i) => (i + 1) % lines.length);
    }
  }, [charIndex, deleting, lineIndex, lines]);

  useEffect(() => {
    setDisplayed(lines[lineIndex].substring(0, charIndex));
  }, [charIndex, lineIndex, lines]);

  return displayed;
}

export default function Hero() {
  const typewriterText = useTypewriter(typewriterLines);

  return (
    <section className="min-h-screen flex items-center pt-16 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24 w-full">
        <div className="max-w-3xl">
          {/* Label */}
          <div className="inline-flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400 mb-6 sm:mb-8 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Available for opportunities
          </div>

          {/* Heading */}
          <h1 className="font-serif italic text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-zinc-900 dark:text-white leading-tight mb-5 sm:mb-6">
            Hi, I'm{" "}
            <span className="text-accent-blue">Mastaan</span>
            <br />
            Randhawa.
          </h1>

          {/* Typewriter — min-height so wrapping text doesn't collapse the block */}
          <div className="min-h-[2.5rem] mb-5 sm:mb-6">
            <p className="font-mono text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {typewriterText}
              <span className="animate-blink border-r-2 border-accent-blue ml-0.5">&nbsp;</span>
            </p>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 sm:mb-10 max-w-xl">
            A passionate Software Developer and Computer Science student at{" "}
            <span className="text-zinc-900 dark:text-white font-medium">Simon Fraser University</span>,
            turning ideas into digital reality.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-10 sm:mb-12">
            <a
              href="#portfolio"
              className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-accent-blue dark:hover:bg-accent-blue dark:hover:text-white transition-all duration-200 group"
            >
              View My Work
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              Get In Touch
            </a>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="https://github.com/mastaanRandhawa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              <Github size={17} />
            </a>
            <a
              href="https://linkedin.com/in/MastaanRandhawa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              <Linkedin size={17} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
