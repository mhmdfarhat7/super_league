import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

export type RandomDotDiveConfig = {
  goalkeeper: PlayerLite;
  opponentAttacker: PlayerLite;
  opponentTeamId: string;
};

@Component({
  selector: 'app-defend-random-dot-dive',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="random-dot-dive-root">
      <div class="game-header">
        <h3>Quick Reflex Save!</h3>
        <div class="player-info" *ngIf="config">
          <div class="player-card">
            <div class="player-name">{{ config.goalkeeper.name }}</div>
            <div class="player-position position-gk">GK</div>
            <div class="player-stats">
              <span>DEF: {{ config.goalkeeper.def }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="game-container">
        <div class="goal-area" (click)="onGoalClick($event)">
          <div class="goal-net">
            <!-- Net pattern -->
            <div class="net-line" *ngFor="let line of netLines" [style]="line"></div>
          </div>
          
          <!-- X mark - flashes for 0.5s then disappears -->
          <div 
            class="x-mark" 
            *ngIf="showXMark"
            [style.left.px]="xMarkPosition.x"
            [style.top.px]="xMarkPosition.y">
            ✕
          </div>
          
          <!-- Click indicator (shows where player clicked) -->
          <div 
            class="click-indicator" 
            *ngIf="showClickIndicator"
            [style.left.px]="clickPosition.x"
            [style.top.px]="clickPosition.y"
            [class.correct]="clickWasCorrect"
            [class.incorrect]="!clickWasCorrect">
            {{ clickWasCorrect ? '✓' : '✕' }}
          </div>
        </div>
        
        <!-- Timer countdown -->
        <div class="timer-display" *ngIf="gameActive && !showFeedback">
          <div class="timer-text">Time: {{ timeRemaining.toFixed(1) }}s</div>
          <div class="timer-bar">
            <div class="timer-fill" [style.width.%]="(timeRemaining / (clickDuration / 1000)) * 100"></div>
          </div>
        </div>
        
        <!-- Feedback message -->
        <div class="feedback-message" *ngIf="showFeedback" [class.success]="clickWasCorrect" [class.failure]="!clickWasCorrect">
          <div class="feedback-text">{{ feedbackText }}</div>
        </div>
        
        <!-- Instructions -->
        <div class="instructions" *ngIf="!gameActive && !gameCompleted">
          <p>Watch the X mark flash on the goal!</p>
          <p>Click where it appeared before time runs out!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .random-dot-dive-root {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 3000;
      padding: 20px;
    }
    
    .game-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .game-header h3 {
      color: #fff;
      font-size: 2rem;
      margin-bottom: 20px;
    }
    
    .player-info {
      display: inline-block;
    }
    
    .player-card {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
      background-size: 200% 200%;
      animation: goldShimmer 6s ease-in-out 0s infinite;
      border-radius: 10px;
      padding: 15px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    @keyframes goldShimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    .player-name {
      font-weight: bold;
      color: #000;
      margin-bottom: 6px;
      font-size: 1rem;
    }
    
    .player-position {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .position-gk {
      background: #FFD700;
      color: #000;
    }
    
    .player-stats {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    
    .player-stats span {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      color: #000;
    }
    
    .game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    
    .goal-area {
      position: relative;
      width: 600px;
      height: 360px;
      background: linear-gradient(to bottom, #1a1a1a 0%, #000 100%);
      border: 6px solid #fff;
      border-radius: 8px 8px 0 0;
      cursor: crosshair;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    
    .goal-net {
      position: absolute;
      inset: 0;
      opacity: 0.3;
    }
    
    .net-line {
      position: absolute;
      background: #fff;
      opacity: 0.4;
    }
    
    .x-mark {
      position: absolute;
      font-size: 48px;
      font-weight: bold;
      color: #ff0000;
      transform: translate(-50%, -50%);
      text-shadow: 
        0 0 10px rgba(255, 0, 0, 0.8),
        0 0 20px rgba(255, 0, 0, 0.6),
        0 0 30px rgba(255, 0, 0, 0.4);
      z-index: 10;
      pointer-events: none;
      animation: flashX 0.5s ease-in-out;
    }
    
    @keyframes flashX {
      0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }
    
    .click-indicator {
      position: absolute;
      font-size: 40px;
      font-weight: bold;
      transform: translate(-50%, -50%);
      z-index: 15;
      pointer-events: none;
      animation: clickPulse 0.3s ease-out;
    }
    
    @keyframes clickPulse {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    .click-indicator.correct {
      color: #4CAF50;
      text-shadow: 
        0 0 10px rgba(76, 175, 80, 0.8),
        0 0 20px rgba(76, 175, 80, 0.6);
    }
    
    .click-indicator.incorrect {
      color: #F44336;
      text-shadow: 
        0 0 10px rgba(244, 67, 54, 0.8),
        0 0 20px rgba(244, 67, 54, 0.6);
    }
    
    .timer-display {
      text-align: center;
      width: 600px;
    }
    
    .timer-text {
      color: #fff;
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .timer-bar {
      width: 100%;
      height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .timer-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50 0%, #FFC107 50%, #F44336 100%);
      transition: width 0.1s linear;
    }
    
    .feedback-message {
      text-align: center;
      padding: 20px;
      border-radius: 12px;
      animation: feedbackSlide 0.3s ease-out;
    }
    
    @keyframes feedbackSlide {
      0% { transform: translateY(-20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    .feedback-message.success {
      background: rgba(76, 175, 80, 0.2);
      border: 3px solid #4CAF50;
    }
    
    .feedback-message.failure {
      background: rgba(244, 67, 54, 0.2);
      border: 3px solid #F44336;
    }
    
    .feedback-text {
      color: #fff;
      font-size: 2rem;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .instructions {
      text-align: center;
      color: #fff;
      font-size: 1.1rem;
      line-height: 1.6;
    }
    
    .instructions p {
      margin: 8px 0;
    }
  `]
})
export class DefendRandomDotDiveComponent implements OnInit, OnDestroy {
  @Input() config?: RandomDotDiveConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  gameActive = false;
  gameCompleted = false;
  showXMark = false;
  showFeedback = false;
  showClickIndicator = false;
  timeRemaining = 2.0;
  clickWasCorrect = false;
  feedbackText = '';
  
  flashDuration = 500; // milliseconds (will be adjusted by stats)
  clickDuration = 2000; // milliseconds (will be adjusted by stats)
  
  xMarkPosition = { x: 0, y: 0 };
  clickPosition = { x: 0, y: 0 };
  hitboxTolerance = 18; // pixels - VERY tight tolerance - need to click almost exactly on the spot
  
  private flashTimeout?: number;
  private timerInterval?: number;
  private feedbackTimeout?: number;
  private soundService = inject(MinigameSoundService);
  
  // Generate net lines
  netLines: { width: string; height: string; left: string; top: string; transform: string }[] = [];
  
  ngOnInit() {
    this.generateNetPattern();
    // Start the game automatically after a brief moment
    setTimeout(() => this.startGame(), 500);
  }
  
  ngOnDestroy() {
    this.cleanup();
  }
  
  private generateNetPattern() {
    const lines: typeof this.netLines = [];
    const goalWidth = 600;
    const goalHeight = 360;
    const spacing = 20;
    
    // Vertical lines
    for (let x = spacing; x < goalWidth; x += spacing) {
      lines.push({
        width: '2px',
        height: `${goalHeight}px`,
        left: `${x}px`,
        top: '0',
        transform: 'none'
      });
    }
    
    // Horizontal lines
    for (let y = spacing; y < goalHeight; y += spacing) {
      lines.push({
        width: `${goalWidth}px`,
        height: '2px',
        left: '0',
        top: `${y}px`,
        transform: 'none'
      });
    }
    
    this.netLines = lines;
  }
  
  startGame() {
    if (!this.config) return;
    
    // Calculate stat-based difficulty
    const gkDef = Math.max(1, this.config.goalkeeper.def);
    const attackerAtt = Math.max(1, this.config.opponentAttacker.att);
    
    // Calculate stat difference (GK advantage)
    const statDifference = gkDef - attackerAtt;
    
    // Flash duration: base 0.25s, ranges from 0.15s (VERY HARD) to 0.35s (slightly easier)
    // Higher GK DEF = longer flash time; higher ATT = shorter
    const baseFlashMs = 250;
    const flashAdjustment = statDifference * 4; // 4ms per stat point difference
    this.flashDuration = Math.max(150, Math.min(350, baseFlashMs + flashAdjustment));
    
    // Click duration: base 1.0s, ranges from 0.6s (VERY HARD) to 1.2s (slightly easier)
    // Higher GK DEF = more time; higher ATT = less time
    const baseClickMs = 1000;
    const clickAdjustment = statDifference * 8; // 8ms per stat point difference
    this.clickDuration = Math.max(600, Math.min(1200, baseClickMs + clickAdjustment));
    
    this.gameActive = true;
    this.gameCompleted = false;
    this.showFeedback = false;
    this.showClickIndicator = false;
    this.timeRemaining = this.clickDuration / 1000; // Convert to seconds for display
    
    console.log(`🎯 Random Dot Dive Stats: GK DEF=${gkDef}, Attacker ATT=${attackerAtt}, Diff=${statDifference}`);
    console.log(`🎯 Flash: ${this.flashDuration}ms, Click Window: ${this.clickDuration}ms`);
    
    // Place X mark randomly but away from posts and crossbar
    const margin = 30; // Margin from edges
    this.xMarkPosition = {
      x: margin + Math.random() * (600 - margin * 2),
      y: margin + Math.random() * (360 - margin * 2)
    };
    
    // Flash X mark for calculated duration
    this.showXMark = true;
    this.soundService.playWrongTackle(); // Flash sound
    
    this.flashTimeout = window.setTimeout(() => {
      this.showXMark = false;
    }, this.flashDuration);
    
    // Start countdown timer
    this.startTimer();
  }
  
  private startTimer() {
    const startTime = Date.now();
    const duration = this.clickDuration; // Use calculated stat-based duration
    
    this.timerInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.timeRemaining = Math.max(0, (duration - elapsed) / 1000);
      
      if (this.timeRemaining <= 0) {
        this.handleTimeout();
      }
    }, 50); // Update every 50ms for smooth countdown
  }
  
  onGoalClick(event: MouseEvent) {
    if (!this.gameActive || this.showFeedback) return;
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    this.clickPosition = { x: clickX, y: clickY };
    
    // Check if click is within tolerance of X mark position
    const dx = clickX - this.xMarkPosition.x;
    const dy = clickY - this.xMarkPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    this.clickWasCorrect = distance <= this.hitboxTolerance;
    
    // Stop timer and show feedback
    this.gameActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    
    this.showFeedback = true;
    this.showClickIndicator = true;
    
    if (this.clickWasCorrect) {
      this.feedbackText = '✓ SAVE!';
      this.soundService.playSuccessTackle();
    } else {
      this.feedbackText = '✕ GOAL!';
      this.soundService.playWrongTackle();
    }
    
    // Show feedback for 2 seconds, then emit result
    this.feedbackTimeout = window.setTimeout(() => {
      this.gameCompleted = true;
      this.result.emit({ success: this.clickWasCorrect });
    }, 2000);
  }
  
  private handleTimeout() {
    if (!this.gameActive || this.showFeedback) return;
    
    this.gameActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    
    this.showFeedback = true;
    this.feedbackText = '✕ TIME UP! GOAL!';
    this.soundService.playWrongTackle();
    
    // Show feedback for 2 seconds, then emit result
    this.feedbackTimeout = window.setTimeout(() => {
      this.gameCompleted = true;
      this.result.emit({ success: false });
    }, 2000);
  }
  
  private cleanup() {
    if (this.flashTimeout) clearTimeout(this.flashTimeout);
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
  }
}

