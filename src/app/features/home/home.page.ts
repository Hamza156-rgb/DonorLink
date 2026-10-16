import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLink } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForward, chatbubblesOutline, informationCircleOutline, lockClosed, medkitOutline, searchOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { BLOOD_GROUPS } from '../../core/models';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

@Component({ selector:'app-home', imports:[IonContent,IonButton,IonIcon,IonRouterLink,RouterLink,ArtComponent,PressDirective], templateUrl:'./home.page.html', styleUrls:['./home.page.scss'] })
export class HomePage {
  private user = toSignal(inject(AuthService).user$);
  groups = BLOOD_GROUPS;
  firstName = computed(() => (this.user()?.displayName ?? '').trim().split(/\s+/)[0] || 'there');
  initials = computed(() => (this.user()?.displayName ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''));
  greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  steps = [
    { icon: 'search-outline', title: 'Search', body: 'Choose a blood group and city to see listed volunteers.' },
    { icon: 'chatbubbles-outline', title: 'Request contact', body: 'Donors decide whether to share their details with you.' },
    { icon: 'medkit-outline', title: 'Confirm with the hospital', body: 'The hospital or blood bank confirms who can donate.' },
  ];
  constructor() { addIcons({ arrowForward, chatbubblesOutline, informationCircleOutline, lockClosed, medkitOutline, searchOutline }); }
}
