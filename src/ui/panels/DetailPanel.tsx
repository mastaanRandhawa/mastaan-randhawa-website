import { motion } from "framer-motion";
import {
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Palette,
  PlaneLanding,
  PlaneTakeoff,
  Send,
  Terminal,
  Users,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useGame, type PanelState } from "@/game/store";
import { portfolio, projectById, skillCategoryById } from "@/content/portfolio";
import { evidenceFor } from "@/content/evidence";
import { Button, Chip, Group, IconTile, Row, SYSTEM } from "../kit";
import { Diagram } from "./Diagram";
import { destinationById, getWorld } from "@/world/world";
import { regionById } from "@/world/layout";
import type { PanelKind } from "@/world/layout";
import { runtime } from "@/game/runtime";
import { departVisit, pickNext } from "@/game/visit";

const P = portfolio.profile;
const FOCUS_ICON = { terminal: Terminal, globe: Globe, database: Database, cloud: Cloud, palette: Palette, zap: Zap };

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[14px] bg-white p-4 ${className}`}>{children}</div>;
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="ios-group">
      {items.map((t) => (
        <div key={t} className="flex gap-3 px-4 py-3 text-[15px] leading-snug text-[#1f3552]">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {t}
        </div>
      ))}
    </div>
  );
}

function About() {
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[17px] leading-relaxed text-[#1f3552]">{P.bio[0]}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-[#33425a]">{P.bio[1]}</p>
      </Card>
      <div className="grid grid-cols-4 gap-2">
        {P.stats.map((s) => (
          <div key={s.label} className="rounded-[14px] bg-white p-3 text-center">
            <div className="font-instrument text-[20px] font-semibold text-[#1f3552]">{s.value}</div>
            <div className="text-[11px] font-medium text-[#5d6b80]">{s.label}</div>
          </div>
        ))}
      </div>
      <Group header="What I do">
        {P.focusAreas.map((f) => (
          <Row key={f.title} icon={FOCUS_ICON[f.icon]} color={f.color} title={f.title} subtitle={f.description} />
        ))}
      </Group>
      <Card>
        <p className="text-[15px] leading-relaxed text-[#33425a]">{P.bio[2]}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-[#33425a]">{P.bio[3]}</p>
      </Card>
      <Group header="Links">
        <Row icon={Download} color={SYSTEM.blue} title="Resume (PDF)" href={P.links.resume} chevron />
        <Row icon={Github} color="#24292f" title="GitHub" href={P.links.github} chevron />
        <Row icon={Linkedin} color="#0a66c2" title="LinkedIn" href={P.links.linkedin} chevron />
      </Group>
    </div>
  );
}

function Skills({ id }: { id: string }) {
  const c = skillCategoryById(id);
  const open = useGame((s) => s.openPanel);
  if (!c) return null;
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[17px] leading-relaxed text-[#1f3552]">{c.blurb}</p>
      </Card>
      <Group header={`${c.skills.length} skills`} footer="Evidence comes from where each tool shows up in projects, roles and credentials. No self-rated percentages.">
        {c.skills.map((s) => {
          const e = evidenceFor(s);
          const any = e.projects.length + e.roles.length + e.credentials.length > 0;
          return (
            <div key={s.name} className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[17px] text-[#1f3552]">{s.name}</span>
              </div>
              {any ? (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-[22px]">
                  {e.roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-[#3f8f5a]/12 px-2.5 py-1 text-[12px] font-medium text-[#248a3d]">
                      <Briefcase size={11} /> {r.title}
                    </span>
                  ))}
                  {e.projects.map((p) => (
                    <button key={p.id} onClick={() => open({ kind: "project", id: p.id })} className="rounded-full bg-[#2b5c8a]/10 px-2.5 py-1 text-[12px] font-medium text-[#2b5c8a] hover:bg-[#2b5c8a]/20">
                      {p.title}
                    </button>
                  ))}
                  {e.credentials.map((x) => (
                    <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-[#b8862b]/20 px-2.5 py-1 text-[12px] font-medium text-[#8a6d00]">
                      <Award size={11} /> {x.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 pl-[22px] text-[13px] text-[#7d8593]">Part of the everyday toolkit</p>
              )}
            </div>
          );
        })}
      </Group>
    </div>
  );
}

function Project({ id }: { id: string }) {
  const p = projectById(id);
  if (!p) return null;
  const isLocalImage = p.image && !p.image.startsWith("http");
  return (
    <div className="space-y-6">
      {isLocalImage && <img src={p.image} alt={p.imageAlt ?? p.title} className="aspect-[16/9] w-full rounded-[16px] object-cover object-top shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)]" loading="lazy" />}
      <Card>
        <p className="text-[17px] leading-relaxed text-[#1f3552]">{p.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.tech.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
        {(p.context || p.period) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#5d6b80]">
            {p.context && <span>{p.context}</span>}
            {p.period && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> {p.period}
              </span>
            )}
          </p>
        )}
      </Card>
      <section>
        <h3 className="ios-group-header">Architecture</h3>
        <Diagram kind={p.diagram} color={p.color} />
      </section>
      <section>
        <h3 className="ios-group-header">What I built</h3>
        <Bullets items={p.highlights.map((h) => h.text)} color={p.color} />
      </section>
      {p.outcomes && (
        <Group header="Outcomes">
          {p.outcomes.map((o) => (
            <div key={o.text} className="flex items-start gap-3 px-4 py-3">
              <CheckCircle2 size={20} className="mt-px shrink-0 text-[#3f8f5a]" fill="#3f8f5a" stroke="white" />
              <span className="text-[15px] leading-snug text-[#1f3552]">{o.text}</span>
            </div>
          ))}
        </Group>
      )}
      <Group header="Links">
        {p.link && <Row icon={ExternalLink} color={p.color} title={p.linkLabel ?? "Visit"} subtitle={p.link.replace(/^https?:\/\//, "")} href={p.link} chevron />}
        <Row icon={Github} color="#24292f" title="More on GitHub" href={P.links.github} chevron />
      </Group>
    </div>
  );
}

function Experience() {
  const c = portfolio.company;
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3">
        <IconTile icon={Briefcase} color={SYSTEM.teal} size={44} />
        <div>
          <p className="text-[19px] font-semibold text-[#1f3552]">{c.name}</p>
          <p className="flex flex-wrap gap-x-3 text-[13px] text-[#5d6b80]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {c.period} · {c.duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {c.location}
            </span>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#33425a]">{c.summary}</p>
        </div>
      </Card>
      {c.roles.map((r) => (
        <section key={r.id}>
          <h3 className="ios-group-header flex items-center gap-2">
            {r.title} · {r.period}
            {r.current && <span className="rounded-full bg-[#3f8f5a] px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-white">Current</span>}
          </h3>
          <Bullets items={r.points} color={SYSTEM.teal} />
          <div className="mt-2 flex flex-wrap gap-1.5 px-1">
            {r.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Education() {
  const e = portfolio.education;
  const open = useGame((s) => s.openPanel);
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3">
        <IconTile icon={GraduationCap} color={SYSTEM.orange} size={44} />
        <div>
          <p className="text-[19px] font-semibold text-[#1f3552]">{e.school}</p>
          <p className="text-[15px] text-[#33425a]">{e.degree}</p>
          <p className="flex flex-wrap gap-x-3 text-[13px] text-[#5d6b80]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {e.period}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {e.location}
            </span>
          </p>
        </div>
      </Card>
      <section>
        <h3 className="ios-group-header">Academic work</h3>
        <Bullets items={e.notes} color={SYSTEM.orange} />
      </section>
      <Group header="Course & systems projects">
        {portfolio.projects
          .filter((p) => p.category === "systems")
          .map((p) => (
            <Row key={p.id} title={p.title} subtitle={p.tagline} chevron onClick={() => open({ kind: "project", id: p.id })} />
          ))}
      </Group>
    </div>
  );
}

function Achievements() {
  const certs = portfolio.credentials.filter((c) => c.kind === "certification");
  const badges = portfolio.credentials.filter((c) => c.kind === "badge");
  const credRow = (c: (typeof certs)[number]) => (
    <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.03]">
      <img src={c.image} alt="" className="h-12 w-12 shrink-0 object-contain" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5d6b80]">{c.issuer}</p>
        <p className="text-[15px] font-medium leading-snug text-[#1f3552]">{c.title}</p>
        <p className="text-[12px] text-[#7d8593]">
          Issued {c.issued}
          {c.expires && ` · Expires ${c.expires}`}
        </p>
      </div>
      <ExternalLink size={15} className="shrink-0 text-[#b9bfc9]" />
    </a>
  );
  return (
    <div className="space-y-6">
      <Group header="Certifications" footer="Tap any credential to verify it with the issuer.">
        {certs.map(credRow)}
      </Group>
      <Group header="Databricks knowledge badges">{badges.map(credRow)}</Group>
      <Group header="Leadership">
        {portfolio.leadership.map((l) => (
          <div key={l.id} className="px-4 py-3">
            <p className="flex items-center gap-2 text-[17px] text-[#1f3552]">
              <Users size={16} className="text-[#5856D6]" /> {l.title}, {l.org}
            </p>
            <p className="text-[13px] text-[#5d6b80]">
              {l.location} · {l.period}
            </p>
            <ul className="mt-1.5 space-y-1 text-[14px] leading-snug text-[#33425a]">
              {l.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
      </Group>
      <Group>
        <Row icon={Linkedin} color="#0a66c2" title="View all on LinkedIn" href={P.links.credentials} chevron />
      </Group>
    </div>
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
  const field = "w-full bg-transparent px-4 py-3 text-[17px] text-[#1f3552] placeholder:text-[#b9bfc9] focus:outline-none";
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[17px] leading-relaxed text-[#1f3552]">{portfolio.contact.connectText}</p>
      </Card>
      <Group>
        <Row icon={Download} color={SYSTEM.blue} title="Download Resume" subtitle={P.resumeFileLabel} href={P.links.resume} chevron />
        <Row icon={Mail} color={SYSTEM.orange} title="Email" subtitle={P.email} href={P.links.email} chevron />
        <Row icon={Linkedin} color="#0a66c2" title="LinkedIn" subtitle="Connect professionally" href={P.links.linkedin} chevron />
        <Row icon={Github} color="#24292f" title="GitHub" subtitle="Browse repositories" href={P.links.github} chevron />
      </Group>
      <form onSubmit={submit}>
        <h3 className="ios-group-header">Send a message</h3>
        <div className="ios-group">
          <label className="block">
            <span className="sr-only">Name</span>
            <input required className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="sr-only">Email</span>
            <input required type="email" className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block">
            <span className="sr-only">Subject</span>
            <input required className={field} placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="block">
            <span className="sr-only">Message</span>
            <textarea required rows={4} className={`${field} resize-none`} placeholder={`Hi ${P.firstName}, …`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
        </div>
        <Button type="submit" variant="filled" size="md" className="mt-3 w-full">
          <Send size={15} /> {sent ? "Opening your mail app…" : "Send via Email"}
        </Button>
      </form>
    </div>
  );
}

const META: Record<PanelKind, (id?: string) => { label: string; title: string; accent: string }> = {
  about: () => ({ label: "Launch Airfield", title: P.name, accent: regionById("launch").accent }),
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

/** iOS-style sheet. While parked on an island it offers Take Off / Fly to next. */
export function DetailPanel({ panel }: { panel: PanelState }) {
  const close = useGame((s) => s.closePanel);
  const setMode = useGame((s) => s.setMode);
  const visit = useGame((s) => s.visit);
  const ref = useRef<HTMLDivElement>(null);
  const meta = META[panel.kind](panel.id);
  const landed = visit?.stage === "landed";
  const here = landed ? destinationById(visit!.destId) : null;
  const nextId = useMemo(() => (landed && visit ? pickNext(visit.destId) : null), [landed, visit, panel]);
  const next = nextId ? destinationById(nextId) : null;

  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [panel]);

  const flyNext = () => {
    if (runtime.visit?.stage === "landed") departVisit(true);
    close();
  };

  return (
    <motion.div className="font-sf fixed inset-0 z-40 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-black/5 to-transparent" onClick={close} />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 280 }}
        className="relative flex h-full w-full max-w-[600px] flex-col overflow-hidden bg-[#f3ecdf] shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.5)] outline-none sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[16px]"
      >
        <header className="z-10 shrink-0 bg-[#f3ecdf] px-5 pb-3 pt-3">
          <div className="flex h-9 items-center justify-between">
            {landed && here ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#33425a] shadow-sm">
                <PlaneLanding size={13} style={{ color: here.accent }} /> Landed at {here.label}
              </span>
            ) : (
              <span />
            )}
            <button onClick={close} className="rounded-lg px-1.5 py-1 text-[17px] font-semibold text-[#2b5c8a] hover:opacity-70">
              Done
            </button>
          </div>
          <p className="mt-1 text-[13px] font-semibold" style={{ color: meta.accent }}>
            {meta.label}
          </p>
          <h2 className="font-sf-display text-[32px] font-bold leading-tight text-[#1f3552]">{meta.title}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
          {panel.kind === "about" && <About />}
          {panel.kind === "skills" && <Skills id={panel.id!} />}
          {panel.kind === "project" && <Project id={panel.id!} />}
          {panel.kind === "experience" && <Experience />}
          {panel.kind === "education" && <Education />}
          {panel.kind === "achievements" && <Achievements />}
          {panel.kind === "contact" && <Contact />}
          <button onClick={() => setMode("portfolio")} className="mx-auto mt-6 block text-[13px] font-medium text-[#2b5c8a] hover:opacity-70">
            Open the classic portfolio
          </button>
        </div>
        <footer className="shrink-0 border-t border-black/[0.06] bg-[#f3ecdf] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {landed ? (
            <div className="flex gap-2.5">
              <Button variant="gray" size="lg" onClick={close} className={next ? "" : "flex-1"}>
                <PlaneTakeoff size={17} /> Take Off
              </Button>
              {next && (
                <Button variant="filled" size="lg" onClick={flyNext} className="min-w-0 flex-1">
                  <span className="truncate">Fly to {next.label}</span>
                </Button>
              )}
            </div>
          ) : (
            <Button variant="filled" size="lg" onClick={close} className="w-full">
              Done
            </Button>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}
