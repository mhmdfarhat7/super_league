import { Injectable } from '@angular/core';

const STORAGE_KEY = 'bg.audio.muted';
const STORAGE_VOL = 'bg.audio.volume';
const AUDIO_URL = "/sounds/UEFA Champions League - Full Version.mp3";

@Injectable({ providedIn: 'root' })
export class BackgroundAudioService {
  private audio?: HTMLAudioElement;
  private muted = false;
  private volume = 0.4; // 0..1

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.muted = saved === 'true';
    const vol = localStorage.getItem(STORAGE_VOL);
    if (vol !== null) {
      const p = parseFloat(vol);
      if (!isNaN(p)) this.volume = Math.max(0, Math.min(1, p));
    }
    this.setup();
  }

  private setup() {
    try {
      this.audio = new Audio(AUDIO_URL);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;
      this.audio.muted = this.muted;
    } catch {}
  }

  isMuted(): boolean { return this.muted; }

  setMuted(m: boolean) {
    this.muted = m;
    localStorage.setItem(STORAGE_KEY, String(m));
    if (this.audio) this.audio.muted = m;
    if (!m) this.ensurePlaying();
  }

  toggleMuted() { this.setMuted(!this.muted); }

  ensurePlaying() {
    if (!this.audio) this.setup();
    if (!this.audio) return;
    if (this.muted) return;
    // Try play; will succeed after a user gesture if blocked earlier
    this.audio.play().catch(() => {});
  }

  getVolume(): number { return this.volume; }
  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    this.volume = vol;
    localStorage.setItem(STORAGE_VOL, String(vol));
    if (this.audio) this.audio.volume = vol;
  }
}
