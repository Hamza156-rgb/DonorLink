import { Component, computed, model, output, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonModal, IonSearchbar, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, chevronDown, close, locationOutline } from 'ionicons/icons';
import { PK_CITIES, POPULAR_CITIES } from '../core/models';
import { PressDirective } from './press.directive';

/** City field that opens a searchable sheet (220+ cities is too many for a plain select on a phone). Empty value = all cities. */
@Component({
  selector: 'app-city-picker',
  imports: [IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSearchbar, IonList, IonItemGroup, IonItemDivider, IonItem, IonLabel, IonIcon, PressDirective],
  styles: [`
    .field{display:flex;align-items:center;gap:10px;width:100%;min-height:58px;padding:8px 14px;border:1px solid var(--bd-line-strong);border-radius:16px;
      background:var(--bd-card);color:var(--bd-ink);font-family:var(--ion-font-family);text-align:left;box-shadow:0 3px 0 var(--bd-line-strong),var(--bd-shadow-1)}
    .field.is-pressed{transform:translateY(2px);box-shadow:0 1px 0 var(--bd-line-strong)}
    .field ion-icon:first-child{padding:8px;font-size:1.1rem;border-radius:11px;background:var(--bd-navy-soft);color:var(--bd-navy)}
    .field .txt{flex:1;min-width:0;display:grid}
    .field small{color:var(--bd-muted);font-size:.75rem}
    .field strong{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .field ion-icon{color:var(--bd-muted);flex:none}
    .chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 12px}
    .chip{min-height:40px;padding:0 14px;border:1px solid var(--bd-line);border-radius:99px;background:var(--bd-card);color:var(--bd-ink);
      font:700 .9rem var(--ion-font-family);box-shadow:0 2px 0 var(--bd-line)}
    .chip.on{background:var(--bd-navy-btn);border-color:var(--bd-navy-deep);color:var(--bd-on-brand);box-shadow:0 2px 0 var(--bd-navy-ink)}
    .hint{margin:4px 16px 8px;color:var(--bd-muted);font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
    ion-item-divider{--background:var(--bd-paper);--color:var(--bd-muted);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;min-height:36px}
    ion-item{--min-height:52px} ion-item.on{--color:var(--bd-navy);font-weight:700}
    .empty{padding:32px 24px;text-align:center;color:var(--bd-muted);line-height:1.5}
    ion-searchbar{--border-radius:var(--bd-r-sm);--background:var(--bd-paper);padding-top:4px}
  `],
  template: `
    <button class="field" appPress type="button" (click)="open.set(true)" [attr.aria-label]="'City: ' + (value() || 'All cities') + '. Change city'">
      <ion-icon name="location-outline" aria-hidden="true" />
      <span class="txt"><small>City</small><strong>{{ value() || 'All cities' }}</strong></span>
      <ion-icon name="chevron-down" aria-hidden="true" />
    </button>

    <ion-modal [isOpen]="open()" (didDismiss)="open.set(false); query.set('')" [initialBreakpoint]="0.92" [breakpoints]="[0, 0.92]">
      <ng-template>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>Choose city</ion-title>
            <ion-buttons slot="end"><ion-button (click)="open.set(false)" aria-label="Close"><ion-icon slot="icon-only" name="close" /></ion-button></ion-buttons>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar placeholder="Search city or province" [debounce]="80" (ionInput)="query.set($any($event).detail.value ?? '')" />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          @if (!query()) {
            <p class="hint">Popular</p>
            <div class="chips">
              <button class="chip" type="button" [class.on]="!value()" (click)="pick('')">All cities</button>
              @for (c of popular; track c) { <button class="chip" type="button" [class.on]="value() === c" (click)="pick(c)">{{ c }}</button> }
            </div>
          }
          @if (groups().length) {
            <ion-list lines="full">
              @for (g of groups(); track g.province) {
                <ion-item-group>
                  <ion-item-divider sticky>{{ g.province }}</ion-item-divider>
                  @for (c of g.cities; track c) {
                    <ion-item button [detail]="false" [class.on]="value() === c" (click)="pick(c)">
                      <ion-label>{{ c }}</ion-label>
                      @if (value() === c) { <ion-icon slot="end" name="checkmark" aria-label="Selected" /> }
                    </ion-item>
                  }
                </ion-item-group>
              }
            </ion-list>
          } @else {
            <p class="empty">No city matches “{{ query() }}”.<br />Check the spelling, or choose “All cities”.</p>
          }
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
})
export class CityPickerComponent {
  readonly value = model<string>('');
  readonly picked = output<string>();
  readonly popular = POPULAR_CITIES;
  open = signal(false); query = signal('');

  /** Matches city or province, case- and accent-insensitive. */
  readonly groups = computed(() => {
    const q = norm(this.query());
    return Object.entries(PK_CITIES)
      .map(([province, cities]) => ({ province, cities: !q || norm(province).includes(q) ? cities : cities.filter(c => norm(c).includes(q)) }))
      .filter(g => g.cities.length);
  });

  constructor() { addIcons({ checkmark, chevronDown, close, locationOutline }); }
  pick(c: string) { this.value.set(c); this.picked.emit(c); this.open.set(false); }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
