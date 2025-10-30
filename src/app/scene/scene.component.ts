import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { UiSoundDirective } from '../sound/ui-sound.directive';
import { GameStateService } from '../game/game-state.service';

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css'],
  imports: [CommonModule, RouterModule, UiSoundDirective]
})
export class SceneComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameState = inject(GameStateService);

  readonly clubId = signal<string>('');

  // Map club id to theme image in public/Inner-Themes
  private readonly idToThemeFilename: Record<string, string> = {
    'barcelona': 'Barcelona.jpeg',
    'real-madrid': 'Real-Madrid.jpeg',
    'arsenal': 'Arsenal.jpeg',
    'chelsea': 'Chelsea.jpeg',
    'man-city': 'Man-City.jpeg',
    'man-united': 'Man-United.jpeg',
    'liverpool': 'Liverpool.jpeg',
    'tottenham': 'Tottenham.jpeg',
    'inter-milan': 'Inter-Milan.jpeg',
    'ac-milan': 'AC Milan.jpeg',
    'bayern': 'Bayern.jpeg',
    'psg': 'psg.jpeg'
  };

  readonly sceneSrc = computed(() => {
    const id = this.clubId();
    const file = this.idToThemeFilename[id];
    return file ? `/Inner-Themes/${file}` : '/images/ICON.png';
  });

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id') || '';
      this.clubId.set(id);
    });
  }

  ngOnInit() {
    // Set the selected club in game state
    const clubId = this.clubId();
    
    if (clubId) {
      const club = this.getClubById(clubId);
      
      if (club) {
        this.gameState.selectClub(club);
      }
    }

    // Navigate to dashboard after animation completes (1800ms + 200ms buffer)
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 2000);
  }

  private getClubById(id: string) {
    const clubs = [
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
    return clubs.find(club => club.id === id);
  }
}
