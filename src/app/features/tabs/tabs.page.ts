import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { home, homeOutline, personCircle, personCircleOutline, search, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
  <ion-tabs>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home"><ion-icon name="home-outline" aria-hidden="true" /><ion-label>Home</ion-label></ion-tab-button>
      <ion-tab-button tab="donors"><ion-icon name="search-outline" aria-hidden="true" /><ion-label>Find donors</ion-label></ion-tab-button>
      <ion-tab-button tab="account"><ion-icon name="person-circle-outline" aria-hidden="true" /><ion-label>Account</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>`,
})
export class TabsPage {
  constructor() { addIcons({ home, homeOutline, search, searchOutline, personCircle, personCircleOutline }); }
}
