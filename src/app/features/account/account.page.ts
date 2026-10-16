import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLink } from '@ionic/angular';
import { ArtComponent } from '../../shared/art.component';
import { addIcons } from 'ionicons';
import { alertCircle, chevronForward, heart, water, callOutline, chatbubblesOutline, checkmarkCircle, informationCircleOutline, logOutOutline, mailOutline, person, personOutline, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { PREFERRED_CONTACT_LABEL, PrivateProfile } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { DonorProfileService } from '../../core/donor-profile.service';
import { AVAILABILITY_LABEL } from '../../core/models';
import { environment } from '../../../environments/environment';
import { PressDirective } from '../../shared/press.directive';

@Component({ selector:'app-account', imports:[IonContent,IonButton,IonIcon,IonRouterLink,RouterLink,DatePipe,ArtComponent,PressDirective], templateUrl:'./account.page.html', styleUrls:['./account.page.scss'] })
export class AccountPage {
  private auth = inject(AuthService); private profiles = inject(ProfileService); private router = inject(Router);
  user = toSignal(this.auth.user$);
  donor = toSignal(inject(DonorProfileService).mine$);   // undefined = loading, null = not a donor
  availabilityLabel = AVAILABILITY_LABEL;
  profile = signal<PrivateProfile | null>(null); loading = signal(true); error = signal('');
  contactLabel = PREFERRED_CONTACT_LABEL; version = environment.appVersion;
  guest = computed(() => !!this.user()?.isAnonymous);
  initials = computed(() => (this.user()?.displayName ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''));
  phoneDisplay = computed(() => { const p = this.profile()?.phone; return p ? `0${p.slice(3, 6)} ${p.slice(6)}` : 'Not added'; });

  constructor() {
    addIcons({ alertCircle, chevronForward, heart, water, callOutline, chatbubblesOutline, checkmarkCircle, informationCircleOutline, logOutOutline, mailOutline, person, personOutline, shieldCheckmark });
    effect(() => { const u = this.user(); if (u && !u.isAnonymous) this.load(u.uid); });
  }
  async load(uid: string) {
    this.loading.set(true); this.error.set('');
    try { this.profile.set(await this.profiles.getMine(uid)); }
    catch { this.error.set('Couldn’t load your details. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }
  async signOut() { await this.auth.logout(); await this.router.navigateByUrl('/login', { replaceUrl: true }); }
  readonly perks = ['Contact donors who match your need', 'List yourself as a donor', 'Keep your details in one place'];
}
