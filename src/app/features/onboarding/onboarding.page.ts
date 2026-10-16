import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { OnboardingService } from '../../core/onboarding.service';
import { ArtComponent, ArtKind } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

interface Slide { art: ArtKind | 'logo'; title: string; body: string; }

@Component({ selector:'app-onboarding', imports:[IonContent,IonButton,ArtComponent,PressDirective], templateUrl:'./onboarding.page.html', styleUrls:['./onboarding.page.scss'] })
export class OnboardingPage {
  private router = inject(Router); private onboarding = inject(OnboardingService);
  private track = viewChild.required<ElementRef<HTMLElement>>('track');
  readonly slides: Slide[] = [
    { art:'logo', title:'Welcome to DonorLink', body:'Connecting donors. Saving lives. Find volunteer blood donors across Pakistan when every minute counts.' },
    { art:'search', title:'Find donors near you', body:'Pick the blood group you need and your city to see volunteers who chose to be listed.' },
    { art:'privacy', title:'Your details stay private', body:'Phone numbers and emails are never shown in search. You decide if and when you’re listed as a donor.' },
    { art:'care', title:'Give with confidence', body:'Blood group alone doesn’t confirm someone can donate. Always confirm with the hospital or blood bank.' },
  ];
  index = signal(0);
  get last() { return this.index() === this.slides.length - 1; }

  onScroll() { const el = this.track().nativeElement; this.index.set(Math.round(el.scrollLeft / el.clientWidth)); }
  go(i: number) { const el = this.track().nativeElement; el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); this.index.set(i); }
  next() { this.go(Math.min(this.index() + 1, this.slides.length - 1)); }
  async finish(path: '/register' | '/login') { await this.onboarding.complete(); await this.router.navigateByUrl(path, { replaceUrl: true }); }
}
