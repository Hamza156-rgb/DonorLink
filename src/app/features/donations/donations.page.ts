import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AlertController, NavController, IonButton, IonContent, IonIcon, IonInput, IonRouterLink, ModalController, ToastController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, alertCircle, calendarOutline, checkmarkCircle, chevronBack, cloudOfflineOutline, informationCircleOutline, medkitOutline, timeOutline, trashOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';
import { authErrorMessage } from '../../core/auth-errors';
import { DonationService, addDays, daysUntil, fromDateInput, toDateInput } from '../../core/donation.service';
import { DonorProfileService } from '../../core/donor-profile.service';
import { DEFAULT_REST_DAYS, DonationEntry, isPaused } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';
import { TiltDirective } from '../../shared/tilt.directive';
import { RecordDonationComponent } from './record-donation.modal';

@Component({ selector: 'app-donations', imports: [IonContent, IonButton, IonIcon, IonInput, IonRouterLink, RouterLink, FormsModule, DatePipe, ArtComponent, PressDirective, TiltDirective],
  templateUrl: './donations.page.html', styleUrls: ['./donations.page.scss'] })
export class DonationsPage {
  private svc = inject(DonationService); private modal = inject(ModalController); private alert = inject(AlertController);
  private toast = inject(ToastController); private nav = inject(NavController);
  readonly net = inject(NetworkService);
  loadError = signal(false);
  entries = toSignal(this.svc.entries$.pipe(catchError(() => { this.loadError.set(true); return of([] as DonationEntry[]); })));
  listing = toSignal(inject(DonorProfileService).mine$);
  paused = computed(() => isPaused(this.listing()));
  pausedUntil = computed(() => this.listing()?.pausedUntil?.toDate() ?? null);
  daysLeft = computed(() => { const d = this.pausedUntil(); return d ? daysUntil(d) : 0; });
  /** 0..1 progress through the pause, measured from the latest donation (or a 90-day window if none). */
  progress = computed(() => {
    const until = this.pausedUntil(); if (!until || !this.paused()) return 1;
    const last = this.entries()?.[0]?.donatedOn.toDate();
    const start = last && last < until ? last : addDays(until, -DEFAULT_REST_DAYS);
    const span = until.getTime() - start.getTime();
    return span > 0 ? Math.min(1, Math.max(0, (Date.now() - start.getTime()) / span)) : 1;
  });
  last = computed(() => this.entries()?.[0] ?? null);
  editing = signal(false); newDate = ''; busy = signal(false);
  readonly today = toDateInput(new Date()); readonly maxPause = toDateInput(addDays(new Date(), 365));

  constructor() { addIcons({ add, alertCircle, calendarOutline, checkmarkCircle, chevronBack, cloudOfflineOutline, informationCircleOutline, medkitOutline, timeOutline, trashOutline }); }

  back() { this.nav.back(); }
  async add() {
    const m = await this.modal.create({ component: RecordDonationComponent, componentProps: { hasListing: !!this.listing() }, initialBreakpoint: 1, breakpoints: [0, 1] });
    await m.present();
    if ((await m.onDidDismiss()).data) this.say('Donation saved. Thank you.');
  }
  startEdit() { this.newDate = toDateInput(this.pausedUntil() ?? addDays(new Date(), DEFAULT_REST_DAYS)); this.editing.set(true); }
  async saveDate() {
    const d = fromDateInput(this.newDate);
    if (!d || this.newDate < this.today || this.newDate > this.maxPause) return this.say('Choose a date between today and one year from now.');
    await this.run(() => this.svc.setPause(d), 'Date updated.'); this.editing.set(false);
  }
  async showNow() {
    const a = await this.alert.create({ header: 'Show me in search now?', message: 'People will see you under “Available now” and can send requests again. Only do this if your blood bank says you can donate.',
      buttons: [{ text: 'Keep paused', role: 'cancel' }, { text: 'Show me now', handler: () => { this.run(() => this.svc.setPause(null), 'You’re back in donor search.'); } }] });
    await a.present();
  }
  async remove(e: DonationEntry) {
    const a = await this.alert.create({ header: 'Delete this donation?', message: 'It will be removed from your history. Your search listing doesn’t change.',
      buttons: [{ text: 'Keep it', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: () => { this.run(() => this.svc.remove(e.id), 'Donation deleted.'); } }] });
    await a.present();
  }
  private async run(fn: () => Promise<void>, ok: string) {
    if (!this.net.online()) return this.say('You’re offline. Connect and try again.');
    this.busy.set(true);
    try { await fn(); await this.say(ok); } catch (err) { await this.say(authErrorMessage(err)); } finally { this.busy.set(false); }
  }
  private async say(message: string) { const t = await this.toast.create({ message, duration: 2500, position: 'top' }); await t.present(); }
}
