import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackgroundAudioService } from './audio/background-audio.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'super-league';

  constructor(private bg: BackgroundAudioService) {}

  ngOnInit(): void {
    // Attempt to start background audio; if blocked, any future user click will trigger it
    this.bg.ensurePlaying();
  }
}
