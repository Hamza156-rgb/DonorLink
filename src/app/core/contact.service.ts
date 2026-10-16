import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, collection, collectionData, orderBy, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { BloodGroup, ContactRequest, Urgency } from './models';

export interface NewContactRequest { toUid: string; bloodGroup: BloodGroup; urgency: Urgency; hospital: string; message: string; }

/** Contact workflow. Writes go through Cloud Functions (rate limits, consent); reads are live and rules-scoped to the two parties. */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private fs = inject(Firestore); private fns = inject(Functions); private inj = inject(EnvironmentInjector);
  private auth = inject(AuthService);

  private live(field: 'toUid' | 'fromUid'): Observable<ContactRequest[]> {
    return this.auth.user$.pipe(
      switchMap(u => !u || u.isAnonymous ? of([] as ContactRequest[]) : runInInjectionContext(this.inj, () =>
        collectionData(query(collection(this.fs, 'contactRequests'), where(field, '==', u.uid), orderBy('createdAt', 'desc')), { idField: 'id' }) as Observable<ContactRequest[]>)),
      shareReplay({ bufferSize: 1, refCount: true }));
  }
  /** Requests people sent me (I'm the donor). */
  readonly received$ = this.live('toUid');
  /** Requests I sent to donors. */
  readonly sent$ = this.live('fromUid');
  readonly pendingReceived$ = this.received$.pipe(map(rs => rs.filter(r => r.status === 'pending').length));

  async request(r: NewContactRequest): Promise<string> {
    const fn = runInInjectionContext(this.inj, () => httpsCallable<NewContactRequest, { id: string }>(this.fns, 'createContactRequest'));
    return (await fn(r)).data.id;
  }
  async respond(id: string, accept: boolean): Promise<void> {
    const fn = runInInjectionContext(this.inj, () => httpsCallable<{ id: string; accept: boolean }, unknown>(this.fns, 'respondToContactRequest'));
    await fn({ id, accept });
  }
}

/** "5 min ago", "Yesterday", "12 Oct". */
export function timeAgo(d?: Date): string {
  if (!d) return 'Just now';
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  if (h < 48) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
/** wa.me needs digits only, no +. */
export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
/** +923001234567 → 0300 1234567 */
export const displayPhone = (p: string) => /^\+923\d{9}$/.test(p) ? `0${p.slice(3, 6)} ${p.slice(6)}` : p;
