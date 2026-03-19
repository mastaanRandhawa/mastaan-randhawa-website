import { Mail, Linkedin, Github } from "lucide-react";

const socials = [
  {
    icon: Mail,
    href: "mailto:mastaanrandhawa@gmail.com",
    label: "Email",
  },
  {
    icon: Linkedin,
    href: "https://linkedin.com/in/MastaanRandhawa",
    label: "LinkedIn",
  },
  {
    icon: Github,
    href: "https://github.com/mastaanRandhawa",
    label: "GitHub",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <p className="font-mono text-sm text-zinc-400 dark:text-zinc-600">
          © 2025 Mastaan Randhawa. All rights reserved.
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
