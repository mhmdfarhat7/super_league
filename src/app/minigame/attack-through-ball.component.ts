import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThroughBallConfig, MiniGameService } from './mini-game.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

@Component({
  selector: 'app-attack-through-ball',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tb-root">
      <div class="player-info" *ngIf="config">
        <h3>Precision Through Ball</h3>
        <div class="player-card">
          <div class="player-name">{{ config.passer.name }}</div>
          <div class="player-position" [class]="'position-' + config.passer.position.toLowerCase()">
            {{ config.passer.position }}
          </div>
          <div class="player-stats">
            <span>ATT: {{ config.passer.att }}</span>
            <span>MID: {{ config.passer.mid }}</span>
            <span>DEF: {{ config.passer.def }}</span>
          </div>
        </div>
      </div>
      <div class="lane">
        <div class="window" [style.width.px]="getWindowWidth()" [style.left.%]="windowPos"></div>
        <div class="cursor" [style.left.%]="cursorPos"></div>
      </div>
      <button class="tap" (click)="onTap()">PASS</button>
    </div>
  `,
  styles: [`
    .tb-root { display:flex; flex-direction:column; align-items:center; gap:16px; }
    .player-info { 
      text-align: center; 
      margin-bottom: 20px; 
      position: fixed; 
      top: 200px; 
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
    .lane { position:relative; width:80vw; max-width:720px; height:36px; background:rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; margin-top: 8px; }
    .window { position:absolute; top:0; bottom:0; background:rgba(46,204,113,0.4); border:1px solid rgba(46,204,113,0.8); border-radius:8px; }
    .cursor { position:absolute; top:-6px; bottom:-6px; width:4px; background:#ffd700; }
    .tap { padding:10px 18px; border-radius:10px; background: #4CAF50; color: white; border: none; cursor: pointer; }
  `]
})
export class AttackThroughBallComponent {
  @Input() config?: ThroughBallConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  cursorPos = 2; // percent
  windowPos = 40; // percent
  private dir = 1; // 1 right, -1 left
  private raf?: number;

  constructor(
    private mg: MiniGameService,
    private soundService: MinigameSoundService
  ) {}

  ngOnInit() { this.animate(); }
  ngOnDestroy() { if (this.raf) cancelAnimationFrame(this.raf); }

  private animate() {
    this.raf = requestAnimationFrame(() => this.animate());
    const speed = (this.config?.ui.sweepSpeed ?? 1) * 0.4; // tune factor
    this.windowPos += this.dir * speed;
    if (this.windowPos < 0) { this.windowPos = 0; this.dir = 1; }
    if (this.windowPos > 100) { this.windowPos = 100; this.dir = -1; }
    this.cursorPos = 50; // fixed center cursor; window moves
  }

  onTap() {
    if (!this.config) return;
    const winStart = this.windowPos;
    const winEnd = this.windowPos + (this.config.ui.windowWidth / (this.getLanePx() || 1)) * 100;
    const inside = this.cursorPos >= winStart && this.cursorPos <= winEnd;

    // Play sound based on result
    if (inside) {
      this.soundService.playSuccessfulPass();
    } else {
      this.soundService.playWrongPass();
    }

    // Make pass success purely based on accuracy (no extra RNG)
    this.result.emit({ success: inside });
  }

  private getLanePx(): number {
    // assumes 80vw; we can't read DOM here simply, so approximate 800
    return 800;
  }

  getWindowWidth(): number {
    return this.config && this.config.ui ? this.config.ui.windowWidth : 80;
  }
}


