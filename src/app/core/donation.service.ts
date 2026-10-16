import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, Timestamp, collection, collectionData, deleteDoc, deleteField, doc, orderBy, query, serverTimestamp, updateDoc, writeBatch } from '@angular/fire/firestore';
import { Observable, of, shareReplay, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { DonationEntry } from './models';

export interface NewDonation { donatedOn: Date; place: string; requestId?: string;
  /** Hide from "Available now" until this day; null leaves the listing as it is. */
  pauseUntil: Date | null; }

/** Midnight (local) at the start of the given day, so pause dates are whole days. */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; };
/** "2026-10-16" for <input type=date>, in local time. */
export const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromDateInput = (s: string) => { const [y, m, d] = s.split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; };
/** Whole days from today until the date (0 = today or past). */
export const daysUntil = (d: Date, now = new Date()) => Math.max(0, Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400_000));

/**
 * Donation history (owner only) and the neutral pause on the public listing. No Cloud Functions: the donor comes
 * back to search automatically because search and firestore.rules compare pausedUntil with the current time.
 */
@Injectable({ providedIn: 'root' })
export class DonationService {
  private fs = inject(Firestore); private inj = inject(EnvironmentInjector); private auth = inject(AuthService);

  /** undefined while loading; newest first. */
  readonly entries$: Observable<DonationEntry[]> = this.auth.user$.pipe(
    switchMap(u => !u || u.isAnonymous ? of([] as DonationEntry[]) : runInInjectionContext(this.inj, () =>
      collectionData(query(collection(this.fs, 'donationHistory', u.uid, 'entries'), orderBy('donatedOn', 'desc')), { idField: 'id' }) as Observable<DonationEntry[]>)),
    shareReplay({ bufferSize: 1, refCount: true }));

  /** Records the donation and, when asked, pauses the listing in the same batch. */
  async record(n: NewDonation, hasListing: boolean): Promise<void> {
    const uid = this.uid();
    await runInInjectionContext(this.inj, () => {
      const b = writeBatch(this.fs);
      b.set(doc(collection(this.fs, 'donationHistory', uid, 'entries')), {
        donatedOn: Timestamp.fromDate(startOfDay(n.donatedOn)), place: n.place.trim(), createdAt: serverTimestamp(),
        ...(n.requestId ? { requestId: n.requestId } : {}),
      });
      if (hasListing && n.pauseUntil) b.update(doc(this.fs, 'publicDonorProfiles', uid), { pausedUntil: Timestamp.fromDate(startOfDay(n.pauseUntil)), updatedAt: serverTimestamp() });
      return b.commit();
    });
  }
  /** Change the pause date, or pass null to show up in search again now. */
  setPause(until: Date | null): Promise<void> {
    const uid = this.uid();
    return runInInjectionContext(this.inj, () => updateDoc(doc(this.fs, 'publicDonorProfiles', uid),
      { pausedUntil: until ? Timestamp.fromDate(startOfDay(until)) : deleteField(), updatedAt: serverTimestamp() }));
  }
  remove(id: string): Promise<void> {
    const uid = this.uid();
    return runInInjectionContext(this.inj, () => deleteDoc(doc(this.fs, 'donationHistory', uid, 'entries', id)));
  }
  private uid() { const u = this.auth.current; if (!u || u.isAnonymous) throw new Error('Sign in first.'); return u.uid; }
}
