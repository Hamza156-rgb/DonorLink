import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Every screen starts with a navy header, so status bar icons are light.
    if (Capacitor.isNativePlatform()) StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    // Hand off from the native/web splash once the first screen has rendered.
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), take(1)).subscribe(() => {
      if (Capacitor.isNativePlatform()) SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
      const boot = document.getElementById('dl-boot');
      if (boot) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 400); }
    });
  }
}
