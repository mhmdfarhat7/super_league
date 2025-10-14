import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  onStartGame() {
    // TODO: Navigate to game screen when implemented
    console.log('Start Game clicked');
    alert('Starting game (placeholder)');
  }

  onOptions() {
    // TODO: Navigate to options/settings when implemented
    console.log('Options clicked');
    alert('Options coming soon');
  }

  onExitGame() {
    console.log('Exit Game clicked');
    // Attempt to close if opened by script; otherwise inform user
    alert('Exit game requested. Close the tab or window.');
    try {
      window.close();
    } catch {}
  }
}

