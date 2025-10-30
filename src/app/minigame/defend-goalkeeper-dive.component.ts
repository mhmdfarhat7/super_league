import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerLite } from './mini-game.service';
import { PlayerDbService } from '../db/player-db.service';
import { MinigameSoundService } from '../sound/minigame-sound.service';

export type GoalkeeperDiveConfig = {
  goalkeeper: PlayerLite;
  opponentAttacker: PlayerLite;
  opponentTeamId: string;
  diveSpots: boolean[]; // 3x3 grid: true = save, false = goal
};

@Component({
  selector: 'app-defend-goalkeeper-dive',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './defend-goalkeeper-dive.component.html',
  styleUrls: ['./defend-goalkeeper-dive.component.css']
})
export class DefendGoalkeeperDiveComponent implements OnInit {
  @Input() config?: GoalkeeperDiveConfig;
  @Output() result = new EventEmitter<{ success: boolean }>();

  diveSpots: { isSave: boolean; revealed: boolean; selected: boolean }[] = [];
  diveTaken = false;

  private playerDb = inject(PlayerDbService);
  private soundService = inject(MinigameSoundService);

  async ngOnInit() {
    if (this.config) {
      this.initializeDiveSpots();
    }
  }

  private initializeDiveSpots() {
    if (!this.config) return;
    
    // Create 9 spots (3x3 grid) with save/no-save based on diving chance percentage
    const totalSpots = 9;
    const divingChance = this.getDivingChance();
    const savePercentage = divingChance / 100; // Convert to 0-1 range
    const saveSpots = Math.round(totalSpots * savePercentage);
    
    // Create array with save spots
    this.diveSpots = Array.from({ length: totalSpots }, (_, i) => ({
      isSave: i < saveSpots,
      revealed: false,
      selected: false
    }));
    
    // Shuffle the array to randomize save positions
    for (let i = this.diveSpots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.diveSpots[i], this.diveSpots[j]] = [this.diveSpots[j], this.diveSpots[i]];
    }
  }

  onDive(index: number) {
    if (this.diveTaken || !this.config) return;
    
    this.diveTaken = true;
    this.diveSpots[index].selected = true;
    
    // Reveal all spots after a short delay
    setTimeout(() => {
      this.diveSpots.forEach(spot => spot.revealed = true);
      
      // Play sound after reveal - fix the sound logic
      if (this.diveSpots[index].isSave) {
        // Green box = successful save = happy sound
        this.soundService.playSave();
      } else {
        // Red box = goal conceded = sad sound
        this.soundService.playFailedSave();
      }
      
      // Emit result after revealing
      setTimeout(() => {
        this.result.emit({ success: this.diveSpots[index].isSave });
      }, 3000); // Display result for 3 seconds
    }, 500);
  }

  getDivingChance(): number {
    if (!this.config) return 0;
    
    const gkDef = this.config.goalkeeper.def;
    const attackerAtt = this.config.opponentAttacker.att;
    
    // Make saving harder - lower base chance and adjusted scaling
    let baseChance = 45; // Base 45% save rate (was 60%)
    
    // Goalkeeper advantage: each DEF point above 80 adds 0.5% chance (was 0.6%)
    if (gkDef > 80) {
      baseChance += (gkDef - 80) * 0.5;
    }
    
    // Attacker disadvantage: each ATT point above 75 reduces 0.9% chance (was 0.8%)
    if (attackerAtt > 75) {
      baseChance -= (attackerAtt - 75) * 0.9;
    }
    
    // Goalkeeper disadvantage: each DEF point below 80 reduces 0.5% chance (was 0.4%)
    if (gkDef < 80) {
      baseChance -= (80 - gkDef) * 0.5;
    }
    
    // Attacker advantage: each ATT point below 75 adds 0.4% chance (was 0.5%)
    if (attackerAtt < 75) {
      baseChance += (75 - attackerAtt) * 0.4;
    }
    
    // Clamp between 25% and 75% for harder saving (was 35-85%)
    return Math.max(25, Math.min(75, Math.round(baseChance)));
  }

  getZoneLabel(index: number): string {
    const labels = [
      'Top Left', 'Top Center', 'Top Right',
      'Middle Left', 'Center', 'Middle Right', 
      'Bottom Left', 'Bottom Center', 'Bottom Right'
    ];
    return labels[index] || `Zone ${index + 1}`;
  }
}
