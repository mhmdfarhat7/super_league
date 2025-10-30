import { Component, OnInit, OnDestroy, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { GameStateService, Club, Match, LeagueTableEntry, GoalScorer, Legend } from '../game/game-state.service';
import { PlayerDbService, Player } from '../db/player-db.service';
import { UiSoundDirective } from '../sound/ui-sound.directive';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  imports: [CommonModule, RouterModule, UiSoundDirective]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private gameState = inject(GameStateService);
  private playerDb = inject(PlayerDbService);
  private router = inject(Router);

  selectedClub = signal<Club | null>(null);
  players = signal<Player[]>([]);
  nextMatch = signal<Match | null>(null);
  leagueTable = signal<LeagueTableEntry[]>([]);
  currentMatchday = signal<number>(1);
  totalMatchdays = signal<number>(22);
  recentResults = signal<Match[]>([]);
  topScorers = signal<GoalScorer[]>([]);
  showShop = signal<boolean>(false);
  legends = signal<Legend[]>([]);
  seasonCompleted = signal<boolean>(false);
  showSeasonSummary = signal<boolean>(false);
  seasonSummary = signal<{ position: number | null; topScorerName: string; topScorerGoals: number; won: number; drawn: number; lost: number } | null>(null);

  // Expose gameState for template access
  get gameStateService() {
    return this.gameState;
  }

  constructor() {
    
    // Move effects to constructor to fix injection context error
    effect(() => {
      const club = this.gameState.selectedClub$();
      this.selectedClub.set(club);
      if (club) {
        this.loadClubData(club.id);
        this.nextMatch.set(this.gameState.getNextMatch());
      }
    });

    effect(() => {
      const season = this.gameState.season$();
      this.leagueTable.set(this.gameState.getLeagueTable());
      this.currentMatchday.set(season.currentMatchday);
      this.recentResults.set(this.gameState.getRecentResults());
      this.topScorers.set(this.gameState.getTopScorers(5));

      // Determine if season completed: all matches played
      const allPlayed = season.matches && season.matches.length > 0 && season.matches.every(m => m.played);
      this.seasonCompleted.set(!!allPlayed);
    });

    // Listen for navigation events to refresh squad data when returning from squad management
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url === '/dashboard') {
        console.log('🔄 Navigated back to dashboard, refreshing squad data');
        this.refreshSquadData();
      }
    });
  }

  onSeasonCompleteClick() {
    const club = this.gameState.getSelectedClub();
    if (!club) return;
    const pos = this.gameState.getClubPosition(club.id);
    const rec = this.gameState.getClubRecord(club.id);
    const ts = this.gameState.getClubTopScorer(club.id);
    this.seasonSummary.set({
      position: pos ?? null,
      topScorerName: ts ? ts.playerName : '—',
      topScorerGoals: ts ? ts.goals : 0,
      won: rec ? rec.won : 0,
      drawn: rec ? rec.drawn : 0,
      lost: rec ? rec.lost : 0
    });
    this.showSeasonSummary.set(true);
  }

  startNewSeason() {
    this.gameState.startNewSeason();
    // Refresh UI state
    this.leagueTable.set(this.gameState.getLeagueTable());
    this.currentMatchday.set(this.gameState.getCurrentMatchday());
    this.totalMatchdays.set(this.gameState.getTotalMatchdays());
    this.recentResults.set(this.gameState.getRecentResults());
    this.topScorers.set(this.gameState.getTopScorers(5));
    this.showSeasonSummary.set(false);
    this.seasonCompleted.set(false);
  }

  ngOnInit() {
    // Load initial data
    this.leagueTable.set(this.gameState.getLeagueTable());
    this.currentMatchday.set(this.gameState.getCurrentMatchday());
    this.totalMatchdays.set(this.gameState.getTotalMatchdays());
    this.recentResults.set(this.gameState.getRecentResults());
    this.topScorers.set(this.gameState.getTopScorers(5));

    // Check if there's already a selected club
    const currentClub = this.gameState.getSelectedClub();
    
    if (currentClub) {
      this.selectedClub.set(currentClub);
      this.loadClubData(currentClub.id);
      this.nextMatch.set(this.gameState.getNextMatch());
    }
  }

  // Method to refresh squad data (called when returning from squad management)
  refreshSquadData() {
    const currentClub = this.gameState.getSelectedClub();
    if (currentClub) {
      console.log('🔄 Refreshing squad data for', currentClub.name);
      this.loadClubData(currentClub.id);
    }
  }

  // Listen for when the component becomes visible (when returning from squad management)
  @HostListener('window:focus')
  onWindowFocus() {
    // Refresh squad data when returning to the dashboard
    this.refreshSquadData();
  }

  private async loadClubData(clubId: string) {
    try {
      const players = await this.playerDb.getPlayersByClub(clubId);
      // Don't sort here - let getStarters() and getSubs() handle sorting
      this.players.set(players);
    } catch (error) {
      console.error('Error loading club data:', error);
    }
  }

  async selectClub(club: Club) {
    console.log('🏆 Selecting club:', club.name);
    
    // Ensure database is seeded before selecting club
    await this.playerDb.seedIfEmpty(this.gameState.clubs);
    
    // Select the club
    this.gameState.selectClub(club);
    
    console.log('✅ Club selected and data seeded:', club.name);
  }

  getClubBadge(teamId: string): string {
    const club = this.gameState.clubs.find(c => c.id === teamId);
    return club ? club.badge : '/images/ICON.png';
  }

  getPlayerPosition(player: Player): string {
    return player.position;
  }

  getPlayerPositionClass(player: Player): string {
    return `position-${player.position.toLowerCase()}`;
  }

  async clearDatabase() {
    console.log('🗑️ Clearing database...');
    await this.playerDb.clearAllData();
    localStorage.removeItem('players.seeded.v5');
    console.log('✅ Database cleared, reloading...');
    location.reload();
  }

  onStartGame() {
    this.router.navigate(['/match']);
  }

  getClubName(teamId: string): string {
    const club = this.gameState.clubs.find(c => c.id === teamId);
    return club ? club.name : teamId;
  }

  // Keyboard event handler
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (this.showShop()) {
      this.closeShop();
    }
  }

  // Shop methods
  async openShop() {
    const club = this.selectedClub();
    if (!club) return;
    
    this.showShop.set(true);
    
    try {
      const legends = await this.gameState.getLegendsForClub(club.id);
      this.legends.set(legends);
    } catch (error) {
      console.error('Error loading legends:', error);
      this.legends.set([]);
    }
  }

  closeShop(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showShop.set(false);
  }

  async buyLegend(legend: Legend) {
    const club = this.selectedClub();
    if (!club) return;

    const success = await this.gameState.purchaseLegend(club.id, legend);
    if (success) {
      // Reload club data to show the new legend
      await this.loadClubData(club.id);
      // Remove the legend from the shop
      const currentLegends = this.legends();
      this.legends.set(currentLegends.filter(l => l.name !== legend.name));
    }
  }

  isLegend(player: any): boolean {
    return !!(player.id && player.id.includes('-legend-'));
  }

  isLegendScorer(scorer: GoalScorer): boolean {
    return !!(scorer.playerId && scorer.playerId.includes('-legend-'));
  }

  getStarters() {
    const starters = this.players().filter(player => player.role === 'starter');
    return this.sortPlayersByPosition(starters);
  }

  getSubs() {
    const subs = this.players().filter(player => player.role === 'sub');
    return this.sortPlayersByPosition(subs);
  }

  private sortPlayersByPosition(players: Player[]): Player[] {
    const positionOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'ATT': 4 }; // Lower number = higher priority
    
    return players.sort((a, b) => {
      const positionA = positionOrder[a.position as keyof typeof positionOrder] || 5;
      const positionB = positionOrder[b.position as keyof typeof positionOrder] || 5;
      
      if (positionA !== positionB) {
        return positionA - positionB; // GK(1) first, then DEF(2), MID(3), ATT(4)
      }
      
      // If same position, sort by ATT stat (highest first)
      return b.att - a.att;
    });
  }

  // Drag and Drop functionality
  private draggedPlayer: Player | null = null;
  private draggedOverSection: string | null = null;
  private draggedOverPlayer: Player | null = null;

  // Card movement animation properties
  private swappingPlayers: Set<string> = new Set();
  private rearrangingGrids: Set<string> = new Set();

  onDragStart(event: DragEvent, player: Player) {
    this.draggedPlayer = player;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', player.id);
    }
    console.log(`🎯 Started dragging player: ${player.name}`);
  }

  onDragEnd(event: DragEvent) {
    this.draggedPlayer = null;
    this.draggedOverSection = null;
    this.draggedOverPlayer = null;
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over, .drag-over-player').forEach(el => el.classList.remove('drag-over', 'drag-over-player'));
    console.log(`🎯 Finished dragging player`);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(event: DragEvent, section: string) {
    event.preventDefault();
    this.draggedOverSection = section;
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
    console.log(`🎯 Dragging over ${section} section`);
  }

  onDragLeave(event: DragEvent, section: string) {
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  onDrop(event: DragEvent, targetRole: 'starter' | 'sub') {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    if (!this.draggedPlayer) return;

    const draggedPlayer = this.draggedPlayer;
    const currentRole = draggedPlayer.role;
    
    // Only allow switching between starter and sub
    if (currentRole === targetRole) {
      console.log(`🎯 Player ${draggedPlayer.name} is already in ${targetRole} role`);
      return;
    }

    console.log(`🎯 Switching ${draggedPlayer.name} from ${currentRole} to ${targetRole}`);
    
    // Update the player's role
    this.updatePlayerRole(draggedPlayer.id, targetRole);
    
    this.draggedPlayer = null;
    this.draggedOverSection = null;
  }

  // Player-to-player drag and drop methods
  onPlayerDragOver(event: DragEvent, targetPlayer: Player) {
    event.preventDefault();
    event.stopPropagation(); // Prevent bubbling to section handlers
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onPlayerDragEnter(event: DragEvent, targetPlayer: Player) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.draggedPlayer || this.draggedPlayer.id === targetPlayer.id) {
      return; // Don't highlight if dragging self
    }
    
    // Only allow swapping between different roles
    if (this.draggedPlayer.role !== targetPlayer.role) {
      this.draggedOverPlayer = targetPlayer;
      console.log(`🎯 Dragging over player: ${targetPlayer.name} for potential swap`);
    }
  }

  onPlayerDragLeave(event: DragEvent, targetPlayer: Player) {
    // Add a small delay to prevent flickering when moving between child elements
    setTimeout(() => {
      if (this.draggedOverPlayer?.id === targetPlayer.id) {
        // Check if we're actually leaving the player card area
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        // Only clear if we're truly outside the card bounds (with padding)
        if (x < rect.left - 15 || x > rect.right + 15 || y < rect.top - 15 || y > rect.bottom + 15) {
          this.draggedOverPlayer = null;
        }
      }
    }, 50);
  }

  onPlayerDrop(event: DragEvent, targetPlayer: Player) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.draggedPlayer || !this.draggedOverPlayer) return;
    
    const draggedPlayer = this.draggedPlayer;
    const targetPlayerRole = targetPlayer.role;
    
    // Only allow swapping between different roles
    if (draggedPlayer.role === targetPlayerRole) {
      console.log(`🎯 Cannot swap players with same role: ${draggedPlayer.role}`);
      return;
    }
    
    console.log(`🎯 DRAMATIC SWAP: ${draggedPlayer.name} ↔ ${targetPlayer.name}`);
    
    // Perform the dramatic swap
    this.performPlayerSwap(draggedPlayer, targetPlayer);
    
    this.draggedPlayer = null;
    this.draggedOverPlayer = null;
  }

  isDragOverPlayer(player: Player): boolean {
    return this.draggedOverPlayer?.id === player.id;
  }

  private async performPlayerSwap(player1: Player, player2: Player) {
    try {
      console.log(`🎯 Performing dramatic swap between ${player1.name} and ${player2.name}`);
      
      // Start card movement animations
      this.startCardMovementAnimation(player1, player2);
      
      // Update both players' roles
      await Promise.all([
        this.playerDb.updatePlayerRole(player1.id, player2.role),
        this.playerDb.updatePlayerRole(player2.id, player1.role)
      ]);
      
      // Update local signals with auto-sorting
      this.players.update(players => {
        const updatedPlayers = players.map(player => {
          if (player.id === player1.id) {
            return { ...player, role: player2.role };
          } else if (player.id === player2.id) {
            return { ...player, role: player1.role };
          }
          return player;
        });
        
        // Auto-sort both sections
        return this.sortPlayers(updatedPlayers);
      });
      
      // Trigger grid rearrangement animation
      this.triggerGridRearrangement();
      
      console.log(`🎯 Dramatic swap completed successfully!`);
    } catch (error) {
      console.error(`🎯 Error performing player swap:`, error);
    }
  }

  private startCardMovementAnimation(player1: Player, player2: Player) {
    // Mark players as swapping
    this.swappingPlayers.add(player1.id);
    this.swappingPlayers.add(player2.id);
    
    // Remove animation classes after animation completes
    setTimeout(() => {
      this.swappingPlayers.delete(player1.id);
      this.swappingPlayers.delete(player2.id);
    }, 1200);
  }

  private triggerGridRearrangement() {
    // Mark grids as rearranging
    this.rearrangingGrids.add('starters');
    this.rearrangingGrids.add('subs');
    
    // Remove animation classes after animation completes
    setTimeout(() => {
      this.rearrangingGrids.delete('starters');
      this.rearrangingGrids.delete('subs');
    }, 600);
  }

  private sortPlayers(players: Player[]): Player[] {
    const starters = players.filter(p => p.role === 'starter');
    const subs = players.filter(p => p.role === 'sub');
    
    // Sort both sections by position (ATT first, GK last)
    const sortedStarters = this.sortPlayersByPosition(starters);
    const sortedSubs = this.sortPlayersByPosition(subs);
    
    return [...sortedStarters, ...sortedSubs];
  }

  // Helper methods for template
  isPlayerSwapping(playerId: string): boolean {
    return this.swappingPlayers.has(playerId);
  }

  isGridRearranging(gridType: string): boolean {
    return this.rearrangingGrids.has(gridType);
  }

  private async updatePlayerRole(playerId: string, newRole: 'starter' | 'sub') {
    try {
      // Update in the database
      await this.playerDb.updatePlayerRole(playerId, newRole);
      
      // Update the local signal
      this.players.update(players => 
        players.map(player => 
          player.id === playerId ? { ...player, role: newRole } : player
        )
      );
      
      console.log(`🎯 Successfully updated player ${playerId} to ${newRole}`);
    } catch (error) {
      console.error(`🎯 Error updating player role:`, error);
    }
  }

  ngOnDestroy() {
    // Clean up any subscriptions if needed
  }
}
