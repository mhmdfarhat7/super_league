import { Injectable, signal, inject } from '@angular/core';
import { PlayerDbService } from '../db/player-db.service';

export type Club = {
  id: string;
  name: string;
  badge: string;
};

export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  matchday: number;
};

export type LeagueTableEntry = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type GoalScorer = {
  playerId: string;
  playerName: string;
  clubId: string;
  clubName: string;
  goals: number;
};

export type Legend = {
  name: string;
  position: string;
  att: number;
  mid: number;
  def: number;
  price: number;
};

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private selectedClub = signal<Club | null>(null);
  private playerDb = inject(PlayerDbService);
  private coins = signal<number>(0);
  private   season = signal<{
    currentMatchday: number;
    totalMatchdays: number;
    matches: Match[];
    leagueTable: LeagueTableEntry[];
    goalScorers: GoalScorer[];
  }>({
    currentMatchday: 1,
    totalMatchdays: 22, // 12 teams, each plays 11 others twice = 22 matchdays
    matches: [],
    leagueTable: [],
    goalScorers: []
  });

  // Signals for reactive updates
  selectedClub$ = this.selectedClub.asReadonly();
  season$ = this.season.asReadonly();
  coins$ = this.coins.asReadonly();

  // Available clubs
  readonly clubs: Club[] = [
    { id: 'barcelona', name: 'Barcelona', badge: '/images/FC_Barcelona_(crest).svg.png' },
    { id: 'real-madrid', name: 'Real Madrid', badge: '/images/Real_Madrid_CF.svg.png' },
    { id: 'arsenal', name: 'Arsenal', badge: '/images/Arsenal_FC.svg.png' },
    { id: 'chelsea', name: 'Chelsea', badge: '/images/Chelsea_FC.svg.png' },
    { id: 'man-city', name: 'Man City', badge: '/images/Manchester_City_FC_badge.svg.png' },
    { id: 'man-united', name: 'Man United', badge: '/images/Manchester_United_FC_crest.png' },
    { id: 'liverpool', name: 'Liverpool', badge: '/images/Liverpool_FC.png' },
    { id: 'tottenham', name: 'Tottenham', badge: '/images/Tottenham_Hotspur.svg.png' },
    { id: 'inter-milan', name: 'Inter Milan', badge: '/images/FC_Internazionale_Milano_2021.svg.png' },
    { id: 'ac-milan', name: 'AC Milan', badge: '/images/Logo_of_AC_Milan.svg.png' },
    { id: 'bayern', name: 'Bayern Munich', badge: '/images/FC_Bayern_München_logo_(2024).svg.png' },
    { id: 'psg', name: 'PSG', badge: '/images/Paris_Saint-Germain_F.C..svg.png' }
  ];

  constructor() {
    this.initializeSeason();
  }

  selectClub(club: Club) {
    this.selectedClub.set(club);
  }

  getSelectedClub(): Club | null {
    return this.selectedClub();
  }

  getNextMatch(): Match | null {
    const currentClub = this.selectedClub();
    if (!currentClub) return null;

    const season = this.season();
    return season.matches.find(match => 
      !match.played && 
      (match.homeTeam === currentClub.id || match.awayTeam === currentClub.id) &&
      match.matchday === season.currentMatchday
    ) || null;
  }

  getLeagueTable(): LeagueTableEntry[] {
    return [...this.season().leagueTable].sort((a, b) => {
      // Sort by points (desc), then goal difference (desc), then goals for (desc)
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }

  getCurrentMatchday(): number {
    return this.season().currentMatchday;
  }

  getTotalMatchdays(): number {
    return this.season().totalMatchdays;
  }

  private initializeSeason() {
    const matches: Match[] = [];
    const clubIds = this.clubs.map(c => c.id);
    
    // Shuffle the club order for random fixtures
    const shuffledClubs = this.shuffleArray([...clubIds]);
    
    // Generate proper round-robin fixtures
    let matchId = 1;
    const numTeams = shuffledClubs.length;
    const totalMatchdays = (numTeams - 1) * 2; // Home and away legs
    
    // First half of season (home and away)
    for (let matchday = 1; matchday <= numTeams - 1; matchday++) {
      for (let i = 0; i < numTeams / 2; i++) {
        const home = shuffledClubs[i];
        const away = shuffledClubs[numTeams - 1 - i];
        
        if (home && away) {
          matches.push({
            id: `match-${matchId++}`,
            homeTeam: home,
            awayTeam: away,
            played: false,
            matchday: matchday
          });
        }
      }
      
      // Rotate teams (except first team)
      const lastTeam = shuffledClubs.pop();
      if (lastTeam) {
        shuffledClubs.splice(1, 0, lastTeam);
      }
    }
    
    // Second half of season (reverse fixtures)
    for (let matchday = numTeams; matchday <= totalMatchdays; matchday++) {
      for (let i = 0; i < numTeams / 2; i++) {
        const home = shuffledClubs[i];
        const away = shuffledClubs[numTeams - 1 - i];
        
        if (home && away) {
          matches.push({
            id: `match-${matchId++}`,
            homeTeam: away, // Reverse home/away
            awayTeam: home,
            played: false,
            matchday: matchday
          });
        }
      }
      
      // Rotate teams (except first team)
      const lastTeam = shuffledClubs.pop();
      if (lastTeam) {
        shuffledClubs.splice(1, 0, lastTeam);
      }
    }

    // Initialize league table - sorted alphabetically
    const leagueTable: LeagueTableEntry[] = clubIds
      .sort((a, b) => {
        const clubA = this.clubs.find(c => c.id === a);
        const clubB = this.clubs.find(c => c.id === b);
        return clubA!.name.localeCompare(clubB!.name);
      })
      .map(teamId => ({
        team: teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      }));

    console.log(`🏆 Season initialized:`);
    console.log(`📊 Total teams: ${numTeams}`);
    console.log(`📅 Total matchdays: ${totalMatchdays}`);
    console.log(`⚽ Total matches: ${matches.length}`);
    console.log(`📋 Matches per matchday: ${matches.length / totalMatchdays}`);
    
    // Log first few matchdays to verify structure
    for (let md = 1; md <= Math.min(3, totalMatchdays); md++) {
      const matchdayMatches = matches.filter(m => m.matchday === md);
      console.log(`📅 Matchday ${md}: ${matchdayMatches.length} matches`);
      matchdayMatches.forEach(m => {
        console.log(`  - ${this.getClubName(m.homeTeam)} vs ${this.getClubName(m.awayTeam)}`);
      });
    }

    this.season.set({
      currentMatchday: 1,
      totalMatchdays: totalMatchdays,
      matches,
      leagueTable,
      goalScorers: []
    });
  }

  // Start a brand-new season (preserve selected club, coins, and squad)
  startNewSeason() {
    this.initializeSeason();
  }

  // Helpers for dashboard summaries
  getClubPosition(clubId: string): number | null {
    const table = this.getLeagueTable();
    const idx = table.findIndex(e => e.team === clubId);
    return idx >= 0 ? idx + 1 : null;
  }

  getClubRecord(clubId: string): { won: number; drawn: number; lost: number } | null {
    const entry = this.season().leagueTable.find(e => e.team === clubId);
    if (!entry) return null;
    return { won: entry.won, drawn: entry.drawn, lost: entry.lost };
  }

  getClubTopScorer(clubId: string): GoalScorer | null {
    const list = this.season().goalScorers
      .filter(s => s.clubId === clubId)
      .sort((a, b) => b.goals - a.goals);
    return list.length > 0 ? list[0] : null;
  }

  // Method to simulate a match result (for testing)
  async simulateMatch(matchId: string, homeScore: number, awayScore: number, skipScorers: boolean = false) {
    const season = this.season();
    const match = season.matches.find(m => m.id === matchId);
    if (!match || match.played) {
      console.log(`⚠️ Match ${matchId} already played or not found, skipping simulation`);
      return;
    }

    console.log(`✅ Simulating match ${matchId}: ${homeScore}-${awayScore}`);
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.played = true;

    // Simulate goal scorers for this match unless they were already added in real-time gameplay
    if (!skipScorers) {
      await this.simulateGoalScorers(match.homeTeam, homeScore);
      await this.simulateGoalScorers(match.awayTeam, awayScore);
    }

    // Update league table
    this.updateLeagueTable(match);
    
    this.season.set({ ...season });
  }

  private updateLeagueTable(match: Match) {
    const table = this.season().leagueTable;
    const homeEntry = table.find(entry => entry.team === match.homeTeam);
    const awayEntry = table.find(entry => entry.team === match.awayTeam);

    if (!homeEntry || !awayEntry) return;

    // Update played matches
    homeEntry.played++;
    awayEntry.played++;

    // Update goals
    homeEntry.goalsFor += match.homeScore!;
    homeEntry.goalsAgainst += match.awayScore!;
    awayEntry.goalsFor += match.awayScore!;
    awayEntry.goalsAgainst += match.homeScore!;

    // Update goal difference
    homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;
    awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;

    // Update points and record
    if (match.homeScore! > match.awayScore!) {
      homeEntry.won++;
      awayEntry.lost++;
      homeEntry.points += 3;
    } else if (match.homeScore! < match.awayScore!) {
      awayEntry.won++;
      homeEntry.lost++;
      awayEntry.points += 3;
    } else {
      homeEntry.drawn++;
      awayEntry.drawn++;
      homeEntry.points += 1;
      awayEntry.points += 1;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Simulate all remaining matches in current matchday
  private isSimulating = false;
  isSimulatingNow(): boolean { return this.isSimulating; }

  async simulateRemainingMatches() {
    console.log('🚀 simulateRemainingMatches called');
    console.log('isSimulating flag:', this.isSimulating);
    
    // Prevent multiple simultaneous simulations
    if (this.isSimulating) {
      console.log('⚠️ Simulation already in progress, skipping...');
      return;
    }

    this.isSimulating = true;
    console.log('🔒 Simulation flag set to true');
    
    const season = this.season();
    const currentMatchday = season.currentMatchday;
    
    // Get all unplayed matches for current matchday
    const unplayedMatches = season.matches.filter(match => 
      !match.played && match.matchday === currentMatchday
    );

    console.log(`🎮 Simulating ${unplayedMatches.length} remaining matches for matchday ${currentMatchday}`);
    console.log('Unplayed matches:', unplayedMatches.map(m => `${this.getClubName(m.homeTeam)} vs ${this.getClubName(m.awayTeam)}`));

    // Only simulate if there are unplayed matches
    if (unplayedMatches.length === 0) {
      console.log('No unplayed matches to simulate');
      this.isSimulating = false;
      return;
    }

    // Pre-cache all teams involved in simulation to prevent race conditions
    const allTeamIds = new Set<string>();
    unplayedMatches.forEach(match => {
      allTeamIds.add(match.homeTeam);
      allTeamIds.add(match.awayTeam);
    });
    
    console.log('🔄 Pre-caching players for all teams...');
    for (const teamId of allTeamIds) {
      try {
        await this.getTeamPlayers(teamId);
        console.log(`✅ Cached players for ${this.getClubName(teamId)}`);
      } catch (error) {
        console.error(`❌ Failed to cache players for ${this.getClubName(teamId)}:`, error);
      }
    }

    // Serialize strictly; avoid any overlapping work
    for (const match of unplayedMatches) {
      console.log(`🎯 Simulating match: ${this.getClubName(match.homeTeam)} vs ${this.getClubName(match.awayTeam)}`);
      const result = this.simulateMatchResult(match.homeTeam, match.awayTeam);
      await this.simulateMatch(match.id, result.homeScore, result.awayScore);
    }

    // Check if all matches in current matchday are complete
    const allMatchesPlayed = season.matches.filter(m => m.matchday === currentMatchday)
      .every(m => m.played);
    
    if (allMatchesPlayed) {
      this.advanceToNextMatchday();
    }

    // Reset simulation flag
    this.isSimulating = false;
    console.log('✅ Simulation completed');
  }

  // Simulate a single match result based on team stats
  private simulateMatchResult(homeTeamId: string, awayTeamId: string): { homeScore: number; awayScore: number } {
    const homeStrength = this.calculateTeamStrength(homeTeamId);
    const awayStrength = this.calculateTeamStrength(awayTeamId);
    
    // Add some randomness to make it realistic
    const homeRandom = (Math.random() - 0.5) * 0.2; // ±10% variation
    const awayRandom = (Math.random() - 0.5) * 0.2;
    
    const adjustedHomeStrength = Math.max(0.1, homeStrength + homeRandom);
    const adjustedAwayStrength = Math.max(0.1, awayStrength + awayRandom);
    
    // Calculate base goal probabilities (much lower for realism)
    const strengthDiff = adjustedHomeStrength - adjustedAwayStrength;
    const baseHomeProb = 0.15 + (strengthDiff * 0.1); // Base 15% + strength difference
    const baseAwayProb = 0.15 - (strengthDiff * 0.1);
    
    // Simulate realistic goal scoring
    let homeScore = 0;
    let awayScore = 0;
    
    // Most common: 0-2 goals per team
    // Simulate 3-4 goal opportunities per match (realistic)
    const goalOpportunities = 3 + Math.floor(Math.random() * 2); // 3-4 opportunities
    
    for (let i = 0; i < goalOpportunities; i++) {
      if (Math.random() < baseHomeProb) {
        homeScore++;
      }
      if (Math.random() < baseAwayProb) {
        awayScore++;
      }
    }
    
    // Apply realistic score distribution
    const scoreDistribution = this.getRealisticScoreDistribution();
    const randomIndex = Math.floor(Math.random() * scoreDistribution.length);
    const { home, away } = scoreDistribution[randomIndex];
    
    // Use the distribution but adjust based on team strength
    if (strengthDiff > 0.2) {
      // Home team is significantly stronger
      homeScore = Math.max(home, homeScore);
      if (Math.random() < 0.3) homeScore = Math.min(3, homeScore + 1);
    } else if (strengthDiff < -0.2) {
      // Away team is significantly stronger
      awayScore = Math.max(away, awayScore);
      if (Math.random() < 0.3) awayScore = Math.min(3, awayScore + 1);
    } else {
      // Evenly matched teams
      homeScore = home;
      awayScore = away;
    }
    
    // Ensure at least one team scores (avoid 0-0 too often)
    if (homeScore === 0 && awayScore === 0) {
      if (Math.random() < 0.5) {
        homeScore = 1;
      } else {
        awayScore = 1;
      }
    }
    
    console.log(`⚽ ${this.getClubName(homeTeamId)} ${homeScore}-${awayScore} ${this.getClubName(awayTeamId)} (H:${homeStrength.toFixed(2)}, A:${awayStrength.toFixed(2)})`);
    
    return { homeScore, awayScore };
  }

  // Get realistic score distribution
  private getRealisticScoreDistribution(): { home: number; away: number }[] {
    return [
      // Most common scores (60% of matches)
      { home: 1, away: 0 }, { home: 0, away: 1 },
      { home: 1, away: 1 }, { home: 2, away: 1 },
      { home: 1, away: 2 }, { home: 2, away: 0 },
      { home: 0, away: 2 },
      
      // Common scores (25% of matches)
      { home: 2, away: 2 }, { home: 3, away: 1 },
      { home: 1, away: 3 }, { home: 3, away: 0 },
      { home: 0, away: 3 }, { home: 3, away: 2 },
      { home: 2, away: 3 },
      
      // Occasional scores (10% of matches)
      { home: 4, away: 1 }, { home: 1, away: 4 },
      { home: 4, away: 0 }, { home: 0, away: 4 },
      { home: 4, away: 2 }, { home: 2, away: 4 },
      
      // Rare scores (5% of matches)
      { home: 5, away: 0 }, { home: 0, away: 5 },
      { home: 4, away: 3 }, { home: 3, away: 4 },
      { home: 5, away: 1 }, { home: 1, away: 5 }
    ];
  }

  // Calculate team strength based on hardcoded values
  private calculateTeamStrength(teamId: string): number {
    // Hardcoded team strengths - you can adjust these values
    const teamStrengths: { [key: string]: number } = {
      // Top tier teams (0.80-0.90)
      'psg': 0.92,
      'real-madrid': 0.90,
      'barcelona': 0.89,
      'bayern': 0.85,
      'liverpool': 0.84,
      
      // High tier teams (0.75-0.80)
      'man-city': 0.80,
      'arsenal': 0.80,
      
      // Mid-high tier teams (0.70-0.75)
      'chelsea': 0.76,
      'inter-milan': 0.74,
      
      // Mid tier teams (0.65-0.70)
      'ac-milan': 0.68,
      'tottenham': 0.59,
      'man-united': 0.53
    };
    
    const strength = teamStrengths[teamId] || 0.60; // Default strength for unknown teams
    console.log(`📊 ${teamId} strength: ${strength.toFixed(3)}`);
    return strength;
  }

  // Advance to next matchday
  private advanceToNextMatchday() {
    const season = this.season();
    if (season.currentMatchday < season.totalMatchdays) {
      const newMatchday = season.currentMatchday + 1;
      console.log(`📅 Advancing to matchday ${newMatchday}`);
      
      this.season.set({
        ...season,
        currentMatchday: newMatchday
      });
    } else {
      console.log('🏆 Season completed!');
      
      // Award coins for league position
      const selectedClub = this.selectedClub();
      if (selectedClub) {
        const leagueTable = this.getLeagueTable();
        const clubPosition = leagueTable.findIndex(entry => entry.team === selectedClub.id) + 1;
        
        if (clubPosition > 0) {
          this.earnCoinsForLeaguePosition(clubPosition);
          console.log(`💰 Earned Super Coin for finishing in position ${clubPosition}!`);
        }
      }
    }
  }

  // Get recent match results for display
  getRecentResults(): Match[] {
    const season = this.season();
    return season.matches
      .filter(match => match.played)
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 10); // Last 10 matches
  }

  // Get club name by ID
  private getClubName(teamId: string): string {
    const club = this.clubs.find(c => c.id === teamId);
    return club ? club.name : teamId;
  }

  // Goal tracking methods
  addGoal(playerId: string, playerName: string, clubId: string): void {
    const season = this.season();
    const clubName = this.getClubName(clubId);
    
    console.log(`⚽ Adding goal: ${playerName} (${playerId}) for ${clubName} (${clubId})`);
    
    // Find existing scorer or create new one
    let scorer = season.goalScorers.find(s => s.playerId === playerId);
    if (scorer) {
      scorer.goals++;
      console.log(`⚽ Updated existing scorer: ${playerName} now has ${scorer.goals} goals`);
    } else {
      scorer = {
        playerId,
        playerName,
        clubId,
        clubName,
        goals: 1
      };
      season.goalScorers.push(scorer);
      console.log(`⚽ Created new scorer: ${playerName} with 1 goal`);
    }
    
    // Update the season signal
    this.season.set({ ...season });
  }

  getTopScorers(limit: number = 5): GoalScorer[] {
    const season = this.season();
    return season.goalScorers
      .sort((a, b) => b.goals - a.goals)
      .slice(0, limit);
  }

  getPlayerGoals(playerId: string): number {
    const season = this.season();
    const scorer = season.goalScorers.find(s => s.playerId === playerId);
    return scorer ? scorer.goals : 0;
  }

  // Coins system methods
  getCoins(): number {
    return this.coins();
  }

  addCoins(amount: number): void {
    const currentCoins = this.coins();
    this.coins.set(currentCoins + amount);
    console.log(`💰 Added ${amount} Super Coin. Total: ${this.coins()}`);
  }

  setCoins(amount: number): void {
    this.coins.set(amount);
    console.log(`💰 Set coins to ${amount} Super Coin`);
  }

  spendCoins(amount: number): boolean {
    const currentCoins = this.coins();
    if (currentCoins >= amount) {
      this.coins.set(currentCoins - amount);
      console.log(`💰 Spent ${amount} Super Coin. Remaining: ${this.coins()}`);
      return true;
    }
    console.log(`❌ Not enough Super Coin. Need ${amount}, have ${currentCoins}`);
    return false;
  }

  // Coin earning methods
  earnCoinsForWin(): void {
    this.addCoins(25);
  }

  earnCoinsForDraw(): void {
    // No coins for draw per updated rules
  }

  earnCoinsForGoal(): void {
    this.addCoins(10);
  }

  loseCoinsForGoalConceded(): void {
    const current = this.getCoins();
    if (current <= 0) return; // cannot go into debt
    const deduction = Math.min(5, current);
    this.addCoins(-deduction);
  }

  earnCoinsForLeaguePosition(position: number): void {
    if (position === 1) {
      this.addCoins(300);
    } else if (position === 2 || position === 3) {
      this.addCoins(100);
    }
  }

  // Legends methods
  async getLegendsForClub(clubId: string): Promise<Legend[]> {
    try {
      const response = await fetch('/rosters.json');
      const data = await response.json();
      return data[clubId]?.legends || [];
    } catch (error) {
      console.error('Error fetching legends:', error);
      return [];
    }
  }

  async purchaseLegend(clubId: string, legend: Legend): Promise<boolean> {
    if (!this.spendCoins(legend.price)) {
      return false;
    }

    try {
      // Get current players and add the legend
      const players = await this.playerDb.getPlayersByClub(clubId);
      
      // Check if legend already exists to prevent duplicates
      const existingLegend = players.find(p => p.name === legend.name);
      if (existingLegend) {
        console.log(`⚠️ Legend ${legend.name} already exists in squad! Refunding coins.`);
        this.addCoins(legend.price);
        return false;
      }
      
      // Create a unique ID for the legend player
      const legendId = `${clubId}-${legend.name.toLowerCase().replace(/\s+/g, '-')}-legend-${Date.now()}`;
      
      // Add legend as a sub player to the club
      const legendPlayer = {
        id: legendId,
        clubId: clubId,
        name: legend.name,
        role: 'sub' as const,
        att: legend.att,
        mid: legend.mid,
        def: legend.def,
        position: legend.position as 'GK' | 'DEF' | 'MID' | 'ATT'
      };

      console.log(`🛒 Adding legend ${legend.name} to squad. Current players: ${players.length}`);
      players.push(legendPlayer);
      console.log(`🛒 After adding legend. Total players: ${players.length}`);
      
      // Update the roster
      await this.playerDb.updateClubPlayers(clubId, players);
      
      console.log(`✅ Purchased legend: ${legend.name} for ${legend.price} Super Coin`);
      return true;
    } catch (error) {
      console.error('Error purchasing legend:', error);
      // Refund coins if purchase failed
      this.addCoins(legend.price);
      return false;
    }
  }

  private async simulateGoalScorers(teamId: string, goals: number) {
    if (goals === 0) return;

    // Make teamId immutable to prevent corruption
    const currentTeamId = teamId;
    
    // Get real players from rosters.json for this team
    const teamPlayers = await this.getTeamPlayers(currentTeamId);
    if (teamPlayers.length === 0) {
      console.log(`❌ No players found for team: ${currentTeamId} - skipping goal simulation`);
      return;
    }
    
    // Filter to attacking players - include all attackers and good attacking midfielders
    const trueAttackers = teamPlayers.filter(p => 
      p.role === 'starter' && p.position === 'ATT'
    );
    
    // Include midfielders with decent attacking stats (ATT >= 80)
    const attackingMidfielders = teamPlayers.filter(p => 
      p.role === 'starter' && p.position === 'MID' && p.att >= 80
    );
    
    // Combine true attackers and good attacking midfielders
    const attackingPlayers = [...trueAttackers, ...attackingMidfielders];
    
    // If no attacking players, use all starter players
    const availablePlayers = attackingPlayers.length > 0 ? attackingPlayers : teamPlayers.filter(p => p.role === 'starter');
    
    if (availablePlayers.length === 0) {
      console.log(`❌ No available players for team: ${currentTeamId} - skipping goal simulation`);
      return;
    }
    
    // Calculate each player's goal probability based on their ATT stat
    // Use a more aggressive exponential system to heavily favor the best players
    const playerProbabilities: { player: any; probability: number }[] = [];
    
    availablePlayers.forEach(player => {
      let baseScore = player.att;
      
      // Boost true attackers significantly
      if (player.position === 'ATT') {
        baseScore = baseScore * 1.3; // 30% boost for true attackers
      } else if (player.position === 'MID') {
        baseScore = baseScore * 0.8; // 20% penalty for midfielders (they're still good but not as natural scorers)
      }
      
      // Use exponential scoring: 90 ATT vs 80 ATT should be dramatically different
      // Formula: score^2.0 to create significant differences between high and low ATT
      const exponentialScore = Math.pow(baseScore, 2.0);
      
      playerProbabilities.push({
        player: player,
        probability: exponentialScore
      });
    });
    
    // Normalize probabilities so they sum to 1
    const totalProbability = playerProbabilities.reduce((sum, p) => sum + p.probability, 0);
    playerProbabilities.forEach(p => {
      p.probability = p.probability / totalProbability;
    });
    
    // Distribute goals based on normalized probabilities
    for (let i = 0; i < goals; i++) {
      const random = Math.random();
      let cumulativeProbability = 0;
      
      for (const playerProb of playerProbabilities) {
        cumulativeProbability += playerProb.probability;
        if (random <= cumulativeProbability) {
          this.addGoal(playerProb.player.id, playerProb.player.name, currentTeamId);
          break;
        }
      }
    }
  }

  private async getTeamPlayers(teamId: string) {
    try {
      const players = await this.playerDb.getPlayersByClub(teamId);
      return players;
    } catch (error) {
      console.error('Error fetching team players:', error);
      return [];
    }
  }
}
