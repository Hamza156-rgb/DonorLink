import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, homeOutline, personCircleOutline, searchOutline } from 'ionicons/icons';
import { ContactService } from '../../core/contact.service';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  styles: [`ion-badge{--background:var(--bd-red);--color:var(--bd-on-brand);font-size:.65rem;min-width:18px}`],
  template: `
  <ion-tabs>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home"><ion-icon name="home-outline" aria-hidden="true" /><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="donors"><ion-icon name="search-outline" aria-hidden="true" /><ion-label>Find donors</ion-label></ion-tab-button>
      <ion-tab-button tab="requests">
        <ion-icon name="chatbubbles-outline" aria-hidden="true" /><ion-label>Requests</ion-label>
        @if (pending()) { <ion-badge [attr.aria-label]="pending() + ' new requests'">{{ pending() }}</ion-badge> }
      </ion-tab-button>
      <ion-tab-button tab="account"><ion-icon name="person-circle-outline" aria-hidden="true" /><ion-label>Account</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>`,
})
export class TabsPage {
  /** Pending requests waiting for this donor's answer. */
  pending = toSignal(inject(ContactService).pendingReceived$, { initialValue: 0 });
  constructor() { addIcons({ chatbubblesOutline, homeOutline, personCircleOutline, searchOutline }); }
}
