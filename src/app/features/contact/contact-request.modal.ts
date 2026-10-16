import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircle, close, informationCircleOutline, locationOutline, lockClosed, medkitOutline } from 'ionicons/icons';
import { authErrorMessage } from '../../core/auth-errors';
import { ContactService } from '../../core/contact.service';
import { BLOOD_GROUPS, BloodGroup, PublicDonor, URGENCY, URGENCY_LABEL, Urgency } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';

/** Bottom sheet: seeker asks a donor to share their contact details. */
@Component({
  selector: 'app-contact-request',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonInput, IonTextarea, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSpinner, ReactiveFormsModule, ArtComponent, PressDirective],
  templateUrl: './contact-request.modal.html',
  styleUrls: ['./contact-request.modal.scss'],
})
export class ContactRequestComponent implements OnInit {
  // "modal" is a reserved property name inside ion-modal.
  private modalCtrl = inject(ModalController); private contacts = inject(ContactService); private router = inject(Router);
  readonly net = inject(NetworkService);
  // Set via ModalController componentProps, which Ionic assigns as plain properties (not signal inputs).
  donor!: PublicDonor;
  neededGroup: BloodGroup | null = null;
  groups = BLOOD_GROUPS; urgencies = URGENCY; urgencyLabel = URGENCY_LABEL;
  form = inject(FormBuilder).nonNullable.group({
    bloodGroup: ['O+' as BloodGroup, Validators.required],
    urgency: ['today' as Urgency, Validators.required],
    hospital: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    message: ['', Validators.maxLength(300)],
  });
  busy = signal(false); error = signal(''); sent = signal(false);

  constructor() { addIcons({ alertCircle, close, informationCircleOutline, locationOutline, lockClosed, medkitOutline }); }
  ngOnInit() { this.form.controls.bloodGroup.setValue(this.neededGroup ?? this.donor.bloodGroup); }

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.busy() || !this.net.online()) return;
    this.busy.set(true); this.error.set('');
    const v = this.form.getRawValue();
    try { await this.contacts.request({ toUid: this.donor.uid, ...v, hospital: v.hospital.trim(), message: v.message.trim() }); this.sent.set(true); }
    catch (e) { this.error.set(authErrorMessage(e)); }
    finally { this.busy.set(false); }
  }
  close() { return this.modalCtrl.dismiss(this.sent()); }
  async viewRequests() { await this.modalCtrl.dismiss(true); await this.router.navigate(['/tabs/requests'], { queryParams: { view: 'sent' } }); }
}
