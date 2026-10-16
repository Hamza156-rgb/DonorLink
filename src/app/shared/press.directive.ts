import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Tactile press: sinks the element (see .dl-press / .dl-key) and gives a light haptic tick on devices. */
@Directive({ selector: '[appPress]', host: { class: 'dl-press' } })
export class PressDirective {
  private el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  @HostListener('pointerdown') down() {
    this.el.classList.add('is-pressed');
    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  }
  @HostListener('pointerup') @HostListener('pointerleave') @HostListener('pointercancel') up() { this.el.classList.remove('is-pressed'); }
}
