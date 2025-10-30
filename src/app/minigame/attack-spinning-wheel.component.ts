import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';

export type SpinningWheelConfig = {
  players: PlayerLite[];
  wheelSize: number;
  colors: string[];
};

export type WheelSegment = {
  player: PlayerLite;
  color: string;
  startAngle: number;
  endAngle: number;
};

@Component({
  selector: 'app-attack-spinning-wheel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wheel-container">
      <div class="wheel-header">
        <h3>Choose Your Attacker!</h3>
        <p>Spin the wheel to select who will take the shot</p>
      </div>
      
      <div class="wheel-wrapper">
        <div class="wheel" 
             [style.transform]="'rotate(' + currentRotation + 'deg)'"
             [class.spinning]="isSpinning"
             [style.background]="getWheelBackground()">
          
          <!-- Player labels positioned inside the wheel so they rotate with it -->
           <div 
             *ngFor="let segment of wheelSegments; let i = index"
             class="player-label"
             [style.transform]="'rotate(' + (segment.startAngle + segment.endAngle) / 2 + 'deg)'">
             <div class="label-content" [class.legendary]="isLegendaryPlayer(segment.player)">
               <div class="player-name">{{ segment.player.name }}</div>
               <div class="player-att">ATT: {{ segment.player.att }}</div>
             </div>
           </div>
        </div>
        
        <div class="wheel-pointer"></div>
      </div>
      
      <div class="wheel-controls" *ngIf="!hasSpun">
        <button 
          class="spin-button" 
          (click)="spinWheel()" 
          [disabled]="isSpinning">
          {{ isSpinning ? 'Spinning...' : 'SPIN!' }}
        </button>
      </div>
      
      <div class="selected-player" *ngIf="selectedPlayer">
        <h4>Selected: {{ selectedPlayer.name }}</h4>
        <p>ATT: {{ selectedPlayer.att }} | MID: {{ selectedPlayer.mid }} | DEF: {{ selectedPlayer.def }}</p>
      </div>
    </div>
  `,
  styles: [`
    .wheel-container {
      --blue: #00C8FF;
      --red: #FF3B3B;
      --green: #00FF9C;
      --gray: #2D2D2D;
      --border: #FFD700;
      --text: #FFFFFF;
      
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 20px;
    }
    
    .wheel-header {
      text-align: center;
      margin-bottom: 30px;
      color: white;
    }
    
    .wheel-header h3 {
      font-size: 2rem;
      margin-bottom: 10px;
      color: var(--text);
    }
    
    .wheel-header p {
      font-size: 1.1rem;
      color: var(--text);
      margin: 0;
      opacity: 0.8;
    }
    
    .wheel-wrapper {
      position: relative;
      width: 600px;
      height: 600px;
      margin-bottom: 30px;
    }
    
    .wheel {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      position: relative;
      border: 6px solid var(--border);
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.7);
      overflow: hidden;
      transition: transform 3s cubic-bezier(0.25, 0.1, 0.25, 1);
      aspect-ratio: 1;
    }
    
    .wheel.spinning {
      transition: transform 3s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
    
    .player-label {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      transform-origin: center;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    
    .label-content {
      transform: translateY(-150px);
      text-align: center;
      color: var(--text);
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      writing-mode: horizontal-tb;
      text-orientation: upright;
    }
    
    .legendary .label-content {
      color: #00BFFF;
      text-shadow: 
        0 0 10px rgba(0, 100, 200, 0.8),
        0 0 20px rgba(0, 100, 200, 0.6),
        0 0 30px rgba(0, 100, 200, 0.4),
        2px 2px 4px rgba(0, 0, 0, 0.8);
      filter: drop-shadow(0 0 8px rgba(0, 100, 200, 0.5));
    }
    
    .player-name {
      font-size: 0.85rem;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: visible;
      text-overflow: unset;
      max-width: none;
      width: 100%;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      letter-spacing: 0.3px;
      line-height: 1.1;
      color: var(--text);
    }
    
    .legendary .player-name {
      color: #00BFFF;
      text-shadow: 
        0 0 8px rgba(0, 100, 200, 0.9),
        0 0 16px rgba(0, 100, 200, 0.7),
        0 0 24px rgba(0, 100, 200, 0.5),
        2px 2px 4px rgba(0, 0, 0, 0.8);
    }
    
    .player-att {
      font-size: 0.8rem;
      opacity: 0.9;
    }
    
    .legendary .player-att {
      color: #00BFFF;
      text-shadow: 
        0 0 6px rgba(0, 100, 200, 0.8),
        0 0 12px rgba(0, 100, 200, 0.6),
        0 0 18px rgba(0, 100, 200, 0.4),
        1px 1px 2px rgba(0, 0, 0, 0.8);
    }
    
    .wheel-pointer {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 20px solid transparent;
      border-right: 20px solid transparent;
      border-top: 40px solid #ff6b6b;
      z-index: 10;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }
    
    .wheel-controls {
      text-align: center;
    }
    
    .spin-button {
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
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
    
    .spin-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    }
    
    .spin-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .selected-player {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      text-align: center;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .selected-player h4 {
      margin: 0 0 8px 0;
      color: #4CAF50;
      font-size: 1.3rem;
    }
    
    .selected-player p {
      margin: 0;
      color: #ccc;
      font-size: 1rem;
    }
  `]
})
export class AttackSpinningWheelComponent implements OnInit, OnDestroy {
  @Input() config?: SpinningWheelConfig;
  @Output() playerSelected = new EventEmitter<PlayerLite>();
  @Output() wheelClosed = new EventEmitter<void>();

  wheelSegments: WheelSegment[] = [];
  currentRotation = 0;
  isSpinning = false;
  hasSpun = false; // Track if wheel has already been spun
  selectedPlayer: PlayerLite | null = null;
  
  private colors = [
    '#00BFFF', '#FF0000', '#00FF00', '#8A2BE2'
  ];

  ngOnInit() {
    if (this.config) {
      this.initializeWheel();
    }
  }

  ngOnDestroy() {
    // Clean up any ongoing animations
  }

  isLegendaryPlayer(player: PlayerLite): boolean {
    // Consider players with ATT >= 91 as legendary
    return player.att >= 91;
  }

  private initializeWheel() {
    if (!this.config) return;

    // Get only the top 4 attacking players (highest ATT stats) and shuffle them randomly
    const sortedPlayers = [...this.config.players]
      .sort((a, b) => b.att - a.att)
      .slice(0, 4); // Only top 4 players
    
    // Shuffle the top 4 randomly
    for (let i = sortedPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sortedPlayers[i], sortedPlayers[j]] = [sortedPlayers[j], sortedPlayers[i]];
    }

    console.log(`🎯 Top 4 attacking players:`, sortedPlayers.map(p => `${p.name} (ATT:${p.att}, ID:${p.id})`));
    console.log(`🎯 Full player objects:`, sortedPlayers);
    console.log(`🎯 Player object references:`, sortedPlayers.map((p, i) => `[${i}] ${p.name}: ${p.id}`));

    // Calculate weights based on ATT stats with extremely sensitive scaling
    const weights = sortedPlayers.map(player => {
      // Use extremely sensitive exponential scaling to make ATT differences very dramatic
      // Higher ATT players get MUCH more area - each point makes a huge difference
      const baseWeight = Math.pow(player.att, 4.5); // Even higher exponent for more dramatic differences
      const multiplier = Math.max(1, (player.att - 80) * 2); // Additional multiplier for high ATT players
      return baseWeight * multiplier;
    });

    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Cap any single player at maximum 50% of the wheel
    const maxAllowedWeight = totalWeight * 0.5;
    const cappedWeights = weights.map(weight => Math.min(weight, maxAllowedWeight));
    
    // Recalculate total with capped weights
    const cappedTotalWeight = cappedWeights.reduce((sum, weight) => sum + weight, 0);
    
    // If we capped any weights, we need to redistribute the remaining space
    // to ensure the wheel adds up to exactly 360 degrees
    const redistributionFactor = totalWeight / cappedTotalWeight;
    const finalWeights = cappedWeights.map(weight => weight * redistributionFactor);

    // Create segments with proportional angles using final weights
    let currentAngle = 0;
    this.wheelSegments = sortedPlayers.map((player, index) => {
      const segmentAngle = (finalWeights[index] / totalWeight) * 360;
      
      // Debug log to see area calculations
      const originalWeight = weights[index];
      const cappedWeight = cappedWeights[index];
      const finalWeight = finalWeights[index];
      const percentage = ((segmentAngle/360)*100).toFixed(1);
      const wasCapped = originalWeight > maxAllowedWeight ? ' (CAPPED)' : '';
      console.log(`${player.name} (ATT:${player.att}): Original=${originalWeight.toFixed(0)}, Capped=${cappedWeight.toFixed(0)}, Final=${finalWeight.toFixed(0)}${wasCapped}, ${segmentAngle.toFixed(1)}° (${percentage}%)`);
      
      const segment: WheelSegment = {
        player,
        color: this.colors[index % this.colors.length],
        startAngle: currentAngle,
        endAngle: currentAngle + segmentAngle
      };
      currentAngle += segmentAngle;
      return segment;
    });

    // Ensure the last segment ends at exactly 360 degrees to prevent gaps
    if (this.wheelSegments.length > 0) {
      this.wheelSegments[this.wheelSegments.length - 1].endAngle = 360;
    }
  }

  spinWheel() {
    if (this.isSpinning || !this.config || this.hasSpun) return;

    this.isSpinning = true;
    this.hasSpun = true; // Mark as spun to prevent cheating
    this.selectedPlayer = null;

    // Calculate random rotation (multiple full rotations + random angle)
    const baseRotations = 5 + Math.random() * 3; // 5-8 full rotations
    const randomAngle = Math.random() * 360;
    const finalRotation = baseRotations * 360 + randomAngle;

    console.log(`🎯 ===== SPINNING WHEEL =====`);
    console.log(`🎯 Base rotations: ${baseRotations}`);
    console.log(`🎯 Random angle: ${randomAngle}`);
    console.log(`🎯 Final rotation: ${finalRotation}`);
    console.log(`🎯 Current rotation before: ${this.currentRotation}`);
    
    this.currentRotation += finalRotation;
    
    console.log(`🎯 Current rotation after: ${this.currentRotation}`);
    console.log(`🎯 Visual rotation (CSS): ${this.currentRotation}deg`);

    // Determine which player was selected based on final rotation
    setTimeout(() => {
      this.isSpinning = false;
      this.selectPlayer(finalRotation);
    }, 3000); // Match the animation duration
  }

  private selectPlayer(finalRotation: number) {
    if (!this.config) return;

    // Normalize rotation to 0-360 range
    const normalizedRotation = ((finalRotation % 360) + 360) % 360;
    
    console.log(`🎯 Final rotation: ${finalRotation}, Normalized: ${normalizedRotation}`);
    console.log('🎯 Available segments:', this.wheelSegments.map(s => 
      `${s.player.name}: ${s.startAngle.toFixed(1)}°-${s.endAngle.toFixed(1)}°`
    ));
    
    // Find which segment the pointer is on
    console.log(`🎯 Looking for segment with normalized rotation: ${normalizedRotation}`);
    console.log(`🎯 Available segments:`, this.wheelSegments.map(s => 
      `${s.player.name}: ${s.startAngle.toFixed(1)}°-${s.endAngle.toFixed(1)}°`
    ));
    
    // Calculate what the pointer should be pointing to visually
    // The pointer is at the top (0°), so we need to find which segment is at the top
    // after the wheel has rotated
    const visualPointerAngle = 0; // Pointer is always at the top
    const wheelRotation = this.currentRotation % 360;
    const effectivePointerAngle = (visualPointerAngle - wheelRotation + 360) % 360;
    console.log(`🎯 Wheel rotation: ${wheelRotation}°`);
    console.log(`🎯 Effective pointer angle: ${effectivePointerAngle}°`);
    
    const visualSegment = this.wheelSegments.find(segment => 
      effectivePointerAngle >= segment.startAngle && effectivePointerAngle < segment.endAngle
    );
    console.log(`🎯 Visual segment (what pointer should show): ${visualSegment?.player.name || 'none'}`);
    
    // Use the same calculation as the visual pointer for consistency
    const selectedSegment = this.wheelSegments.find(segment => 
      effectivePointerAngle >= segment.startAngle && effectivePointerAngle < segment.endAngle
    );
    
    if (selectedSegment) {
      this.selectedPlayer = selectedSegment.player;
      console.log(`🎯 Selected: ${selectedSegment.player.name} (${selectedSegment.startAngle.toFixed(1)}°-${selectedSegment.endAngle.toFixed(1)}°)`);
      console.log(`🎯 Selected player object:`, JSON.stringify(selectedSegment.player, null, 2));
      console.log(`🎯 Selected player ID: "${selectedSegment.player.id}"`);
      console.log(`🎯 Selected player name: "${selectedSegment.player.name}"`);
      console.log(`🎯 Selected player reference:`, selectedSegment.player);
    } else {
      // Fallback to first segment if no match found
      this.selectedPlayer = this.wheelSegments[0].player;
      console.log(`🎯 Fallback selected: ${this.selectedPlayer.name}`);
      console.log(`🎯 Fallback player object:`, JSON.stringify(this.selectedPlayer, null, 2));
      console.log(`🎯 Fallback player reference:`, this.selectedPlayer);
    }
    
    // Emit the selected player after 3 seconds (2 more seconds for display)
    setTimeout(() => {
      console.log(`🎯 Spinning wheel emitting player: ${this.selectedPlayer!.name} (ID: ${this.selectedPlayer!.id})`);
      console.log(`🎯 Emitting player object:`, JSON.stringify(this.selectedPlayer, null, 2));
      console.log(`🎯 Player object reference:`, this.selectedPlayer);
      this.playerSelected.emit(this.selectedPlayer!);
    }, 3000);
  }

  closeWheel() {
    this.wheelClosed.emit();
  }

  getWheelBackground(): string {
    if (this.wheelSegments.length === 0) return '';
    
    const gradients = this.wheelSegments.map((segment, index) => {
      const startAngle = segment.startAngle;
      const endAngle = segment.endAngle;
      return `${segment.color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');
    
    return `conic-gradient(${gradients})`;
  }
}
