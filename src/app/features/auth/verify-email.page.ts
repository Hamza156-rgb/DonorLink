import { Component, OnDestroy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cloudOfflineOutline, informationCircle } from 'ionicons/icons';
import { ArtComponent } from '../../shared/art.component';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { PressDirective } from '../../shared/press.directive';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { NetworkService } from '../../core/network.service';
import { OnboardingService } from '../../core/onboarding.service';

const COOLDOWN_S = 60;

@Component({ selector:'app-verify-email', imports:[IonContent,IonIcon,IonButton,IonSpinner,ArtComponent,AuthHeroComponent,PressDirective], templateUrl:'./verify-email.page.html' })
export class VerifyEmailPage implements OnDestroy {
  private auth = inject(AuthService); private router = inject(Router); private onboarding = inject(OnboardingService);
  readonly net = inject(NetworkService);
  user = toSignal(this.auth.user$);
  checking = signal(false); sending = signal(false); error = signal(''); info = signal(''); cooldown = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  /** Local emulators never send real email; offer a one-tap verify. Never true in production builds. */
  readonly devVerify = environment.useEmulators;
  constructor() { addIcons({ alertCircle, cloudOfflineOutline, informationCircle }); }

  async check() {
    if (this.checking()) return;
    this.checking.set(true); this.error.set(''); this.info.set('');
    try {
      if (await this.auth.refreshVerified())
        await this.router.navigateByUrl((await this.onboarding.hasDonorIntent()) ? '/tabs/account/donor?setup=1' : '/tabs/home', { replaceUrl: true });
      else this.error.set('Your email isn’t verified yet. Open the link we sent you, then try again.');
    } catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.checking.set(false); }
  }
  /** Emulator only: open the verification link the Auth emulator generated, then continue. */
  async verifyLocally() {
    const email = this.user()?.email; if (!email) return;
    this.error.set(''); this.info.set('');
    try {
      const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${environment.firebase.projectId}/oobCodes`);
      const link = ((await res.json()).oobCodes as { email: string; requestType: string; oobLink: string }[])
        .filter(c => c.email === email && c.requestType === 'VERIFY_EMAIL').pop()?.oobLink;
      if (!link) { this.error.set('No verification link found. Tap “Resend email” first.'); return; }
      await fetch(link);
      await this.check();
    } catch { this.error.set('Couldn’t reach the local Auth emulator. Is “npm run emulators” running?'); }
  }
  async resend() {
    if (this.sending() || this.cooldown()) return;
    this.sending.set(true); this.error.set(''); this.info.set('');
    try { await this.auth.resendVerification(); this.info.set('We sent a new link. Check your inbox and spam folder.'); this.startCooldown(); }
    catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.sending.set(false); }
  }
  async signOut() { await this.auth.logout(); await this.router.navigateByUrl('/login', { replaceUrl: true }); }
  private startCooldown() {
    this.cooldown.set(COOLDOWN_S); clearInterval(this.timer);
    this.timer = setInterval(() => { this.cooldown.update(s => s - 1); if (!this.cooldown()) clearInterval(this.timer); }, 1000);
  }
  ngOnDestroy() { clearInterval(this.timer); }
}
