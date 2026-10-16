import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonInputPasswordToggle, IonRouterLink, IonSelect, IonSelectOption, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, callOutline, cloudOfflineOutline, lockClosedOutline, mailOutline, personOutline, shieldCheckmark } from 'ionicons/icons';
import { AuthHeroComponent } from '../../shared/auth-hero.component';
import { PressDirective } from '../../shared/press.directive';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { PREFERRED_CONTACT, PREFERRED_CONTACT_LABEL, PreferredContact } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { emailValidator, normalizePkMobile, pkMobileValidator } from '../../core/validators';

@Component({ selector:'app-register', imports:[IonContent,IonIcon,IonInput,IonInputPasswordToggle,IonSelect,IonSelectOption,IonButton,IonSpinner,IonRouterLink,RouterLink,ReactiveFormsModule,AuthHeroComponent,PressDirective], templateUrl:'./register.page.html' })
export class RegisterPage {
  private auth = inject(AuthService); private router = inject(Router);
  readonly net = inject(NetworkService);
  contacts = PREFERRED_CONTACT; contactLabel = PREFERRED_CONTACT_LABEL;
  form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, emailValidator]],
    phone: ['', [Validators.required, pkMobileValidator]],
    preferredContact: ['in_app' as PreferredContact, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  busy = signal(false); error = signal('');
  constructor() { addIcons({ alertCircle, callOutline, cloudOfflineOutline, lockClosedOutline, mailOutline, personOutline, shieldCheckmark }); }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true); this.error.set('');
    const v = this.form.getRawValue();
    try {
      await this.auth.register({ ...v, fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(), phone: normalizePkMobile(v.phone)! });
      await this.router.navigateByUrl('/verify-email', { replaceUrl: true });
    } catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
}
