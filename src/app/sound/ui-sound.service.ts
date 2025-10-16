import { Injectable } from '@angular/core';

export type SynthWave = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type SoundChoice =
  | { kind: 'synth'; wave: SynthWave; freq: number; attackMs?: number; decayMs?: number; gain?: number }
  | { kind: 'url'; url: string; gain?: number };

const LS_HOVER = 'ui.hover.sound';
const LS_CLICK = 'ui.click.sound';
const LS_SFX_VOL = 'ui.sfx.volume';

@Injectable({ providedIn: 'root' })
export class UiSoundService {
  private audioCtx?: AudioContext;
  private hoverChoice: SoundChoice = { kind: 'synth', wave: 'sine', freq: 600, attackMs: 0, decayMs: 90, gain: 0.2 };
  private clickChoice: SoundChoice = { kind: 'synth', wave: 'square', freq: 220, attackMs: 0, decayMs: 120, gain: 0.25 };
  private sfxVolume = 1.0; // 0..1 multiplier applied to all UI sounds

  constructor() {
    // Load saved choices
    const savedHover = this.safeParse(localStorage.getItem(LS_HOVER));
    const savedClick = this.safeParse(localStorage.getItem(LS_CLICK));
    if (savedHover) this.hoverChoice = savedHover;
    if (savedClick) this.clickChoice = savedClick;
    const sv = localStorage.getItem(LS_SFX_VOL);
    if (sv !== null) {
      const p = parseFloat(sv);
      if (!isNaN(p)) this.sfxVolume = Math.max(0, Math.min(1, p));
    }
  }

  getHoverChoice(): SoundChoice { return this.hoverChoice; }
  getClickChoice(): SoundChoice { return this.clickChoice; }

  setHoverChoice(c: SoundChoice) {
    this.hoverChoice = c;
    localStorage.setItem(LS_HOVER, JSON.stringify(c));
  }

  setClickChoice(c: SoundChoice) {
    this.clickChoice = c;
    localStorage.setItem(LS_CLICK, JSON.stringify(c));
  }

  playHover() { this.play(this.hoverChoice); }
  playClick() { this.play(this.clickChoice); }

  private play(choice: SoundChoice) {
    if (choice.kind === 'synth') {
      this.playSynth(choice);
    } else {
      this.playUrl(choice);
    }
  }

  private ensureCtx(): AudioContext | undefined {
    try {
      if (!this.audioCtx) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return undefined;
        this.audioCtx = new Ctx();
      }
      // Resume if suspended (autoplay policies)
      const ctx = this.audioCtx;
      if (!ctx) return undefined;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch {
      return undefined;
    }
  }

  private playSynth(c: Extract<SoundChoice, { kind: 'synth' }>) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const gBase = Math.max(0, Math.min(1, c.gain ?? 0.2));
    const g = Math.max(0, Math.min(1, gBase * this.sfxVolume));
    const attack = (c.attackMs ?? 0) / 1000;
    const decay = (c.decayMs ?? 120) / 1000;

    osc.type = c.wave;
    osc.frequency.setValueAtTime(c.freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(g, now + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Math.max(0.0001, g) * 0.001), now + attack + decay);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + attack + decay + 0.05);
  }

  private playUrl(c: Extract<SoundChoice, { kind: 'url' }>) {
    try {
      const audio = new Audio(c.url);
      const gBase = Math.max(0, Math.min(1, c.gain ?? 1));
      audio.volume = Math.max(0, Math.min(1, gBase * this.sfxVolume));
      audio.play().catch(() => {});
    } catch {}
  }

  private safeParse(v: string | null): SoundChoice | null {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  }

  getSfxVolume(): number { return this.sfxVolume; }
  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    localStorage.setItem(LS_SFX_VOL, String(this.sfxVolume));
  }
}
