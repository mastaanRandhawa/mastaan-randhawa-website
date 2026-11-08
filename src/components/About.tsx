import { Terminal, Globe, Palette, Zap, Database, Cloud } from "lucide-react";

import { portfolio } from "@/content/portfolio";

const ICONS = { terminal: Terminal, globe: Globe, database: Database, cloud: Cloud, palette: Palette, zap: Zap };
const whatIDo = portfolio.profile.focusAreas.map((f) => ({ icon: ICONS[f.icon], title: f.title, desc: f.description, color: f.color }));

export default function About() {
  return (
    <section id="about" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10 sm:mb-16">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            About Me
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2">
            Who I Am
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Bio */}
          <div>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5 sm:mb-6">
              I'm{" "}
              <span className="text-zinc-900 dark:text-white font-semibold">Mastaan Randhawa</span>
              , a Software Developer and Computer Science student at{" "}
              <span className="text-zinc-900 dark:text-white font-semibold">
                Simon Fraser University
              </span>
              . I'm passionate about using technology to create meaningful change.
            </p>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5 sm:mb-6">
              For the past year and a half at{" "}
              <span className="text-zinc-900 dark:text-white font-semibold">
                ThoughtsWin Systems
              </span>{" "}
              I've worked as an App Development Intern and now as a Data Engineer Intern, building
              applications and data pipelines. I'm a Databricks Certified Data Engineer Associate
              and a Microsoft Certified Security Operations Analyst, and I've built client websites
              through Doxa Studios.
            </p>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5 sm:mb-6">
              I hope to keep expanding my skills, meet people from different walks of life, and one
              day explore how tech and sales can come together to help others.
            </p>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              From building low-level systems in C/C++ to crafting interactive web experiences with
              Three.js and React, I love the entire spectrum of software development.
            </p>

            {/* Quick stats */}
            <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {portfolio.profile.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 text-center"
                >
                  <div className="font-mono font-bold text-xl sm:text-2xl text-zinc-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="font-mono text-xs text-zinc-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* What I Do */}
          <div>
            <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mb-5 sm:mb-6">
              What I Do
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {whatIDo.map(({ icon: Icon, title, desc, color }) => (
                <div
                  key={title}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-200 group"
                >
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <h4 className="font-mono font-semibold text-sm text-zinc-900 dark:text-white mb-1.5">
                    {title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
