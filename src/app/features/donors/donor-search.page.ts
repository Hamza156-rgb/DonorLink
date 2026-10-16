import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QueryDocumentSnapshot } from '@angular/fire/firestore';
import { IonButton, IonContent, IonIcon, IonRefresher, IonRefresherContent, IonToggle, RefresherCustomEvent, AlertController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cloudOfflineOutline, informationCircleOutline, locationOutline, refresh, shieldCheckmark } from 'ionicons/icons';
import { DonorService } from './donor.service';
import { ContactRequestComponent } from '../contact/contact-request.modal';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { BLOOD_GROUPS, BloodGroup, PublicDonor } from '../../core/models';
import { CityPickerComponent } from '../../shared/city-picker.component';
import { NetworkService } from '../../core/network.service';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

@Component({ selector:'app-donor-search', imports:[IonContent,IonRefresher,IonRefresherContent,CityPickerComponent,IonToggle,IonButton,IonIcon,FormsModule,ArtComponent,PressDirective], templateUrl:'./donor-search.page.html', styleUrls:['./donor-search.page.scss'] })
export class DonorSearchPage {
  private svc = inject(DonorService); private modal = inject(ModalController); private alert = inject(AlertController);
  private auth = inject(AuthService); private router = inject(Router);
  readonly net = inject(NetworkService);
  /** ?group=O%2B from the home screen shortcuts. */
  readonly group = input<string>('');
  groups = BLOOD_GROUPS;
  selected = signal<BloodGroup | null>(null); city = ''; availableOnly = true;
  items = signal<PublicDonor[]>([]); loading = signal(false); error = signal(''); searched = signal(false); more = signal(false);
  private cursor: QueryDocumentSnapshot | null = null;

  constructor() {
    addIcons({ alertCircle, cloudOfflineOutline, informationCircleOutline, locationOutline, refresh, shieldCheckmark });
    effect(() => {
      const g = this.group() as BloodGroup;
      if ((BLOOD_GROUPS as readonly string[]).includes(g)) untracked(() => { if (this.selected() !== g) this.pick(g); });
      else untracked(() => { if (!this.searched() && !this.loading()) this.run(); });   // open with all donors listed
    });
  }

  async run(reset = true) {
    const g = this.selected() ?? undefined; if (this.loading()) return;
    if (reset) { this.cursor = null; this.items.set([]); }
    this.loading.set(true); this.error.set('');
    try {
      const p = await this.svc.search({ bloodGroup: g, city: this.city || undefined, availableOnly: this.availableOnly }, this.cursor);
      this.items.update(x => [...x, ...p.items]); this.cursor = p.cursor; this.more.set(p.items.length === 15); this.searched.set(true);
    } catch { this.error.set('Could not load donors. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }
  async refresh(e: Event) { await this.run(); (e as RefresherCustomEvent).target.complete(); }
  /** Tapping the selected group again clears it (all groups). */
  pick(g: BloodGroup) { this.selected.set(this.selected() === g ? null : g); this.run(); }
  initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''); }
  async requestContact(d: PublicDonor) {
    if (!environment.features.contact) return this.contactUnavailable();
    if (this.auth.current?.isAnonymous) return this.askToSignUp(d);
    const m = await this.modal.create({ component: ContactRequestComponent, componentProps: { donor: d, neededGroup: this.selected() }, initialBreakpoint: 1, breakpoints: [0, 1] });
    await m.present();
  }
  isMe(d: PublicDonor) { return d.uid === this.auth.current?.uid; }
  /** Production on the free plan has no Cloud Functions yet; say so instead of failing. */
  private async contactUnavailable() {
    const a = await this.alert.create({ header: 'Contact requests are coming soon',
      message: 'You can search donors now. Sending contact requests will be switched on shortly. In an emergency, contact the hospital blood bank directly.', buttons: ['OK'] });
    await a.present();
  }
  /** Contact needs a verified account (enforced in createContactRequest); explain why, then offer the way in. */
  private async askToSignUp(d: PublicDonor) {
    const a = await this.alert.create({
      header: 'Create a free account to contact donors',
      message: `To protect donors like ${d.displayName}, only verified members can send contact requests. It takes about a minute.`,
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Sign in', handler: () => { this.router.navigateByUrl('/login'); } },
        { text: 'Create account', handler: () => { this.router.navigateByUrl('/register'); } },
      ],
    });
    await a.present();
  }
}
