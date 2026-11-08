import { motion } from "framer-motion";
import { ArrowRight, Briefcase, CalendarDays, Download, ExternalLink, Github, GraduationCap, Linkedin, Mail, MapPin, X, Award, Users, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useGame, type PanelState } from "@/game/store";
import { portfolio, projectById, skillCategoryById } from "@/content/portfolio";
import { evidenceFor } from "@/content/evidence";
import { Chip, Label } from "../kit";
import { Diagram } from "./Diagram";
import { getWorld } from "@/world/world";
import { regionById } from "@/world/layout";
import type { PanelKind } from "@/world/layout";

const P = portfolio.profile;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9573f]">{title}</h4>
      {children}
    </section>
  );
}

function LinkButton({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  const external = !href.startsWith("mailto") && !href.endsWith(".pdf");
  return (
    <a
      href={href}
      target={href.startsWith("mailto") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className={
        primary
          ? "inline-flex items-center gap-2 rounded-full bg-[#1f3552] px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#2b4a72]"
          : "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-xs font-semibold text-[#1f3552] ring-1 ring-[#1f3552]/15 hover:ring-[#1f3552]/40"
      }
    >
      {children}
      {external && <ExternalLink size={12} className="opacity-60" />}
    </a>
  );
}

function About() {
  return (
    <>
      <p className="text-[15px] leading-relaxed text-[#1f3552]/85">{P.bio[0]}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#1f3552]/85">{P.bio[1]}</p>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {P.stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white/70 p-2.5 text-center ring-1 ring-[#1f3552]/10">
            <div className="font-mono text-lg font-bold text-[#1f3552]">{s.value}</div>
            <div className="font-mono text-[10px] text-[#1f3552]/55">{s.label}</div>
          </div>
        ))}
      </div>
      <Section title="What I do">
        <div className="grid gap-2 sm:grid-cols-2">
          {P.focusAreas.map((f) => (
            <div key={f.title} className="rounded-xl bg-white/60 p-3 ring-1 ring-[#1f3552]/8">
              <p className="text-sm font-semibold text-[#1f3552]">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                {f.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#1f3552]/65">{f.description}</p>
            </div>
          ))}
        </div>
      </Section>
      <p className="mt-5 text-sm leading-relaxed text-[#1f3552]/75">{P.bio[2]}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#1f3552]/75">{P.bio[3]}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <LinkButton href={P.links.resume} primary>
          <Download size={13} /> Resume
        </LinkButton>
        <LinkButton href={P.links.github}>
          <Github size={13} /> GitHub
        </LinkButton>
        <LinkButton href={P.links.linkedin}>
          <Linkedin size={13} /> LinkedIn
        </LinkButton>
      </div>
    </>
  );
}

function Skills({ id }: { id: string }) {
  const c = skillCategoryById(id);
  const open = useGame((s) => s.openPanel);
  if (!c) return null;
  return (
    <>
      <p className="text-[15px] leading-relaxed text-[#1f3552]/85">{c.blurb}</p>
      <p className="mt-1 text-xs text-[#1f3552]/55">Evidence comes from where each tool shows up in projects, roles and credentials — no self-rated percentages.</p>
      <div className="mt-4 space-y-2">
        {c.skills.map((s) => {
          const e = evidenceFor(s);
          const any = e.projects.length + e.roles.length + e.credentials.length > 0;
          return (
            <div key={s.name} className="rounded-xl bg-white/70 p-3 ring-1 ring-[#1f3552]/8">
              <div className="flex items-center gap-2">
                <span className="rounded-md px-2 py-0.5 font-mono text-xs font-semibold" style={{ backgroundColor: s.color, color: s.textColor }}>
                  {s.name}
                </span>
              </div>
              {any ? (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {e.roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-[#3fb8af]/12 px-2 py-0.5 text-[#1f6f69]">
                      <Briefcase size={10} /> {r.title}
                    </span>
                  ))}
                  {e.projects.map((p) => (
                    <button key={p.id} onClick={() => open({ kind: "project", id: p.id })} className="inline-flex items-center gap-1 rounded-full bg-[#5b6cff]/10 px-2 py-0.5 text-[#2f3fb0] hover:bg-[#5b6cff]/20">
                      {p.title} <ArrowRight size={10} />
                    </button>
                  ))}
                  {e.credentials.map((x) => (
                    <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-[#e6b64c]/15 px-2 py-0.5 text-[#8a6410]">
                      <Award size={10} /> {x.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-[#1f3552]/50">Part of the everyday toolkit.</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Project({ id }: { id: string }) {
  const p = projectById(id);
  if (!p) return null;
  const isLocalImage = p.image && !p.image.startsWith("http");
  return (
    <>
      {isLocalImage && (
        <img src={p.image} alt={p.imageAlt ?? p.title} className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover object-top ring-1 ring-[#1f3552]/10" loading="lazy" />
      )}
      <p className="text-[15px] leading-relaxed text-[#1f3552]/85">{p.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.tech.map((t) => (
          <Chip key={t} color={p.color}>
            {t}
          </Chip>
        ))}
      </div>
      {(p.context || p.period) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#1f3552]/60">
          {p.context && <span>{p.context}</span>}
          {p.period && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} /> {p.period}
            </span>
          )}
        </p>
      )}
      <Section title="Architecture">
        <Diagram kind={p.diagram} color={p.color} />
      </Section>
      <Section title="What I built">
        <ul className="space-y-1.5">
          {p.highlights.map((h) => (
            <li key={h.text} className="flex gap-2.5 text-sm leading-relaxed text-[#1f3552]/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              {h.text}
            </li>
          ))}
        </ul>
      </Section>
      {p.outcomes && (
        <Section title="Outcomes">
          <div className="grid gap-2 sm:grid-cols-2">
            {p.outcomes.map((o) => (
              <div key={o.text} className="rounded-xl bg-[#3fb8af]/10 p-3 text-sm font-medium leading-snug text-[#1f3552] ring-1 ring-[#3fb8af]/25">
                {o.text}
              </div>
            ))}
          </div>
        </Section>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {p.link && (
          <LinkButton href={p.link} primary>
            {p.linkLabel ?? "Visit"}
          </LinkButton>
        )}
        <LinkButton href={P.links.github}>
          <Github size={13} /> More on GitHub
        </LinkButton>
      </div>
    </>
  );
}

function Experience() {
  const c = portfolio.company;
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3fb8af]/15 text-[#1f6f69]">
          <Briefcase size={20} />
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1f3552]">{c.name}</p>
          <p className="flex flex-wrap gap-x-3 font-mono text-[11px] text-[#1f3552]/60">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} /> {c.period} · {c.duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {c.location}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#1f3552]/75">{c.summary}</p>
      <ol className="relative ml-4 mt-5 space-y-6 border-l border-[#1f3552]/15">
        {c.roles.map((r) => (
          <li key={r.id} className="relative pl-6">
            <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-[#fbf6ec] ${r.current ? "bg-[#3fb8af]" : "bg-[#1f3552]/30"}`} />
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="font-semibold text-[#1f3552]">{r.title}</h5>
              {r.current && <span className="rounded-full bg-[#3fb8af]/15 px-2 py-0.5 font-mono text-[10px] text-[#1f6f69]">Current</span>}
            </div>
            <p className="font-mono text-[11px] text-[#1f3552]/55">{r.period}</p>
            <ul className="mt-2 space-y-1.5">
              {r.points.map((pt) => (
                <li key={pt} className="flex gap-2.5 text-sm leading-relaxed text-[#1f3552]/80">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#3fb8af]" />
                  {pt}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <Chip key={t} color="#3fb8af">
                  {t}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function Education() {
  const e = portfolio.education;
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d9573f]/12 text-[#b6432d]">
          <GraduationCap size={20} />
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1f3552]">{e.school}</p>
          <p className="text-sm text-[#1f3552]/80">{e.degree}</p>
          <p className="flex flex-wrap gap-x-3 font-mono text-[11px] text-[#1f3552]/60">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} /> {e.period}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {e.location}
            </span>
          </p>
        </div>
      </div>
      <Section title="Academic work">
        <ul className="space-y-1.5">
          {e.notes.map((n) => (
            <li key={n} className="flex gap-2.5 text-sm leading-relaxed text-[#1f3552]/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9573f]" />
              {n}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Course projects">
        <CourseProjects />
      </Section>
    </>
  );
}

function CourseProjects() {
  const open = useGame((s) => s.openPanel);
  return (
    <div className="flex flex-wrap gap-2">
      {portfolio.projects
        .filter((p) => p.category === "systems")
        .map((p) => (
          <button key={p.id} onClick={() => open({ kind: "project", id: p.id })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-mono text-[11px] text-[#1f3552] ring-1 ring-[#1f3552]/15 hover:ring-[#1f3552]/40">
            {p.title} <ArrowRight size={11} />
          </button>
        ))}
    </div>
  );
}

function Achievements() {
  const certs = portfolio.credentials.filter((c) => c.kind === "certification");
  const badges = portfolio.credentials.filter((c) => c.kind === "badge");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {certs.map((c) => (
          <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col rounded-2xl bg-white/80 p-3 ring-1 ring-[#1f3552]/10 transition hover:-translate-y-0.5 hover:ring-[#1f3552]/30">
            <img src={c.image} alt={`${c.title} badge`} className="mx-auto h-20 w-20 object-contain" loading="lazy" />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#d9573f]">{c.issuer}</p>
            <p className="text-[13px] font-semibold leading-snug text-[#1f3552]">{c.title}</p>
            <p className="mt-auto pt-1 font-mono text-[10px] text-[#1f3552]/55">
              Issued {c.issued}
              {c.expires && ` · Expires ${c.expires}`}
            </p>
          </a>
        ))}
      </div>
      <Section title="Databricks knowledge badges">
        <div className="grid gap-2 sm:grid-cols-2">
          {badges.map((c) => (
            <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white/70 p-2.5 ring-1 ring-[#1f3552]/10 hover:ring-[#1f3552]/30">
              <img src={c.image} alt="" className="h-12 w-12 object-contain" loading="lazy" />
              <div>
                <p className="text-xs font-semibold leading-snug text-[#1f3552]">{c.title}</p>
                <p className="font-mono text-[10px] text-[#1f3552]/55">{c.issued}</p>
              </div>
            </a>
          ))}
        </div>
      </Section>
      <Section title="Leadership">
        {portfolio.leadership.map((l) => (
          <div key={l.id} className="rounded-xl bg-white/70 p-3 ring-1 ring-[#1f3552]/10">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1f3552]">
              <Users size={14} /> {l.title}, {l.org}
            </p>
            <p className="font-mono text-[10px] text-[#1f3552]/55">
              {l.location} · {l.period}
            </p>
            <ul className="mt-1.5 space-y-1">
              {l.points.map((pt) => (
                <li key={pt} className="text-xs leading-relaxed text-[#1f3552]/75">
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
      <div className="mt-5">
        <LinkButton href={P.links.credentials}>View all on LinkedIn</LinkButton>
      </div>
    </>
  );
}

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`;
    window.location.href = `mailto:${P.email}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  const field = "w-full rounded-xl border border-[#1f3552]/15 bg-white/80 px-3 py-2.5 text-sm text-[#1f3552] placeholder:text-[#1f3552]/35 focus:border-[#f2735a] focus:outline-none";
  return (
    <>
      <p className="text-[15px] leading-relaxed text-[#1f3552]/85">{portfolio.contact.connectText}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={P.links.resume} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-[#1f3552] p-3 text-white hover:bg-[#2b4a72]">
          <Download size={18} />
          <span>
            <span className="block text-sm font-semibold">Download resume</span>
            <span className="font-mono text-[10px] text-white/70">{P.resumeFileLabel}</span>
          </span>
        </a>
        <a href={P.links.email} className="flex items-center gap-3 rounded-xl bg-white/80 p-3 text-[#1f3552] ring-1 ring-[#1f3552]/10 hover:ring-[#1f3552]/30">
          <Mail size={18} className="text-[#f2735a]" />
          <span>
            <span className="block text-sm font-semibold">Email</span>
            <span className="font-mono text-[10px] text-[#1f3552]/60">{P.email}</span>
          </span>
        </a>
        <a href={P.links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white/80 p-3 text-[#1f3552] ring-1 ring-[#1f3552]/10 hover:ring-[#1f3552]/30">
          <Linkedin size={18} className="text-[#0a66c2]" />
          <span className="text-sm font-semibold">Connect on LinkedIn</span>
        </a>
        <a href={P.links.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white/80 p-3 text-[#1f3552] ring-1 ring-[#1f3552]/10 hover:ring-[#1f3552]/30">
          <Github size={18} />
          <span className="text-sm font-semibold">Browse GitHub</span>
        </a>
      </div>
      <Section title="Send a message">
        <form onSubmit={submit} className="space-y-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="sr-only">Name</span>
              <input required className={field} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="sr-only">Email</span>
              <input required type="email" className={field} placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
          <label className="block">
            <span className="sr-only">Subject</span>
            <input required className={field} placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="block">
            <span className="sr-only">Message</span>
            <textarea required rows={4} className={`${field} resize-none`} placeholder={`Hi ${P.firstName}, …`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#f2735a] px-5 py-2.5 font-mono text-xs font-semibold text-white hover:bg-[#e8624a]">
            <Send size={13} /> {sent ? "Opening your mail app…" : "Send via email"}
          </button>
        </form>
      </Section>
    </>
  );
}

const META: Record<PanelKind, (id?: string) => { label: string; title: string; accent: string }> = {
  about: () => ({ label: "Launch Airfield · About", title: P.name, accent: regionById("launch").accent }),
  skills: (id) => {
    const c = skillCategoryById(id!);
    return { label: `Skills Archipelago · ${c?.islandName ?? ""}`, title: c?.label ?? "Skills", accent: c?.color ?? "#3b5bff" };
  },
  project: (id) => {
    const p = projectById(id!);
    const region = getWorld().destinations.find((d) => d.contentId === id)?.regionId;
    return { label: region ? regionById(region).name : "Project", title: p?.title ?? "", accent: p?.color ?? "#f2735a" };
  },
  experience: () => ({ label: "Experience City", title: "Where I've worked", accent: regionById("city").accent }),
  education: () => ({ label: "Education Summit", title: "Education", accent: regionById("summit").accent }),
  achievements: () => ({ label: "Achievement Peaks", title: "Certifications & leadership", accent: regionById("peaks").accent }),
  contact: () => ({ label: "Contact Airfield", title: "Let's connect", accent: regionById("contact").accent }),
};

export function DetailPanel({ panel }: { panel: PanelState }) {
  const close = useGame((s) => s.closePanel);
  const setMode = useGame((s) => s.setMode);
  const ref = useRef<HTMLDivElement>(null);
  const meta = META[panel.kind](panel.id);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollTo({ top: 0 });
  }, [panel]);

  return (
    <motion.div className="fixed inset-0 z-40 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-gradient-to-l from-[#1f3552]/45 to-transparent" onClick={close} />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
        className="relative h-full w-full max-w-[620px] overflow-y-auto bg-[#fbf6ec] shadow-[-30px_0_80px_-30px_rgba(31,53,82,0.6)] outline-none sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 bg-[#fbf6ec]/95 backdrop-blur">
          <div className="h-1.5" style={{ backgroundColor: meta.accent }} />
          <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-4">
            <div>
              <Label color={meta.accent}>{meta.label}</Label>
              <h2 className="font-serif text-3xl italic leading-tight text-[#1f3552]">{meta.title}</h2>
            </div>
            <button onClick={close} aria-label="Close and keep flying" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1f3552]/5 text-[#1f3552] hover:bg-[#1f3552]/10">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-6 pb-8">
          {panel.kind === "about" && <About />}
          {panel.kind === "skills" && <Skills id={panel.id!} />}
          {panel.kind === "project" && <Project id={panel.id!} />}
          {panel.kind === "experience" && <Experience />}
          {panel.kind === "education" && <Education />}
          {panel.kind === "achievements" && <Achievements />}
          {panel.kind === "contact" && <Contact />}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#1f3552]/10 pt-4">
            <button onClick={close} className="inline-flex items-center gap-2 rounded-full bg-[#f2735a] px-5 py-2.5 font-mono text-xs font-semibold text-white hover:bg-[#e8624a]">
              Keep flying <ArrowRight size={14} />
            </button>
            <button onClick={() => setMode("portfolio")} className="font-mono text-[11px] text-[#1f3552]/60 underline underline-offset-4 hover:text-[#1f3552]">
              Open the classic portfolio
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
