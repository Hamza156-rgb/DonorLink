import { Component, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueryDocumentSnapshot } from '@angular/fire/firestore';
import { DonorService } from './donor.service';
import { BLOOD_GROUPS, BloodGroup, PK_CITIES, PublicDonor } from '../../core/models';

@Component({ selector:'app-donor-search', standalone:true, imports:[IonicModule,FormsModule,RouterLink], templateUrl:'./donor-search.page.html', styleUrls:['./donor-search.page.scss'] })
export class DonorSearchPage {
  private svc = inject(DonorService);
  groups = BLOOD_GROUPS; cities = Object.values(PK_CITIES).flat().sort();
  group = signal<BloodGroup | null>(null); city = ''; availableOnly = true;
  items = signal<PublicDonor[]>([]); loading = signal(false); error = signal(''); searched = signal(false); more = signal(false);
  private cursor: QueryDocumentSnapshot | null = null;

  async run(reset = true) {
    const g = this.group(); if (!g || this.loading()) return;
    if (reset) { this.cursor = null; this.items.set([]); }
    this.loading.set(true); this.error.set('');
    try {
      const p = await this.svc.search({ bloodGroup: g, city: this.city || undefined, availableOnly: this.availableOnly }, this.cursor);
      this.items.update(x => [...x, ...p.items]); this.cursor = p.cursor; this.more.set(p.items.length === 15); this.searched.set(true);
    } catch { this.error.set('Could not load donors. Check your connection and try again.'); }
    finally { this.loading.set(false); }
  }
  pick(g: BloodGroup) { this.group.set(g); this.run(); }
}
