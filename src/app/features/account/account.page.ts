import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, callOutline, chatbubblesOutline, informationCircleOutline, logOutOutline, mailOutline, personOutline, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { PREFERRED_CONTACT_LABEL, PrivateProfile } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { environment } from '../../../environments/environment';
import { PressDirective } from '../../shared/press.directive';

@Component({ selector:'app-account', imports:[IonContent,IonButton,IonIcon,DatePipe,PressDirective], templateUrl:'./account.page.html', styleUrls:['./account.page.scss'] })
export class AccountPage {
  private auth = inject(AuthService); private profiles = inject(ProfileService); private router = inject(Router);
  user = toSignal(this.auth.user$);
  profile = signal<PrivateProfile | null>(null); loading = signal(true); error = signal('');
  contactLabel = PREFERRED_CONTACT_LABEL; version = environment.appVersion;
  initials = computed(() => (this.user()?.displayName ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''));
  phoneDisplay = computed(() => { const p = this.profile()?.phone; return p ? `0${p.slice(3, 6)} ${p.slice(6)}` : 'Not added'; });

  constructor() {
    addIcons({ alertCircle, callOutline, chatbubblesOutline, informationCircleOutline, logOutOutline, mailOutline, personOutline, shieldCheckmark });
    effect(() => { const u = this.user(); if (u) this.load(u.uid); });
  }
  async load(uid: string) {
    this.loading.set(true); this.error.set('');
    try { this.profile.set(await this.profiles.getMine(uid)); }
    catch { this.error.set('Couldn’t load your details. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }
  async signOut() { await this.auth.logout(); await this.router.navigateByUrl('/login', { replaceUrl: true }); }
}
