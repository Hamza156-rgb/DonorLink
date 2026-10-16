import { Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PressDirective } from './press.directive';

export interface SegOption { value: string; label: string; badge?: number }

/**
 * Segmented control with a sliding raised pill. Replaces ion-segment, whose Material indicator is a thin
 * underline (selected labels became invisible). Works with [(value)], ngModel and formControlName.
 */
@Component({
  selector: 'app-seg',
  imports: [PressDirective],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SegComponent), multi: true }],
  host: { role: 'radiogroup', class: 'dl-seg', '[style.--n]': 'options().length', '[style.--i]': 'index()', '[class.off]': 'index() < 0' },
  template: `
    <span class="dl-seg-pill" aria-hidden="true"></span>
    @for (o of options(); track o.value) {
      <button type="button" role="radio" appPress [attr.aria-checked]="o.value === value()" [class.on]="o.value === value()"
        [disabled]="disabled()" (click)="pick(o.value)">
        {{ o.label }}@if (o.badge) {<span class="dl-seg-badge">{{ o.badge }}</span>}
      </button>
    }`,
})
export class SegComponent implements ControlValueAccessor {
  readonly options = input.required<SegOption[]>();
  readonly value = model<string>('');
  readonly disabled = signal(false);
  readonly index = computed(() => this.options().findIndex(o => o.value === this.value()));
  private onChange: (v: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  pick(v: string) {
    if (v === this.value()) return;
    this.value.set(v); this.onChange(v); this.onTouched();
  }
  writeValue(v: string | null) { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled.set(d); }
}
