import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExitComponent } from './exit/exit.component';
import { OptionsComponent } from './options/options.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'options', component: OptionsComponent },
  { path: 'exit', component: ExitComponent },
];
