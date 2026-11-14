import type { ReactNode } from "react";

/** Section title: a hairline rule, the section number in the margin, a plain serif title. */
export default function SectionHeading({ n, title, children }: { n: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 sm:mb-12 border-t border-zinc-300 dark:border-zinc-700 pt-4 grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-y-2">
      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 pt-2">{n}</span>
      <div>
        <h2 className="font-serif font-bold tracking-tight text-4xl sm:text-5xl leading-none text-[#0d1b3e] dark:text-white">{title}</h2>
        {children && <p className="mt-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">{children}</p>}
      </div>
    </div>
  );
}
