import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UiSoundDirective } from '../sound/ui-sound.directive';

@Component({
  selector: 'app-scene',
  standalone: true,
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css'],
  imports: [CommonModule, RouterModule, UiSoundDirective]
})
export class SceneComponent {
  private route = inject(ActivatedRoute);

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
}
