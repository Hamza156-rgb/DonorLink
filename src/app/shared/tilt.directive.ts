import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * 3D tilt: while a finger or pointer is down on the element it leans toward the touch point and a glare
 * follows it (see .dl-tilt). Purely visual: reads --rx/--ry/--gx/--gy, never blocks taps or scrolling.
 */
@Directive({ selector: '[appTilt]', host: { class: 'dl-tilt' } })
export class TiltDirective {
  private el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private static readonly reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private active = false;

  @HostListener('pointerdown', ['$event']) down(e: PointerEvent) { this.active = true; this.lean(e); }
  @HostListener('pointermove', ['$event']) move(e: PointerEvent) { if (this.active || e.pointerType === 'mouse') this.lean(e); }
  @HostListener('pointerup') @HostListener('pointerleave') @HostListener('pointercancel') reset() {
    this.active = false;
    this.el.classList.remove('is-tilting');
    for (const p of ['--rx', '--ry']) this.el.style.removeProperty(p);
  }

  private lean(e: PointerEvent) {
    if (TiltDirective.reduce) return;
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    this.el.classList.add('is-tilting');
    this.el.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`);
    this.el.style.setProperty('--rx', `${((.5 - y) * 10).toFixed(2)}deg`);
    this.el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    this.el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  }
}
