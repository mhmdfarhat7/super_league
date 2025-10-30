import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';

export interface PassCuttingConfig {
  defender: PlayerLite;
  attacker: PlayerLite;
  passes: number; // Number of passes to intercept
}

export interface PassCuttingResult {
  success: boolean;
  interceptions: number;
  totalPasses: number;
  defender: PlayerLite;
}

@Component({
  selector: 'app-defend-pass-cutting',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pass-cutting-container" *ngIf="config">
      <!-- Header -->
      <div class="header">
        <h2>Pass Cutting Challenge</h2>
        <div class="players-info">
          <div class="defender-info">
            <h3>Defender</h3>
            <div class="player-card">
              <div class="player-name">{{ config.defender.name }}</div>
              <div class="player-stats">DEF: {{ config.defender.def }}</div>
            </div>
          </div>
          <div class="attacker-info">
            <h3>Attacker</h3>
            <div class="player-card">
              <div class="player-name">{{ config.attacker.name }}</div>
              <div class="player-stats">MID: {{ config.attacker.mid }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Area -->
      <div class="game-area" (click)="onFieldClick($event)">
        <!-- Football Pitch Background -->
        <div class="football-pitch">
          <div class="center-line"></div>
          <div class="center-circle"></div>
          <div class="center-spot"></div>

          <div class="penalty-area left"></div>
          <div class="penalty-area right"></div>

          <div class="goal-area left"></div>
          <div class="goal-area right"></div>

          <div class="penalty-spot left"></div>
          <div class="penalty-spot right"></div>

          <div class="penalty-arc left"></div>
          <div class="penalty-arc right"></div>

          <div class="goal left"></div>
          <div class="goal right"></div>
        </div>

        <!-- Pass Lines -->
        <div 
          *ngFor="let pass of activePasses; let i = index"
          class="pass-line"
          [style.left.px]="pass.startX"
          [style.top.px]="pass.startY"
          [style.width.px]="pass.length"
          [style.height.px]="pass.hitboxHeight || 4"
          [style.transform]="'rotate(' + pass.angle + 'deg)'"
          [class.intercepted]="pass.intercepted"
          [class.missed]="pass.missed"
          (click)="interceptPass(i, $event)"
        ></div>

        <!-- Interception Feedback -->
        <div 
          *ngIf="showFeedback"
          class="feedback"
          [class.success]="lastResult === 'success'"
          [class.fail]="lastResult === 'fail'"
        >
          <div *ngIf="lastResult === 'success' && !gameCompleted" class="feedback-text">✓ Intercepted!</div>
          <div *ngIf="lastResult === 'fail' && !gameFailed" class="feedback-text">✗ Missed!</div>
          <div *ngIf="lastResult === 'success' && gameCompleted" class="feedback-text">DEFENSE SUCCESSFUL!<br>All passes intercepted!</div>
          <div *ngIf="lastResult === 'fail' && gameFailed" class="feedback-text">DEFENSE FAILED!<br>Goal conceded!</div>
        </div>
      </div>

      <!-- Game Status -->
      <div class="game-status">
        <div class="status-text">{{ getStatusMessage() }}</div>
        <div class="progress">
          <div class="progress-bar" [style.width.%]="(interceptions / config.passes) * 100"></div>
        </div>
        <div class="stats">
          Interceptions: {{ interceptions }}/{{ config.passes }}
        </div>
      </div>

      <!-- Controls -->
      <div class="controls" *ngIf="!gameStarted">
        <button class="start-btn" (click)="startGame()">START DEFENDING</button>
      </div>
    </div>
  `,
  styles: [`
    .pass-cutting-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      padding-top: 100px;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      font-family: 'Arial', sans-serif;
      z-index: 3000;
      overflow-y: auto;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h2 {
      margin: 0 0 20px 0;
      font-size: 2.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .players-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 40px;
      margin-bottom: 20px;
    }

    .defender-info, .attacker-info {
      text-align: center;
    }

    .defender-info h3, .attacker-info h3 {
      margin: 0 0 10px 0;
      font-size: 1.2rem;
      color: #ffd700;
    }

    .player-card {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
      background-size: 200% 200%;
      animation: goldShimmer 6s ease-in-out 0s infinite;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 10px;
      padding: 15px;
      min-width: 150px;
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
    
    @keyframes goldShimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @keyframes goldSweep {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .player-name {
      font-size: 1.1rem;
      font-weight: bold;
      margin-bottom: 5px;
      color: #000; /* Black text */
    }

    .player-stats {
      font-size: 0.9rem;
      color: #000; /* Black text */
    }

    .game-area {
      position: relative;
      width: 800px;
      height: 500px;
      border: 3px solid #fff;
      border-radius: 15px;
      overflow: hidden;
      cursor: crosshair;
      margin-bottom: 20px;
    }

    .football-pitch {
      position: relative;
      width: 100%;
      aspect-ratio: 105 / 68; /* standard proportions */
      background: #3b945e; /* realistic grass green */
      border: 0px solid #fff; /* outer lines */
      box-shadow: inset 0 0 0 4px #fff;
      overflow: hidden;
    }

    /* Center line */
    .center-line {
      position: absolute;
      top: 0;
      left: 50%;
      width: 4px;
      height: 100%;
      background: #fff;
      transform: translateX(-50%);
    }

    /* Center circle */
    .center-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 15%;
      height: 22%;
      border: 3px solid #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    .center-spot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 10px;
      height: 10px;
      background: #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    /* Penalty areas */
    .penalty-area {
      position: absolute;
      top: 50%;
      width: 16%;
      height: 50%;
      border: 3px solid #fff;
      transform: translateY(-50%);
    }

    .penalty-area.left {
      left: 0;
      border-left: none;
    }

    .penalty-area.right {
      right: 0;
      border-right: none;
    }

    /* Goal areas (6-yard boxes) */
    .goal-area {
      position: absolute;
      top: 50%;
      width: 6%;
      height: 20%;
      border: 3px solid #fff;
      transform: translateY(-50%);
    }

    .goal-area.left {
      left: 0;
      border-left: none;
    }

    .goal-area.right {
      right: 0;
      border-right: none;
    }

    /* Penalty spots */
    .penalty-spot {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      top: 50%;
    }

    .penalty-spot.left {
      left: 11%;
      transform: translateY(-50%);
    }

    .penalty-spot.right {
      right: 11%;
      transform: translateY(-50%);
    }

    /* Arcs on the penalty area */
    .penalty-arc {
      position: absolute;
      width: 13%;
      height: 26%;
      border: 3px solid #fff;
      border-radius: 50%;
      top: 50%;
      transform: translateY(-50%);
      clip-path: polygon(0% 0, 50% 0, 50% 100%, 0% 100%);    }

    .penalty-arc.left {
      left: 9.5%;
      transform: translateY(-50%) rotate(180deg);
    }

    .penalty-arc.right {
      right: 9.5%;
    }

    /* Goals (optional visual frames) */
    .goal {
      position: absolute;
      top: 50%;
      width: 2%;
      height: 12%;
      border: 2px solid #fff;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
    }

    .goal.left {
      left: -2%;
    }

    .goal.right {
      right: -2%;
    }

    .pass-line {
      position: absolute;
      height: 4px;
      background: #ff6b6b;
      border: 2px dashed #fff;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .pass-line:hover {
      background: #ff8e8e;
      transform: scale(1.1);
    }

    .pass-line.intercepted {
      background: #4caf50;
      border-color: #2e7d32;
    }

    .pass-line.missed {
      background: #f44336;
      border-color: #c62828;
    }

    .feedback {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 3rem;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 20;
      animation: feedbackPulse 0.5s ease-in-out;
      text-align: center;
    }

    .feedback-text {
      line-height: 1.2;
    }

    .feedback.success {
      color: #4caf50;
    }

    .feedback.fail {
      color: #f44336;
    }

    @keyframes feedbackPulse {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }

    .game-status {
      text-align: center;
      margin-bottom: 20px;
    }

    .status-text {
      font-size: 1.5rem;
      margin-bottom: 10px;
      color: #ffd700;
    }

    .progress {
      width: 300px;
      height: 20px;
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      overflow: hidden;
      margin: 0 auto 10px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      transition: width 0.3s ease;
    }

    .stats {
      font-size: 1.1rem;
      color: #ccc;
    }

    .controls {
      text-align: center;
    }

    .start-btn {
      background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 1.2rem;
      font-weight: bold;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    }

    .start-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    }

    .start-btn:active {
      transform: translateY(0);
    }
  `]
})
export class DefendPassCuttingComponent implements OnInit, OnDestroy {
  @Input() config: PassCuttingConfig | null = null;
  @Output() result = new EventEmitter<PassCuttingResult>();

  gameStarted = false;
  gameActive = false;
  gameCompleted = false;
  gameFailed = false;
  
  activePasses: any[] = [];
  interceptions = 0;
  currentPassIndex = 0;
  
  showFeedback = false;
  lastResult: 'success' | 'fail' | null = null;
  
  private gameTimer: any;
  private passTimer: any;
  private advantage: number = 0; // Calculated from defender DEF vs attacker MID

  ngOnInit() {
    if (this.config) {
      console.log('🎯 Pass Cutting Challenge initialized with config:', this.config);
      // Calculate advantage: defender DEF vs attacker MID
      // advantage = clamp((defender.DEF - attacker.MID) / 40, -0.5, 0.5)
      const statDiff = this.config.defender.def - this.config.attacker.mid;
      this.advantage = Math.max(-0.5, Math.min(0.5, statDiff / 40));
      console.log(`🎯 Advantage calculated: ${this.advantage} (DEF ${this.config.defender.def} vs MID ${this.config.attacker.mid})`);
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  startGame() {
    if (!this.config) return;
    
    this.gameStarted = true;
    this.gameActive = true;
    this.gameCompleted = false;
    this.gameFailed = false;
    this.interceptions = 0;
    this.currentPassIndex = 0;
    this.activePasses = [];
    
    console.log('🎯 Starting Pass Cutting Challenge with', this.config.passes, 'passes');
    
    this.startPassSequence();
  }

  private startPassSequence() {
    if (this.currentPassIndex >= this.config!.passes) {
      this.completeGame();
      return;
    }

    this.createPass();
    this.currentPassIndex++;
    
    // Calculate pass visibility time based on advantage
    // Base time: 2000ms
    // At +0.5 advantage (defender much better): 2000 * 1.3 = 2600ms (easier - more time)
    // At -0.5 advantage (attacker much better): 2000 * 0.7 = 1400ms (harder - less time)
    const baseVisibilityTime = 2000;
    const visibilityTime = baseVisibilityTime * (1 + 0.6 * this.advantage);
    const bufferTime = 500; // Buffer between passes
    const nextPassDelay = visibilityTime + bufferTime;
    
    // Start next pass after calculated delay
    this.passTimer = setTimeout(() => {
      if (this.gameActive) {
        this.startPassSequence();
      }
    }, nextPassDelay);
  }

  private createPass() {
    // Calculate pass visibility time based on advantage
    const baseVisibilityTime = 2000;
    const visibilityTime = baseVisibilityTime * (1 + 0.6 * this.advantage);
    
    // Calculate pass hitbox size based on advantage
    // Base height: 4px, adjust ±50% based on advantage
    // At +0.5 advantage: 4 * 1.5 = 6px (larger hitbox = easier)
    // At -0.5 advantage: 4 * 0.5 = 2px (smaller hitbox = harder)
    const baseHeight = 4;
    const hitboxHeight = baseHeight * (1 + this.advantage);
    
    const pass = {
      startX: Math.random() * 600 + 100, // Random X position
      startY: Math.random() * 300 + 100, // Random Y position
      length: 150 + Math.random() * 100, // Random length
      angle: Math.random() * 360, // Random angle
      intercepted: false,
      missed: false,
      startTime: Date.now(),
      visibilityTime: visibilityTime,
      hitboxHeight: hitboxHeight
    };
    
    this.activePasses.push(pass);
    
    // Remove pass after calculated visibility time if not intercepted
    setTimeout(() => {
      if (!pass.intercepted && this.gameActive) {
        this.missPass(pass);
      }
    }, visibilityTime);
  }

  interceptPass(passIndex: number, event: Event) {
    if (!this.gameActive || this.activePasses[passIndex].intercepted) return;
    
    event.stopPropagation();
    
    const pass = this.activePasses[passIndex];
    pass.intercepted = true;
    this.interceptions++;
    
    this.showFeedbackMessage('success');
    console.log('🎯 Pass intercepted! Total:', this.interceptions);
    
    // Check if all passes completed
    if (this.interceptions >= this.config!.passes) {
      this.completeGame();
    }
  }

  private missPass(pass: any) {
    if (pass.intercepted) return;
    
    pass.missed = true;
    this.showFeedbackMessage('fail');
    this.failGame();
  }

  private showFeedbackMessage(result: 'success' | 'fail') {
    this.lastResult = result;
    this.showFeedback = true;
    
    setTimeout(() => {
      this.showFeedback = false;
      this.lastResult = null;
    }, 1000);
  }

  private completeGame() {
    this.gameActive = false;
    this.gameCompleted = true;
    this.cleanup();
    
    // Show success feedback
    this.showFeedbackMessage('success');
    this.lastResult = 'success';
    
    const result: PassCuttingResult = {
      success: true,
      interceptions: this.interceptions,
      totalPasses: this.config!.passes,
      defender: this.config!.defender
    };
    
    console.log('🎯 Pass Cutting Challenge completed successfully:', result);
    
    // Delay result emission to show feedback
    setTimeout(() => {
      this.result.emit(result);
    }, 2000);
  }

  private failGame() {
    this.gameActive = false;
    this.gameFailed = true;
    this.cleanup();
    
    // Show failure feedback
    this.showFeedbackMessage('fail');
    this.lastResult = 'fail';
    
    const result: PassCuttingResult = {
      success: false,
      interceptions: this.interceptions,
      totalPasses: this.config!.passes,
      defender: this.config!.defender
    };
    
    console.log('🎯 Pass Cutting Challenge failed:', result);
    
    // Delay result emission to show feedback
    setTimeout(() => {
      this.result.emit(result);
    }, 2000);
  }

  private cleanup() {
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.passTimer) {
      clearTimeout(this.passTimer);
      this.passTimer = null;
    }
  }

  onFieldClick(event: Event) {
    // Missing a pass (clicking anywhere other than a pass line) is an immediate fail
    if (this.gameActive && !this.gameCompleted && !this.gameFailed) {
      this.failGame();
    }
  }

  getStatusMessage(): string {
    if (!this.gameStarted) {
      return 'Ready to start defending!';
    }
    if (this.gameCompleted) {
      return 'Challenge completed!';
    }
    if (this.gameFailed) {
      return 'Challenge failed!';
    }
    return `Intercept the passes! (${this.interceptions}/${this.config!.passes})`;
  }
}
