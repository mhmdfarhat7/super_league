import { Component, OnInit } from '@angular/core';
import { UiSoundDirective } from '../sound/ui-sound.directive';

@Component({
  selector: 'app-exit',
  standalone: true,
  templateUrl: './exit.component.html',
  styleUrl: './exit.component.css',
  imports: [UiSoundDirective]
})
export class ExitComponent implements OnInit {
  ngOnInit(): void {
    // Attempt best-effort close on entry
    this.tryExit();
  }

  tryExit() {
    // Web browsers block closing windows not opened by script.
    // We try a few strategies and then show manual instructions.
    try {
      // Electron preload bridge (if available)
      // @ts-ignore
      if (window?.electron?.exit) {
        // @ts-ignore
        window.electron.exit();
        return;
      }
    } catch {}

    try {
      // Cordova/Capacitor (if packaged as app)
      // @ts-ignore
      const navAny = navigator as any;
      if (navAny?.app?.exitApp) {
        navAny.app.exitApp();
        return;
      }
    } catch {}

    try {
      // Close if opened by script
      window.close();
    } catch {}

    try {
      // Some browsers allow this self-close trick
      window.open('', '_self')?.close();
    } catch {}
  }
}
