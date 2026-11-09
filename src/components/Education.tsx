import { GraduationCap, MapPin, CalendarDays } from "lucide-react";
import { portfolio } from "@/content/portfolio";

export default function Education() {
  const e = portfolio.education;
  return (
    <section id="education" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">Education</span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2">Where I Study</h2>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-8 flex items-start gap-4 sm:gap-5">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} className="text-accent-blue" />
          </div>
          <div className="min-w-0">
            <h3 className="font-mono font-semibold text-base sm:text-lg text-zinc-900 dark:text-white">{e.school}</h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{e.degree}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {e.period}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                {e.location}
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {e.notes.map((n) => (
                <li key={n} className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="mt-2 w-1 h-1 rounded-full bg-accent-blue flex-shrink-0" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
