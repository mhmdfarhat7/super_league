import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';
import { PlayerDbService } from '../db/player-db.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

export type PowerShotConfig = {
  shooter: PlayerLite;
  opponentGkDef: number;
  opponentTeamId: string;
};

@Component({
  selector: 'app-attack-power-shot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="power-shot-root">
      <div class="players-info" *ngIf="config">
        <div class="attacker-info">
          <h3>Power Shot Challenge!</h3>
          <div class="player-card">
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
              Perfect Zone: {{ getPerfectZoneSize() }}%
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
      
      <div class="power-shot-container">
        <div class="shot-header">
          <h3>Build Your Shot Power!</h3>
          <div class="shot-info">Click when the power bar hits the perfect zone</div>
        </div>
        
        <div class="power-shot-area">
          <div class="goal-visual">
            <div class="goal-frame">
              <div class="goal-net"></div>
            </div>
            <div class="ball-trajectory" [class.visible]="shotTaken" [class.goal]="isGoal" [class.miss]="!isGoal">
              ⚽
            </div>
          </div>
          
          <div class="power-bar-container">
            <div class="power-bar">
              <div class="power-fill" [style.height.%]="currentPower"></div>
              <div class="power-zones">
                <div class="zone weak" [style.bottom.%]="0" [style.height.%]="weakZoneSize"></div>
                <div class="zone perfect" [style.bottom.%]="weakZoneSize" [style.height.%]="perfectZoneSize"></div>
                <div class="zone strong" [style.bottom.%]="weakZoneSize + perfectZoneSize" [style.height.%]="strongZoneSize"></div>
              </div>
              <div class="power-indicator" [style.bottom.%]="currentPower"></div>
            </div>
            <div class="power-labels">
              <span class="label strong">Too Strong</span>
              <span class="label perfect">Perfect!</span>
              <span class="label weak">Weak</span>
            </div>
          </div>
          
          <div class="shot-controls">
            <button 
              class="shot-button" 
              [class.disabled]="shotTaken || !gameActive"
              (click)="takeShot()"
              [disabled]="shotTaken || !gameActive">
              {{ getButtonText() }}
            </button>
          </div>
          
          <div class="result-display" *ngIf="shotTaken">
            <div class="result-message" [class.success]="isGoal" [class.failure]="!isGoal">
              {{ getResultMessage() }}
            </div>
            <div class="power-result">
              Power: {{ shotPower.toFixed(1) }}% - {{ getPowerRating() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .power-shot-root { 
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
    .player-stats { color: #ccc; font-size: 0.9rem; margin-bottom: 8px; }
    .player-stats span { margin-right: 12px; }
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
    
    .power-shot-container {
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
    
    .shot-header {
      text-align: center;
      margin-bottom: 30px;
      z-index: 10;
    }
    
    .shot-header h3 {
      color: #fff;
      margin: 0 0 8px 0;
      font-size: 2rem;
    }
    
    .shot-info {
      color: #ccc;
      font-size: 1.1rem;
    }
    
    .power-shot-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
      width: 100%;
      max-width: 600px;
      margin-top: 150px;
    }
    
    .goal-visual {
      position: fixed;
      top: 50%;
      right: 50px;
      transform: translateY(-50%);
      width: 200px;
      height: 120px;
      z-index: 10;
    }
    
    .goal-frame {
      width: 100%;
      height: 100%;
      border: 4px solid #fff;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      position: relative;
      overflow: hidden;
    }
    
    .goal-net {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20px;
      background: repeating-linear-gradient(
        90deg,
        #fff 0px,
        #fff 2px,
        transparent 2px,
        transparent 8px
      );
    }
    
    .ball-trajectory {
      position: fixed;
      top: 50%;
      left: calc(100% - 300px);
      font-size: 2rem;
      transform: translateY(-50%);
      opacity: 0;
      transition: all 0.8s ease-in-out;
      z-index: 15;
    }
    
    .ball-trajectory.visible {
      opacity: 1;
    }
    
    .ball-trajectory.goal.visible {
      left: calc(100% - 120px);
    }
    
    .ball-trajectory.miss.visible {
      left: calc(100% + 100px);
      top: -30%;
    }
    
    .ball-trajectory.goal {
      animation: goalCelebration 1s ease-in-out;
    }
    
    .ball-trajectory.miss {
      animation: missTrajectory 1s ease-in-out;
    }
    
    @keyframes goalCelebration {
      0% { transform: translateY(-50%) scale(1); }
      50% { transform: translateY(-50%) scale(1.5); }
      100% { transform: translateY(-50%) scale(1); }
    }
    
    @keyframes missTrajectory {
      0% { transform: translateY(-50%) rotate(0deg) scale(1); opacity: 1; }
      50% { transform: translateY(-50%) rotate(45deg) scale(0.8); opacity: 0.8; }
      100% { transform: translateY(-50%) rotate(90deg) scale(0.4); opacity: 0; }
    }
    
    .power-bar-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 auto;
    }
    
    .power-bar {
      position: relative;
      width: 60px;
      height: 400px;
      background: #333;
      border: 3px solid #fff;
      border-radius: 30px;
      overflow: hidden;
    }
    
    .power-fill {
      width: 100%;
      background: linear-gradient(180deg, #4CAF50 0%, #FFC107 50%, #F44336 100%);
      transition: height 0.02s linear;
      border-radius: 27px;
      position: absolute;
      bottom: 0;
      left: 0;
    }
    
    .power-zones {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }
    
    .zone {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: 27px;
      opacity: 0.3;
    }
    
    .zone.weak {
      background: #4CAF50;
    }
    
    .zone.perfect {
      background: #2196F3;
      opacity: 0.6;
      animation: perfectPulse 1s ease-in-out infinite alternate;
    }
    
    .zone.strong {
      background: #F44336;
    }
    
    @keyframes perfectPulse {
      0% { opacity: 0.6; }
      100% { opacity: 0.9; }
    }
    
    .power-indicator {
      position: absolute;
      left: -5px;
      width: 70px;
      height: 4px;
      background: #fff;
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
      transform: translateY(50%);
    }
    
    .power-labels {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #fff;
      font-size: 0.9rem;
      font-weight: bold;
      height: 400px;
      margin-left: 10px;
    }
    
    .label.weak { color: #4CAF50; }
    .label.perfect { color: #2196F3; }
    .label.strong { color: #F44336; }
    
    .shot-controls {
      text-align: center;
    }
    
    .shot-button {
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      border: none;
      padding: 20px 40px;
      font-size: 1.5rem;
      font-weight: bold;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
      min-width: 200px;
    }
    
    .shot-button:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(255, 107, 107, 0.6);
    }
    
    .shot-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .result-display {
      text-align: center;
      margin-top: 20px;
    }
    
    .result-message {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 10px;
      padding: 15px;
      border-radius: 10px;
    }
    
    .result-message.success {
      color: #4CAF50;
      background: rgba(76, 175, 80, 0.2);
      border: 2px solid #4CAF50;
    }
    
    .result-message.failure {
      color: #F44336;
      background: rgba(244, 67, 54, 0.2);
      border: 2px solid #F44336;
    }
    
    .power-result {
      color: #ccc;
      font-size: 1.1rem;
    }
  `]
})
export class AttackPowerShotComponent implements OnInit, OnDestroy {
  @Input() config?: PowerShotConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  // Game state
  gameActive = false;
  shotTaken = false;
  isGoal = false;
  currentPower = 0;
  shotPower = 0;
  
  // Power bar zones
  weakZoneStart = 0;
  weakZoneSize = 30;
  perfectZoneStart = 30;
  perfectZoneSize = 20;
  strongZoneStart = 50;
  strongZoneSize = 50;
  
  // Animation
  private powerInterval?: number;
  private powerDirection = 1;
  private powerSpeed = 2.8; // Slower, more manageable speed
  
  // Goalkeeper
  goalkeeper = signal<PlayerLite | null>(null);
  
  private playerDb = inject(PlayerDbService);
  private soundService = inject(MinigameSoundService);
  private componentId = Math.random().toString(36).substr(2, 9);

  async ngOnInit() {
    console.log(`🎯 ===== POWER SHOT COMPONENT INIT [${this.componentId}] =====`);
    if (this.config) {
      console.log(`🎯 [${this.componentId}] Received config with shooter: ${this.config.shooter.name} (ID: ${this.config.shooter.id})`);
      console.log(`🎯 [${this.componentId}] Shooter object:`, JSON.stringify(this.config.shooter, null, 2));
      this.initializeZones();
      await this.loadGoalkeeper();
      this.startGame();
    } else {
      console.log(`🎯 [${this.componentId}] No config provided`);
    }
  }

  ngOnDestroy() {
    console.log(`🎯 ===== POWER SHOT COMPONENT DESTROYED [${this.componentId}] =====`);
    this.stopPowerAnimation();
  }

  private initializeZones() {
    if (!this.config) return;
    
    // Calculate zone sizes based on player's ATT stat
    const att = this.config.shooter.att;
    const gkDef = this.config.opponentGkDef;
    
    // Make it much harder - smaller perfect zone overall
    const basePerfectSize = 8; // Much smaller base zone
    
    // Higher ATT = slightly larger perfect zone, but still challenging
    const advantage = Math.max(-0.2, Math.min(0.2, (att - gkDef) / 100)); // Reduced advantage
    const perfectSize = Math.max(5, Math.min(15, basePerfectSize + (advantage * 5))); // Much smaller range
    
    // Adjust zones based on perfect zone size (vertical - from bottom to top)
    // Weak at bottom (0-30%), Perfect in middle (30-50%), Strong at top (50-100%)
    this.perfectZoneSize = perfectSize;
    this.perfectZoneStart = 50 - (perfectSize / 2);
    
    // Calculate zone sizes
    this.weakZoneSize = this.perfectZoneStart;
    this.strongZoneStart = this.perfectZoneStart + this.perfectZoneSize;
    this.strongZoneSize = 100 - this.strongZoneStart;
    
    // Position zones from bottom: weak (0-30%), perfect (30-50%), strong (50-100%)
    this.weakZoneStart = 0; // Weak starts at bottom
    this.perfectZoneStart = this.weakZoneSize; // Perfect starts after weak
    this.strongZoneStart = this.perfectZoneStart + this.perfectZoneSize; // Strong starts after perfect
    
    console.log(`🎯 [${this.componentId}] Zones - Weak: 0-${this.weakZoneSize}%, Perfect: ${this.perfectZoneStart}-${this.perfectZoneStart + this.perfectZoneSize}%, Strong: ${this.strongZoneStart}-100%`);
  }

  private startGame() {
    this.gameActive = true;
    this.shotTaken = false;
    this.currentPower = 0;
    this.powerDirection = 1;
    this.startPowerAnimation();
  }

  private startPowerAnimation() {
    this.powerInterval = window.setInterval(() => {
      this.currentPower += this.powerDirection * this.powerSpeed;
      
      if (this.currentPower >= 100) {
        this.currentPower = 100;
        this.powerDirection = -1;
      } else if (this.currentPower <= 0) {
        this.currentPower = 0;
        this.powerDirection = 1;
      }
    }, 20); // 50 FPS for smooth but not overwhelming animation
  }

  private stopPowerAnimation() {
    if (this.powerInterval) {
      clearInterval(this.powerInterval);
      this.powerInterval = undefined;
    }
  }

  takeShot() {
    if (this.shotTaken || !this.gameActive || !this.config) return;
    
    this.shotTaken = true;
    this.gameActive = false;
    this.shotPower = this.currentPower;
    this.stopPowerAnimation();
    
    // Determine if shot is successful
    this.isGoal = this.calculateShotSuccess();
    
    console.log(`🎯 [${this.componentId}] Shot taken - Power: ${this.shotPower.toFixed(1)}%, Goal: ${this.isGoal}`);
    
    // Play sound effect
    if (this.isGoal) {
      this.soundService.playGoalScored();
    } else {
      this.soundService.playSave();
    }
    
    // Emit result after animation
    setTimeout(() => {
      this.result.emit({ success: this.isGoal });
    }, 2000);
  }

  private calculateShotSuccess(): boolean {
    if (!this.config) return false;
    
    const power = this.shotPower;
    const att = this.config.shooter.att;
    const gkDef = this.config.opponentGkDef;
    
    // Check if power is in perfect zone
    if (power >= this.perfectZoneStart && power <= this.perfectZoneStart + this.perfectZoneSize) {
      // Perfect shot - guaranteed goal for perfect timing
      return true;
    }
    
    // Check if power is in weak zone
    if (power < this.perfectZoneStart) {
      // Weak shots have very low chance of scoring
      const weakChance = Math.max(0.05, (power / this.perfectZoneStart) * 0.15) + ((att - gkDef) / 500);
      return Math.random() < Math.max(0.02, Math.min(0.25, weakChance));
    }
    
    // Check if power is in strong zone
    if (power > this.perfectZoneStart + this.perfectZoneSize) {
      // Strong shots have low-medium chance
      const strongChance = Math.max(0.1, 0.3 - ((power - (this.perfectZoneStart + this.perfectZoneSize)) / this.strongZoneSize) * 0.2) + ((att - gkDef) / 300);
      return Math.random() < Math.max(0.05, Math.min(0.4, strongChance));
    }
    
    return false;
  }

  getButtonText(): string {
    if (this.shotTaken) {
      return this.isGoal ? 'GOAL!' : 'MISS!';
    }
    return 'SHOOT!';
  }

  getResultMessage(): string {
    if (this.isGoal) {
      return '⚽ GOAL! ⚽';
    }
    return '❌ SAVED ❌';
  }

  getPowerRating(): string {
    if (this.shotPower < this.perfectZoneStart) {
      return 'Too Weak';
    } else if (this.shotPower > this.perfectZoneStart + this.perfectZoneSize) {
      return 'Too Strong';
    } else {
      return 'Perfect!';
    }
  }

  getPerfectZoneSize(): number {
    return Math.round(this.perfectZoneSize);
  }

  getScoringChance(): number {
    if (!this.config) return 0;
    
    const att = this.config.shooter.att;
    const gkDef = this.config.opponentGkDef;
    const advantage = Math.max(-0.3, Math.min(0.3, (att - gkDef) / 50));
    const baseChance = 0.4 + (advantage * 0.3);
    return Math.max(20, Math.min(80, Math.round(baseChance * 100)));
  }

  getSavingChance(): number {
    if (!this.config) return 0;
    
    const att = this.config.shooter.att;
    const gkDef = this.config.opponentGkDef;
    const advantage = Math.max(-0.3, Math.min(0.3, (att - gkDef) / 50));
    const baseChance = 0.6 - (advantage * 0.3);
    return Math.max(20, Math.min(80, Math.round(baseChance * 100)));
  }

  private async loadGoalkeeper() {
    if (!this.config) return;
    
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
    return this.goalkeeper()?.name || 'Unknown GK';
  }

  getGoalkeeperAtt(): number {
    return this.goalkeeper()?.att || 0;
  }

  getGoalkeeperMid(): number {
    return this.goalkeeper()?.mid || 0;
  }

  getGoalkeeperDef(): number {
    return this.goalkeeper()?.def || 0;
  }
}
