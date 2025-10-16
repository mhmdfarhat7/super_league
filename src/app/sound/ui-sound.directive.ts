import { Directive, HostListener } from '@angular/core';
import { UiSoundService } from './ui-sound.service';
import { BackgroundAudioService } from '../audio/background-audio.service';

@Directive({
  selector: '[appUiSound]',
  standalone: true,
})
export class UiSoundDirective {
  constructor(private uiSound: UiSoundService, private bg: BackgroundAudioService) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.uiSound.playHover();
  }

  @HostListener('click') onClick() {
    this.uiSound.playClick();
    // Ensure background audio starts on first user gesture
    this.bg.ensurePlaying();
  }
}
