import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-minigame-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="host" *ngIf="visible">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .host { position: absolute; inset: 0; z-index: 2000; display:flex; align-items:flex-end; justify-content:center; padding-bottom: 30vh; }
  `]
})
export class MiniGameHostComponent {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
}


