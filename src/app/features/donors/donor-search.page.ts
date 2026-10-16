import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QueryDocumentSnapshot } from '@angular/fire/firestore';
import { IonButton, IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonToggle, RefresherCustomEvent, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, cloudOfflineOutline, informationCircleOutline, locationOutline, refresh, shieldCheckmark } from 'ionicons/icons';
import { DonorService } from './donor.service';
import { AuthService } from '../../core/auth.service';
import { BLOOD_GROUPS, BloodGroup, PK_CITIES, PublicDonor } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

@Component({ selector:'app-donor-search', imports:[IonContent,IonRefresher,IonRefresherContent,IonSelect,IonSelectOption,IonToggle,IonButton,IonIcon,FormsModule,ArtComponent,PressDirective], templateUrl:'./donor-search.page.html', styleUrls:['./donor-search.page.scss'] })
export class DonorSearchPage {
  private svc = inject(DonorService); private toast = inject(ToastController); private alert = inject(AlertController);
  private auth = inject(AuthService); private router = inject(Router);
  readonly net = inject(NetworkService);
  /** ?group=O%2B from the home screen shortcuts. */
  readonly group = input<string>('');
  groups = BLOOD_GROUPS; cities = Object.values(PK_CITIES).flat().sort();
  selected = signal<BloodGroup | null>(null); city = ''; availableOnly = true;
  items = signal<PublicDonor[]>([]); loading = signal(false); error = signal(''); searched = signal(false); more = signal(false);
  private cursor: QueryDocumentSnapshot | null = null;

  constructor() {
    addIcons({ alertCircle, cloudOfflineOutline, informationCircleOutline, locationOutline, refresh, shieldCheckmark });
    effect(() => {
      const g = this.group() as BloodGroup;
      if ((BLOOD_GROUPS as readonly string[]).includes(g)) untracked(() => { if (this.selected() !== g) this.pick(g); });
    });
  }

  async run(reset = true) {
    const g = this.selected(); if (!g || this.loading()) return;
    if (reset) { this.cursor = null; this.items.set([]); }
    this.loading.set(true); this.error.set('');
    try {
      const p = await this.svc.search({ bloodGroup: g, city: this.city || undefined, availableOnly: this.availableOnly }, this.cursor);
      this.items.update(x => [...x, ...p.items]); this.cursor = p.cursor; this.more.set(p.items.length === 15); this.searched.set(true);
    } catch { this.error.set('Could not load donors. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }
  async refresh(e: Event) { await this.run(); (e as RefresherCustomEvent).target.complete(); }
  pick(g: BloodGroup) { this.selected.set(g); this.run(); }
  initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''); }
  /** The contact workflow is the next module; say so plainly instead of a dead link. */
  async requestContact(d: PublicDonor) {
    if (this.auth.current?.isAnonymous) return this.askToSignUp(d);
    const t = await this.toast.create({ message: `Contact requests are coming in the next update. ${d.displayName} hasn’t been notified.`, duration: 3000, position: 'top', color: 'secondary' });
    await t.present();
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
