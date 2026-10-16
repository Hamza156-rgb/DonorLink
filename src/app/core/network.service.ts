import { Injectable, signal } from '@angular/core';

/** Browser/WebView connectivity. Screens use it for their offline state. */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }
}
