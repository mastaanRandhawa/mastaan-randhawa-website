import { Briefcase, MapPin, CalendarDays } from "lucide-react";
import { portfolio } from "@/content/portfolio";

type Role = {
  title: string;
  period: string;
  current?: boolean;
  points: string[];
  tags: string[];
};

const company = portfolio.company;
const roles: Role[] = portfolio.company.roles;

export default function Experience() {
  return (
    <section id="experience" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Experience
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            Where I've Worked
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl">
            Over a year and a half of hands-on industry experience, from building applications to
            engineering data pipelines.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-8">
          {/* Company */}
          <div className="flex items-start gap-4 sm:gap-5 mb-8 sm:mb-10">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
              <Briefcase size={20} className="text-accent-blue" />
            </div>
            <div className="min-w-0">
              <h3 className="font-mono font-semibold text-base sm:text-lg text-zinc-900 dark:text-white">
                {company.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {company.period} · {company.duration}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} />
                  {company.location}
                </span>
              </div>
            </div>
          </div>

          {/* Roles timeline */}
          <ol className="relative ml-5 sm:ml-7 border-l border-zinc-200 dark:border-zinc-800 space-y-10">
            {roles.map((role) => (
              <li key={role.title} className="relative pl-6 sm:pl-8">
                <span
                  className={`absolute -left-[6px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-zinc-900 ${
                    role.current ? "bg-accent-blue" : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                  <h4 className="font-mono font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">
                    {role.title}
                  </h4>
                  {role.current && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-full px-2.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Current
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-zinc-400 mb-4">{role.period}</p>

                <ul className="space-y-2 mb-5">
                  {role.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed"
                    >
                      <span className="mt-2 w-1 h-1 rounded-full bg-accent-blue flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-1.5">
                  {role.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
