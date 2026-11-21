import type { ReactNode } from "react";
import { motion } from "motion/react";
import { EASE } from "@/components/ui/motion";

const VIEWPORT = { once: true, amount: 0.6 } as const;

/** Section title: a hairline rule, the section number in the margin, a plain serif title. The rule draws in, then the text rises. */
export default function SectionHeading({ n, title, children }: { n: string; title: string; children?: ReactNode }) {
  return (
    <motion.div className="relative mb-8 sm:mb-12 pt-4 grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-y-2" initial="hidden" whileInView="show" viewport={VIEWPORT}>
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left bg-zinc-300 dark:bg-zinc-700"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 1, ease: EASE }}
      />
      <motion.span
        className="font-mono text-xs text-zinc-400 dark:text-zinc-500 pt-2 tabular"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
      >
        {n}
      </motion.span>
      <div>
        <motion.h2
          className="font-serif font-bold tracking-tight text-4xl sm:text-5xl leading-none text-[#0d1b3e] dark:text-white"
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        >
          {title}
        </motion.h2>
        {children && (
          <motion.p
            className="mt-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed"
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.22 }}
          >
            {children}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
