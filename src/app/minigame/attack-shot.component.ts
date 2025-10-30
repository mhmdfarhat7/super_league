import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';
import { PlayerDbService } from '../db/player-db.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

export type ShotConfig = {
  shooter: PlayerLite;
  opponentGkDef: number;
  opponentTeamId: string; // Add opponent team ID
  goalSpots: boolean[]; // 3x3 grid: true = goal, false = no goal
};

@Component({
  selector: 'app-attack-shot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shot-root">
      <div class="players-info" *ngIf="config">
        <div class="attacker-info">
          <h3>Take the Shot!</h3>
          <div class="player-card" [class.legend]="isLegendaryPlayer(config.shooter)">
            <div class="player-name">{{ config.shooter.name }}</div>
            <div class="player-position" [class]="'position-' + config.shooter.position.toLowerCase()">
              {{ config.shooter.position }}
            </div>
            <div class="player-stats">
              <span>ATT: {{ config.shooter.att }}</span>
              <span>MID: {{ config.shooter.mid }}</span>
              <span>DEF: {{ config.shooter.def }}</span>
            </div>
            <div class="scoring-chance">
              Scoring Chance: {{ getScoringChance() }}%
            </div>
          </div>
        </div>
        
        <div class="goalkeeper-info">
          <h3>vs Goalkeeper</h3>
          <div class="player-card">
            <div class="player-name">{{ getGoalkeeperName() }}</div>
            <div class="player-position position-gk">GK</div>
            <div class="player-stats">
              <span>ATT: {{ getGoalkeeperAtt() }}</span>
              <span>MID: {{ getGoalkeeperMid() }}</span>
              <span>DEF: {{ getGoalkeeperDef() }}</span>
            </div>
            <div class="saving-chance">
              Saving Chance: {{ getSavingChance() }}%
            </div>
          </div>
        </div>
      </div>
      
      <div class="goal-container">
        <div class="goal-header">
          <h3>Choose Your Shot Target</h3>
          <div class="goal-info">Click on any zone to shoot</div>
        </div>
        
        
        <div class="simple-goal">
          <div class="shot-grid">
            <button 
              *ngFor="let spot of shotSpots; let i = index"
              class="shot-zone"
              [class.goal]="spot.revealed && spot.isGoal"
              [class.no-goal]="spot.revealed && !spot.isGoal"
              [class.selected]="spot.selected"
              [class.disabled]="shotTaken"
              (click)="onShot(i)"
              [disabled]="shotTaken">
              <div class="zone-label">{{ getZoneLabel(i) }}</div>
              <div class="zone-result" *ngIf="spot.revealed">
                {{ spot.isGoal ? '⚽ GOAL!' : '❌ SAVE' }}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shot-root { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 20px; 
      padding: 20px;
    }
    
    .players-info { 
      position: fixed; 
      top: 160px; 
      left: 50%; 
      transform: translateX(-50%); 
      z-index: 3000; 
      display: flex;
      gap: 20px;
    }
    
    .attacker-info, .goalkeeper-info {
      text-align: center;
      background: rgba(0,0,0,0.8); 
      padding: 16px; 
      border-radius: 12px; 
      border: 2px solid rgba(255,255,255,0.3);
    }
    .player-info h3 { color: #fff; margin-bottom: 12px; font-size: 1.2rem; }
    .player-card { 
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
      background-size: 200% 200%;
      animation: goldShimmer 6s ease-in-out 0s infinite;
      border-radius: 8px; 
      padding: 12px; 
      border: 2px solid transparent;
      position: relative;
      overflow: hidden;
    }
    
    .player-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      animation: goldSweep 6s ease-in-out 0s infinite;
    }
    
    .player-card.legend {
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
    
    .player-card.legend::before {
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
    
    .player-card .player-name { font-weight: bold; color: #000 !important; margin-bottom: 6px; }
    .player-card .player-position { 
      display: inline-block; 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 0.9rem; 
      font-weight: bold;
      margin-bottom: 8px;
    }
    .player-card .position-gk { background: #ffd700; color: #000 !important; }
    .player-card .position-def { background: #90ee90; color: #000 !important; }
    .player-card .position-mid { background: #87ceeb; color: #000 !important; }
    .player-card .position-att { background: #ff6b6b; color: #fff !important; }
    .player-card .player-stats { color: #000 !important; font-size: 0.9rem; margin-bottom: 8px; }
    .player-card .player-stats span { margin-right: 12px; color: #000 !important; }
    
    /* Extra specific selectors to override any conflicting styles */
    .player-card .player-stats span,
    .player-card .player-stats span *,
    .player-card .player-stats {
      color: #000 !important;
    }
    .scoring-chance { 
      color: #4CAF50; 
      font-size: 0.9rem; 
      font-weight: bold; 
      text-align: center;
      background: rgba(76, 175, 80, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .saving-chance { 
      color: #FF6B6B; 
      font-size: 0.9rem; 
      font-weight: bold; 
      text-align: center;
      background: rgba(255, 107, 107, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 107, 107, 0.3);
    }
    
    .goal-container {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.8);
      z-index: 2000;
      padding: 20px;
    }
    
    .simple-goal {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      border: 4px solid #ecf0f1;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 0;
      width: min(80vw, 600px);
      aspect-ratio: 3 / 1; /* Real goal proportions: 7.32m wide by 2.44m high */
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      position: relative;
      overflow: visible;
    }
    
    .simple-goal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%),
        linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
      background-size: 20px 20px;
      border-radius: 8px 8px 0 0;
      pointer-events: none;
    }
    
    
    
    
    
    .goal-header {
      text-align: center;
      margin-bottom: 20px;
      z-index: 10;
    }
    
    .goal-header h3 {
      color: #fff;
      margin: 0 0 8px 0;
      font-size: 1.5rem;
    }
    
    .goal-info {
      color: #ccc;
      font-size: 0.9rem;
    }
    
    .shot-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 2px;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 8px;
      box-sizing: border-box;
    }
    
    .shot-zone {
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.2) 0%, rgba(41, 128, 185, 0.3) 100%);
      border: 1px solid rgba(52, 152, 219, 0.6);
      border-radius: 4px;
      color: #ecf0f1;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 0.7rem;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    
    .shot-zone::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.05) 100%);
      pointer-events: none;
    }
    
    .shot-zone:hover:not(:disabled) {
      background: rgba(255,255,255,0.2);
      border-color: rgba(255,255,255,0.5);
      transform: scale(1.05);
    }
    
    .shot-zone:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
    
    .shot-zone.goal {
      background: rgba(46, 204, 113, 0.8);
      border-color: #2ecc71;
      animation: goalPulse 0.5s ease-in-out;
    }
    
    .shot-zone.no-goal {
      background: rgba(231, 76, 60, 0.8);
      border-color: #e74c3c;
      animation: noGoalShake 0.5s ease-in-out;
    }
    
    .zone-label {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 0.65rem;
      line-height: 1;
    }
    
    .zone-result {
      font-size: 0.6rem;
      font-weight: bold;
      line-height: 1;
    }
    
    .shot-spot.selected {
      border-color: #f39c12;
      background: rgba(243, 156, 18, 0.3);
      transform: scale(1.1);
    }
    
    @keyframes goalPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    
    @keyframes noGoalShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `]
})
export class AttackShotComponent implements OnInit, OnDestroy {
  @Input() set config(value: ShotConfig | undefined) {
    console.log(`🎯 [${this.componentId}] Config changed:`, value ? `${value.shooter.name} (ID: ${value.shooter.id})` : 'undefined');
    if (value) {
      console.log(`🎯 [${this.componentId}] New config shooter object:`, JSON.stringify(value.shooter, null, 2));
    }
    this._config = value;
  }
  get config(): ShotConfig | undefined {
    return this._config;
  }
  private _config?: ShotConfig;
  
  @Output() result = new EventEmitter<{ success: boolean }>();

  shotSpots: { isGoal: boolean; revealed: boolean; selected: boolean }[] = [];
  shotTaken = false;
  goalkeeper = signal<PlayerLite | null>(null);
  
  private playerDb = inject(PlayerDbService);
  private soundService = inject(MinigameSoundService);
  private componentId = Math.random().toString(36).substr(2, 9);

  async ngOnInit() {
    console.log(`🎯 ===== ATTACK SHOT COMPONENT INIT [${this.componentId}] =====`);
    if (this.config) {
      console.log(`🎯 [${this.componentId}] Received config with shooter: ${this.config.shooter.name} (ID: ${this.config.shooter.id})`);
      console.log(`🎯 [${this.componentId}] Shooter object:`, JSON.stringify(this.config.shooter, null, 2));
      console.log(`🎯 [${this.componentId}] Shooter stats - ATT: ${this.config.shooter.att}, MID: ${this.config.shooter.mid}, DEF: ${this.config.shooter.def}`);
      console.log(`🎯 [${this.componentId}] Shooter position: ${this.config.shooter.position}`);
      this.initializeShotSpots();
      await this.loadGoalkeeper();
    } else {
      console.log(`🎯 [${this.componentId}] No config provided`);
    }
  }

  ngOnDestroy() {
    console.log(`🎯 ===== ATTACK SHOT COMPONENT DESTROYED [${this.componentId}] =====`);
  }

  isLegendaryPlayer(player: PlayerLite): boolean {
    // Consider players with ATT >= 91 as legendary
    return player.att >= 91;
  }

  private initializeShotSpots() {
    if (!this.config) return;
    
    // Create 9 spots (3x3 grid) with goal/no-goal based on scoring chance percentage
    const totalSpots = 9;
    const scoringChance = this.getScoringChance();
    const goalPercentage = scoringChance / 100; // Convert to 0-1 range
    const goalSpots = Math.round(totalSpots * goalPercentage);
    
    // Create array with goal spots
    this.shotSpots = Array.from({ length: totalSpots }, (_, i) => ({
      isGoal: i < goalSpots,
      revealed: false,
      selected: false
    }));
    
    // Shuffle the array to randomize goal positions
    for (let i = this.shotSpots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shotSpots[i], this.shotSpots[j]] = [this.shotSpots[j], this.shotSpots[i]];
    }
  }

  private calculateGoalChance(): number {
    if (!this.config) return 0.5;
    
    const attackerAtt = this.config.shooter.att;
    const gkDef = this.config.opponentGkDef;
    
    // Calculate advantage (similar to mini-game service)
    const advantage = Math.max(-0.5, Math.min(0.5, (attackerAtt - gkDef) / 40));
    
    // Base chance with advantage scaling
    const baseChance = 0.4 + (advantage * 0.3);
    
    // Cap between 0.1 and 0.9 (10% to 90% of spots are goals)
    return Math.max(0.1, Math.min(0.9, baseChance));
  }

  onShot(index: number) {
    if (this.shotTaken || !this.config) return;
    
    this.shotTaken = true;
    this.shotSpots[index].selected = true;
    
    // Reveal all spots after a short delay
    setTimeout(() => {
      this.shotSpots.forEach(spot => spot.revealed = true);
      
                    // Play sound after reveal
                    if (this.shotSpots[index].isGoal) {
                      this.soundService.playGoalScored();
                    } else {
                      this.soundService.playFailedSave();
                    }
      
      // Emit result after revealing
      setTimeout(() => {
        this.result.emit({ success: this.shotSpots[index].isGoal });
      }, 3000);
    }, 500);
  }

  getScoringChance(): number {
    if (!this.config) return 0;
    
    const attackerAtt = this.config.shooter.att;
    const gkDef = this.getGoalkeeperDef();
    
    // Make shooting easier - higher base chance and better scaling
    // Base scoring rate around 50% for good chances (was 40%)
    let baseChance = 50;
    
    // Attacker advantage: each ATT point above 75 adds 1.0% chance (was 0.8%)
    if (attackerAtt > 75) {
      baseChance += (attackerAtt - 75) * 1.0;
    }
    
    // Goalkeeper disadvantage: each DEF point above 80 reduces 0.5% chance (was 0.6%)
    if (gkDef > 80) {
      baseChance -= (gkDef - 80) * 0.5;
    }
    
    // Attacker disadvantage: each ATT point below 75 reduces 0.4% chance (was 0.5%)
    if (attackerAtt < 75) {
      baseChance -= (75 - attackerAtt) * 0.4;
    }
    
    // Goalkeeper advantage: each DEF point below 80 adds 0.3% chance (was 0.4%)
    if (gkDef < 80) {
      baseChance += (80 - gkDef) * 0.3;
    }
    
    // Clamp between 20% and 75% for easier scoring (was 15-65%)
    return Math.max(20, Math.min(75, Math.round(baseChance)));
  }

  getZoneLabel(index: number): string {
    const labels = [
      'Top Left', 'Top Center', 'Top Right',
      'Middle Left', 'Center', 'Middle Right', 
      'Bottom Left', 'Bottom Center', 'Bottom Right'
    ];
    return labels[index] || `Zone ${index + 1}`;
  }

  private async loadGoalkeeper() {
    if (!this.config?.opponentTeamId) return;
    
    try {
      const players = await this.playerDb.getPlayersByClub(this.config.opponentTeamId);
      const gk = players.find(p => p.position === 'GK' && p.role === 'starter');
      
      if (gk) {
        this.goalkeeper.set({
          id: gk.id,
          name: gk.name,
          position: gk.position,
          att: gk.att,
          mid: gk.mid,
          def: gk.def
        });
      }
    } catch (error) {
      console.error('Error loading goalkeeper:', error);
    }
  }

  getGoalkeeperName(): string {
    const gk = this.goalkeeper();
    return gk ? gk.name : 'Opponent GK';
  }

  getGoalkeeperAtt(): number {
    const gk = this.goalkeeper();
    return gk ? gk.att : 0;
  }

  getGoalkeeperMid(): number {
    const gk = this.goalkeeper();
    return gk ? gk.mid : 0;
  }

  getGoalkeeperDef(): number {
    const gk = this.goalkeeper();
    return gk ? gk.def : (this.config?.opponentGkDef || 0);
  }

  getSavingChance(): number {
    if (!this.config) return 0;
    
    const attackerAtt = this.config.shooter.att;
    const gkDef = this.getGoalkeeperDef();
    
    // More realistic saving calculation (inverse of scoring chance)
    const scoringChance = this.getScoringChance();
    const savingChance = 100 - scoringChance;
    
    // Clamp between 25% and 92% for realism
    return Math.max(25, Math.min(92, savingChance));
  }
}
