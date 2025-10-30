import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameStateService, Club } from '../game/game-state.service';
import { PlayerDbService, Player } from '../db/player-db.service';
import { UiSoundDirective } from '../sound/ui-sound.directive';

@Component({
  selector: 'app-squad',
  standalone: true,
  templateUrl: './squad.component.html',
  styleUrl: './squad.component.css',
  imports: [CommonModule, RouterModule, UiSoundDirective]
})
export class SquadComponent implements OnInit {
  private gameState = inject(GameStateService);
  private playerDb = inject(PlayerDbService);

  selectedClub = signal<Club | null>(null);
  allPlayers = signal<Player[]>([]);
  activeSquad = signal<Player[]>([]);
  availablePlayers = signal<Player[]>([]);
  
  private draggedPlayer: Player | null = null;
  isDragOverSquad = false;
  isDragOverAvailable = false;

  constructor() {
    // Move effect to constructor to fix injection context error
    effect(() => {
      const club = this.gameState.selectedClub$();
      this.selectedClub.set(club);
      if (club) {
        this.loadClubData(club.id);
      }
    });
  }

  ngOnInit() {
    // Check if there's already a selected club
    const currentClub = this.gameState.getSelectedClub();
    
    if (currentClub) {
      this.selectedClub.set(currentClub);
      this.loadClubData(currentClub.id);
    }
  }

  private async loadClubData(clubId: string) {
    try {
      const players = await this.playerDb.getPlayersByClub(clubId);
      // Sort players: starters first, then by position, then subs by position
      const sortedPlayers = this.sortPlayers(players);
      this.allPlayers.set(sortedPlayers);
      
      // Set active squad (starters) and available players (subs)
      const starters = sortedPlayers.filter(p => p.role === 'starter');
      const subs = sortedPlayers.filter(p => p.role === 'sub');
      
      this.activeSquad.set(starters);
      this.availablePlayers.set(subs);
    } catch (error) {
      console.error('Error loading club data:', error);
    }
  }

  private sortPlayers(players: Player[]): Player[] {
    const positionOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'ATT': 4 };
    
    return players.sort((a, b) => {
      // First sort by role (starters first)
      if (a.role !== b.role) {
        return a.role === 'starter' ? -1 : 1;
      }
      
      // Then sort by position within each role
      const positionA = positionOrder[a.position as keyof typeof positionOrder] || 5;
      const positionB = positionOrder[b.position as keyof typeof positionOrder] || 5;
      
      if (positionA !== positionB) {
        return positionA - positionB;
      }
      
      // Finally sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  moveToSquad(player: Player) {
    if (this.activeSquad().length >= 11) {
      alert('Squad is full! Maximum 11 players allowed.');
      return;
    }

    // Update player role to starter
    this.updatePlayerRole(player, 'starter');
    
    // Move player from available to active squad
    const available = this.availablePlayers().filter(p => p.id !== player.id);
    const active = [...this.activeSquad(), { ...player, role: 'starter' as const }];
    
    this.availablePlayers.set(available);
    this.activeSquad.set(active);
  }

  moveToBench(player: Player) {
    // Update player role to sub
    this.updatePlayerRole(player, 'sub');
    
    // Move player from active squad to available
    const active = this.activeSquad().filter(p => p.id !== player.id);
    const available = [...this.availablePlayers(), { ...player, role: 'sub' as const }];
    
    this.activeSquad.set(active);
    this.availablePlayers.set(available);
  }

  private async updatePlayerRole(player: Player, newRole: 'starter' | 'sub') {
    try {
      // Update in database
      const updatedPlayer = { ...player, role: newRole };
      await this.playerDb.updatePlayer(updatedPlayer);
    } catch (error) {
      console.error('Error updating player role:', error);
    }
  }

  getPlayerPosition(player: Player): string {
    return player.position;
  }

  getPlayerPositionClass(player: Player): string {
    return `position-${player.position.toLowerCase()}`;
  }

  // Drag and Drop Methods
  onDragStart(event: DragEvent, player: Player) {
    this.draggedPlayer = player;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', player.id);
    }
  }

  onDragEnd(event: DragEvent) {
    this.draggedPlayer = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetSection: 'active' | 'available') {
    event.preventDefault();
    
    if (!this.draggedPlayer) return;

    const currentActiveSquad = this.activeSquad();
    const currentAvailablePlayers = this.availablePlayers();

    if (targetSection === 'active') {
      // Moving to active squad
      if (currentActiveSquad.length >= 11) {
        alert('Squad is full! Maximum 11 players allowed.');
        return;
      }
      this.moveToSquad(this.draggedPlayer);
    } else {
      // Moving to available players
      this.moveToBench(this.draggedPlayer);
    }
  }

  onGridDragOver(event: DragEvent, gridType: 'squad' | 'available') {
    event.preventDefault();
    if (gridType === 'squad') {
      this.isDragOverSquad = true;
    } else {
      this.isDragOverAvailable = true;
    }
  }

  onGridDragLeave(event: DragEvent, gridType: 'squad' | 'available') {
    if (gridType === 'squad') {
      this.isDragOverSquad = false;
    } else {
      this.isDragOverAvailable = false;
    }
  }

  onGridDrop(event: DragEvent, gridType: 'squad' | 'available') {
    event.preventDefault();
    if (gridType === 'squad') {
      this.isDragOverSquad = false;
      this.onDrop(event, 'active');
    } else {
      this.isDragOverAvailable = false;
      this.onDrop(event, 'available');
    }
  }

  isLegend(player: Player): boolean {
    return !!(player.id && player.id.includes('-legend-'));
  }
}
