import { Download, Mail, FileText } from "lucide-react";

export default function Resume() {
  return (
    <section id="resume" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Resume
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            My Resume
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl">
            Download my latest resume to learn more about my experience, skills, and achievements.
          </p>
        </div>

        {/* Card — full width on mobile, max-2xl on larger */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-8 w-full sm:max-w-2xl">
          <div className="flex items-start gap-4 sm:gap-5 mb-6 sm:mb-8">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-accent-blue" />
            </div>
            <div className="min-w-0">
              <h3 className="font-mono font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1 truncate">
                Mastaan_Randhawa_Resume2025.pdf
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Software Developer · Simon Fraser University · May 2025
              </p>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4">
            <a
              href="ResumeMay2025Tech.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-mono text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-accent-blue dark:hover:bg-accent-blue dark:hover:text-white transition-all duration-200"
            >
              <Download size={15} />
              Download Resume
            </a>
            <a
              href="mailto:mastaanrandhawa@gmail.com"
              className="inline-flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              <Mail size={15} />
              Contact Me
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
