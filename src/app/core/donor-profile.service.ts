import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, deleteDoc, doc, docData, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { Availability, BloodGroup, PublicDonor } from './models';

export interface DonorListing { displayName: string; bloodGroup: BloodGroup; city: string; province: string; availability: Availability; discoverable: boolean; }

/** The signed-in user's public donor listing (publicDonorProfiles/{uid}): the record Find donors searches. */
@Injectable({ providedIn: 'root' })
export class DonorProfileService {
  private fs = inject(Firestore); private inj = inject(EnvironmentInjector); private auth = inject(AuthService);

  /** undefined while loading, null when the user isn't a donor (or is a guest). */
  readonly mine$: Observable<PublicDonor | null> = this.auth.user$.pipe(
    switchMap(u => !u || u.isAnonymous ? of(null) : runInInjectionContext(this.inj, () =>
      docData(doc(this.fs, 'publicDonorProfiles', u.uid)).pipe(map(d => d ? ({ uid: u.uid, ...d } as PublicDonor) : null)))),
    shareReplay({ bufferSize: 1, refCount: true }));

  /** Creates or replaces the listing. "verified" is server-controlled, so the existing value is kept as-is. */
  save(uid: string, l: DonorListing, verified: boolean): Promise<void> {
    return runInInjectionContext(this.inj, () => setDoc(doc(this.fs, 'publicDonorProfiles', uid), { ...l, verified, updatedAt: serverTimestamp() }));
  }
  remove(uid: string): Promise<void> {
    return runInInjectionContext(this.inj, () => deleteDoc(doc(this.fs, 'publicDonorProfiles', uid)));
  }
}

/** Public name shown in search: first name + last initial ("Hamza Waseem" → "Hamza W."). */
export function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
