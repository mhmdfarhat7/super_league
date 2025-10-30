import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';

@Component({
  selector: 'app-mystery-player-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="picker">
      <div class="cards">
        <button 
          class="card" 
          *ngFor="let c of players; let i = index" 
          (click)="onPick(i)" 
          [class.legend]="revealedIndex !== null && isLegendaryPlayer(c)"
          [class.mystery]="revealedIndex === null">
          <div *ngIf="revealedIndex !== null; else hiddenOrOthers">
            <div class="name">{{c.name}}</div>
            <div class="position" [class]="'position-' + c.position.toLowerCase()">{{c.position}}</div>
            <div class="stats">ATT {{c.att}} · MID {{c.mid}} · DEF {{c.def}}</div>
          </div>
          <ng-template #hiddenOrOthers>
            <div class="mystery-content">
              <div class="question-mark">?</div>
              <div class="mystery-text">MYSTERY</div>
            </div>
          </ng-template>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .picker { 
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0; 
      background: rgba(0,0,0,0.8); 
      display: flex; 
      align-items: flex-start; 
      justify-content: center; 
      padding-top: 63vh;
      z-index: 1000;
    }
    .cards { display: flex; gap: 20px; }
    .card { 
      width: 180px; 
      height: 140px; 
      border-radius: 12px; 
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
      background-size: 200% 200%;
      animation: goldShimmer 6s ease-in-out 0s infinite;
      border: 2px solid transparent; 
      color: #000; 
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }
    
    .card.mystery {
      background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 50%, #2a2a2a 100%);
      background-size: 200% 200%;
      animation: mysteryPulse 3s ease-in-out 0s infinite;
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    
    .card.mystery::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      animation: mysterySweep 4s ease-in-out 0s infinite;
    }
    
    @keyframes mysteryPulse {
      0%, 100% { 
        background-position: 0% 50%;
        box-shadow: 0 0 15px rgba(100, 150, 255, 0.3);
      }
      50% { 
        background-position: 100% 50%;
        box-shadow: 0 0 25px rgba(100, 150, 255, 0.5);
      }
    }
    
    @keyframes mysterySweep {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      animation: goldSweep 6s ease-in-out 0s infinite;
    }
    
    .card.legend {
      background-image: url('/images/Diamond.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border: 3px solid #00BFFF;
      animation: none;
      box-shadow: 
        0 0 20px rgba(0, 191, 255, 0.6),
        0 0 40px rgba(0, 191, 255, 0.4),
        0 0 60px rgba(0, 191, 255, 0.2);
      animation: legendGlow 2s ease-in-out infinite;
    }
    
    .card.legend::before {
      display: none;
    }
    
    @keyframes goldShimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @keyframes goldSweep {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    
    @keyframes legendGlow {
      0%, 100% { 
        box-shadow: 
          0 0 20px rgba(0, 191, 255, 0.6),
          0 0 40px rgba(0, 191, 255, 0.4),
          0 0 60px rgba(0, 191, 255, 0.2);
      }
      50% { 
        box-shadow: 
          0 0 30px rgba(0, 191, 255, 0.8),
          0 0 60px rgba(0, 191, 255, 0.6),
          0 0 90px rgba(0, 191, 255, 0.4);
      }
    }
    
    .card:hover {
      transform: translateY(-5px);
      border-color: rgba(255,255,255,0.6);
    }
    
    .card.mystery:hover {
      transform: translateY(-5px);
      border-color: rgba(100, 150, 255, 0.6);
      box-shadow: 0 0 30px rgba(100, 150, 255, 0.4);
    }
    
    .card.legend:hover {
      transform: translateY(-5px);
      border-color: rgba(255, 255, 255, 0.5);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    
    .mystery-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .question-mark {
      font-size: 4rem;
      font-weight: bold;
      color: #fff;
      text-shadow: 
        0 0 10px rgba(100, 150, 255, 0.8),
        0 0 20px rgba(100, 150, 255, 0.6),
        0 0 30px rgba(100, 150, 255, 0.4);
      animation: questionMarkGlow 2s ease-in-out infinite;
    }
    
    @keyframes questionMarkGlow {
      0%, 100% {
        text-shadow: 
          0 0 10px rgba(100, 150, 255, 0.8),
          0 0 20px rgba(100, 150, 255, 0.6),
          0 0 30px rgba(100, 150, 255, 0.4);
        transform: scale(1);
      }
      50% {
        text-shadow: 
          0 0 15px rgba(100, 150, 255, 1),
          0 0 30px rgba(100, 150, 255, 0.8),
          0 0 45px rgba(100, 150, 255, 0.6);
        transform: scale(1.05);
      }
    }
    
    .mystery-text {
      font-size: 0.85rem;
      font-weight: bold;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .name { font-weight: bold; margin-bottom: 8px; font-size: 1.1rem; color: #000; }
    .position { 
      font-size: 0.9rem; 
      padding: 4px 8px; 
      border-radius: 6px; 
      margin-bottom: 8px;
      font-weight: bold;
    }
    .position-gk { background: #ffd700; color: #000; }
    .position-def { background: #90ee90; color: #000; }
    .position-mid { background: #87ceeb; color: #000; }
    .position-att { background: #ff6b6b; color: #fff; }
    .stats { font-size: 0.85rem; opacity: 0.9; text-align: center; color: #000; }
  `]
})
export class MysteryPlayerPickerComponent implements OnInit {
  @Input() players: PlayerLite[] = [];
  @Output() playerSelected = new EventEmitter<PlayerLite>();

  revealedIndex: number | null = null;

  ngOnInit() {
    console.log(`🎯 ===== MYSTERY PICKER COMPONENT INITIALIZED =====`);
    console.log(`🎯 Players received:`, this.players.map(p => `${p.name} (${p.position})`));
    console.log(`🎯 Total players:`, this.players.length);
  }

  isLegendaryPlayer(player: PlayerLite): boolean {
    // Consider players with ATT >= 91 as legendary
    return player.att >= 91;
  }

  onPick(index: number) {
    console.log(`🎯 ===== PLAYER PICKED =====`);
    console.log(`🎯 Picked index:`, index);
    console.log(`🎯 Picked player:`, this.players[index]?.name, `(${this.players[index]?.position})`);
    
    if (this.revealedIndex === null) {
      this.revealedIndex = index;
      console.log(`🎯 Emitting player selection:`, this.players[index]);
      // The parent (match.component) now decides how long to wait (3s) before starting
      this.playerSelected.emit(this.players[index]);
    }
  }
}


