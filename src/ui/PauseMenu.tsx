import { motion } from "framer-motion";
import { ArrowLeft, Award, BookOpen, Check, Keyboard, LayoutGrid, Lock, Map, Play, Plane, Settings2, Camera, LogOut, ScrollText } from "lucide-react";
import { useGame, type Overlay } from "@/game/store";
import { ACHIEVEMENTS, MISSIONS, SKINS, completion, unlockedSkins } from "@/game/progression";
import { CONTROL_HELP } from "@/config/controls";
import { portfolio } from "@/content/portfolio";
import { parkAtSpawn } from "@/game/runtime";
import { clearSave } from "@/game/save";
import { Button, Glass, Kbd, Label } from "./kit";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <button onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full bg-[#1f3552]/5 text-[#1f3552] hover:bg-[#1f3552]/10">
        <ArrowLeft size={16} />
      </button>
      <h2 className="font-serif text-2xl italic text-[#1f3552]">{title}</h2>
    </div>
  );
}

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1f3552]/8 py-2.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1f3552]">{label}</p>
        {hint && <p className="text-[11px] text-[#1f3552]/55">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", value ? "bg-[#3fb8af]" : "bg-[#1f3552]/20")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", value ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-[#1f3552]/8 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("rounded-full px-3 py-1 font-mono text-[11px] transition", value === o.v ? "bg-white text-[#1f3552] shadow" : "text-[#1f3552]/60 hover:text-[#1f3552]")}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Slider({ value, onChange, label, min = 0, max = 1, step = 0.05 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number }) {
  return <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-36 accent-[#f2735a]" />;
}

export function SettingsPanel({ onBack }: { onBack: () => void }) {
  const s = useGame((x) => x.settings);
  const u = useGame((x) => x.updateSettings);
  const quality = useGame((x) => x.quality);
  return (
    <Glass className="max-h-[85vh] overflow-y-auto p-6">
      <Header title="Settings" onBack={onBack} />
      <Label className="text-[#d9573f]">Flight</Label>
      <Row label="Flight assist" hint="Auto-levels, limits pitch, pulls up near terrain">
        <Toggle label="Flight assist" value={s.flightAssist} onChange={(v) => u({ flightAssist: v })} />
      </Row>
      <Row label="Steering" hint="Mouse mode steers toward the cursor">
        <Segmented label="Steering" value={s.controlMode} onChange={(v) => u({ controlMode: v })} options={[{ v: "keyboard", l: "Keyboard" }, { v: "mouse", l: "Mouse" }]} />
      </Row>
      {s.controlMode === "mouse" && (
        <Row label="Mouse sensitivity">
          <Slider label="Mouse sensitivity" value={s.mouseSensitivity} min={0.3} max={2.5} step={0.1} onChange={(v) => u({ mouseSensitivity: v })} />
        </Row>
      )}
      <Row label="Invert pitch">
        <Toggle label="Invert pitch" value={s.invertPitch} onChange={(v) => u({ invertPitch: v })} />
      </Row>
      <div className="mt-4" />
      <Label className="text-[#d9573f]">Graphics</Label>
      <Row label="Quality" hint={s.quality === "auto" ? `Auto — currently ${quality}` : undefined}>
        <Segmented
          label="Quality"
          value={s.quality}
          onChange={(v) => u({ quality: v })}
          options={[{ v: "auto", l: "Auto" }, { v: "low", l: "Low" }, { v: "medium", l: "Med" }, { v: "high", l: "High" }]}
        />
      </Row>
      <Row label="Destination labels">
        <Toggle label="Destination labels" value={s.showLabels} onChange={(v) => u({ showLabels: v })} />
      </Row>
      <Row label="Show FPS">
        <Toggle label="Show FPS" value={s.showFps} onChange={(v) => u({ showFps: v })} />
      </Row>
      <div className="mt-4" />
      <Label className="text-[#d9573f]">Comfort & accessibility</Label>
      <Row label="Reduced motion" hint="Calmer camera, no speed lines or FOV kicks">
        <Toggle label="Reduced motion" value={s.reducedMotion} onChange={(v) => u({ reducedMotion: v, cameraShake: v ? false : s.cameraShake })} />
      </Row>
      <Row label="Camera shake">
        <Toggle label="Camera shake" value={s.cameraShake} onChange={(v) => u({ cameraShake: v })} />
      </Row>
      <div className="mt-4" />
      <Label className="text-[#d9573f]">Audio</Label>
      <Row label="Mute all">
        <Toggle label="Mute" value={s.muted} onChange={(v) => u({ muted: v })} />
      </Row>
      <Row label="Master volume">
        <Slider label="Master volume" value={s.masterVolume} onChange={(v) => u({ masterVolume: v })} />
      </Row>
      <Row label="Music">
        <Slider label="Music volume" value={s.musicVolume} onChange={(v) => u({ musicVolume: v })} />
      </Row>
      <Row label="Effects">
        <Slider label="Effects volume" value={s.sfxVolume} onChange={(v) => u({ sfxVolume: v })} />
      </Row>
    </Glass>
  );
}

function ControlsPanel({ onBack }: { onBack: () => void }) {
  return (
    <Glass className="p-6">
      <Header title="Controls" onBack={onBack} />
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {CONTROL_HELP.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-3 border-b border-[#1f3552]/8 py-1.5">
            <span className="text-sm text-[#1f3552]">{c.label}</span>
            <span className="flex gap-1">
              {c.keys.map((k) => (
                <Kbd key={k} className="border-[#1f3552]/20 bg-[#1f3552]/5 text-[#1f3552]">
                  {k}
                </Kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[#1f3552]/60">Arrow keys mirror W/A/S/D. Gamepads: left stick to fly, RT boost, LT brake, bumpers roll, A explore, Start pause. Touch devices get an on-screen stick.</p>
    </Glass>
  );
}

function LogPanel({ onBack }: { onBack: () => void }) {
  const p = useGame((s) => s.progress);
  return (
    <Glass className="max-h-[85vh] overflow-y-auto p-6">
      <Header title="Mission Log" onBack={onBack} />
      <div className="mb-5 flex items-center gap-4 rounded-xl bg-[#1f3552]/5 p-3">
        <div className="font-mono text-3xl font-semibold text-[#1f3552]">{Math.round(completion(p) * 100)}%</div>
        <div className="text-xs text-[#1f3552]/70">
          {p.discoveredRegions.length} regions · {p.viewed.filter((v) => v.startsWith("project-")).length}/{portfolio.projects.length} projects · {p.collectibles.length}/{portfolio.flightLogs.length} flight logs · {Math.round(p.flightSeconds / 60)} min flown
        </div>
      </div>
      <Label className="text-[#d9573f]">Missions</Label>
      <ul className="mb-5 mt-2 space-y-1.5">
        {MISSIONS.map((m) => {
          const done = m.done(p);
          const pr = m.progress?.(p);
          return (
            <li key={m.id} className="flex items-center gap-3 text-sm">
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", done ? "bg-[#3fb8af] text-white" : "ring-1 ring-[#1f3552]/25")}>{done && <Check size={12} />}</span>
              <span className={cn("text-[#1f3552]", done && "text-[#1f3552]/50 line-through")}>{m.title}</span>
              {pr && <span className="ml-auto font-mono text-[11px] text-[#1f3552]/50">{pr[0]}/{pr[1]}</span>}
            </li>
          );
        })}
      </ul>
      <Label className="text-[#d9573f]">Courses</Label>
      <ul className="mb-5 mt-2 space-y-1 text-sm text-[#1f3552]">
        {[
          ["canyon-run", "Canyon Run"],
          ["skyline-sprint", "Skyline Sprint"],
          ["summit-spiral", "Summit Spiral"],
        ].map(([id, name]) => (
          <li key={id} className="flex justify-between">
            <span>{name}</span>
            <span className="font-mono text-xs text-[#1f3552]/60">{p.courses[id] ? `${p.courses[id].best.toFixed(2)}s · ${p.courses[id].medal}` : "not flown"}</span>
          </li>
        ))}
      </ul>
      <Label className="text-[#d9573f]">Achievements</Label>
      <div className="mb-5 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = p.achievements.includes(a.id);
          return (
            <div key={a.id} className={cn("flex items-start gap-2.5 rounded-xl p-2.5 ring-1", got ? "bg-[#fff4d6] ring-[#e6b64c]/40" : "ring-[#1f3552]/10 opacity-60")}>
              <Award size={16} className={got ? "mt-0.5 text-[#b88a1c]" : "mt-0.5 text-[#1f3552]/40"} />
              <div>
                <p className="text-sm font-semibold text-[#1f3552]">{a.title}</p>
                <p className="text-[11px] leading-snug text-[#1f3552]/60">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Label className="text-[#d9573f]">Flight logs</Label>
      <div className="mt-2 space-y-2">
        {portfolio.flightLogs.map((l) => {
          const got = p.collectibles.includes(l.id);
          return (
            <div key={l.id} className="rounded-xl bg-[#1f3552]/[0.04] p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1f3552]">
                {got ? <BookOpen size={14} className="text-[#b88a1c]" /> : <Lock size={13} className="text-[#1f3552]/40" />}
                {got ? l.title : "Undiscovered log"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#1f3552]/70">{got ? l.body : "Hidden somewhere in the world. Look for a golden glow."}</p>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

function HangarPanel({ onBack }: { onBack: () => void }) {
  const p = useGame((s) => s.progress);
  const setSkin = useGame((s) => s.setSkin);
  const unlocked = unlockedSkins(p);
  return (
    <Glass className="p-6">
      <Header title="Hangar" onBack={onBack} />
      <div className="grid gap-3 sm:grid-cols-2">
        {SKINS.map((s) => {
          const ok = unlocked.includes(s.id);
          const on = p.skin === s.id;
          return (
            <button
              key={s.id}
              disabled={!ok}
              onClick={() => setSkin(s.id)}
              className={cn("rounded-2xl p-3 text-left ring-1 transition", on ? "bg-white ring-2 ring-[#f2735a]" : "bg-white/60 ring-[#1f3552]/10 hover:bg-white", !ok && "cursor-not-allowed opacity-60")}
            >
              <div className="mb-2 flex h-14 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${s.body} 0 55%, ${s.accent} 55% 75%, ${s.trim} 75%)` }}>
                {!ok && <Lock size={18} className="text-[#1f3552]/70" />}
                {on && <Check size={18} className="text-[#1f3552]" />}
              </div>
              <p className="text-sm font-semibold text-[#1f3552]">{s.name}</p>
              <p className="text-[11px] text-[#1f3552]/60">{ok ? (on ? "Equipped" : "Click to equip") : s.unlock}</p>
            </button>
          );
        })}
      </div>
    </Glass>
  );
}

export function PauseMenu() {
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const setMode = useGame((s) => s.setMode);
  const setPhoto = useGame((s) => s.setPhoto);
  const go = (o: Overlay) => setOverlay(o);
  const back = () => setOverlay("pause");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 grid place-items-center bg-[#1f3552]/35 p-4 backdrop-blur-[6px]"
      onClick={(e) => e.target === e.currentTarget && setOverlay(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Pause menu"
    >
      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-xl">
        {overlay === "settings" && <SettingsPanel onBack={back} />}
        {overlay === "controls" && <ControlsPanel onBack={back} />}
        {overlay === "log" && <LogPanel onBack={back} />}
        {overlay === "hangar" && <HangarPanel onBack={back} />}
        {overlay === "pause" && (
          <Glass className="p-6">
            <Label className="text-[#d9573f]">Paused</Label>
            <h2 className="mb-5 font-serif text-3xl italic text-[#1f3552]">Holding pattern</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="primary" size="lg" onClick={() => setOverlay(null)} autoFocus>
                <Play size={15} fill="currentColor" /> Resume flight
              </Button>
              <Button size="lg" onClick={() => setMode("portfolio")}>
                <LayoutGrid size={15} /> View portfolio
              </Button>
              <Button size="lg" onClick={() => go("map")}>
                <Map size={15} /> World map
              </Button>
              <Button size="lg" onClick={() => go("log")}>
                <ScrollText size={15} /> Mission log
              </Button>
              <Button size="lg" onClick={() => go("hangar")}>
                <Plane size={15} /> Hangar
              </Button>
              <Button size="lg" onClick={() => setPhoto(true)}>
                <Camera size={15} /> Photo mode
              </Button>
              <Button size="lg" onClick={() => go("settings")}>
                <Settings2 size={15} /> Settings
              </Button>
              <Button size="lg" onClick={() => go("controls")}>
                <Keyboard size={15} /> Controls
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1f3552]/10 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  parkAtSpawn();
                  setMode("title");
                }}
              >
                <LogOut size={13} /> Return to title
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm("Reset all exploration progress? This can't be undone.")) {
                    clearSave();
                    useGame.getState().resetProgress();
                    parkAtSpawn();
                    setMode("title");
                  }
                }}
              >
                Reset progress
              </Button>
            </div>
          </Glass>
        )}
      </motion.div>
    </motion.div>
  );
}
