import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSoundDirective } from '../sound/ui-sound.directive';

type Team = {
  id: string;
  name: string;
  badge: string; // path to image asset
};

@Component({
  selector: 'app-teams',
  standalone: true,
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.css',
  imports: [CommonModule, UiSoundDirective]
})
export class TeamsComponent {
  teams: Team[] = [
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
    { id: 'psg', name: 'PSG', badge: '/images/Paris_Saint-Germain_F.C..svg.png' },
  ];

  private fallbackBadges: Record<string, string[]> = {
    'barcelona': [
      '/images/FC_Barcelona_%28crest%29.svg.png',
      'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg'
    ],
    'real-madrid': [
      'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg'
    ],
    'arsenal': [
      'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg'
    ],
    'inter-milan': [
      '/images/badges/inter.png'
    ],
    'bayern': [
      '/images/FC_Bayern_M%C3%BCnchen_logo_(2024).svg.png',
      '/images/badges/bayern.png'
    ]
  };

  onBadgeError(team: Team, ev: Event) {
    const img = ev.target as HTMLImageElement;
    const fallbacks = this.fallbackBadges[team.id] || [];
    const next = fallbacks.shift();
    if (next) {
      // swap to next fallback and remember it
      team.badge = next;
      img.src = next;
      this.fallbackBadges[team.id] = fallbacks;
    } else {
      // final generic football icon
      const generic = '/images/ICON.png';
      team.badge = generic;
      img.src = generic;
    }
  }
}


