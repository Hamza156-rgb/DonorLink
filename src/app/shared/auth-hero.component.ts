import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack } from 'ionicons/icons';

/** Navy brand header used by the sign-in / sign-up screens; the form sheet overlaps its bottom edge. */
@Component({
  selector: 'app-auth-hero',
  imports: [IonIcon, IonRouterLinkWithHref, RouterLink],
  template: `
  <header class="dl-hero">
    <div class="dl-hero-top">
      @if (back()) { <a class="dl-icon-btn" [routerLink]="back()" routerDirection="back" aria-label="Back"><ion-icon name="chevron-back" /></a> }
      @else { <span></span> }
    </div>
    <div class="dl-logo-badge lg"><img src="assets/brand/logo-mark.png" alt="DonorLink" width="62" height="60" /></div>
    <h1>{{ heading() }}</h1>
    @if (sub()) { <p>{{ sub() }}</p> }
  </header>`,
})
export class AuthHeroComponent {
  readonly heading = input.required<string>();
  readonly sub = input('');
  readonly back = input<string | null>(null);
  constructor() { addIcons({ chevronBack }); }
}
