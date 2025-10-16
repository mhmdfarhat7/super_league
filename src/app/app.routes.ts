import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExitComponent } from './exit/exit.component';
import { OptionsComponent } from './options/options.component';
import { TeamsComponent } from './teams/teams.component';
import { ClubsCompactComponent } from './clubs/clubs-compact.component';
import { SceneComponent } from './scene/scene.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'options', component: OptionsComponent },
  { path: 'exit', component: ExitComponent },
  { path: 'teams', component: TeamsComponent },
  { path: 'clubs', component: ClubsCompactComponent },
  { path: 'scene/:id', component: SceneComponent },
];
