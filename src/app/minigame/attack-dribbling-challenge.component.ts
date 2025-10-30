import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';
import { PlayerDbService } from '../db/player-db.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

export type DribblingChallengeConfig = {
  attacker: PlayerLite;
  opponentTeamId: string;
  opponentPlayers: PlayerLite[];
};

interface Defender {
  player: PlayerLite;
  x: number;
  y: number;
  // Pattern params
  centerX?: number;
  centerY?: number;
  angle?: number; // radians for circular pattern
  angularSpeed?: number; // radians per frame
  radius?: number; // circular path radius
  // GK vertical oscillation
  isGoalkeeper?: boolean;
  minY?: number;
  maxY?: number;
  vy?: number; // vertical speed per frame
  // Rendering/collision
  hitboxRadius: number;
}

@Component({
  selector: 'app-attack-dribbling-challenge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dribbling-challenge-root">
      <div class="players-info" *ngIf="config">
        <div class="attacker-info">
          <h3>Dribbling Challenge!</h3>
          <div class="player-card">
            <div class="player-name">{{ config.attacker.name }}</div>
            <div class="player-position" [class]="'position-' + config.attacker.position.toLowerCase()">
              {{ config.attacker.position }}
            </div>
            <div class="player-stats">
              <span>ATT: {{ config.attacker.att }}</span>
              <span>MID: {{ config.attacker.mid }}</span>
              <span>DEF: {{ config.attacker.def }}</span>
            </div>
            <div class="speed-info">
              Speed: {{ getBallSpeed() }}px/s
            </div>
          </div>
        </div>
        
        <div class="defenders-info">
          <h3>Defenders</h3>
          <div class="defenders-list">
            <div class="defender-card" *ngFor="let defender of defenders()">
              <div class="defender-name">{{ defender.player.name }}</div>
              <div class="defender-position" [class]="'position-' + defender.player.position.toLowerCase()">
                {{ defender.player.position }}
              </div>
              <div class="defender-stats">
                <span>ATT: {{ defender.player.att }}</span>
                <span>MID: {{ defender.player.mid }}</span>
                <span>DEF: {{ defender.player.def }}</span>
              </div>
              <div class="defender-speed">
                Speed: {{ getDefenderDisplaySpeed(defender) }}px/s
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dribbling-container">
        <div class="game-header">
          <h3>Dribble Past the Defenders!</h3>
          <div class="game-info">Use WASD keys to move the ball. Reach the goal area to score!</div>
        </div>
        
        <div class="football-pitch">
          <div class="goal-area" [class.reached]="goalReached">
            <div class="goal-text">GOAL</div>
          </div>
          <!-- Red backline behind the goal to prevent going around from the back -->
          <div 
            class="goal-backline"
            [style.left.px]="goalAreaX + goalAreaWidth"
            [style.top.px]="goalAreaY - 12"  
            [style.height.px]="goalAreaHeight + 18">
          </div>
          <!-- Backline arms (top and bottom) extending to the right side -->
          <div
            class="goal-backline-arm"
            [style.left.px]="goalAreaX + goalAreaWidth - (goalAreaWidth / 2)"
            [style.top.px]="goalAreaY - 12"  
            [style.width.px]="goalAreaWidth / 2">
          </div>
          <div
            class="goal-backline-arm"
            [style.left.px]="goalAreaX + goalAreaWidth - (goalAreaWidth / 2)"
            [style.top.px]="goalAreaY + goalAreaHeight" 
            [style.width.px]="goalAreaWidth / 2">
          </div>
          
          <div class="ball" 
               [style.left.px]="ballX - 15" 
               [style.top.px]="ballY - 15"
               [class.moving]="isMoving">
            ⚽
          </div>
          
          <div class="defender" 
               *ngFor="let defender of defenders()"
               [style.left.px]="defender.x - defender.hitboxRadius" 
               [style.top.px]="defender.y - defender.hitboxRadius"
               [style.width.px]="defender.hitboxRadius * 2"
               [style.height.px]="defender.hitboxRadius * 2">
            <div class="defender-icon">{{ getDefenderIcon(defender.player.position) }}</div>
            <div class="defender-name" [style.fontSize.px]="getDefenderNameFontSize(defender.player.name)">{{ getSecondName(defender.player.name) }}</div>
          </div>
        </div>
        
        <div class="game-controls">
          <div class="instructions">
            <div class="instruction" *ngIf="!gameStarted">Ready to dribble? Press START to begin!</div>
            <div class="instruction" *ngIf="gameStarted">WASD to move • Reach the goal area • Avoid defenders</div>
            <div class="status" [class.failed]="gameFailed">
              {{ getStatusMessage() }}
            </div>
          </div>
          
          <div class="start-button-container" *ngIf="!gameStarted">
            <button 
              class="start-button" 
              (click)="startGame()"
              [disabled]="gameCompleted">
              START DRIBBLING
            </button>
          </div>
        </div>
        
        <div class="result-display" *ngIf="gameCompleted">
          <div class="result-message" [class.success]="goalReached" [class.failure]="gameFailed">
            {{ getResultMessage() }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dribbling-challenge-root { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 20px; 
      padding: 20px;
    }
    
    .players-info { 
      position: fixed; 
      top: 160px; 
      left: 0;
      right: 0;
      z-index: 3000; 
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0 20px;
      pointer-events: none;
    }
    
    .attacker-info {
      text-align: center;
      background: rgba(0,0,0,0.8); 
      padding: 16px; 
      border-radius: 12px; 
      border: 2px solid rgba(255,255,255,0.3);
      height: fit-content;
    }
    
    .defenders-info {
      text-align: center;
      background: rgba(0,0,0,0.8); 
      padding: 16px; 
      border-radius: 12px; 
      border: 2px solid rgba(255,255,255,0.3);
      height: fit-content;
    }
    
    .attacker-info h3, .defenders-info h3 { 
      color: #fff; 
      margin-bottom: 12px; 
      font-size: 1.2rem; 
    }
    
    .player-card, .defender-card { 
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
      background-size: 200% 200%;
      animation: goldShimmer 6s ease-in-out 0s infinite;
      border-radius: 10px; 
      padding: 15px; 
      border: 2px solid transparent;
      margin-bottom: 8px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .player-card::before, .defender-card::before {
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
    
    .player-card:hover, .defender-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .player-name, .defender-name { 
      font-weight: bold; 
      color: #000; 
      margin-bottom: 6px; 
      font-size: 1rem;
    }
    
    .player-position, .defender-position { 
      display: inline-block; 
      padding: 4px 8px; 
      border-radius: 12px; 
      font-size: 0.75rem; 
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .position-gk { background-color: #FFD700; color: #000; }
    .position-def { background-color: #90EE90; color: #000; }
    .position-mid { background-color: #87CEEB; color: #000; }
    .position-att { background-color: #FF6B6B; color: #fff; }
    
    .player-stats, .defender-stats { 
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px; 
    }
    
    .player-stats span, .defender-stats span { 
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    
    .speed-info, .defender-speed { 
      color: #4CAF50; 
      font-size: 0.8rem; 
      font-weight: bold; 
      text-align: center;
      background: rgba(76, 175, 80, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .defenders-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .dribbling-container {
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
    
    .game-header {
      text-align: center;
      margin-bottom: 30px;
      z-index: 10;
    }
    
    .game-header h3 {
      color: #fff;
      margin: 0 0 8px 0;
      font-size: 2rem;
    }
    
    .game-info {
      color: #ccc;
      font-size: 1.1rem;
    }
    
    .football-pitch {
      position: relative;
      width: 800px;
      height: 500px;
      background: linear-gradient(135deg, #2d5016 0%, #3a6b1a 50%, #2d5016 100%);
      border: 4px solid #fff;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    
    .goal-area {
      position: absolute;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 60px;
      height: 120px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border: 3px solid #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .goal-area.reached {
      background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
    }
    
    /* Backline (failure boundary) */
    .goal-backline {
      position: absolute;
      width: 6px; /* reasonable thickness */
      background: #ff1a1a; /* bright red */
      box-shadow: 0 0 12px rgba(255, 26, 26, 0.8), 0 0 22px rgba(255, 26, 26, 0.5);
      border-radius: 3px;
    }

    .goal-backline-arm {
      position: absolute;
      height: 6px; /* match backline thickness */
      background: #ff1a1a;
      box-shadow: 0 0 12px rgba(255, 26, 26, 0.8), 0 0 22px rgba(255, 26, 26, 0.5);
      border-radius: 3px;
    }
    
    .goal-text {
      color: #000;
      font-weight: bold;
      font-size: 1.2rem;
      text-shadow: 1px 1px 2px rgba(255,255,255,0.5);
    }
    
    .ball {
      position: absolute;
      width: 30px;
      height: 30px;
      background: radial-gradient(circle at 30% 30%, #fff, #666);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      z-index: 20;
      transition: all 0.1s ease;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    
    .ball.moving {
      animation: ballBounce 0.3s ease-in-out infinite alternate;
    }
    
    @keyframes ballBounce {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-3px); }
    }
    
    .defender {
      position: absolute;
      /* Width and height set dynamically via inline styles to match hitbox */
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 15;
      transition: all 0.1s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    .defender-icon {
      font-size: 1.2rem;
      color: #fff;
      font-weight: bold;
    }
    
    .defender-name {
      font-size: 1rem;
      color: #000;
      text-align: center;
      margin-top: 2px;
      word-wrap: break-word;
      line-height: 1.2;
    }

    /* Smaller label inside the on-field red circles for better fit, no ellipsis */
    .defender .defender-name {
      font-size: 0.75rem;
    }
    
    .game-controls {
      text-align: center;
    }
    
    .instructions {
      color: #fff;
      font-size: 1.1rem;
      margin-bottom: 10px;
    }
    
    .start-button-container {
      margin-top: 20px;
    }
    
    .start-button {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 1.3rem;
      font-weight: bold;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      min-width: 200px;
    }
    
    .start-button:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
    }
    
    .start-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .status {
      color: #4CAF50;
      font-weight: bold;
      font-size: 1.2rem;
    }
    
    .status.failed {
      color: #F44336;
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
  `]
})
export class AttackDribblingChallengeComponent implements OnInit, OnDestroy {
  @Input() config?: DribblingChallengeConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  // Game state
  gameActive = false;
  gameStarted = false;
  gameCompleted = false;
  gameFailed = false;
  goalReached = false;
  isMoving = false;
  
  // Ball position
  ballX = 50;
  ballY = 250;
  
  // Game settings
  ballSpeed = 3;
  fieldWidth = 800;
  fieldHeight = 500;
  goalAreaX = 720;
  goalAreaY = 190;
  goalAreaWidth = 60;
  goalAreaHeight = 120;
  
  // Defenders
  defenders = signal<Defender[]>([]);
  
  // Input handling
  private keysPressed = new Set<string>();
  private animationFrame?: number;
  
  private playerDb = inject(PlayerDbService);
  private soundService = inject(MinigameSoundService);
  private componentId = Math.random().toString(36).substr(2, 9);

  async ngOnInit() {
    console.log(`🎯 ===== DRIBBLING CHALLENGE COMPONENT INIT [${this.componentId}] =====`);
    if (this.config) {
      console.log(`🎯 [${this.componentId}] Received config with attacker: ${this.config.attacker.name} (ID: ${this.config.attacker.id})`);
      this.initializeGame();
      this.setupEventListeners();
      // Don't start automatically - wait for user to press START
    } else {
      console.log(`🎯 [${this.componentId}] No config provided`);
    }
  }

  ngOnDestroy() {
    console.log(`🎯 ===== DRIBBLING CHALLENGE COMPONENT DESTROYED [${this.componentId}] =====`);
    this.cleanup();
  }

  private initializeGame() {
    if (!this.config) return;
    
    // Calculate ball speed based on attacker's ATT stat (buffed)
    this.ballSpeed = 3 + (this.config.attacker.att / 20); // 3-7.5 px/frame based on ATT (faster)
    
    // Identify GK and pick 4 defenders (LB, LCB, RCB, RB) if available
    const gk = this.config.opponentPlayers.find(p => p.position === 'GK') || null;
    const backs = this.config.opponentPlayers.filter(p => p.position === 'DEF').slice(0, 4);
    const defendersList: Defender[] = [];

    // Place goalkeeper: up/down oscillation in front of goal; speed scales with GK DEF
    if (gk) {
      const x = this.fieldWidth - 80;
      const goalTop = this.goalAreaY;
      const goalBottom = this.goalAreaY + this.goalAreaHeight;
      const gkDef = Math.max(1, gk.def);
      const vy = 0.5 + gkDef / 50; // ~0.5 to ~2.3 px/frame (slower)
      const hitboxRadius = 20 + gkDef / 12; // 20-28 px radius (even smaller hitbox)
      defendersList.push({
        player: gk,
        x,
        y: (goalTop + goalBottom) / 2,
        isGoalkeeper: true,
        minY: goalTop,
        maxY: goalBottom,
        vy,
        hitboxRadius
      });
    }

    // Vertical defensive line alongside the goal (LB, LCB, RCB, RB)
    // More spread vertically with top/bottom pushed forward
    const baseDefensiveLineX = this.fieldWidth - 180; // Base position for middle defenders
    const forwardDefensiveLineX = this.fieldWidth - 130; // Forward position for top/bottom defenders
    
    // More spread vertically - larger gaps between defenders
    const baseYs = [
      this.fieldHeight * 0.15,  // Top defender (LB) - pushed forward
      this.fieldHeight * 0.35,   // Upper center (LCB) - middle position
      this.fieldHeight * 0.55,   // Lower center (RCB) - middle position
      this.fieldHeight * 0.75    // Bottom defender (RB) - pushed forward
    ];
    // Larger circular radii for more spread during patterns
    const radii = [45, 50, 45, 45]; // Increased radii for more separation

    backs.forEach((player, i) => {
      const def = Math.max(1, player.def);
      // Slower rotation speed - reduced by ~60%
      const angularSpeed = (0.005 + def / 1200) * (Math.random() < 0.5 ? 1 : -1); // slower rotation with DEF
      const hitboxRadius = 18 + def / 10; // even smaller hitbox (~18-27, was ~22-34)
      
      // Top (index 0) and bottom (index 3) pushed forward, middle ones (1, 2) stay back
      const cx = (i === 0 || i === 3) ? forwardDefensiveLineX : baseDefensiveLineX;
      const cy = baseYs[Math.min(i, baseYs.length - 1)]; // Different Y positions (more spread)
      const r = radii[Math.min(i, radii.length - 1)];
      const angle = Math.random() * Math.PI * 2;
      defendersList.push({
        player,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        centerX: cx,
        centerY: cy,
        angle,
        angularSpeed,
        radius: r,
        hitboxRadius
      });
    });
    
    this.defenders.set(defendersList);
    
    console.log(`🎯 [${this.componentId}] Initialized with ${defendersList.length} defenders`);
    console.log(`🎯 [${this.componentId}] Ball speed: ${this.ballSpeed}px/frame`);
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.gameActive || this.gameCompleted) return;
    
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
      event.preventDefault();
      this.keysPressed.add(key);
      this.isMoving = true;
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(key)) {
      this.keysPressed.delete(key);
      this.isMoving = this.keysPressed.size > 0;
    }
  }

  startGame() {
    this.gameActive = true;
    this.gameStarted = true;
    this.gameCompleted = false;
    this.gameFailed = false;
    this.goalReached = false;
    this.ballX = 50;
    this.ballY = 250;
    this.isMoving = false;
    
    this.gameLoop();
  }

  private gameLoop() {
    if (!this.gameActive || this.gameCompleted) return;
    
    this.updateBall();
    this.updateDefenders();
    this.checkCollisions();
    this.checkBackLine();
    this.checkGoal();
    
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private updateBall() {
    if (!this.gameActive) return;
    
    let deltaX = 0;
    let deltaY = 0;
    
    if (this.keysPressed.has('w')) deltaY -= this.ballSpeed;
    if (this.keysPressed.has('s')) deltaY += this.ballSpeed;
    if (this.keysPressed.has('a')) deltaX -= this.ballSpeed;
    if (this.keysPressed.has('d')) deltaX += this.ballSpeed;
    
    // Normalize diagonal movement
    if (deltaX !== 0 && deltaY !== 0) {
      const factor = 1 / Math.sqrt(2);
      deltaX *= factor;
      deltaY *= factor;
    }
    
    // Update position with boundary checking
    this.ballX = Math.max(15, Math.min(this.fieldWidth - 15, this.ballX + deltaX));
    this.ballY = Math.max(15, Math.min(this.fieldHeight - 15, this.ballY + deltaY));
  }

  private updateDefenders() {
    this.defenders.update(defenders => defenders.map(d => {
      // Goalkeeper: vertical oscillation between minY and maxY
      if (d.isGoalkeeper) {
        const vy = d.vy || 2;
        let newY = (d.y || 0) + vy;
        let newVy = vy;
        const minY = d.minY ?? 0;
        const maxY = d.maxY ?? this.fieldHeight;
        if (newY > maxY) { newY = maxY; newVy = -Math.abs(vy); }
        if (newY < minY) { newY = minY; newVy = Math.abs(vy); }
        return { ...d, y: newY, vy: newVy };
      }
      // Defenders: independent circular motion around center
      const angle = (d.angle ?? 0) + (d.angularSpeed ?? 0.02);
      const r = d.radius ?? 35;
      const cx = d.centerX ?? d.x;
      const cy = d.centerY ?? d.y;
      const newX = Math.max(20, Math.min(this.fieldWidth - 20, cx + Math.cos(angle) * r));
      const newY = Math.max(20, Math.min(this.fieldHeight - 20, cy + Math.sin(angle) * r));
      return { ...d, x: newX, y: newY, angle };
    }));
  }

  private checkCollisions() {
    const ballRadius = 15;
    // Defender hitbox depends on DEF (set per defender)
    
    for (const defender of this.defenders()) {
      const dx = this.ballX - defender.x;
      const dy = this.ballY - defender.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const defenderRadius = defender.hitboxRadius;
      if (distance < ballRadius + defenderRadius) {
        this.handleCollision();
        return;
      }
    }
  }

  private checkGoal() {
    // Do not count goals if the game already ended or failed this frame
    if (!this.gameActive || this.gameCompleted || this.gameFailed) return;

    if (this.ballX >= this.goalAreaX - 15 && 
        this.ballX <= this.goalAreaX + this.goalAreaWidth + 15 &&
        this.ballY >= this.goalAreaY - 15 && 
        this.ballY <= this.goalAreaY + this.goalAreaHeight + 15) {
      this.handleGoal();
    }
  }

  // Fail if ball touches or crosses the red backline behind the goal
  private checkBackLine() {
    const ballRadius = 15;
    const backLineX = this.goalAreaX + this.goalAreaWidth; // line placed exactly at goal's back edge
    // Backline spans slightly beyond goal vertically for symmetry
    const backlineTop = this.goalAreaY - 12; // extend 12px above goal
    const backlineBottom = this.goalAreaY + this.goalAreaHeight + 6; // extend only 6px below goal
    const withinGoalVertical = this.ballY >= backlineTop - ballRadius && this.ballY <= backlineBottom + ballRadius;
    const touchingOrCrossing = (this.ballX + ballRadius) >= backLineX; // touching counts as fail
    if (this.gameActive && !this.gameCompleted && withinGoalVertical && touchingOrCrossing) {
      this.handleBackLineFail();
    }

    // Check top and bottom arms (horizontal lines to the right of backline)
    const armThickness = 6;
    const armStartX = backLineX - (this.goalAreaWidth / 2);
    const armEndX = backLineX;
    const topArmY = this.goalAreaY - 12;
    const bottomArmY = this.goalAreaY + this.goalAreaHeight;
    const touchingTopArm =
      this.ballY + ballRadius >= topArmY &&
      this.ballY - ballRadius <= (topArmY + armThickness) &&
      this.ballX + ballRadius >= armStartX &&
      this.ballX - ballRadius <= armEndX;
    const touchingBottomArm =
      this.ballY + ballRadius >= bottomArmY &&
      this.ballY - ballRadius <= (bottomArmY + armThickness) &&
      this.ballX + ballRadius >= armStartX &&
      this.ballX - ballRadius <= armEndX;

    if (this.gameActive && !this.gameCompleted && (touchingTopArm || touchingBottomArm)) {
      this.handleBackLineFail();
    }
  }

  private handleBackLineFail() {
    // Immediate fail with sound (use wrong tackle as a sharp feedback akin to post hit)
    this.gameActive = false;
    this.gameCompleted = true;
    this.gameFailed = true;
    this.soundService.playWrongTackle();
    
    setTimeout(() => {
      this.result.emit({ success: false });
    }, 1000);
  }

  private handleCollision() {
    console.log(`🎯 [${this.componentId}] Collision detected - game failed`);
    this.gameActive = false;
    this.gameCompleted = true;
    this.gameFailed = true;
    this.soundService.playWrongTackle();
    
    setTimeout(() => {
      this.result.emit({ success: false });
    }, 1000);
  }

  private handleGoal() {
    console.log(`🎯 [${this.componentId}] Goal reached - success!`);
    this.gameActive = false;
    this.gameCompleted = true;
    this.goalReached = true;
    this.soundService.playGoalScored();
    
    setTimeout(() => {
      this.result.emit({ success: true });
    }, 2000);
  }

  getBallSpeed(): number {
    return Math.round(this.ballSpeed * 60); // Convert to px/s for display
  }

  getDefenderDisplaySpeed(d: Defender): number {
    if (d.isGoalkeeper) {
      const vy = Math.abs(d.vy || 0);
      return Math.round(vy * 60);
    }
    const ang = Math.abs(d.angularSpeed || 0);
    const r = d.radius || 0;
    const tangential = ang * r; // px/frame
    return Math.round(tangential * 60);
  }

  getDefenderIcon(position: string): string {
    switch (position) {
      case 'GK': return '🥅';
      case 'DEF': return '🛡️';
      case 'MID': return '⚽';
      case 'ATT': return '⚡';
      default: return '👤';
    }
  }

  getSecondName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    // Use the last token as the "second name" (surname)
    return parts[parts.length - 1];
  }

  getDefenderNameFontSize(fullName: string): number {
    const name = this.getSecondName(fullName);
    const len = name.length;
    if (len <= 6) return 12;   // default
    if (len <= 9) return 11;   // slightly smaller
    if (len <= 12) return 10;  // smaller
    return 9;                  // longest names
  }

  getStatusMessage(): string {
    if (this.gameFailed) return '❌ Tackled!';
    if (this.goalReached) return '⚽ Goal!';
    if (this.gameStarted) return '🏃‍♂️ Dribbling...';
    return '⏳ Ready to start';
  }

  getResultMessage(): string {
    if (this.goalReached) return '⚽ GOAL! ⚽';
    return '❌ TACKLED ❌';
  }
}
