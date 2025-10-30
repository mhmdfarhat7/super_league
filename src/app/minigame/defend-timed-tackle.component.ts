import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimedTackleConfig } from './mini-game.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

@Component({
  selector: 'app-defend-timed-tackle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tt-root">
      <div class="player-info" *ngIf="config">
        <h3>Timed Tackle</h3>
        <div class="player-card">
          <div class="player-name">{{ config.defender.name }}</div>
          <div class="player-position" [class]="'position-' + config.defender.position.toLowerCase()">
            {{ config.defender.position }}
          </div>
          <div class="player-stats">
            <span>ATT: {{ config.defender.att }}</span>
            <span>MID: {{ config.defender.mid }}</span>
            <span>DEF: {{ config.defender.def }}</span>
          </div>
        </div>
      </div>
      <div class="meter">
        <div class="zone" [style.width.%]="zoneWidth" [style.left.%]="zoneLeft"></div>
        <div class="marker" [style.left.%]="marker"></div>
      </div>
      <button class="tap" (click)="onTap()">TACKLE</button>
    </div>
  `,
  styles: [`
    .tt-root { display:flex; flex-direction:column; align-items:center; gap:16px; }
    .player-info { 
      text-align: center; 
      margin-bottom: 20px; 
      position: fixed; 
      top: 80px; 
      left: 50%; 
      transform: translateX(-50%); 
      z-index: 3000; 
      background: rgba(0,0,0,0.8); 
      padding: 16px; 
      border-radius: 12px; 
      border: 2px solid rgba(255,255,255,0.3);
    }
    .player-info h3 { color: #fff; margin-bottom: 12px; font-size: 1.2rem; }
    .player-card { 
      background: rgba(255,255,255,0.1); 
      border-radius: 8px; 
      padding: 12px; 
      border: 1px solid rgba(255,255,255,0.2);
    }
    .player-name { font-weight: bold; color: #fff; margin-bottom: 6px; }
    .player-position { 
      display: inline-block; 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 0.9rem; 
      font-weight: bold;
      margin-bottom: 8px;
    }
    .position-gk { background: #ffd700; color: #000; }
    .position-def { background: #90ee90; color: #000; }
    .position-mid { background: #87ceeb; color: #000; }
    .position-att { background: #ff6b6b; color: #fff; }
    .player-stats { color: #ccc; font-size: 0.9rem; }
    .player-stats span { margin-right: 12px; }
    .meter { position:relative; width:80vw; max-width:720px; height:16px; background:rgba(255,255,255,0.1); border-radius:8px; margin-top: 8px; }
    .zone { position:absolute; top:0; bottom:0; background:rgba(76,175,80,0.5); border:1px solid rgba(76,175,80,0.9); border-radius:6px; }
    .marker { position:absolute; top:-8px; bottom:-8px; width:4px; background:#ffd700; }
    .tap { padding:10px 18px; border-radius:10px; background: #f44336; color: white; border: none; cursor: pointer; }
  `]
})
export class DefendTimedTackleComponent {
  @Input() config?: TimedTackleConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  marker = 0; // percent
  private dir = 1;
  private raf?: number;
  zoneLeft = 35;
  zoneWidth = 30;

  constructor(private soundService: MinigameSoundService) {}

  ngOnInit() {
    if (this.config) {
      const rel = Math.max(12, Math.min(70, this.config.ui.zoneSize * 30));
      this.zoneWidth = rel;
      this.zoneLeft = 50 - rel / 2;
    }
    this.animate();
  }

  ngOnDestroy() { if (this.raf) cancelAnimationFrame(this.raf); }

  private animate() {
    this.raf = requestAnimationFrame(() => this.animate());
    const speed = (this.config?.ui.swingSpeed ?? 1) * 0.8;
    this.marker += this.dir * speed;
    if (this.marker < 0) { this.marker = 0; this.dir = 1; }
    if (this.marker > 100) { this.marker = 100; this.dir = -1; }
  }

  onTap() {
    if (!this.config) return;
    const inside = this.marker >= this.zoneLeft && this.marker <= (this.zoneLeft + this.zoneWidth);
    
    // Play sound based on result
    if (inside) {
      this.soundService.playSuccessTackle();
    } else {
      this.soundService.playWrongTackle();
    }
    
    // Make tackle success purely based on timing accuracy (no GK bailout)
    this.result.emit({ success: inside });
  }
}


