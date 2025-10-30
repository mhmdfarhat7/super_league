import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerDbService, Player } from '../db/player-db.service';
import { RouterModule } from '@angular/router';

type Club = { id: string; name: string };

@Component({
  selector: 'app-players',
  standalone: true,
  templateUrl: './players.component.html',
  styleUrl: './players.component.css',
  imports: [CommonModule, RouterModule]
})
export class PlayersComponent implements OnInit {
  private db = inject(PlayerDbService);
  clubs = signal<Club[]>([]);
  playersByClub = signal<Record<string, Player[]>>({});

  async ngOnInit() {
    // Known clubs from teams list
    const clubs: Club[] = [
      { id: 'barcelona', name: 'Barcelona' },
      { id: 'real-madrid', name: 'Real Madrid' },
      { id: 'arsenal', name: 'Arsenal' },
      { id: 'chelsea', name: 'Chelsea' },
      { id: 'man-city', name: 'Man City' },
      { id: 'man-united', name: 'Man United' },
      { id: 'liverpool', name: 'Liverpool' },
      { id: 'tottenham', name: 'Tottenham' },
      { id: 'inter-milan', name: 'Inter Milan' },
      { id: 'ac-milan', name: 'AC Milan' },
      { id: 'bayern', name: 'Bayern Munich' },
      { id: 'psg', name: 'PSG' },
    ];

    await this.db.seedIfEmpty(clubs);
    this.clubs.set(clubs);

    const map: Record<string, Player[]> = {};
    for (const c of clubs) {
      map[c.id] = await this.db.getPlayersByClub(c.id);
    }
    this.playersByClub.set(map);
  }
}


