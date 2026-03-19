import { Download, Mail, FileText } from "lucide-react";

export default function Resume() {
  return (
    <section id="resume" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Resume
          </span>
          <h2 className="font-serif italic text-4xl sm:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            My Resume
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl">
            Download my latest resume to learn more about my experience, skills, and achievements.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-2xl">
          <div className="flex items-start gap-5 mb-8">
            <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-accent-blue" />
            </div>
            <div>
              <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mb-1">
                Mastaan_Randhawa_Resume2025.pdf
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Software Developer · Simon Fraser University · Updated May 2025
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href="ResumeMay2025Tech.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-sm px-6 py-3 rounded-full hover:bg-accent-blue dark:hover:bg-accent-blue dark:hover:text-white transition-all duration-200"
            >
              <Download size={16} />
              Download Resume
            </a>
            <a
              href="mailto:mastaanrandhawa@gmail.com"
              className="inline-flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-sm px-6 py-3 rounded-full hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              <Mail size={16} />
              Contact Me
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
