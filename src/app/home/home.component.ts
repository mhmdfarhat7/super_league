import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UiSoundDirective } from '../sound/ui-sound.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [UiSoundDirective]
})
export class HomeComponent {
  constructor(private router: Router) {}
  onStartGame() {
    // TODO: Navigate to game screen when implemented
    console.log('Start Game clicked');
    alert('Starting game (placeholder)');
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
}
