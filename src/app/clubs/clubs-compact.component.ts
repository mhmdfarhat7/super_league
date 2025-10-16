import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Club = { id: string; name: string; badge: string };

@Component({
  selector: 'app-clubs-compact',
  standalone: true,
  templateUrl: './clubs-compact.component.html',
  styleUrl: './clubs-compact.component.css',
  imports: [CommonModule]
})
export class ClubsCompactComponent {
  clubs: Club[] = [
    { id: 'barcelona',   name: 'Barcelona',     badge: '/images/FC_Barcelona_(crest).svg.png' },
    { id: 'real-madrid', name: 'Real Madrid',   badge: '/images/Real_Madrid_CF.svg.png' },
    { id: 'arsenal',     name: 'Arsenal',       badge: '/images/Arsenal_FC.svg.png' },
    { id: 'chelsea',     name: 'Chelsea',       badge: '/images/Chelsea_FC.svg.png' },
    { id: 'man-city',    name: 'Man City',      badge: '/images/Manchester_City_FC_badge.svg.png' },
    { id: 'man-united',  name: 'Man United',    badge: '/images/Manchester_United_FC_crest.png' },
    { id: 'liverpool',   name: 'Liverpool',     badge: '/images/Liverpool_FC.png' },
    { id: 'tottenham',   name: 'Tottenham',     badge: '/images/Tottenham_Hotspur.svg.png' },
    { id: 'inter-milan', name: 'Inter Milan',   badge: '/images/FC_Internazionale_Milano_2021.svg.png' },
    { id: 'ac-milan',    name: 'AC Milan',      badge: '/images/Logo_of_AC_Milan.svg.png' },
    { id: 'bayern',      name: 'Bayern Munich', badge: '/images/FC_Bayern_München_logo_(2024).svg.png' },
    { id: 'psg',         name: 'PSG',           badge: '/images/Paris_Saint-Germain_F.C..svg.png' },
  ];
}


