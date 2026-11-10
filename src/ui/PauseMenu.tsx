import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Check, CheckCircle2, Circle, Gamepad2, Keyboard, LayoutGrid, ListChecks, Lock, Map, Medal, Plane, Play, Settings2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useGame, type Overlay } from "@/game/store";
import { ACHIEVEMENTS, MISSIONS, SKINS, completion, unlockedSkins } from "@/game/progression";
import { CONTROL_HELP } from "@/config/controls";
import { portfolio } from "@/content/portfolio";
import { CREDITS } from "@/content/credits";
import { parkAtSpawn } from "@/game/runtime";
import { clearSave } from "@/game/save";
import { Group, Kbd, NavBar, Row, Segmented, Slider, Switch, SYSTEM } from "./kit";
import { cn } from "@/lib/utils";
import { useTriggerOrigin } from "./origin";

/** iOS sheet chrome: grouped background, large rounded corners. */
function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("font-sf max-h-[86vh] max-h-[86dvh] overflow-y-auto overscroll-contain rounded-[16px] bg-[#f3ecdf] pb-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]", className)}>{children}</div>;
}

function LargeTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-5 pb-4 pt-1">
      <h2 className="font-sf-display text-[34px] font-bold leading-tight text-[#1f3552]">{children}</h2>
      {sub && <p className="text-[15px] text-[#5d6b80]">{sub}</p>}
    </div>
  );
}

export function SettingsPanel({ onBack, closeLabel }: { onBack: () => void; closeLabel?: string }) {
  const s = useGame((x) => x.settings);
  const u = useGame((x) => x.updateSettings);
  const quality = useGame((x) => x.quality);
  return (
    <Sheet>
      {closeLabel ? <NavBar title="Settings" onDone={onBack} doneLabel={closeLabel} /> : <NavBar title="Settings" onBack={onBack} backLabel="Paused" />}
      <div className="space-y-6 px-4 pt-2">
        <Group header="Flight" footer="S climbs and W dives, like a control column. Let go and the plane rolls back to wings-level and eases its nose to the horizon. In Mouse mode, centring the cursor does the same.">
          <Row
            icon={Gamepad2}
            color={SYSTEM.indigo}
            title="Steering"
            accessory={<Segmented label="Steering" value={s.controlMode} onChange={(v) => u({ controlMode: v })} options={[{ v: "keyboard", l: "Keys" }, { v: "mouse", l: "Mouse" }]} />}
          />
          {s.controlMode === "mouse" && (
            <Row title="Mouse Sensitivity" accessory={<Slider label="Mouse sensitivity" value={s.mouseSensitivity} min={0.3} max={2.5} step={0.1} onChange={(v) => u({ mouseSensitivity: v })} />} />
          )}
          <Row title="Invert Pitch" accessory={<Switch label="Invert pitch" value={s.invertPitch} onChange={(v) => u({ invertPitch: v })} />} />
        </Group>
        <Group header="Graphics" footer={s.quality === "auto" ? `Automatic adjusts to your device. Currently ${quality}.` : undefined}>
          <Row
            title="Quality"
            accessory={
              <Segmented
                label="Quality"
                value={s.quality}
                onChange={(v) => u({ quality: v })}
                options={[{ v: "auto", l: "Auto" }, { v: "low", l: "Low" }, { v: "medium", l: "Med" }, { v: "high", l: "High" }]}
              />
            }
          />
          <Row title="Destination Labels" accessory={<Switch label="Destination labels" value={s.showLabels} onChange={(v) => u({ showLabels: v })} />} />
          <Row title="Show Frame Rate" accessory={<Switch label="Show FPS" value={s.showFps} onChange={(v) => u({ showFps: v })} />} />
        </Group>
        <Group header="Accessibility" footer="Reduce Motion calms the camera and removes speed lines and field-of-view kicks.">
          <Row title="Reduce Motion" accessory={<Switch label="Reduced motion" value={s.reducedMotion} onChange={(v) => u({ reducedMotion: v, cameraShake: v ? false : s.cameraShake })} />} />
          <Row title="Camera Shake" accessory={<Switch label="Camera shake" value={s.cameraShake} onChange={(v) => u({ cameraShake: v })} />} />
        </Group>
        <Group header="Sound">
          <Row title="Mute" accessory={<Switch label="Mute" value={s.muted} onChange={(v) => u({ muted: v })} />} />
          <Row title="Master" accessory={<Slider label="Master volume" value={s.masterVolume} onChange={(v) => u({ masterVolume: v })} />} />
          <Row title="Music" accessory={<Slider label="Music volume" value={s.musicVolume} onChange={(v) => u({ musicVolume: v })} />} />
          <Row title="Effects" accessory={<Slider label="Effects volume" value={s.sfxVolume} onChange={(v) => u({ sfxVolume: v })} />} />
        </Group>
        <Group header="Credits" footer="Free 3D models from Sketchfab. Tap one to see the original.">
          {CREDITS.map((c) => (
            <Row key={c.source} href={c.source} title={c.title} subtitle={`${c.author} · ${c.license} · ${c.use}`} chevron />
          ))}
        </Group>
      </div>
    </Sheet>
  );
}

function ControlsPanel({ onBack }: { onBack: () => void }) {
  return (
    <Sheet>
      <NavBar title="Controls" onBack={onBack} backLabel="Paused" />
      <div className="space-y-6 px-4 pt-2">
        <Group header="Keyboard" footer="Arrow keys mirror the letters: ↓ climbs, ↑ dives, ← → turn.">
          {CONTROL_HELP.map((c) => (
            <Row
              key={c.label}
              title={c.label}
              accessory={
                <span className="flex gap-1">
                  {c.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              }
            />
          ))}
        </Group>
        <Group header="Mouse" footer="With Mouse steering on, the left button steers, so drag with the right button to look.">
          <Row title="Look around" accessory={<span className="text-[15px] text-[#5d6b80]">Drag</span>} />
          <Row title="Zoom" accessory={<span className="text-[15px] text-[#5d6b80]">Scroll</span>} />
          <Row title="Reset view" accessory={<span className="text-[15px] text-[#5d6b80]">Double-click</span>} />
        </Group>
        <Group header="Other devices">
          <Row icon={Gamepad2} color={SYSTEM.indigo} title="Gamepad" subtitle="Left stick flies (pull back to climb) · RT boost · LT brake · bumpers roll · A explore · Start pause" />
          <Row icon={Plane} color={SYSTEM.teal} title="Touch" subtitle="On-screen stick (pull back to climb) with Boost, Brake and Explore buttons" />
        </Group>
      </div>
    </Sheet>
  );
}

function LogPanel({ onBack }: { onBack: () => void }) {
  const p = useGame((s) => s.progress);
  const pct = Math.round(completion(p) * 100);
  return (
    <Sheet>
      <NavBar title="Mission Log" onBack={onBack} backLabel="Paused" />
      <div className="space-y-6 px-4 pt-2">
        <div className="ios-group flex items-center gap-4 p-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(120,120,128,0.16)" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2b5c8a" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums text-[#1f3552]">{pct}%</span>
          </div>
          <div className="text-[13px] leading-relaxed tabular-nums text-[#5d6b80]">
            <div className="text-[17px] font-semibold text-[#1f3552]">Explored</div>
            {p.discoveredRegions.length} regions · {p.viewed.filter((v) => v.startsWith("project-")).length} of {portfolio.projects.length} projects · {p.collectibles.length} of {portfolio.flightLogs.length} logs ·{" "}
            {Math.round(p.flightSeconds / 60)} min flown
          </div>
        </div>
        <Group header="Missions">
          {MISSIONS.map((m) => {
            const done = m.done(p);
            const pr = m.progress?.(p);
            return (
              <Row
                key={m.id}
                title={<span className={done ? "text-[#7d8593]" : undefined}>{m.title}</span>}
                accessory={
                  <span className="flex items-center gap-2">
                    {pr && <span className="text-[15px] tabular-nums text-[#7d8593]">{pr[0]}/{pr[1]}</span>}
                    {done ? <CheckCircle2 size={22} className="text-[#3f8f5a]" fill="#3f8f5a" stroke="white" /> : <Circle size={22} className="text-[#c7c7cc]" />}
                  </span>
                }
              />
            );
          })}
        </Group>
        <Group header="Courses">
          {[
            ["canyon-run", "Canyon Run"],
            ["skyline-sprint", "Skyline Sprint"],
            ["summit-spiral", "Summit Spiral"],
          ].map(([id, name]) => (
            <Row key={id} icon={Medal} color={p.courses[id] ? SYSTEM.yellow : SYSTEM.gray} title={name} value={p.courses[id] ? `${p.courses[id].best.toFixed(2)}s` : "Not flown"} />
          ))}
        </Group>
        <Group header="Achievements">
          {ACHIEVEMENTS.map((a) => {
            const got = p.achievements.includes(a.id);
            return <Row key={a.id} icon={got ? Award : Lock} color={got ? "#E5B000" : "#b9bfc9"} title={<span className={got ? undefined : "text-[#7d8593]"}>{a.title}</span>} subtitle={a.description} />;
          })}
        </Group>
        <Group header="Flight Logs" footer="Logs glow gold. Look behind waterfalls, under islands and on top of towers.">
          {portfolio.flightLogs.map((l) => {
            const got = p.collectibles.includes(l.id);
            return <Row key={l.id} icon={got ? BookOpen : Lock} color={got ? SYSTEM.orange : "#b9bfc9"} title={got ? l.title : "Undiscovered"} subtitle={got ? l.body : undefined} />;
          })}
        </Group>
      </div>
    </Sheet>
  );
}

function HangarPanel({ onBack }: { onBack: () => void }) {
  const p = useGame((s) => s.progress);
  const setSkin = useGame((s) => s.setSkin);
  const unlocked = unlockedSkins(p);
  return (
    <Sheet>
      <NavBar title="Hangar" onBack={onBack} backLabel="Paused" />
      <div className="grid grid-cols-2 gap-3 px-4 pt-2">
        {SKINS.map((s) => {
          const ok = unlocked.includes(s.id);
          const on = p.skin === s.id;
          return (
            <button
              key={s.id}
              disabled={!ok}
              onClick={() => setSkin(s.id)}
              className={cn("relative rounded-[10px] bg-white p-3 text-left transition", on && "ring-2 ring-[#2b5c8a]", !ok && "cursor-not-allowed")}
            >
              <div className="relative mb-2.5 flex h-20 items-center justify-center overflow-hidden rounded-[12px]" style={{ background: `linear-gradient(135deg, ${s.body} 0 55%, ${s.accent} 55% 76%, ${s.trim} 76%)` }}>
                {!ok && (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white">
                    <Lock size={16} />
                  </span>
                )}
              </div>
              {on && (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#2b5c8a] text-white shadow">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              <p className="text-[15px] font-semibold text-[#1f3552]">{s.name}</p>
              <p className="text-[12px] leading-snug text-[#5d6b80]">{ok ? (on ? "Equipped" : "Tap to equip") : s.unlock}</p>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function PauseMenu() {
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const setMode = useGame((s) => s.setMode);
  const go = (o: Overlay) => setOverlay(o);
  const back = () => setOverlay("pause");
  // Sub-panels sit one level below the pause sheet: going in slides left, back slides right.
  const depth = (o: Overlay | null) => (o === "pause" ? 0 : 1);
  const [nav, setNav] = useState({ at: overlay, dir: 1 });
  if (nav.at !== overlay) setNav({ at: overlay, dir: depth(overlay) >= depth(nav.at) ? 1 : -1 });
  const dir = nav.at !== overlay ? (depth(overlay) >= depth(nav.at) ? 1 : -1) : nav.dir;
  const sheet = useRef<HTMLDivElement>(null);
  const origin = useTriggerOrigin(sheet);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-sf safe-pad fixed inset-0 z-40 grid place-items-center bg-[#0d1523]/55"
      onClick={(e) => e.target === e.currentTarget && setOverlay(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Pause menu"
    >
      <motion.div
        ref={sheet}
        style={{ transformOrigin: origin }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", damping: 30, stiffness: 360, mass: 0.8 }}
        className="relative w-full max-w-[460px]"
      >
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div
        key={overlay}
        custom={dir}
        variants={{
          enter: (d: number) => ({ x: 36 * d, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (d: number) => ({ x: -36 * d, opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", damping: 34, stiffness: 420, mass: 0.7 }}
        className="w-full"
      >
        {overlay === "settings" && <SettingsPanel onBack={back} />}
        {overlay === "controls" && <ControlsPanel onBack={back} />}
        {overlay === "log" && <LogPanel onBack={back} />}
        {overlay === "hangar" && <HangarPanel onBack={back} />}
        {overlay === "pause" && (
          <Sheet>
            <NavBar onDone={() => setOverlay(null)} doneLabel="Resume" />
            <LargeTitle sub="Holding pattern. The world waits for you.">Paused</LargeTitle>
            <div className="space-y-6 px-4">
              <Group>
                <Row icon={Play} color={SYSTEM.blue} title="Resume Flight" chevron onClick={() => setOverlay(null)} />
              </Group>
              <Group>
                <Row icon={Map} color={SYSTEM.green} title="World Map" chevron onClick={() => go("map")} />
                <Row icon={ListChecks} color={SYSTEM.orange} title="Mission Log" chevron onClick={() => go("log")} />
                <Row icon={Plane} color={SYSTEM.indigo} title="Hangar" chevron onClick={() => go("hangar")} />
              </Group>
              <Group>
                <Row icon={Settings2} color={SYSTEM.gray} title="Settings" chevron onClick={() => go("settings")} />
                <Row icon={Keyboard} color={SYSTEM.gray} title="Controls" chevron onClick={() => go("controls")} />
                <Row icon={LayoutGrid} color={SYSTEM.teal} title="Classic Portfolio" chevron onClick={() => setMode("portfolio")} />
              </Group>
              <Group>
                <Row
                  title="Return to Title"
                  tone="blue"
                  onClick={() => {
                    parkAtSpawn();
                    setMode("title");
                  }}
                />
                <Row
                  title="Reset Progress…"
                  tone="red"
                  onClick={() => {
                    if (window.confirm("Reset all exploration progress? This can't be undone.")) {
                      clearSave();
                      useGame.getState().resetProgress();
                      parkAtSpawn();
                      setMode("title");
                    }
                  }}
                />
              </Group>
            </div>
          </Sheet>
        )}
      </motion.div>
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
