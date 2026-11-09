import { Mail, Linkedin, Github } from "lucide-react";
import { portfolio } from "@/content/portfolio";

const SECTIONS = [
  { label: "Work", href: "#portfolio" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Certifications", href: "#certifications" },
  { label: "Education", href: "#education" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "Resume", href: "#resume" },
];

const P = portfolio.profile;
const socials = [
  { icon: Mail, href: P.links.email, label: "Email" },
  { icon: Linkedin, href: P.links.linkedin, label: "LinkedIn" },
  { icon: Github, href: P.links.github, label: "GitHub" },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10">
      <nav aria-label="All sections" className="max-w-6xl mx-auto px-6 mb-8 flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2">
        {[...SECTIONS].map((l) => (
          <a key={l.href} href={l.href} className="font-mono text-sm text-zinc-500 dark:text-zinc-400 hover:text-accent-blue transition-colors">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <p className="font-mono text-sm text-zinc-400 dark:text-zinc-600">
          © {new Date().getFullYear()} {P.name}. All rights reserved.
        </p>

        <div className="flex items-center gap-3">
          {socials.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
            >
              <Icon size={16} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
