import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToggle, IonToolbar, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, calendarOutline, close, informationCircleOutline, medkitOutline } from 'ionicons/icons';
import { authErrorMessage } from '../../core/auth-errors';
import { DonationService, addDays, fromDateInput, toDateInput } from '../../core/donation.service';
import { DEFAULT_REST_DAYS } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { PressDirective } from '../../shared/press.directive';

/** Bottom sheet: record a donation and (optionally) pause the donor listing until a chosen day. */
@Component({
  selector: 'app-record-donation',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonInput, IonToggle, IonSpinner, FormsModule, DatePipe, PressDirective],
  templateUrl: './record-donation.modal.html',
  styleUrls: ['./record-donation.modal.scss'],
})
export class RecordDonationComponent implements OnInit {
  private modalCtrl = inject(ModalController); private donations = inject(DonationService);
  readonly net = inject(NetworkService);
  // Set via ModalController componentProps (plain properties).
  place = ''; requestId = ''; hasListing = false;

  readonly today = toDateInput(new Date());
  readonly maxPause = toDateInput(addDays(new Date(), 365));
  readonly restDays = DEFAULT_REST_DAYS;
  donatedOn = signal(this.today);
  pause = true;
  /** Follows the donation date until the donor picks their own. */
  pauseUntil = signal(toDateInput(addDays(new Date(), DEFAULT_REST_DAYS)));
  private pauseEdited = false;
  busy = signal(false); error = signal(''); touched = signal(false);
  dateError = computed(() => { const d = fromDateInput(this.donatedOn()); return !d ? 'Choose the date you donated.' : this.donatedOn() > this.today ? 'The date can’t be in the future.' : ''; });

  constructor() { addIcons({ alertCircle, calendarOutline, close, informationCircleOutline, medkitOutline }); }
  ngOnInit() { this.pause = this.hasListing; }

  setDonatedOn(v: string) {
    this.donatedOn.set(v);
    const d = fromDateInput(v);
    if (d && !this.pauseEdited) this.pauseUntil.set(toDateInput(addDays(d, DEFAULT_REST_DAYS)));
  }
  setPauseUntil(v: string) { this.pauseEdited = true; this.pauseUntil.set(v); }

  async save() {
    this.touched.set(true);
    const donatedOn = fromDateInput(this.donatedOn()), pauseUntil = fromDateInput(this.pauseUntil());
    if (this.dateError() || !donatedOn) return;
    if (this.pause && (!pauseUntil || this.pauseUntil() > this.maxPause)) { this.error.set('Choose a date within the next year for coming back to search.'); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.donations.record({ donatedOn, place: this.place, requestId: this.requestId || undefined, pauseUntil: this.pause && this.hasListing ? pauseUntil : null }, this.hasListing);
      await this.modalCtrl.dismiss(true);
    } catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
  close() { return this.modalCtrl.dismiss(false); }
}
