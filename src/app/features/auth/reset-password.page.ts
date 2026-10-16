import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonRouterLink, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cloudOfflineOutline, mailOutline } from 'ionicons/icons';
import { ArtComponent } from '../../shared/art.component';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { PressDirective } from '../../shared/press.directive';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { NetworkService } from '../../core/network.service';
import { emailValidator } from '../../core/validators';

@Component({ selector:'app-reset-password', imports:[IonContent,IonIcon,IonInput,IonButton,IonSpinner,IonRouterLink,RouterLink,ReactiveFormsModule,ArtComponent,AuthHeroComponent,PressDirective], templateUrl:'./reset-password.page.html' })
export class ResetPasswordPage implements OnInit {
  private auth = inject(AuthService);
  readonly net = inject(NetworkService);
  readonly email = input<string>();
  form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, emailValidator]] });
  busy = signal(false); error = signal(''); sentTo = signal('');
  constructor() { addIcons({ alertCircle, cloudOfflineOutline, mailOutline }); }

  ngOnInit() { if (this.email()) this.form.controls.email.setValue(this.email()!); }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true); this.error.set('');
    const email = this.form.getRawValue().email.trim().toLowerCase();
    try { await this.auth.resetPassword(email); this.sentTo.set(email); }
    catch (e) {
      // Same answer whether or not the account exists, so this screen can't be used to find accounts.
      if ((e as { code?: string })?.code === 'auth/user-not-found') this.sentTo.set(email); else this.error.set(authErrorMessage(e));
    }
    finally { this.busy.set(false); }
  }
}
