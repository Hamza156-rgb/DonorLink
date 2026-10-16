import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'onboarding.done';

/** Remembers that the intro slides were seen (native storage on devices, localStorage on web). */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  async isDone(): Promise<boolean> {
    try { return (await Preferences.get({ key: KEY })).value === '1'; } catch { return false; }
  }
  async complete(): Promise<void> {
    try { await Preferences.set({ key: KEY, value: '1' }); } catch { /* storage blocked: show slides again next time */ }
  }
}
