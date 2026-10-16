import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonContent, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, heart, informationCircleOutline, water } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { OnboardingService } from '../../core/onboarding.service';
import { ArtComponent, ArtKind } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

interface Slide { art: ArtKind | 'logo' | 'choice'; title: string; body: string; }

@Component({ selector:'app-onboarding', imports:[IonContent,IonButton,IonIcon,IonSpinner,ArtComponent,PressDirective], templateUrl:'./onboarding.page.html', styleUrls:['./onboarding.page.scss'] })
export class OnboardingPage {
  private router = inject(Router); private onboarding = inject(OnboardingService); private auth = inject(AuthService);
  private track = viewChild.required<ElementRef<HTMLElement>>('track');
  readonly slides: Slide[] = [
    { art:'logo', title:'Welcome to DonorLink', body:'Connecting donors. Saving lives. Find volunteer blood donors across Pakistan when every minute counts.' },
    { art:'search', title:'Find donors in minutes', body:'Pick the blood group you need and your city. No account needed to search.' },
    { art:'privacy', title:'Donors stay protected', body:'Phone numbers and emails are never shown in search. Donors choose who can reach them.' },
    { art:'choice', title:'How can we help you today?', body:'Blood group alone doesn’t confirm someone can donate. Always confirm with the hospital or blood bank.' },
  ];
  index = signal(0); busy = signal(false); error = signal('');
  get last() { return this.index() === this.slides.length - 1; }

  constructor() { addIcons({ chevronForward, heart, informationCircleOutline, water }); }
  onScroll() { const el = this.track().nativeElement; this.index.set(Math.round(el.scrollLeft / el.clientWidth)); }
  go(i: number) { const el = this.track().nativeElement; el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); this.index.set(i); }
  next() { this.go(Math.min(this.index() + 1, this.slides.length - 1)); }

  /** "I need blood": straight to search as a guest. */
  async needBlood() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.auth.continueAsGuest(); await this.onboarding.complete(); await this.router.navigateByUrl('/tabs/donors', { replaceUrl: true }); }
    catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
  /** "I want to donate": donors need a verified account to be listed. */
  async donate() { await this.onboarding.complete(); await this.router.navigate(['/register'], { queryParams: { intent: 'donor' }, replaceUrl: true }); }
  async signIn() { await this.onboarding.complete(); await this.router.navigateByUrl('/login', { replaceUrl: true }); }
}
