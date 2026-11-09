/**
 * Procedural audio: every sound is synthesised with the Web Audio API, so there
 * are no audio files to load or license. Starts only after a user gesture.
 */
type Sfx = "touchdown" | "ring" | "discover" | "collect" | "bump" | "crash" | "click" | "boost" | "finish" | "achievement" | "open" | "whoosh";

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private engineGain!: GainNode;
  private engineFilter!: BiquadFilterNode;
  private osc1!: OscillatorNode;
  private osc2!: OscillatorNode;
  private chopLfo!: OscillatorNode;
  private chopDepth!: GainNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private delay!: DelayNode;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private chordIndex = 0;
  private volumes = { master: 0.8, music: 0.45, sfx: 0.8, muted: false };
  private lastBoost = false;

  get ready() {
    return !!this.ctx;
  }

  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);

    // Echo for music plucks + chimes.
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.master);

    // Noise buffer.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // ── Engine: saw + sub through a lowpass, amplitude-chopped by the prop ──
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.Q.value = 3;
    const chop = ctx.createGain();
    chop.gain.value = 0.7;
    this.chopLfo = ctx.createOscillator();
    this.chopDepth = ctx.createGain();
    this.chopDepth.gain.value = 0.3;
    this.chopLfo.connect(this.chopDepth).connect(chop.gain);
    this.osc1 = ctx.createOscillator();
    this.osc1.type = "sawtooth";
    this.osc2 = ctx.createOscillator();
    this.osc2.type = "square";
    const o2g = ctx.createGain();
    o2g.gain.value = 0.35;
    this.osc1.connect(this.engineFilter);
    this.osc2.connect(o2g).connect(this.engineFilter);
    this.engineFilter.connect(chop).connect(this.engineGain).connect(this.sfxBus);
    this.osc1.start();
    this.osc2.start();
    this.chopLfo.start();

    // ── Wind: looping band-passed noise ──
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.sfxBus);
    wind.start();

    this.applyVolumes();
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  setVolumes(v: { masterVolume: number; musicVolume: number; sfxVolume: number; muted: boolean }) {
    this.volumes = { master: v.masterVolume, music: v.musicVolume, sfx: v.sfxVolume, muted: v.muted };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.muted ? 0 : this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  }

  /** Called every frame with normalised flight values. */
  private lastUpdate = 0;
  private lastSig = "";

  updateFlight(active: boolean, rpm: number, speedT: number, boost: boolean, paused: boolean) {
    if (!this.ctx) return;
    // Automation events are cheap but not free: push at most 20 updates/s, and
    // only when something audible changed, so param timelines never pile up.
    const now = performance.now();
    if (now - this.lastUpdate < 50) return;
    const on = active && !paused;
    const sig = `${on}|${active}|${boost}|${rpm.toFixed(2)}|${speedT.toFixed(2)}`;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.lastUpdate = now;
    const t = this.ctx.currentTime;
    const f = 52 + rpm * 58 + (boost ? 10 : 0);
    this.osc1.frequency.setTargetAtTime(f, t, 0.12);
    this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.12);
    this.chopLfo.frequency.setTargetAtTime(14 + rpm * 34, t, 0.12);
    this.engineFilter.frequency.setTargetAtTime(240 + rpm * 900 + (boost ? 400 : 0), t, 0.15);
    this.engineGain.gain.setTargetAtTime(on ? 0.07 + rpm * 0.05 : active ? 0.02 : 0, t, 0.2);
    this.windFilter.frequency.setTargetAtTime(350 + speedT * 1500, t, 0.2);
    this.windGain.gain.setTargetAtTime(on ? 0.03 + speedT * speedT * 0.28 + (boost ? 0.08 : 0) : 0, t, 0.25);
    if (boost && !this.lastBoost && on) this.play("boost");
    this.lastBoost = boost;
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private tone(freq: number, type: OscillatorType, at: number, a: number, peak: number, dec: number, echo = false, bus = this.sfxBus) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, at, a, peak, dec);
    o.connect(g).connect(bus);
    if (echo) g.connect(this.delay);
    o.start(at);
    o.stop(at + a + dec + 0.05);
  }

  private noiseBurst(at: number, dur: number, freq: number, peak: number, type: BiquadFilterType = "lowpass", sweepTo?: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    const g = ctx.createGain();
    this.env(g, at, 0.01, peak, dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(at, Math.random());
    s.stop(at + dur + 0.1);
  }

  play(name: Sfx, opts: { index?: number; strength?: number } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case "ring": {
        const n = 76 + PENTA[Math.min(PENTA.length - 1, opts.index ?? 0)];
        this.tone(midi(n), "sine", t, 0.005, 0.22, 0.9, true);
        this.tone(midi(n + 12), "sine", t, 0.005, 0.07, 0.5, true);
        this.tone(midi(n + 19), "triangle", t + 0.04, 0.005, 0.04, 0.4);
        break;
      }
      case "discover":
        [62, 66, 69, 74].forEach((n, i) => this.tone(midi(n), "triangle", t + i * 0.09, 0.25, 0.08, 2.2, true));
        break;
      case "collect":
        [79, 83, 86, 91].forEach((n, i) => this.tone(midi(n), "sine", t + i * 0.07, 0.005, 0.14, 0.45, true));
        break;
      case "achievement":
        this.tone(midi(81), "sine", t, 0.005, 0.15, 0.6, true);
        this.tone(midi(88), "sine", t + 0.12, 0.005, 0.15, 0.9, true);
        break;
      case "finish":
        [69, 73, 76, 81, 85, 88].forEach((n, i) => this.tone(midi(n), "triangle", t + i * 0.08, 0.005, 0.12, 0.8, true));
        break;
      case "bump": {
        const s = Math.min(1, opts.strength ?? 0.5);
        this.noiseBurst(t, 0.25, 500, 0.35 * s);
        const o = this.ctx.createOscillator();
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
        const g = this.ctx.createGain();
        this.env(g, t, 0.005, 0.4 * s, 0.3);
        o.connect(g).connect(this.sfxBus);
        o.start(t);
        o.stop(t + 0.4);
        break;
      }
      case "crash":
        this.noiseBurst(t, 1.2, 900, 0.5, "lowpass", 120);
        this.play("bump", { strength: 1 });
        break;
      case "touchdown":
        this.noiseBurst(t, 0.18, 2600, 0.12, "bandpass", 1400);
        this.noiseBurst(t + 0.09, 0.14, 2400, 0.08, "bandpass", 1200);
        this.play("bump", { strength: 0.22 });
        break;
      case "click":
        this.tone(1400, "sine", t, 0.002, 0.05, 0.05);
        break;
      case "open":
        this.tone(midi(74), "sine", t, 0.005, 0.06, 0.25);
        this.tone(midi(81), "sine", t + 0.05, 0.005, 0.05, 0.3);
        break;
      case "boost":
        this.noiseBurst(t, 0.7, 300, 0.12, "bandpass", 2400);
        break;
      case "whoosh":
        this.noiseBurst(t, 0.9, 1800, 0.14, "bandpass", 300);
        break;
    }
  }

  // ── Generative ambient music: slow pads + pentatonic plucks ──
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const chords = [
      [50, 57, 62, 66, 69],
      [47, 54, 59, 62, 66],
      [43, 50, 55, 59, 62],
      [45, 52, 57, 61, 64],
    ];
    const playChord = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const ch = chords[this.chordIndex++ % chords.length];
      for (const n of ch) {
        const o = this.ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = (Math.random() - 0.5) * 14;
        const f = this.ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 650;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.022, t + 2.5);
        g.gain.setValueAtTime(0.022, t + 6.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 9.5);
        o.connect(f).connect(g).connect(this.musicBus);
        o.start(t);
        o.stop(t + 10);
      }
      // A few plucks over the chord.
      const notes = ch.slice(2).map((n) => n + 12);
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.7) {
          const n = notes[Math.floor(Math.random() * notes.length)] + (Math.random() < 0.3 ? 12 : 0);
          const at = t + 0.8 + i * (1.6 + Math.random() * 1.2);
          const o = this.ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = midi(n);
          const g = this.ctx.createGain();
          this.env(g, at, 0.01, 0.05, 1.6);
          o.connect(g).connect(this.musicBus);
          g.connect(this.delay);
          o.start(at);
          o.stop(at + 1.8);
        }
      }
    };
    playChord();
    this.musicTimer = setInterval(playChord, 8000);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}

export const audio = new AudioEngine();
