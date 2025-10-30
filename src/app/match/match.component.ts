import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService, Club, Match } from '../game/game-state.service';
import { MiniGameHostComponent } from '../minigame/minigame-host.component';
import { AttackThroughBallComponent } from '../minigame/attack-through-ball.component';
import { DefendTimedTackleComponent } from '../minigame/defend-timed-tackle.component';
import { AttackShotComponent } from '../minigame/attack-shot.component';
import { DefendGoalkeeperDiveComponent } from '../minigame/defend-goalkeeper-dive.component';
import { MysteryPlayerPickerComponent } from '../minigame/mystery-player-picker.component';
import { AttackSpinningWheelComponent } from '../minigame/attack-spinning-wheel.component';
import { AttackPowerShotComponent } from '../minigame/attack-power-shot.component';
import { AttackDribblingChallengeComponent } from '../minigame/attack-dribbling-challenge.component';
import { DefendPassCuttingComponent } from '../minigame/defend-pass-cutting.component';
import { DefendRandomDotDiveComponent } from '../minigame/defend-random-dot-dive.component';
import { MiniGameService, PlayerLite, ThroughBallConfig, TimedTackleConfig, GoalkeeperDiveConfig, RandomDotDiveConfig } from '../minigame/mini-game.service';
import { PowerShotConfig } from '../minigame/attack-power-shot.component';
import { DribblingChallengeConfig } from '../minigame/attack-dribbling-challenge.component';
import { PassCuttingConfig } from '../minigame/defend-pass-cutting.component';
import { UiSoundDirective } from '../sound/ui-sound.directive';
import { PlayerDbService } from '../db/player-db.service';

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [CommonModule, UiSoundDirective, MiniGameHostComponent, AttackThroughBallComponent, DefendTimedTackleComponent, AttackShotComponent, DefendGoalkeeperDiveComponent, MysteryPlayerPickerComponent, AttackSpinningWheelComponent, AttackPowerShotComponent, AttackDribblingChallengeComponent, DefendPassCuttingComponent, DefendRandomDotDiveComponent],
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.css']
})
export class MatchComponent implements OnInit, OnDestroy {
  // Match state
  currentTime = signal(0); // 0-90 minutes
  isPaused = signal(false);
  isMatchActive = signal(false);
  currentQuarter = signal(1); // 1-4
  homeScore = signal(0);
  awayScore = signal(0);
  
  // Teams
  homeTeam = signal<Club | null>(null);
  awayTeam = signal<Club | null>(null);
  
  // Mini-game triggers
  showAttackButton = signal(false);
  showDefendButton = signal(false);
  miniGameActive = signal(false);
  showReturnButton = signal(false);
  
  // Mystery player picker
  showMysteryPicker = signal(false);
  mysteryPlayers = signal<PlayerLite[]>([]);
  currentMiniGameType = signal<'attack' | 'defend' | 'shooter'>('attack');
  
  // Spinning wheel
  showSpinningWheel = signal(false);
  spinningWheelPlayers = signal<PlayerLite[]>([]);
  
  // Active mini-game state
  activeAttackConfig: ThroughBallConfig | null = null;
  activeDefendConfig: TimedTackleConfig | null = null;
  activePowerShotConfig: PowerShotConfig | null = null;
  activeDribblingChallengeConfig: DribblingChallengeConfig | null = null;
  activePassCuttingConfig: PassCuttingConfig | null = null;
  private _activeShotConfig: any = null; // Will be ShotConfig
  get activeShotConfig(): any {
    return this._activeShotConfig;
  }
  set activeShotConfig(value: any) {
    console.log(`🎯 ===== ACTIVE SHOT CONFIG CHANGED =====`);
    console.log(`🎯 New activeShotConfig:`, value ? `${value.shooter?.name} (ID: ${value.shooter?.id})` : 'null');
    if (value && value.shooter) {
      console.log(`🎯 Shooter object:`, JSON.stringify(value.shooter, null, 2));
    }
    this._activeShotConfig = value;
  }
  activeGoalkeeperDiveConfig: GoalkeeperDiveConfig | null = null;
  activeRandomDotDiveConfig: RandomDotDiveConfig | null = null;
  selectedPlayer: PlayerLite | null = null;
  selectedShooter: PlayerLite | null = null;
  selectedOpponentAttacker: PlayerLite | null = null;
  coinsEarnedThisMatch = 0;
  Math = Math;
  
  // Debug counters for mini-game selection
  private spinningWheelCount = 0;
  private mysteryPickerCount = 0;
  
  // Match data
  currentMatch: Match | null = null;
  scheduledMiniGames: { time: number; type: 'attack' | 'defend'; triggered: boolean }[] = [];
  
  // Goal tracking
  matchScorers = signal<{ playerName: string; team: 'home' | 'away'; minute: number; goals: number }[]>([]);
  showGoalNotification = signal(false);
  goalNotificationText = signal('');
  
  // Match highlights tracking
  matchHighlights = signal<{ minute: number; type: 'goal' | 'save' | 'tackle'; playerName: string; team: 'home' | 'away'; description: string }[]>([]);
  showHighlights = signal(false);
  
  // Timer
  private animationFrame: any;
  private lastTime: number = 0;
  private readonly MATCH_DURATION = 90; // 90 minutes
  private readonly QUARTER_DURATION = 22.5; // 22.5 minutes per quarter
  private readonly REAL_TIME_FACTOR = 4; // 1 real second = 4 game minutes
  
  constructor(
    private gameState: GameStateService,
    private router: Router,
    private mini: MiniGameService,
    private playerDb: PlayerDbService
  ) {}

  ngOnInit() {
    this.initializeMatch();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private initializeMatch() {
    // Get current match from game state
    this.currentMatch = this.gameState.getNextMatch();
    
    if (!this.currentMatch) {
      console.error('No match found');
      this.router.navigate(['/dashboard']);
      return;
    }

    // Get team information
    const homeTeam = this.gameState.clubs.find(c => c.id === this.currentMatch!.homeTeam);
    const awayTeam = this.gameState.clubs.find(c => c.id === this.currentMatch!.awayTeam);
    
    if (!homeTeam || !awayTeam) {
      console.error('Team not found');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.homeTeam.set(homeTeam);
    this.awayTeam.set(awayTeam);
    
    console.log('🏟️ Match initialized:');
    console.log('Home Team:', homeTeam.name, '(ID:', this.currentMatch.homeTeam, ')');
    console.log('Away Team:', awayTeam.name, '(ID:', this.currentMatch.awayTeam, ')');
    
    // Start the match
    this.startMatch();
  }

  startMatch() {
    this.isMatchActive.set(true);
    this.isPaused.set(false);
    this.currentTime.set(0);
    this.currentQuarter.set(1);
    this.homeScore.set(0);
    this.awayScore.set(0);
    this.coinsEarnedThisMatch = 0;
    
    this.startTimer();
    this.scheduleMiniGames();
  }

  private startTimer() {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = () => {
    if (!this.isMatchActive()) {
      this.animationFrame = null;
      return;
    }

    if (this.isPaused()) {
      // Continue animation loop but don't update time
      this.animationFrame = requestAnimationFrame(this.animate);
      return;
    }

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = now;

    const newTime = this.currentTime() + (deltaTime * this.REAL_TIME_FACTOR);
    
    if (newTime >= this.MATCH_DURATION) {
      this.endMatch();
      return;
    } else {
      this.currentTime.set(newTime);
      this.updateQuarter();
      this.checkMiniGameTriggers();
    }

    // Continue animation
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  private stopTimer() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private updateQuarter() {
    const time = this.currentTime();
    if (time <= 22.5) {
      this.currentQuarter.set(1);
    } else if (time <= 45) {
      this.currentQuarter.set(2);
    } else if (time <= 67.5) {
      this.currentQuarter.set(3);
    } else {
      this.currentQuarter.set(4);
    }
  }

  private checkMiniGameTriggers() {
    const currentTime = this.currentTime();
    
    this.scheduledMiniGames.forEach(miniGame => {
      if (!miniGame.triggered && currentTime >= miniGame.time) {
        // Guard against re-entry while UI state settles
        miniGame.triggered = true;
        if (this.miniGameActive() || this.showAttackButton() || this.showDefendButton()) return;
        if (miniGame.type === 'attack') {
          this.triggerAttackMiniGame();
        } else {
          this.triggerDefendMiniGame();
        }
      }
    });
  }

  private scheduleMiniGames() {
    // Schedule 2 mini-games per quarter (1 attack, 1 defend)
    const quarters = [
      { start: 0, end: 22.5 },
      { start: 22.5, end: 45 },
      { start: 45, end: 67.5 },
      { start: 67.5, end: 90 }
    ];

    this.scheduledMiniGames = [];

    quarters.forEach((quarter, index) => {
      // Attack mini-game (random time in first half of quarter)
      const attackTime = quarter.start + Math.random() * (quarter.end - quarter.start) * 0.5;
      this.scheduledMiniGames.push({
        time: attackTime,
        type: 'attack',
        triggered: false
      });
      
      // Defend mini-game (random time in second half of quarter)
      const defendTime = quarter.start + (quarter.end - quarter.start) * 0.5 + Math.random() * (quarter.end - quarter.start) * 0.5;
      this.scheduledMiniGames.push({
        time: defendTime,
        type: 'defend',
        triggered: false
      });
    });

    console.log('Scheduled mini-games:', this.scheduledMiniGames);
  }

  private triggerAttackMiniGame() {
    if (this.isMatchActive() && !this.isPaused() && !this.miniGameActive() && !this.showAttackButton()) {
      this.pauseMatch();
      this.showAttackButton.set(true);
    }
  }

  private triggerDefendMiniGame() {
    if (this.isMatchActive() && !this.isPaused() && !this.miniGameActive() && !this.showDefendButton()) {
      this.pauseMatch();
      this.showDefendButton.set(true);
    }
  }

  async onAttackClick() {
    console.log(`🎯 ===== ATTACK CLICKED =====`);
    this.showAttackButton.set(false);
    this.currentMiniGameType.set('attack');
    
    // Randomly select from available attacking minigames
    const attackMinigames = [
      'mystery-picker',
      'spinning-wheel',
      'dribbling-challenge',
      'power-shot'
    ];
    
    const selectedMinigame = attackMinigames[Math.floor(Math.random() * attackMinigames.length)];
    console.log(`🎯 Randomly selected attack minigame: ${selectedMinigame}`);
    
    switch (selectedMinigame) {
      case 'mystery-picker':
        await this.startMysteryPicker();
        break;
      case 'spinning-wheel':
        await this.startSpinningWheel();
        break;
      case 'dribbling-challenge':
        await this.startDribblingChallenge();
        break;
      case 'power-shot':
        await this.startPowerShot();
        break;
      default:
        console.error(`🎯 Unknown attack minigame: ${selectedMinigame}`);
        await this.startMysteryPicker(); // Fallback
    }
  }

  async startMysteryPicker() {
    console.log(`🎯 ===== STARTING MYSTERY PICKER (PASSING PHASE) =====`);
    console.log(`🎯 Using MYSTERY CARDS for midfielders (passing)`);
    
    // Get all midfielders for the mystery picker from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    console.log(`🎯 Club ID: ${clubId}`);
    
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'mid');
    console.log(`🎯 Raw players from DB:`, players.map(p => `${p.name} (${p.position})`));
    
    // Filter to only midfielders (MID position)
    const midfielders = players.filter(p => p.position === 'MID');
    console.log(`🎯 Filtered midfielders:`, midfielders.map(p => `${p.name} (${p.position})`));
    
    // Take top 4 midfielders and shuffle them randomly
    const top4Midfielders = midfielders
      .sort((a, b) => b.mid - a.mid)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Midfielders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Midfielders[i], top4Midfielders[j]] = [top4Midfielders[j], top4Midfielders[i]];
    }
    
    console.log(`🎯 Top 4 midfielders for mystery picker:`, top4Midfielders.map(p => `${p.name} (MID:${p.mid}, ID:${p.id})`));
    console.log(`🎯 Setting mysteryPlayers to:`, top4Midfielders.length, 'midfielders');
    
    this.mysteryPlayers.set(top4Midfielders);
    this.showMysteryPicker.set(true);
    console.log(`🎯 Mystery picker should now show MIDFIELDERS`);
  }

  async startDribblingChallenge() {
    console.log(`🎯 Using DRIBBLING CHALLENGE for attackers`);
    
    // Get all attackers for the dribbling challenge from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    
    // Filter to attackers and high-attacking midfielders, then get top 4
    const attackers = players.filter(p => 
      p.position === 'ATT' || (p.position === 'MID' && p.att > 83)
    );
    
    // Take top 4 attackers and shuffle them randomly
    const top4Attackers = attackers
      .sort((a, b) => b.att - a.att)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Attackers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Attackers[i], top4Attackers[j]] = [top4Attackers[j], top4Attackers[i]];
    }
    
    console.log(`🎯 Match component - Top 4 attackers for dribbling challenge:`, top4Attackers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    
    // Select a random attacker from the top 4
    const selectedAttacker = top4Attackers[Math.floor(Math.random() * top4Attackers.length)];
    console.log(`🎯 Selected attacker for dribbling challenge: ${selectedAttacker.name} (ID: ${selectedAttacker.id})`);
    
    // Get opponent team players
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    
    // Get only defenders and goalkeeper from opponent team
    const opponentPlayers = await this.playerDb.getPlayersByClub(opponentTeamId || '');
    const defendersOnly = opponentPlayers.filter(p => p.position === 'DEF' || p.position === 'GK');
    const opponentPlayerLites = defendersOnly.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      att: p.att,
      mid: p.mid,
      def: p.def
    }));
    
    // Create dribbling challenge config
    this.activeDribblingChallengeConfig = {
      attacker: selectedAttacker,
      opponentTeamId: opponentTeamId || '',
      opponentPlayers: opponentPlayerLites
    };
    
    this.miniGameActive.set(true);
    console.log(`🎯 Set miniGameActive to true for dribbling challenge`);
  }

  async startPowerShot() {
    console.log(`🎯 Using POWER SHOT for attackers`);
    
    // Get all attackers for the power shot from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    
    // Filter to attackers and high-attacking midfielders, then get top 4
    const attackers = players.filter(p => 
      p.position === 'ATT' || (p.position === 'MID' && p.att > 83)
    );
    
    // Take top 4 attackers and shuffle them randomly
    const top4Attackers = attackers
      .sort((a, b) => b.att - a.att)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Attackers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Attackers[i], top4Attackers[j]] = [top4Attackers[j], top4Attackers[i]];
    }
    
    console.log(`🎯 Match component - Top 4 attackers for power shot:`, top4Attackers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    
    // Select a random attacker from the top 4
    const selectedAttacker = top4Attackers[Math.floor(Math.random() * top4Attackers.length)];
    console.log(`🎯 Selected attacker for power shot: ${selectedAttacker.name} (ID: ${selectedAttacker.id})`);
    
    // Get opponent GK stats
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const opponentStats = this.mini.getOpponentStats(opponentTeamId || '');
    
    // Create power shot config
    this.activePowerShotConfig = {
      shooter: selectedAttacker,
      opponentGkDef: opponentStats.gkDef,
      opponentTeamId: opponentTeamId || ''
    };
    
    this.miniGameActive.set(true);
    console.log(`🎯 Set miniGameActive to true for power shot`);
  }

  async startSpinningWheel() {
    this.spinningWheelCount++;
    console.log(`🎯 Using SPINNING WHEEL for attackers (Count: ${this.spinningWheelCount})`);
    
    // Get all attackers for the spinning wheel from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    
    // Filter to attackers and high-attacking midfielders, then get top 4
    const attackers = players.filter(p => 
      p.position === 'ATT' || (p.position === 'MID' && p.att > 83)
    );
    
    // Take top 4 attackers and shuffle them randomly
    const top4Attackers = attackers
      .sort((a, b) => b.att - a.att)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Attackers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Attackers[i], top4Attackers[j]] = [top4Attackers[j], top4Attackers[i]];
    }
    
    console.log(`🎯 Match component - Top 4 attackers for spinning wheel:`, top4Attackers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    this.spinningWheelPlayers.set(top4Attackers);
    this.showSpinningWheel.set(true);
    console.log(`🎯 Set showSpinningWheel to true, current value: ${this.showSpinningWheel()}`);
  }

  async startShotMinigame() {
    console.log(`🎯 Using SHOT minigame for attackers`);
    
    // Get all attackers for the shot from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    
    // Filter to attackers and high-attacking midfielders, then get top 4
    const attackers = players.filter(p => 
      p.position === 'ATT' || (p.position === 'MID' && p.att > 83)
    );
    
    // Take top 4 attackers and shuffle them randomly
    const top4Attackers = attackers
      .sort((a, b) => b.att - a.att)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Attackers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Attackers[i], top4Attackers[j]] = [top4Attackers[j], top4Attackers[i]];
    }
    
    console.log(`🎯 Match component - Top 4 attackers for shot:`, top4Attackers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    this.mysteryPlayers.set(top4Attackers);
    this.showMysteryPicker.set(true);
    console.log(`🎯 Set showMysteryPicker to true for shot minigame`);
  }

  async startThroughBall() {
    console.log(`🎯 Using THROUGH BALL for attackers`);
    
    // Get all attackers for the through ball from DB
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const players = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    
    // Filter to attackers and high-attacking midfielders, then get top 4
    const attackers = players.filter(p => 
      p.position === 'ATT' || (p.position === 'MID' && p.att > 83)
    );
    
    // Take top 4 attackers and shuffle them randomly
    const top4Attackers = attackers
      .sort((a, b) => b.att - a.att)
      .slice(0, 4);
    
    // Shuffle the top 4 randomly
    for (let i = top4Attackers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top4Attackers[i], top4Attackers[j]] = [top4Attackers[j], top4Attackers[i]];
    }
    
    console.log(`🎯 Match component - Top 4 attackers for through ball:`, top4Attackers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    
    // Select a random attacker from the top 4
    const selectedAttacker = top4Attackers[Math.floor(Math.random() * top4Attackers.length)];
    console.log(`🎯 Selected attacker for through ball: ${selectedAttacker.name} (ID: ${selectedAttacker.id})`);
    
    // Get opponent team players
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    
    // Get only defenders and goalkeeper from opponent team
    const opponentPlayers = await this.playerDb.getPlayersByClub(opponentTeamId || '');
    const defendersOnly = opponentPlayers.filter(p => p.position === 'DEF' || p.position === 'GK');
    const opponentPlayerLites = defendersOnly.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      att: p.att,
      mid: p.mid,
      def: p.def
    }));
    
    // Get opponent stats
    const opponentStats = this.mini.getOpponentStats(opponentTeamId || '');
    
    // Create through ball config
    this.activeAttackConfig = this.mini.buildThroughBallConfig({
      passer: selectedAttacker,
      finisher: selectedAttacker,
      opponentDefAvg: opponentStats.defAvg,
      opponentGkDef: opponentStats.gkDef
    });
    
    this.miniGameActive.set(true);
    console.log(`🎯 Set miniGameActive to true for through ball`);
  }

  async onDefendClick() {
    this.showDefendButton.set(false);
    this.currentMiniGameType.set('defend');
    
    // Randomly select from available defense minigames
    // Goalkeeper dive is NOT in the random selection - it's only triggered as a fallback
    const defenseMinigames = [
      'pass-cutting',
      'timed-tackle',
      'random-dot-dive'
    ];
    
    const selectedMinigame = defenseMinigames[Math.floor(Math.random() * defenseMinigames.length)];
    console.log(`🛡️ Randomly selected defense minigame: ${selectedMinigame}`);
    
    switch (selectedMinigame) {
      case 'pass-cutting':
        await this.startPassCuttingMiniGame();
        break;
      case 'timed-tackle':
        await this.startTimedTackleMiniGame();
        break;
      case 'random-dot-dive':
        await this.startRandomDotDiveMiniGame();
        break;
      default:
        console.error(`🛡️ Unknown defense minigame: ${selectedMinigame}`);
        await this.startPassCuttingMiniGame(); // Fallback
    }
  }

  async startPassCuttingMiniGame() {
    console.log('🎯 ===== START PASS CUTTING MINI GAME =====');
    
    // Get a random defender from our team
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const defenders = await this.mini.getPlayersForRoleFromDb(clubId, 'defend');
    const selectedDefender = defenders[Math.floor(Math.random() * defenders.length)];
    
    // Get a random attacker from opponent team
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentClubId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const attackers = await this.mini.getPlayersForRoleFromDb(opponentClubId || '', 'attack');
    const selectedAttacker = attackers[Math.floor(Math.random() * attackers.length)];
    
    console.log('🎯 Selected defender:', selectedDefender.name);
    console.log('🎯 Selected attacker:', selectedAttacker.name);
    
    // Create pass cutting config
    this.activePassCuttingConfig = {
      defender: selectedDefender,
      attacker: selectedAttacker,
      passes: 4 // 4 passes to intercept
    };
    
    console.log('🎯 Created pass cutting config:', this.activePassCuttingConfig);
    
    // Set mini-game as active
    this.miniGameActive.set(true);
    console.log('🎯 Set miniGameActive to true for pass cutting challenge');
  }

  async startTimedTackleMiniGame() {
    console.log('🛡️ ===== START TIMED TACKLE MINI GAME =====');
    
    // Get a random defender from our team
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const defenders = await this.mini.getPlayersForRoleFromDb(clubId, 'defend');
    const selectedDefender = defenders[Math.floor(Math.random() * defenders.length)];
    
    // Get a random attacker from opponent team
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentClubId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const attackers = await this.mini.getPlayersForRoleFromDb(opponentClubId || '', 'attack');
    const selectedAttacker = attackers[Math.floor(Math.random() * attackers.length)];
    
    console.log('🛡️ Selected defender:', selectedDefender.name);
    console.log('🛡️ Selected attacker:', selectedAttacker.name);
    
    // Set selectedPlayer for use in result handler
    this.selectedPlayer = selectedDefender;
    
    // Get opponent stats
    const opponentStats = this.mini.getOpponentStats(opponentClubId || '');
    
    // Create timed tackle config
    this.activeDefendConfig = this.mini.buildTimedTackleConfig({
      defender: selectedDefender,
      attackerAtt: opponentStats.attAvg,
      gkDef: selectedDefender.def // Use defender's def as fallback
    });
    
    this.miniGameActive.set(true);
    console.log('🛡️ Set miniGameActive to true for timed tackle challenge');
  }

  async startRandomDotDiveMiniGame() {
    console.log('🎯 ===== START RANDOM DOT DIVE MINI GAME =====');
    
    // Get our goalkeeper
    const clubId = this.gameState.getSelectedClub()?.id || '';
    let gkList = await this.mini.getPlayersForRoleFromDb(clubId, 'gk');
    if (!gkList || gkList.length === 0) {
      const allClubPlayers = await this.playerDb.getPlayersByClub(clubId);
      const anyGk = allClubPlayers.find(p => p.position === 'GK');
      if (anyGk) {
        gkList = [{ id: anyGk.id, name: anyGk.name, position: anyGk.position as any, att: anyGk.att, mid: anyGk.mid, def: anyGk.def }];
      }
    }
    const goalkeeper = gkList && gkList.length > 0 ? gkList[0] : undefined as any;
    
    if (!goalkeeper) {
      console.error('No goalkeeper found for random dot dive');
      await this.finishDefense(false);
      return;
    }
    
    // Get a random attacker from opponent team
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentClubId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const attackers = await this.mini.getPlayersForRoleFromDb(opponentClubId || '', 'attack');
    
    if (!attackers || attackers.length === 0) {
      console.error('No opponent attackers found for random dot dive');
      await this.finishDefense(false);
      return;
    }
    
    const selectedAttacker = attackers[Math.floor(Math.random() * attackers.length)];
    
    // Store attacker for goal tracking
    this.selectedOpponentAttacker = selectedAttacker;
    
    // Create random dot dive config
    const diveGame = this.mini.getRandomDotDiveMiniGame(goalkeeper, selectedAttacker, opponentClubId || '');
    this.activeRandomDotDiveConfig = diveGame.config;
    this.currentMiniGameType.set('defend');
    this.miniGameActive.set(true);
    console.log('🎯 Set miniGameActive to true for random dot dive challenge');
  }

  async startGoalkeeperDiveMiniGame() {
    console.log('🥅 ===== START GOALKEEPER DIVE MINI GAME =====');
    
    // Get our goalkeeper
    const clubId = this.gameState.getSelectedClub()?.id || '';
    let gkList = await this.mini.getPlayersForRoleFromDb(clubId, 'gk');
    if (!gkList || gkList.length === 0) {
      const allClubPlayers = await this.playerDb.getPlayersByClub(clubId);
      const anyGk = allClubPlayers.find(p => p.position === 'GK');
      if (anyGk) {
        gkList = [{ id: anyGk.id, name: anyGk.name, position: anyGk.position as any, att: anyGk.att, mid: anyGk.mid, def: anyGk.def }];
      }
    }
    const goalkeeper = gkList && gkList.length > 0 ? gkList[0] : undefined as any;
    
    // Get a random attacker from opponent team
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentClubId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const attackers = await this.mini.getPlayersForRoleFromDb(opponentClubId || '', 'attack');
    const selectedAttacker = attackers[Math.floor(Math.random() * attackers.length)];
    
    await this.startGoalkeeperDiveMiniGameForAttacker(selectedAttacker, goalkeeper, opponentClubId || '');
  }

  async startGoalkeeperDiveMiniGameForAttacker(attacker: PlayerLite, goalkeeper?: PlayerLite, opponentClubId?: string) {
    console.log('🥅 ===== START GOALKEEPER DIVE MINI GAME FOR ATTACKER =====');
    
    // Get our goalkeeper if not provided
    if (!goalkeeper) {
      const clubId = this.gameState.getSelectedClub()?.id || '';
      let gkList = await this.mini.getPlayersForRoleFromDb(clubId, 'gk');
      if (!gkList || gkList.length === 0) {
        const allClubPlayers = await this.playerDb.getPlayersByClub(clubId);
        const anyGk = allClubPlayers.find(p => p.position === 'GK');
        if (anyGk) {
          gkList = [{ id: anyGk.id, name: anyGk.name, position: anyGk.position as any, att: anyGk.att, mid: anyGk.mid, def: anyGk.def }];
        }
      }
      goalkeeper = gkList && gkList.length > 0 ? gkList[0] : undefined as any;
    }
    
    // Get opponent team ID if not provided
    if (!opponentClubId) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      opponentClubId = isPlayerHome ? this.awayTeam()?.id || '' : this.homeTeam()?.id || '';
    }
    
    if (!goalkeeper || !attacker) {
      console.error('🥅 Missing goalkeeper or attacker for dive minigame');
      return;
    }
    
    // Store attacker for potential goal recording
    this.selectedOpponentAttacker = attacker;
    
    console.log('🥅 Selected goalkeeper:', goalkeeper.name);
    console.log('🥅 Selected attacker:', attacker.name);
    
    // Create goalkeeper dive config
    const diveGame = this.mini.getGoalkeeperDiveMiniGame(goalkeeper, attacker, opponentClubId);
    this.activeGoalkeeperDiveConfig = diveGame.config;
    
    this.miniGameActive.set(true);
    this.currentMiniGameType.set('defend'); // Set to defend since goalkeeper is defending
    console.log('🥅 Set miniGameActive to true for goalkeeper dive challenge');
  }

  async   onPlayerPicked(player: PlayerLite) {
    if (this.currentMiniGameType() === 'shooter') {
      this.selectedShooter = player;
    } else {
      this.selectedPlayer = player;
    }
    
    // Dramatic reveal pause (3s)
    setTimeout(async () => {
      this.showMysteryPicker.set(false);
      this.miniGameActive.set(true);
      
      if (this.currentMiniGameType() === 'attack') {
        this.startAttackMiniGame(player);
      } else if (this.currentMiniGameType() === 'defend') {
        this.startDefendMiniGame(player);
      } else if (this.currentMiniGameType() === 'shooter') {
        this.startShotMiniGame(player);
      }
    }, 3000);
  }

  onSpinningWheelPlayerSelected(player: PlayerLite) {
    console.log(`🎯 ===== SPINNING WHEEL PLAYER SELECTED =====`);
    console.log(`🎯 Received player: ${player.name} (ID: ${player.id})`);
    console.log(`🎯 Player object:`, JSON.stringify(player, null, 2));
    console.log(`🎯 Player object reference:`, player);
    console.log(`🎯 Player object keys:`, Object.keys(player));
    console.log(`🎯 Player position: ${player.position}, ATT: ${player.att}, MID: ${player.mid}, DEF: ${player.def}`);
    
    this.selectedShooter = player;
    console.log(`🎯 Set selectedShooter to: ${this.selectedShooter.name} (ID: ${this.selectedShooter.id})`);
    console.log(`🎯 selectedShooter object:`, JSON.stringify(this.selectedShooter, null, 2));
    
    this.showSpinningWheel.set(false);
    
    // Clear any previous mini-game type to avoid conflicts
    this.currentMiniGameType.set('attack');
    
    // Start shooting mini-game immediately after spinning wheel result is shown
    setTimeout(() => {
      console.log(`🎯 About to call startShotMiniGame with player: ${player.name} (ID: ${player.id})`);
      this.miniGameActive.set(true);
      this.startShotMiniGame(player);
    }, 100); // Very short delay to ensure smooth transition
  }

  onSpinningWheelClosed() {
    this.showSpinningWheel.set(false);
    this.resumeMatch();
  }

  private async startAttackMiniGame(player: PlayerLite) {
    // Ensure the passer is a midfielder for clearer MID scaling
    let passer = player;
    if (player.position !== 'MID') {
      const clubId = this.gameState.getSelectedClub()?.id || '';
      const mids = await this.mini.getPlayersForRoleFromDb(clubId, 'mid');
      passer = mids[0] || player;
    }

    // Get opponent stats
    const opponentStats = this.mini.getOpponentStats(this.awayTeam()?.id || '');
    
    // Create config for through ball (pass)
    this.activeAttackConfig = this.mini.buildThroughBallConfig({
      passer,
      finisher: passer, // keep same for now
      opponentDefAvg: opponentStats.defAvg,
      opponentGkDef: opponentStats.gkDef
    });
    
    console.log(`🎯 ===== THROUGH BALL CONFIG CREATED =====`);
    console.log(`🎯 Passer: ${passer.name} (MID: ${passer.mid})`);
    console.log(`🎯 Opponent Def Avg: ${opponentStats.defAvg}`);
    console.log(`🎯 Window Width: ${this.activeAttackConfig.ui.windowWidth}px`);
    console.log(`🎯 Sweep Speed: ${this.activeAttackConfig.ui.sweepSpeed}`);
    const midStat = passer.mid;
    let difficultyLevel: string;
    if (midStat >= 90) {
      difficultyLevel = 'SO EASY (90+ MID)';
    } else if (midStat >= 85) {
      difficultyLevel = 'EASY (85-89 MID)';
    } else if (midStat >= 80) {
      difficultyLevel = 'NORMAL (80-84 MID)';
    } else {
      difficultyLevel = 'HARD (<80 MID)';
    }
    
    console.log(`🎯 Difficulty: ${difficultyLevel}`);
  }

  private async startDefendMiniGame(player: PlayerLite) {
    // Get opponent stats
    const opponentStats = this.mini.getOpponentStats(this.awayTeam()?.id || '');
    
    // Create config for timed tackle
    const clubId = this.gameState.getSelectedClub()?.id || '';
    const gks = await this.mini.getPlayersForRoleFromDb(clubId, 'gk');
    const gkDef = gks[0]?.def ?? 80;
    this.activeDefendConfig = this.mini.buildTimedTackleConfig({
      defender: player,
      attackerAtt: opponentStats.attAvg,
      gkDef
    });
  }

  onAttackMiniGameResult(ev: { success: boolean }) {
    this.activeAttackConfig = null;
    
    if (ev.success) {
      // Pass successful, brief message and then show shooter selection
      this.miniGameActive.set(false); // hide overlay to allow picker clicks
      this.showTransientBanner('Pass Successful!');
      setTimeout(() => { this.showShooterSelection(); }, 1000);
    } else {
      // Pass failed, resume match (no goal added)
      this.miniGameActive.set(false);
      this.selectedPlayer = null;
      this.resumeMatch();
    }
  }

  private async showShooterSelection() {
    this.currentMiniGameType.set('shooter');
    this.showMysteryPicker.set(true);
    
    console.log(`🎯 ===== STARTING SHOOTER SELECTION =====`);
    
    // Get all players for the shooter picker
    const clubId = this.gameState.getSelectedClub()?.id || '';
    console.log(`🎯 Club ID: ${clubId}`);
    
    // Get both attackers and high-attacking midfielders
    const attackPlayers = await this.mini.getPlayersForRoleFromDb(clubId, 'attack');
    const midPlayers = await this.mini.getPlayersForRoleFromDb(clubId, 'mid');
    
    console.log(`🎯 Attack players:`, attackPlayers.map(p => `${p.name} (${p.position}, ATT:${p.att})`));
    console.log(`🎯 Mid players:`, midPlayers.map(p => `${p.name} (${p.position}, ATT:${p.att})`));
    
    // Filter attackers and high-attacking midfielders (ATT > 84)
    const attackers = attackPlayers.filter(p => p.position === 'ATT');
    const highAttMidfielders = midPlayers.filter(p => p.position === 'MID' && p.att > 84);
    
    console.log(`🎯 Attackers:`, attackers.map(p => `${p.name} (ATT:${p.att})`));
    console.log(`🎯 High-attacking midfielders (ATT > 84):`, highAttMidfielders.map(p => `${p.name} (ATT:${p.att})`));
    
    // Combine and exclude the passer
    const availableShooters = [...attackers, ...highAttMidfielders].filter(p => 
      p.id !== this.selectedPlayer?.id // Exclude the passer
    );
    
    console.log(`🎯 Available shooters (after excluding passer):`, availableShooters.map(p => `${p.name} (${p.position}, ATT:${p.att})`));
    
    // Use weighted random selection - better attackers have higher chances
    const selectedShooters = this.selectWeightedPlayers(availableShooters, 5);
    
    console.log(`🎯 Selected shooters for mystery picker:`, selectedShooters.map(p => `${p.name} (${p.position}, ATT:${p.att})`));
    
    this.mysteryPlayers.set(selectedShooters); // Show 5 randomly selected shooters with weighted probability
  }

  private selectWeightedPlayers(players: PlayerLite[], count: number): PlayerLite[] {
    if (players.length <= count) {
      return players; // Return all if we have fewer players than requested
    }
    
    // Calculate weights based on attacking ability for shooters
    const weights = players.map(player => {
      let weight: number;
      
      // For shooters, always use attacking stat regardless of position
      if (player.position === 'ATT') {
        weight = player.att; // Attackers weighted by ATT
      } else if (player.position === 'MID') {
        weight = player.att; // High-attacking midfielders also weighted by ATT
      } else {
        weight = player.att; // Default to ATT for other positions
      }
      
      // Use exponential weighting to create big differences
      return Math.pow(weight, 1.3);
    });
    
    // Normalize weights to probabilities
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const probabilities = weights.map(weight => weight / totalWeight);
    
    // Select players using weighted random selection
    const selected: PlayerLite[] = [];
    const availableIndices = Array.from({ length: players.length }, (_, i) => i);
    
    for (let i = 0; i < count; i++) {
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedIndex = 0;
      
      for (let j = 0; j < availableIndices.length; j++) {
        const index = availableIndices[j];
        cumulativeProbability += probabilities[index];
        if (random <= cumulativeProbability) {
          selectedIndex = j;
          break;
        }
      }
      
      const playerIndex = availableIndices[selectedIndex];
      selected.push(players[playerIndex]);
      availableIndices.splice(selectedIndex, 1); // Remove selected player
      
      // Recalculate probabilities for remaining players
      const remainingWeights = availableIndices.map(idx => weights[idx]);
      const remainingTotal = remainingWeights.reduce((sum, weight) => sum + weight, 0);
      probabilities.forEach((_, idx) => {
        if (availableIndices.includes(idx)) {
          probabilities[idx] = weights[idx] / remainingTotal;
        }
      });
    }
    
    return selected;
  }

  private calculateScoringChance(shooter: PlayerLite): number {
    // Get opponent GK stats
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    
    if (!opponentTeamId) return 50; // Default if no opponent
    
    // Get opponent GK DEF stat (simplified - in real implementation you'd fetch from DB)
    const opponentGkDef = 80; // Default GK DEF stat
    
    // Use the same calculation as in attack-shot.component.ts
    const attackerAtt = shooter.att;
    const gkDef = opponentGkDef;
    
    // Make shooting easier - higher base chance and better scaling
    let baseChance = 50;
    
    // Attacker advantage: each ATT point above 75 adds 1.0% chance
    if (attackerAtt > 75) {
      baseChance += (attackerAtt - 75) * 1.0;
    }
    
    // Goalkeeper disadvantage: each DEF point above 80 reduces 0.5% chance
    if (gkDef > 80) {
      baseChance -= (gkDef - 80) * 0.5;
    }
    
    // Attacker disadvantage: each ATT point below 75 reduces 0.4% chance
    if (attackerAtt < 75) {
      baseChance -= (75 - attackerAtt) * 0.4;
    }
    
    // Goalkeeper advantage: each DEF point below 80 adds 0.3% chance
    if (gkDef < 80) {
      baseChance += (80 - gkDef) * 0.3;
    }
    
    // Clamp between 20% and 75% for easier scoring
    return Math.max(20, Math.min(75, Math.round(baseChance)));
  }

  private startShotMiniGame(player: PlayerLite) {
    console.log(`🎯 ===== START SHOT MINI GAME =====`);
    console.log(`🎯 Called with player: ${player.name} (ID: ${player.id})`);
    console.log(`🎯 Player object:`, JSON.stringify(player, null, 2));
    console.log(`🎯 selectedShooter is: ${this.selectedShooter?.name} (ID: ${this.selectedShooter?.id})`);
    console.log(`🎯 selectedShooter object:`, JSON.stringify(this.selectedShooter, null, 2));
    console.log(`🎯 Are they the same object?`, player === this.selectedShooter);
    console.log(`🎯 Are they equal?`, JSON.stringify(player) === JSON.stringify(this.selectedShooter));
    
    // Get opponent GK stats
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    const opponentStats = this.mini.getOpponentStats(opponentTeamId || '');
    
    // Create shot config
    this.activeShotConfig = {
      shooter: player,
      opponentGkDef: opponentStats.gkDef,
      opponentTeamId: opponentTeamId, // Pass the opponent team ID
      goalSpots: [] // Will be generated by the component
    };
    console.log(`🎯 Created activeShotConfig with shooter: ${this.activeShotConfig.shooter.name} (ID: ${this.activeShotConfig.shooter.id})`);
    console.log(`🎯 activeShotConfig.shooter object:`, JSON.stringify(this.activeShotConfig.shooter, null, 2));
    this.miniGameActive.set(true);
  }


  async onDefendMiniGameResult(ev: { success: boolean }) {
    const defender = this.selectedPlayer;
    this.activeDefendConfig = null;
    
    if (defender) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      
      if (ev.success) {
        // Successful tackle
        this.addHighlight('tackle', defender.name, team, `🛡️ TACKLE! ${defender.name} makes a successful tackle`);
        await this.finishDefense(true);
      } else {
        // Failed tackle - trigger goalkeeper dive as last chance
        this.addHighlight('tackle', defender.name, team, `❌ MISSED TACKLE! ${defender.name} fails to tackle`);
        await this.showGoalkeeperDive();
        return; // Don't call finishDefense - goalkeeper dive will handle it
      }
    } else {
      await this.finishDefense(ev.success);
    }
  }

  private addMatchGoal(playerName: string, team: 'home' | 'away') {
    const currentMinute = Math.floor(this.currentTime());
    const currentScorers = this.matchScorers();
    
    // Check if player already scored in this match
    const existingScorer = currentScorers.find(s => s.playerName === playerName && s.team === team);
    
    if (existingScorer) {
      // Update existing scorer's goal count
      existingScorer.goals++;
    } else {
      // Add new scorer
      currentScorers.push({
        playerName,
        team,
        minute: currentMinute,
        goals: 1
      });
    }
    
    this.matchScorers.set([...currentScorers]);
    
    // Add to highlights
    this.addHighlight('goal', playerName, team, `⚽ GOAL! ${playerName} scores in the ${currentMinute}'`);
    
    // Show goal notification
    this.showGoalNotification.set(true);
    this.goalNotificationText.set(`${playerName} ⚽ ${currentMinute}'`);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      this.showGoalNotification.set(false);
    }, 3000);
  }

  getHomeScorers() {
    return this.matchScorers().filter(s => s.team === 'home');
  }

  getAwayScorers() {
    return this.matchScorers().filter(s => s.team === 'away');
  }

  getGoalBalls(goals: number): number[] {
    return Array(goals).fill(0);
  }

  closeHighlights() {
    this.showHighlights.set(false);
  }

  private addHighlight(type: 'goal' | 'save' | 'tackle', playerName: string, team: 'home' | 'away', description: string) {
    const currentMinute = Math.floor(this.currentTime());
    const currentHighlights = this.matchHighlights();
    
    currentHighlights.push({
      minute: currentMinute,
      type,
      playerName,
      team,
      description
    });
    
    // Sort by minute to keep chronological order
    currentHighlights.sort((a, b) => a.minute - b.minute);
    
    this.matchHighlights.set([...currentHighlights]);
  }

  private async getGoalkeeperName(teamId: string): Promise<string> {
    try {
      const players = await this.playerDb.getPlayersByClub(teamId);
      const gk = players.find(p => p.position === 'GK' && p.role === 'starter');
      return gk ? gk.name : 'Unknown GK';
    } catch (error) {
      console.error('Error fetching goalkeeper:', error);
      return 'Unknown GK';
    }
  }

  async onDribblingChallengeResult(ev: { success: boolean }) {
    const attacker = this.activeDribblingChallengeConfig?.attacker;
    this.activeDribblingChallengeConfig = null;
    
    if (attacker) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      
      if (ev.success) {
        // Goal scored
        console.log(`⚽ DRIBBLING CHALLENGE GOAL: ${attacker.name} (${attacker.id}) scores for ${this.gameState.getSelectedClub()?.name}`);
        console.log(`🎯 DEBUG: isPlayerHome = ${isPlayerHome}, selectedClub = ${this.gameState.getSelectedClub()?.id}, homeTeam = ${this.homeTeam()?.id}`);
        
        if (isPlayerHome) {
          this.gameState.addGoal(
            attacker.id,
            attacker.name,
            this.gameState.getSelectedClub()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        } else {
          this.gameState.addGoal(
            attacker.id,
            attacker.name,
            this.awayTeam()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        }
        
        // Track goal for match display
        this.addMatchGoal(attacker.name, team);
      } else {
        // Tackled by defender - no goal, no minigame, just failed attack
        console.log(`🛡️ DRIBBLING CHALLENGE TACKLE: ${attacker.name} was tackled`);
        this.addHighlight('tackle', 'Defender', 'away', `🛡️ TACKLE! ${attacker.name} was dispossessed`);
      }
    }
    
    this.finishAttack(ev.success);
  }

  async onPassCuttingResult(ev: { success: boolean; interceptions: number; totalPasses: number; defender: PlayerLite }) {
    const defender = this.activePassCuttingConfig?.defender;
    const attacker = this.activePassCuttingConfig?.attacker;
    this.activePassCuttingConfig = null;
    
    if (defender) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      
      if (ev.success) {
        // Successful defense - no goal conceded
        console.log(`🛡️ PASS CUTTING SUCCESS: ${defender.name} (${defender.id}) intercepted ${ev.interceptions}/${ev.totalPasses} passes for ${this.gameState.getSelectedClub()?.name}`);
        
        // Add highlight
        this.matchHighlights.update(highlights => [...highlights, {
          minute: Math.floor(this.currentTime()),
          type: 'tackle',
          playerName: defender.name,
          team: team,
          description: `Intercepted ${ev.interceptions} passes`
        }]);
      } else {
        // Failed defense - trigger goalkeeper dive as last chance
        console.log(`⚽ PASS CUTTING FAILED: ${defender.name} (${defender.id}) failed to intercept passes - triggering goalkeeper dive`);
        this.addHighlight('tackle', defender.name, team, `❌ MISSED INTERCEPTION! ${defender.name} fails to cut pass`);
        
        // Trigger goalkeeper dive with the attacker from pass cutting
        if (attacker) {
          const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
          await this.startGoalkeeperDiveMiniGameForAttacker(attacker, undefined, opponentTeamId || '');
          return; // Exit early, goalkeeper dive will handle finishDefense
        } else {
          // Fallback if no attacker
          await this.finishDefense(false);
        }
      }
    }
    
    this.finishDefense(ev.success);
  }

  async onPowerShotMiniGameResult(ev: { success: boolean }) {
    const shooter = this.activePowerShotConfig?.shooter;
    this.activePowerShotConfig = null;
    
    if (shooter) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      
      if (ev.success) {
        // Goal scored
        console.log(`⚽ POWER SHOT GOAL: ${shooter.name} (${shooter.id}) scores for ${this.gameState.getSelectedClub()?.name}`);
        console.log(`🎯 DEBUG: isPlayerHome = ${isPlayerHome}, selectedClub = ${this.gameState.getSelectedClub()?.id}, homeTeam = ${this.homeTeam()?.id}`);
        
        if (isPlayerHome) {
          this.gameState.addGoal(
            shooter.id,
            shooter.name,
            this.gameState.getSelectedClub()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        } else {
          this.gameState.addGoal(
            shooter.id,
            shooter.name,
            this.awayTeam()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        }
        
        // Track goal for match display
        this.addMatchGoal(shooter.name, team);
      } else {
        // Save made by goalkeeper
        const gkTeam = isPlayerHome ? 'away' : 'home';
        const gkTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
        const gkName = gkTeamId ? await this.getGoalkeeperName(gkTeamId) : 'Unknown GK';
        console.log(`🥅 POWER SHOT SAVE: ${gkName} saves ${shooter.name}'s shot`);
        this.addHighlight('save', gkName, gkTeam, `🥅 SAVE! ${gkName} makes a great save`);
      }
    }
    
    this.finishAttack(ev.success);
  }

  async onShotMiniGameResult(ev: { success: boolean }) {
    const shooter = this.selectedShooter;
    this.activeShotConfig = null;
    this.selectedShooter = null;
    
    if (shooter) {
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      
      if (ev.success) {
        // Goal scored
        console.log(`⚽ GOAL SCORED: ${shooter.name} (${shooter.id}) shoots and scores for ${this.gameState.getSelectedClub()?.name}`);
        console.log(`🎯 DEBUG: isPlayerHome = ${isPlayerHome}, selectedClub = ${this.gameState.getSelectedClub()?.id}, homeTeam = ${this.homeTeam()?.id}`);
        
        if (isPlayerHome) {
          this.gameState.addGoal(
            shooter.id,
            shooter.name,
            this.gameState.getSelectedClub()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        } else {
          this.gameState.addGoal(
            shooter.id,
            shooter.name,
            this.awayTeam()?.id || ''
          );
          // Earn coins for scoring (only for player's team)
          this.gameState.earnCoinsForGoal();
          this.coinsEarnedThisMatch += 10;
          this.showCoinAnimation(+10);
        }
        
        // Track goal for match display
        this.addMatchGoal(shooter.name, team);
      } else {
        // Save made by goalkeeper
        const gkTeam = isPlayerHome ? 'away' : 'home';
        const gkTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
        const gkName = gkTeamId ? await this.getGoalkeeperName(gkTeamId) : 'Unknown GK';
        console.log(`🥅 SAVE: ${gkName} saves ${shooter.name}'s shot`);
        this.addHighlight('save', gkName, gkTeam, `🥅 SAVE! ${gkName} makes a great save`);
      }
    }
    
    this.finishAttack(ev.success);
  }

  private finishAttack(success: boolean) {
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    if (success) {
      if (isPlayerHome) this.homeScore.set(this.homeScore() + 1); else this.awayScore.set(this.awayScore() + 1);
    }
    this.miniGameActive.set(false);
    this.selectedPlayer = null;
    this.resumeMatch();
  }

  private async showGoalkeeperDive() {
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
    
    if (!opponentTeamId) return;
    
    try {
      // Get your goalkeeper
      const yourTeamId = this.gameState.getSelectedClub()?.id;
      if (!yourTeamId) return;
      
      // Get your goalkeeper (using PlayerLite format)
      let gkList = await this.mini.getPlayersForRoleFromDb(yourTeamId, 'gk');
      if (!gkList || gkList.length === 0) {
        const allClubPlayers = await this.playerDb.getPlayersByClub(yourTeamId);
        const anyGk = allClubPlayers.find(p => p.position === 'GK');
        if (anyGk) {
          gkList = [{ id: anyGk.id, name: anyGk.name, position: anyGk.position as any, att: anyGk.att, mid: anyGk.mid, def: anyGk.def }];
        }
      }
      const goalkeeper = gkList && gkList.length > 0 ? gkList[0] : null;
      
      if (!goalkeeper) {
        console.error('No goalkeeper found for goalkeeper dive');
        await this.finishDefense(false);
        return;
      }
      
      // Get opponent attacker (using PlayerLite format)
      const opponentAttackers = await this.mini.getPlayersForRoleFromDb(opponentTeamId, 'attack');
      if (!opponentAttackers || opponentAttackers.length === 0) {
        console.error('No opponent attackers found for goalkeeper dive');
        await this.finishDefense(false);
        return;
      }
      const opponentAttacker = opponentAttackers[Math.floor(Math.random() * opponentAttackers.length)];
      
      // Store the attacker for later use in finishDefense (convert to Player format for storage)
      this.selectedOpponentAttacker = {
        id: opponentAttacker.id,
        name: opponentAttacker.name,
        position: opponentAttacker.position,
        att: opponentAttacker.att,
        mid: opponentAttacker.mid,
        def: opponentAttacker.def
      };
      
      // Create goalkeeper dive mini-game
      const diveGame = this.mini.getGoalkeeperDiveMiniGame(goalkeeper, opponentAttacker, opponentTeamId);
      this.activeGoalkeeperDiveConfig = diveGame.config;
      this.currentMiniGameType.set('defend'); // Set to defend since goalkeeper is defending
      this.miniGameActive.set(true);
      console.log('🥅 Goalkeeper dive triggered from defending minigame failure');
    } catch (error) {
      console.error('Error setting up goalkeeper dive:', error);
      await this.finishDefense(false);
    }
  }

  async onGoalkeeperDiveResult(ev: { success: boolean }) {
    this.activeGoalkeeperDiveConfig = null;
    await this.finishDefense(ev.success);
  }

  async onRandomDotDiveResult(ev: { success: boolean }) {
    const attacker = this.activeRandomDotDiveConfig?.opponentAttacker;
    this.activeRandomDotDiveConfig = null;
    
    if (attacker && ev.success) {
      // Successful save - just add highlight
      const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
      const team = isPlayerHome ? 'home' : 'away';
      console.log(`🥅 RANDOM DOT DIVE SAVE: Goalkeeper saves ${attacker.name}'s shot`);
      this.addHighlight('save', 'Goalkeeper', team, `🥅 SAVE! Goalkeeper makes a great reflex save`);
      // Clear selectedOpponentAttacker so finishDefense doesn't try to add a goal
      this.selectedOpponentAttacker = null;
    }
    // If failed, selectedOpponentAttacker is already set, so finishDefense will handle the goal
    
    await this.finishDefense(ev.success);
  }

  private async finishDefense(success: boolean) {
    const isPlayerHome = this.gameState.getSelectedClub()?.id === this.homeTeam()?.id;
    if (!success) {
      // concede
      if (isPlayerHome) this.awayScore.set(this.awayScore() + 1); else this.homeScore.set(this.homeScore() + 1);
      
      // Use the stored opponent attacker from goalkeeper dive mini-game
      const opponentTeamId = isPlayerHome ? this.awayTeam()?.id : this.homeTeam()?.id;
      if (opponentTeamId && this.selectedOpponentAttacker) {
        const team = isPlayerHome ? 'away' : 'home';
        
        // Log conceded goal for debugging
        console.log(`🚨 CONCEDED GOAL: ${this.selectedOpponentAttacker.name} (${opponentTeamId}) scored against ${this.gameState.getSelectedClub()?.name}`);
        
        // Add to match highlights
        this.addMatchGoal(this.selectedOpponentAttacker.name, team);
        
        // Add to global goal scorers
        this.gameState.addGoal(
          this.selectedOpponentAttacker.id,
          this.selectedOpponentAttacker.name,
          opponentTeamId
        );

        // Deduct coins immediately for conceding and show animation
        // Deduct coins only if possible; reflect in match counter
        const before = this.gameState.getCoins();
        this.gameState.loseCoinsForGoalConceded();
        const after = this.gameState.getCoins();
        if (after < before) {
          const deducted = Math.min(5, before);
          this.coinsEarnedThisMatch = Math.max(0, this.coinsEarnedThisMatch - deducted);
          this.showCoinAnimation(-deducted);
        }
      }
    }
    this.miniGameActive.set(false);
    this.selectedPlayer = null;
    this.selectedOpponentAttacker = null; // Clear the stored attacker
    this.resumeMatch();
  }

  pauseMatch() {
    this.isPaused.set(true);
  }

  resumeMatch() {
    if (this.isPaused() && this.isMatchActive()) {
      console.log('🔄 Resuming match...');
      this.isPaused.set(false);
      // Update lastTime to prevent time jump when resuming
      this.lastTime = performance.now();
      console.log('✅ Match resumed - timer should continue');
    } else {
      console.log('⚠️ Resume called but match not paused or not active');
    }
  }

  exitMatch() {
    // Forfeit with 3-0 loss for the player's team
    const playerTeam = this.gameState.getSelectedClub();
    const isPlayerHome = playerTeam?.id === this.homeTeam()?.id;
    
    console.log('🚪 Match forfeited by player');
    console.log('Player team:', playerTeam?.name);
    console.log('Is player home team:', isPlayerHome);
    
    if (isPlayerHome) {
      // Player is home team, so they lose 0-3
      this.homeScore.set(0);
      this.awayScore.set(3);
      console.log('❌ Player loses 0-3 (home team)');
    } else {
      // Player is away team, so they lose 0-3
      this.homeScore.set(3);
      this.awayScore.set(0);
      console.log('❌ Player loses 0-3 (away team)');
    }
    
    this.endMatch();
  }

  private async endMatch() {
    this.stopTimer();
    this.isMatchActive.set(false);
    this.isPaused.set(false);
    
    // Update match result in game state
    if (this.currentMatch) {
      console.log(`🏁 Match ended: ${this.homeScore()}-${this.awayScore()}`);
      // Pass skipScorers=true so we don't double-add scorers after in-game goals
      this.gameState.simulateMatch(
        this.currentMatch.id,
        this.homeScore(),
        this.awayScore(),
        true
      );
      
      // Award coins based on match result
      const selectedClub = this.gameState.getSelectedClub();
      if (selectedClub) {
        const isPlayerHome = selectedClub.id === this.currentMatch.homeTeam;
        const playerScore = isPlayerHome ? this.homeScore() : this.awayScore();
        const opponentScore = isPlayerHome ? this.awayScore() : this.homeScore();
        
        console.log(`🎮 MATCH RESULT DEBUG:`);
        console.log(`   Player Score: ${playerScore}`);
        console.log(`   Opponent Score: ${opponentScore}`);
        console.log(`   Starting Coins: ${this.gameState.getCoins()}`);
        
        if (playerScore > opponentScore) {
          // Win
          console.log(`🏆 WIN DETECTED - Awarding win bonus...`);
          this.gameState.earnCoinsForWin();
          this.coinsEarnedThisMatch += 25;
          this.showCoinAnimation(+25);
          console.log(`💰 Earned 25 Super Coin for winning!`);
          console.log(`   Coins after win: ${this.gameState.getCoins()}`);
        } else if (playerScore === opponentScore) {
          // Draw
          console.log(`🤝 DRAW DETECTED - Awarding draw bonus...`);
          this.gameState.earnCoinsForDraw();
          console.log(`💰 Earned 0 Super Coin for drawing!`);
          console.log(`   Coins after draw: ${this.gameState.getCoins()}`);
        } else {
          console.log(`😞 LOSS DETECTED - No bonus coins`);
        }
        
        // Award coins for goals scored (already handled during match)
        console.log(`⚽ GOALS BONUS - ${playerScore} goals scored (coins already awarded during match)`);
        console.log(`   Coins after goals: ${this.gameState.getCoins()}`);
        
        // Penalty for goals conceded
        if (opponentScore > 0) {
          console.log(`🚫 GOALS CONCEDED PENALTY - Already handled during match on each conceded goal.`);
        } else {
          console.log(`🛡️ CLEAN SHEET - No goals conceded penalty!`);
        }
        
        // Add a coins summary highlight for this match
        console.log(`🎯 FINAL COIN TOTAL: ${this.gameState.getCoins()} Super Coin`);
      }
    }
    
    // Simulate remaining matches in current matchday
    await this.gameState.simulateRemainingMatches();
    
    // Show highlights if there are any
    if (this.matchHighlights().length > 0) {
      this.showHighlights.set(true);
    }
    
    // Show return button instead of automatic navigation
    this.showReturnButton.set(true);
  }

  getTimeDisplay(): string {
    const minutes = Math.floor(this.currentTime());
    const seconds = Math.floor((this.currentTime() % 1) * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Simple transient banner helper
  private showTransientBanner(message: string) {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.position = 'fixed';
    el.style.top = '50px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '2500';
    el.style.padding = '10px 16px';
    el.style.borderRadius = '8px';
    el.style.background = 'rgba(0,0,0,0.85)';
    el.style.color = '#fff';
    el.style.fontWeight = '600';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 900);
  }

  // Fancy coin animation (floating +X/-Y with coin icon)
  private showCoinAnimation(amount: number) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    // Centered under the team badges and score header
    el.style.top = '140px';
    el.style.left = '50%';
    el.style.transform = 'translate(-50%, -10px)';
    el.style.zIndex = '5000';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.padding = '14px 18px';
    el.style.borderRadius = '18px';
    el.style.backdropFilter = 'blur(6px)';
    el.style.border = '2px solid rgba(255,255,255,0.2)';
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
    el.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
    el.style.opacity = '0';

    const isPositive = amount >= 0;
    el.style.background = isPositive ? 'rgba(0, 128, 0, 0.25)' : 'rgba(128, 0, 0, 0.25)';
    el.style.color = isPositive ? '#00ff66' : '#ff5555';
    el.style.textShadow = isPositive ? '0 0 8px rgba(0,255,100,0.6)' : '0 0 8px rgba(255,80,80,0.6)';

    const img = document.createElement('img');
    img.src = '/images/Super Coin.png';
    img.alt = 'Super Coin';
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.objectFit = 'contain';

    const span = document.createElement('span');
    span.textContent = `${isPositive ? '+' : ''}${amount} Super Coin`;
    span.style.fontWeight = '900';
    span.style.fontFamily = 'Orbitron, monospace';
    span.style.letterSpacing = '1px';
    span.style.fontSize = '1.2rem';

    el.appendChild(img);
    el.appendChild(span);
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%, 0)';
      el.style.opacity = '1';
    });

    setTimeout(() => {
      el.style.transform = 'translate(-50%, -20px)';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 600);
    }, 1400);
  }

  getTimeProgress(): number {
    return (this.currentTime() / this.MATCH_DURATION) * 100;
  }

  returnToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  getQuarterDisplay(): string {
    return `Q${this.currentQuarter()}`;
  }
}