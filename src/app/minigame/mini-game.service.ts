import { Injectable } from '@angular/core';
import { PlayerDbService } from '../db/player-db.service';
import { DefendGoalkeeperDiveComponent } from './defend-goalkeeper-dive.component';
import { DefendRandomDotDiveComponent } from './defend-random-dot-dive.component';

export type MiniGameType = 'attack' | 'defend';
export type AttackMiniGameId = 'through-ball' | 'finishing' | 'dribble-shot';
export type DefendMiniGameId = 'timed-tackle' | 'interception' | 'gk-reaction' | 'goalkeeper-dive';

export type PlayerLite = {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
  att: number;
  mid: number;
  def: number;
};

export type MysteryCandidate = { player: PlayerLite };

export type ThroughBallConfig = {
  passer: PlayerLite;
  finisher: PlayerLite;
  opponentDefAvg: number;
  opponentGkDef: number;
  ui: { windowWidth: number; sweepSpeed: number };
};

export type TimedTackleConfig = {
  defender: PlayerLite;
  attackerAtt: number;
  ui: { zoneSize: number; swingSpeed: number };
  gkBailout: { chance: number; saveChance: number };
};

export type GoalkeeperDiveConfig = {
  goalkeeper: PlayerLite;
  opponentAttacker: PlayerLite;
  opponentTeamId: string;
  diveSpots: boolean[]; // 3x3 grid: true = save, false = goal
};

export type RandomDotDiveConfig = {
  goalkeeper: PlayerLite;
  opponentAttacker: PlayerLite;
  opponentTeamId: string;
};

@Injectable({ providedIn: 'root' })
export class MiniGameService {
  constructor(private playerDb: PlayerDbService) {}
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // Advantage helper in range [-0.5, 0.5]
  advantage(yourStat: number, oppStat: number): number {
    return this.clamp((yourStat - oppStat) / 40, -0.5, 0.5);
  }

  // RNG cap utility to ensure never 100%
  cappedProbability(base: number, cap = 0.95, floor = 0.02): number {
    return this.clamp(base, floor, cap);
  }

  buildThroughBallConfig(params: {
    passer: PlayerLite;
    finisher: PlayerLite;
    opponentDefAvg: number;
    opponentGkDef: number;
  }): ThroughBallConfig {
    const midStat = params.passer.mid;
    
    // Discrete difficulty levels based on MID stat
    let windowWidth: number;
    let sweepSpeed: number;
    
    if (midStat >= 90) {
      // So easy for 90+ MID
      windowWidth = 120;
      sweepSpeed = 1.2;
    } else if (midStat >= 85) {
      // Easy but not so much for 85-89 MID
      windowWidth = 65;
      sweepSpeed = 3;
    } else if (midStat >= 80) {
      // Normal for 80-84 MID
      windowWidth = 60;
      sweepSpeed = 3.5;
    } else {
      // Hard for <80 MID
      windowWidth = 55;
      sweepSpeed = 5.8;
    }

    return {
      passer: params.passer,
      finisher: params.finisher,
      opponentDefAvg: params.opponentDefAvg,
      opponentGkDef: params.opponentGkDef,
      ui: { windowWidth, sweepSpeed }
    };
  }

  computeThroughBallGoalChance(finisherAtt: number, opponentGkDef: number): number {
    const adv = this.advantage(finisherAtt, opponentGkDef);
    const base = 0.55 * (1 + 0.4 * adv);
    return this.cappedProbability(base);
  }

  buildTimedTackleConfig(params: {
    defender: PlayerLite;
    attackerAtt: number;
    gkDef: number;
  }): TimedTackleConfig {
    const adv = this.advantage(params.defender.def, params.attackerAtt);
    // Make tackle much harder - smaller zone and faster swing
    const zoneSize = 0.35 * (1 + 0.3 * adv); // Much smaller zone
    const swingSpeed = 2.0 * (1 - 0.2 * adv); // Much faster swing

    // GK bailout setup
    const gkAdv = this.advantage(params.gkDef, params.attackerAtt);
    const chance = this.cappedProbability(0.35 * (1 + 0.8 * gkAdv), 0.75, 0);
    const saveChance = this.cappedProbability(0.6 + 0.25 * (gkAdv + 0.5));

    return {
      defender: params.defender,
      attackerAtt: params.attackerAtt,
      ui: { zoneSize, swingSpeed },
      gkBailout: { chance, saveChance }
    };
  }

  // Async: get club players from DB and filter by role
  async getPlayersForRoleFromDb(clubId: string, role: 'attack' | 'defend' | 'gk' | 'mid'): Promise<PlayerLite[]> {
    if (!clubId) return [];
    const players = await this.playerDb.getPlayersByClub(clubId);
    
    // First filter to only starters
    const starters = players.filter(p => p.role === 'starter');
    
    // Then filter by position/role
    let filtered = starters;
    if (role === 'attack') {
      filtered = starters.filter(p => p.position === 'ATT' || p.position === 'MID');
    } else if (role === 'defend') {
      filtered = starters.filter(p => p.position === 'DEF');
    } else if (role === 'gk') {
      filtered = starters.filter(p => p.position === 'GK');
    } else if (role === 'mid') {
      filtered = starters.filter(p => p.position === 'MID');
    }
    
    // Map to PlayerLite
    const mapped: PlayerLite[] = filtered.map((p, idx) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      att: p.att,
      mid: p.mid,
      def: p.def,
    }));
    
    console.log(`🎯 MiniGameService - getPlayersForRoleFromDb for role '${role}':`, mapped.map(p => `${p.name} (ID:${p.id})`));
    
    // Shuffle deterministically-ish
    for (let i = mapped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
    }
    
    console.log(`🎯 MiniGameService - After shuffle:`, mapped.map(p => `${p.name} (ID:${p.id})`));
    return mapped;
  }

  // Get opponent stats
  getOpponentStats(opponentClubId: string): { attAvg: number; defAvg: number; gkDef: number } {
    // This would normally calculate from opponent's players
    // For now, return some realistic values
    return {
      attAvg: 82,
      defAvg: 78,
      gkDef: 85
    };
  }

  // Get goalkeeper dive mini-game
  getGoalkeeperDiveMiniGame(goalkeeper: PlayerLite, opponentAttacker: PlayerLite, opponentTeamId: string) {
    const diveSpots = this.generateDiveSpots(goalkeeper, opponentAttacker);
    
    return {
      component: DefendGoalkeeperDiveComponent,
      config: {
        goalkeeper,
        opponentAttacker,
        opponentTeamId,
        diveSpots
      } as GoalkeeperDiveConfig
    };
  }

  private generateDiveSpots(goalkeeper: PlayerLite, opponentAttacker: PlayerLite): boolean[] {
    const totalSpots = 9;
    const gkDef = goalkeeper.def;
    const attackerAtt = opponentAttacker.att;
    
    // Calculate diving chance (goalkeeper advantage: 55% base)
    const statDifference = gkDef - attackerAtt;
    const baseChance = 55 + (statDifference * 4); // Each stat point = 4% chance
    const divingChance = Math.max(15, Math.min(95, baseChance)) / 100;
    
    const saveSpots = Math.round(totalSpots * divingChance);
    
    // Create array with save spots
    const spots = Array.from({ length: totalSpots }, (_, i) => i < saveSpots);
    
    // Shuffle the array
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    
    return spots;
  }

  // Get random dot dive mini-game
  getRandomDotDiveMiniGame(goalkeeper: PlayerLite, opponentAttacker: PlayerLite, opponentTeamId: string) {
    return {
      component: DefendRandomDotDiveComponent,
      config: {
        goalkeeper,
        opponentAttacker,
        opponentTeamId
      } as RandomDotDiveConfig
    };
  }
}


