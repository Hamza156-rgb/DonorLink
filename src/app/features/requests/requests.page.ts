import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AlertController, IonButton, IonContent, IonIcon, IonRouterLink, IonSegment, IonSegmentButton, IonSpinner, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { call, checkmarkCircle, closeCircle, informationCircleOutline, locationOutline, logoWhatsapp, medkitOutline, timeOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { authErrorMessage } from '../../core/auth-errors';
import { ContactService, displayPhone, timeAgo, whatsappLink } from '../../core/contact.service';
import { ContactRequest, URGENCY_LABEL } from '../../core/models';
import { NetworkService } from '../../core/network.service';
import { ArtComponent } from '../../shared/art.component';
import { PressDirective } from '../../shared/press.directive';
import { environment } from '../../../environments/environment';

type View = 'received' | 'sent';

@Component({ selector:'app-requests', imports:[IonContent,IonSegment,IonSegmentButton,IonButton,IonIcon,IonSpinner,IonRouterLink,RouterLink,ArtComponent,PressDirective], templateUrl:'./requests.page.html', styleUrls:['./requests.page.scss'] })
export class RequestsPage {
  private contacts = inject(ContactService); private alert = inject(AlertController); private toast = inject(ToastController);
  readonly net = inject(NetworkService);
  /** ?view=sent after sending a request. */
  readonly view = input<string>('');
  private user = toSignal(inject(AuthService).user$);
  guest = computed(() => !!this.user()?.isAnonymous);
  tab = signal<View>('received');
  loadError = signal(false);
  private orError = <T>(o: import('rxjs').Observable<T[]>) => o.pipe(catchError(() => { this.loadError.set(true); return of(null); }));
  received = toSignal(this.orError(this.contacts.received$));
  sent = toSignal(this.orError(this.contacts.sent$));
  pending = computed(() => (this.received() ?? []).filter(r => r.status === 'pending').length);
  busyId = signal(''); contactOn = environment.features.contact;
  urgencyLabel = URGENCY_LABEL; ago = (r: ContactRequest) => timeAgo(r.createdAt?.toDate()); phone = displayPhone;

  constructor() {
    addIcons({ call, checkmarkCircle, closeCircle, informationCircleOutline, locationOutline, logoWhatsapp, medkitOutline, timeOutline });
    effect(() => { const v = this.view(); if (v === 'sent' || v === 'received') this.tab.set(v); });
  }
  setView(e: Event) { this.tab.set((e as CustomEvent).detail.value as View); }
  initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join(''); }
  wa(r: ContactRequest) { return whatsappLink(r.sharedContact!.phone, `Assalam-o-Alaikum ${r.sharedContact!.name.split(' ')[0]}, I contacted you on DonorLink about ${r.bloodGroup} blood for a patient at ${r.hospital}.`); }

  async answer(r: ContactRequest, accept: boolean) {
    if (accept) {
      const a = await this.alert.create({
        header: `Share your number with ${r.fromName}?`,
        message: 'They’ll see your name and mobile number so they can call or WhatsApp you. Only accept if you’re able to help.',
        buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Share and accept', role: 'confirm' }],
      });
      await a.present();
      if ((await a.onDidDismiss()).role !== 'confirm') return;
    }
    this.busyId.set(r.id);
    try {
      await this.contacts.respond(r.id, accept);
      await (await this.toast.create({ message: accept ? `${r.fromName} can now see your number.` : 'Request declined. They’ll be told you’re not available.', duration: 2500, position: 'top', color: 'secondary' })).present();
    } catch (e) {
      await (await this.toast.create({ message: authErrorMessage(e), duration: 3500, position: 'top', color: 'danger' })).present();
    } finally { this.busyId.set(''); }
  }
}
