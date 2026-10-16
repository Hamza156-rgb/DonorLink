import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { PublicDonor, BloodGroup } from '../../core/models';

export interface DonorFilter { bloodGroup: BloodGroup; city?: string; availableOnly: boolean; }
export interface DonorPage { items: PublicDonor[]; cursor: QueryDocumentSnapshot | null; }

@Injectable({ providedIn: 'root' })
export class DonorService {
  private fs = inject(Firestore);
  /** Server-side query + cursor pagination; never filters the whole collection on the client. */
  async search(f: DonorFilter, cursor: QueryDocumentSnapshot | null = null, size = 15): Promise<DonorPage> {
    const c = [where('discoverable','==',true), where('bloodGroup','==',f.bloodGroup)];
    if (f.city) c.push(where('city','==',f.city));
    if (f.availableOnly) c.push(where('availability','==','available'));
    const q = query(collection(this.fs,'publicDonorProfiles'), ...c, orderBy('updatedAt','desc'), ...(cursor ? [startAfter(cursor)] : []), limit(size));
    const snap = await getDocs(q);
    return { items: snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<PublicDonor,'uid'>) })), cursor: snap.docs.at(-1) ?? null };
  }
}
