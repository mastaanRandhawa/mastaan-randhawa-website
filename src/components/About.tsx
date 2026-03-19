import { Terminal, Globe, Palette, Zap } from "lucide-react";

const whatIDo = [
  {
    icon: Terminal,
    title: "System Programming",
    desc: "Low-level C/C++ development, memory management, OS concepts, and performance-critical applications.",
    color: "#1f464d",
  },
  {
    icon: Globe,
    title: "Web Development",
    desc: "Full-stack web applications using modern frameworks, responsive design, and scalable architectures.",
    color: "#0015ff",
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    desc: "Crafting intuitive user interfaces with Figma, translating designs into polished digital experiences.",
    color: "#E794DA",
  },
  {
    icon: Zap,
    title: "Performance Optimization",
    desc: "Profiling, benchmarking, and tuning applications for speed, efficiency, and resource utilization.",
    color: "#ff5941",
  },
];

export default function About() {
  return (
    <section id="about" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            About Me
          </span>
          <h2 className="font-serif italic text-4xl sm:text-5xl text-zinc-900 dark:text-white mt-2">
            Who I Am
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Bio */}
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed mb-6">
              I'm{" "}
              <span className="text-zinc-900 dark:text-white font-semibold">Mastaan Randhawa</span>
              , a Software Developer and Computer Science student at{" "}
              <span className="text-zinc-900 dark:text-white font-semibold">
                Simon Fraser University
              </span>
              . I'm passionate about using technology to create meaningful change.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed mb-6">
              I hope to keep expanding my skills, meet people from different walks of life, and one
              day explore how tech and sales can come together to help others.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
              From building low-level systems in C/C++ to crafting interactive web experiences with
              Three.js and React, I love the entire spectrum of software development.
            </p>

            {/* Quick stats */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { value: "9+", label: "Projects" },
                { value: "15+", label: "Technologies" },
                { value: "SFU", label: "University" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center"
                >
                  <div className="font-mono font-bold text-2xl text-zinc-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="font-mono text-xs text-zinc-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* What I Do */}
          <div>
            <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mb-6">
              What I Do
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whatIDo.map(({ icon: Icon, title, desc, color }) => (
                <div
                  key={title}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-200 group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <Icon size={18} style={{ color }} />
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
