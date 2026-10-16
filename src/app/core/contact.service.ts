import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, Timestamp, collection, collectionData, doc, getDoc, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { BloodGroup, ContactRequest, Urgency } from './models';

export interface NewContactRequest { toUid: string; bloodGroup: BloodGroup; urgency: Urgency; hospital: string; message: string; }

/** A user-facing contact error; authErrorMessage() maps the code to copy. */
export class ContactError extends Error { constructor(readonly code: string) { super(code); } }
export const MAX_REQUESTS_PER_HOUR = 5;

/**
 * Contact workflow without Cloud Functions (works on the free plan): the app writes directly and firestore.rules
 * enforce everything (verified sender, listed donor, real names, no duplicates, 5/hour, donor-only answers).
 * The checks here only exist to show a clear message before the rules would refuse.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private fs = inject(Firestore); private inj = inject(EnvironmentInjector);
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
    const me = this.auth.current;
    if (!me || me.isAnonymous || !me.emailVerified) throw new ContactError('contact/need-account');
    const id = `${me.uid}_${r.toUid}`;
    return runInInjectionContext(this.inj, async () => {
      const [existing, donor, profile, quota] = await Promise.all([
        getDoc(doc(this.fs, 'contactRequests', id)), getDoc(doc(this.fs, 'publicDonorProfiles', r.toUid)),
        getDoc(doc(this.fs, 'privateProfiles', me.uid)), getDoc(doc(this.fs, 'requestQuota', me.uid))]);
      if (existing.exists() && existing.data()['status'] !== 'declined') throw new ContactError('contact/already-exists');
      if (!donor.exists() || donor.data()['discoverable'] !== true) throw new ContactError('contact/not-listed');
      if (!profile.exists()) throw new ContactError('contact/no-profile');
      const q = quota.data() as { windowStart?: Timestamp; count?: number } | undefined;
      const inWindow = !!q?.windowStart && q.windowStart.toMillis() > Date.now() - 3600_000;
      if (inWindow && (q!.count ?? 0) >= MAX_REQUESTS_PER_HOUR) throw new ContactError('contact/limit');

      const batch = writeBatch(this.fs);
      batch.set(doc(this.fs, 'contactRequests', id), {
        fromUid: me.uid, toUid: r.toUid, status: 'pending', fromName: profile.data()['fullName'], toName: donor.data()['displayName'],
        bloodGroup: r.bloodGroup, urgency: r.urgency, hospital: r.hospital, city: donor.data()['city'], message: r.message,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      batch.set(doc(this.fs, 'requestQuota', me.uid), inWindow
        ? { windowStart: q!.windowStart, count: (q!.count ?? 0) + 1, lastRequestId: id, lastRequestAt: serverTimestamp() }
        : { windowStart: serverTimestamp(), count: 1, lastRequestId: id, lastRequestAt: serverTimestamp() });
      await batch.commit();
      return id;
    });
  }
  /** Donor answers. Accepting shares the donor's own name, mobile and preference with this one requester. */
  async respond(id: string, accept: boolean): Promise<void> {
    const me = this.auth.current; if (!me) throw new ContactError('contact/need-account');
    await runInInjectionContext(this.inj, async () => {
      const update: Record<string, unknown> = { status: accept ? 'accepted' : 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (accept) {
        const p = (await getDoc(doc(this.fs, 'privateProfiles', me.uid))).data();
        if (!p?.['phone']) throw new ContactError('contact/no-phone');
        update['sharedContact'] = { name: p['fullName'], phone: p['phone'], preferredContact: p['preferredContact'] };
      }
      await updateDoc(doc(this.fs, 'contactRequests', id), update);
    });
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
