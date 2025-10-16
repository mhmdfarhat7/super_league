import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiSoundDirective } from '../sound/ui-sound.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [CommonModule, UiSoundDirective]
})
export class HomeComponent {
  constructor(private router: Router) {}

  showIntro = false;

  @ViewChild('introVideo') introVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('introContainer') introContainer?: ElementRef<HTMLDivElement>;
  onStartGame() {
    this.showIntro = true;
    // let change detection render overlay first
    setTimeout(async () => {
      try {
        await this.enterFullscreen();
      } catch {}
      try {
        const video = this.introVideo?.nativeElement;
        if (video) {
          video.currentTime = 0;
          await video.play();
        }
      } catch {}
    });
  }

  onOptions() {
    console.log('Options clicked');
    this.router.navigateByUrl('/options');
  }

  onExitGame() {
    console.log('Exit Game clicked');
    // TODO: Add any game cleanup logic here (stop timers, save state, stop audio, etc.)
    this.router.navigateByUrl('/exit');
  }

  async enterFullscreen() {
    const container = this.introContainer?.nativeElement;
    if (!container) return;
    const anyEl = container as any;
    if (anyEl.requestFullscreen) return anyEl.requestFullscreen();
    if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
    if (anyEl.msRequestFullscreen) return anyEl.msRequestFullscreen();
  }

  exitFullscreen() {
    const d: any = document;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (d.webkitFullscreenElement) return d.webkitExitFullscreen?.();
    if (d.msFullscreenElement) return d.msExitFullscreen?.();
  }

  onIntroEnded() {
    this.cleanupIntro();
    this.router.navigateByUrl('/clubs');
  }

  skipIntro() {
    try { this.introVideo?.nativeElement.pause(); } catch {}
    this.cleanupIntro();
    this.router.navigateByUrl('/clubs');
  }

  private cleanupIntro() {
    this.exitFullscreen();
    this.showIntro = false;
  }
}
