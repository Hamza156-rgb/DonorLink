import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { PrivateProfile } from './models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private fs = inject(Firestore); private inj = inject(EnvironmentInjector);
  /** Owner-only read of privateProfiles/{uid}; null if the document was never written. */
  async getMine(uid: string): Promise<PrivateProfile | null> {
    const snap = await runInInjectionContext(this.inj, () => getDoc(doc(this.fs, 'privateProfiles', uid)));
    return snap.exists() ? (snap.data() as PrivateProfile) : null;
  }
}
