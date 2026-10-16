import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonContent, IonIcon, IonInput, IonSpinner, IonToggle, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, chevronBack, cloudOfflineOutline, informationCircleOutline, locationOutline, lockClosed, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { DonorProfileService, publicName } from '../../core/donor-profile.service';
import { AVAILABILITY, AVAILABILITY_LABEL, Availability, BLOOD_GROUPS, BloodGroup, CITY_PROVINCE } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { OnboardingService } from '../../core/onboarding.service';
import { CityPickerComponent } from '../../shared/city-picker.component';
import { PressDirective } from '../../shared/press.directive';
import { SegComponent, SegOption } from '../../shared/seg.component';
import { TiltDirective } from '../../shared/tilt.directive';

@Component({ selector:'app-donor-profile', imports:[IonContent,IonButton,IonIcon,IonInput,IonSpinner,SegComponent,TiltDirective,IonToggle,FormsModule,CityPickerComponent,PressDirective], templateUrl:'./donor-profile.page.html', styleUrls:['./donor-profile.page.scss'] })
export class DonorProfilePage {
  private auth = inject(AuthService); private donors = inject(DonorProfileService); private onboarding = inject(OnboardingService);
  private router = inject(Router); private toast = inject(ToastController); private alert = inject(AlertController);
  readonly net = inject(NetworkService);
  /** ?setup=1 right after sign-up ("Step 2 of 2"). */
  readonly setup = input<string>('');
  private user = toSignal(this.auth.user$);
  mine = toSignal(this.donors.mine$);           // undefined = loading
  groups = BLOOD_GROUPS; availabilities = AVAILABILITY; availabilityLabel = AVAILABILITY_LABEL;
  availabilityOptions: SegOption[] = AVAILABILITY.map(a => ({ value: a, label: AVAILABILITY_LABEL[a] }));

  displayName = ''; bloodGroup = signal<BloodGroup | null>(null); city = ''; availability: Availability = 'available'; discoverable = true;
  busy = signal(false); error = signal(''); touched = signal(false);
  isNew = computed(() => this.mine() === null);
  private loaded = false;

  constructor() {
    addIcons({ alertCircle, chevronBack, cloudOfflineOutline, informationCircleOutline, locationOutline, lockClosed, shieldCheckmark });
    // Fill the form once: from the existing listing, or sensible defaults for a new donor.
    effect(() => {
      const m = this.mine(), u = this.user();
      if (m === undefined || !u || this.loaded) return;
      untracked(() => {
        this.loaded = true;
        if (m) { this.displayName = m.displayName; this.bloodGroup.set(m.bloodGroup); this.city = m.city; this.availability = m.availability; this.discoverable = m.discoverable ?? true; }
        else this.displayName = publicName(u.displayName ?? '');
      });
    });
  }
  get nameError() { const n = this.displayName.trim(); return n.length < 2 || n.length > 40 ? 'Use 2 to 40 characters, e.g. Hamza W.' : ''; }
  initials() { return this.displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'; }
  province() { return CITY_PROVINCE[this.city] ?? ''; }

  async save() {
    this.touched.set(true); this.error.set('');
    const u = this.user(); const g = this.bloodGroup();
    if (!u || this.nameError || !g || !this.city) { this.error.set(!g ? 'Choose your blood group.' : !this.city ? 'Choose your city.' : this.nameError); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true);
    try {
      await this.donors.save(u.uid, { displayName: this.displayName.trim(), bloodGroup: g, city: this.city, province: this.province(), availability: this.availability, discoverable: this.discoverable }, this.mine()?.verified ?? false);
      await this.onboarding.setDonorIntent(false);
      await (await this.toast.create({ message: this.discoverable ? 'Saved. You’re listed in donor search.' : 'Saved. You’re hidden from donor search.', duration: 2500, position: 'top', color: 'secondary' })).present();
      await this.router.navigateByUrl(this.setup() ? '/tabs/home' : '/tabs/account', { replaceUrl: true });
    } catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
  async removeListing() {
    const a = await this.alert.create({ header: 'Remove your donor profile?', message: 'You’ll disappear from donor search. Requests already shared stay with the people you accepted.',
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Remove', role: 'destructive' }] });
    await a.present();
    if ((await a.onDidDismiss()).role !== 'destructive') return;
    try { await this.donors.remove(this.user()!.uid); await this.router.navigateByUrl('/tabs/account', { replaceUrl: true }); }
    catch (e) { this.error.set(authErrorMessage(e)); }
  }
  back() { return this.router.navigateByUrl(this.setup() ? '/tabs/home' : '/tabs/account'); }
}
