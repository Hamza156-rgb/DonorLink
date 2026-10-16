import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'onboarding.done';
const DONOR = 'onboarding.donorIntent';

/** Remembers that the intro slides were seen (native storage on devices, localStorage on web). */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  async isDone(): Promise<boolean> {
    try { return (await Preferences.get({ key: KEY })).value === '1'; } catch { return false; }
  }
  /** Set when someone chose "I want to donate"; after email verification they go straight to donor profile setup. */
  async setDonorIntent(on: boolean): Promise<void> {
    try { on ? await Preferences.set({ key: DONOR, value: '1' }) : await Preferences.remove({ key: DONOR }); } catch { /* best effort */ }
  }
  async hasDonorIntent(): Promise<boolean> {
    try { return (await Preferences.get({ key: DONOR })).value === '1'; } catch { return false; }
  }
  async complete(): Promise<void> {
    try { await Preferences.set({ key: KEY, value: '1' }); } catch { /* storage blocked: show slides again next time */ }
  }
}
