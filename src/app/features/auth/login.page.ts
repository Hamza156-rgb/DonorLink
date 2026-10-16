import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonInputPasswordToggle, IonRouterLink, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cloudOfflineOutline, lockClosedOutline, mailOutline, water } from 'ionicons/icons';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { PressDirective } from '../../shared/press.directive';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { NetworkService } from '../../core/network.service';
import { emailValidator, safeReturnUrl } from '../../core/validators';

@Component({ selector:'app-login', imports:[IonContent,IonIcon,IonInput,IonInputPasswordToggle,IonButton,IonSpinner,IonRouterLink,RouterLink,ReactiveFormsModule,AuthHeroComponent,PressDirective], templateUrl:'./login.page.html' })
export class LoginPage {
  private auth = inject(AuthService); private router = inject(Router);
  readonly net = inject(NetworkService);
  readonly returnUrl = input<string>();
  form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, emailValidator]], password: ['', Validators.required] });
  busy = signal(false); guestBusy = signal(false); error = signal('');
  constructor() { addIcons({ alertCircle, cloudOfflineOutline, lockClosedOutline, mailOutline, water }); }

  /** People who need blood can search right away, without an account. */
  async searchAsGuest() {
    if (this.guestBusy()) return;
    this.guestBusy.set(true); this.error.set('');
    try { await this.auth.continueAsGuest(); await this.router.navigateByUrl('/tabs/donors', { replaceUrl: true }); }
    catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.guestBusy.set(false); }
  }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true); this.error.set('');
    const { email, password } = this.form.getRawValue();
    try {
      const u = await this.auth.login(email.trim().toLowerCase(), password);
      await this.router.navigateByUrl(u.emailVerified ? safeReturnUrl(this.returnUrl()) : '/verify-email', { replaceUrl: true });
    } catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
}
