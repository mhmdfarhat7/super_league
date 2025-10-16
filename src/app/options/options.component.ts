import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UiSoundService } from '../sound/ui-sound.service';
import { UiSoundDirective } from '../sound/ui-sound.directive';
import { BackgroundAudioService } from '../audio/background-audio.service';

@Component({
  selector: 'app-options',
  standalone: true,
  imports: [CommonModule, UiSoundDirective, RouterLink],
  templateUrl: './options.component.html',
  styleUrl: './options.component.css'
})
export class OptionsComponent implements OnInit {
  bgMuted = signal<boolean>(false);
  bgVol = signal<number>(40);   // 0..100 UI scale
  sfxVol = signal<number>(100); // 0..100 UI scale

  constructor(private ui: UiSoundService, private bg: BackgroundAudioService) {}

  ngOnInit(): void {
    // Background audio state
    this.bgMuted.set(this.bg.isMuted());
    this.bgVol.set(Math.round(this.bg.getVolume() * 100));
    this.sfxVol.set(Math.round(this.ui.getSfxVolume() * 100));
  }

  toggleBgAudio() {
    this.bg.toggleMuted();
    this.bgMuted.set(this.bg.isMuted());
    if (!this.bg.isMuted()) this.bg.ensurePlaying();
  }

  onBgVol(v: number) {
    const cv = Math.max(0, Math.min(100, Math.round(v)));
    this.bgVol.set(cv);
    this.bg.setVolume(cv / 100);
    if (!this.bgMuted()) this.bg.ensurePlaying();
  }

  onSfxVol(v: number) {
    const cv = Math.max(0, Math.min(100, Math.round(v)));
    this.sfxVol.set(cv);
    this.ui.setSfxVolume(cv / 100);
  }
}
