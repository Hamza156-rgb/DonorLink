import { Component, input } from '@angular/core';

export type ArtKind = 'search' | 'privacy' | 'care' | 'mail' | 'key' | 'empty';

/**
 * Inline illustrations (no remote images). Depth comes from layered gradients, a specular highlight
 * and a soft ground shadow; colours come from design tokens via CSS custom properties.
 */
@Component({
  selector: 'app-art',
  host: { role: 'img', '[attr.aria-hidden]': 'true' },
  styles: [`:host{display:block} svg{width:100%;height:auto;overflow:visible}
    .r1{stop-color:var(--bd-red-bright)} .r2{stop-color:var(--bd-red-deep)} .n1{stop-color:var(--bd-navy)} .n2{stop-color:var(--bd-navy-deep)}
    .w1{stop-color:var(--bd-card)} .w2{stop-color:var(--bd-navy-soft)} .sh{fill:var(--bd-navy-deep);opacity:.18} .hi{fill:var(--bd-on-brand);opacity:.45}
    .wh{fill:var(--bd-on-brand)} .ln{fill:none;stroke:var(--bd-navy);stroke-width:6;stroke-linecap:round}`],
  template: `
  <svg viewBox="0 0 200 200">
    <defs>
      <linearGradient [attr.id]="id('r')" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" class="r1"/><stop offset="1" class="r2"/></linearGradient>
      <linearGradient [attr.id]="id('n')" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" class="n1"/><stop offset="1" class="n2"/></linearGradient>
      <linearGradient [attr.id]="id('w')" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="w1"/><stop offset="1" class="w2"/></linearGradient>
    </defs>
    <ellipse class="sh" cx="100" cy="184" rx="54" ry="8"/>
    @switch (kind()) {
      @case ('search') {
        <path [attr.fill]="url('n')" d="M100 22c-30 0-52 22-52 51 0 37 52 89 52 89s52-52 52-89c0-29-22-51-52-51z"/>
        <circle class="wh" cx="100" cy="73" r="30"/>
        <path [attr.fill]="url('r')" d="M100 52s-16 19-16 29a16 16 0 0 0 32 0c0-10-16-29-16-29z"/>
        <ellipse class="hi" cx="94" cy="76" rx="3.5" ry="7" transform="rotate(20 94 76)"/>
        <circle cx="152" cy="140" r="20" fill="none" stroke-width="9" [attr.stroke]="url('r')"/>
        <path d="M166 154l14 14" stroke-width="10" stroke-linecap="round" [attr.stroke]="url('r')"/>
      }
      @case ('privacy') {
        <path [attr.fill]="url('n')" d="M100 18l64 24v46c0 42-28 72-64 86-36-14-64-44-64-86V42z"/>
        <path class="hi" d="M100 18l64 24v10L100 28 36 52V42z" opacity=".2"/>
        <rect class="wh" x="72" y="86" width="56" height="44" rx="10"/>
        <path d="M84 86V74a16 16 0 0 1 32 0v12" fill="none" stroke="var(--bd-on-brand)" stroke-width="8"/>
        <circle [attr.fill]="url('r')" cx="100" cy="106" r="7"/><rect [attr.fill]="url('r')" x="97" y="108" width="6" height="12" rx="3"/>
      }
      @case ('care') {
        <path [attr.fill]="url('n')" d="M30 150c0-22 18-34 38-34h20l26 18c6 4 4 13-3 13H86" opacity=".95"/>
        <path [attr.fill]="url('n')" d="M170 150c0-22-18-34-38-34h-8l-18 14" opacity=".75"/>
        <path [attr.fill]="url('r')" d="M100 16s-40 46-40 72a40 40 0 0 0 80 0c0-26-40-72-40-72z"/>
        <path class="wh" d="M100 108l-15-14a9 9 0 0 1 15-10 9 9 0 0 1 15 10z"/>
        <ellipse class="hi" cx="84" cy="72" rx="5" ry="13" transform="rotate(25 84 72)"/>
      }
      @case ('mail') {
        <rect [attr.fill]="url('w')" x="28" y="54" width="144" height="104" rx="16" stroke="var(--bd-line)" stroke-width="2"/>
        <path [attr.fill]="url('n')" d="M28 70l72 48 72-48V66a12 12 0 0 0-12-12H40a12 12 0 0 0-12 12z"/>
        <circle [attr.fill]="url('r')" cx="160" cy="58" r="24"/>
        <path d="M149 58l8 8 14-15" fill="none" stroke="var(--bd-on-brand)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      }
      @case ('key') {
        <rect [attr.fill]="url('n')" x="48" y="82" width="104" height="86" rx="20"/>
        <path d="M70 82V64a30 30 0 0 1 60 0v18" fill="none" stroke-width="14" [attr.stroke]="url('n')"/>
        <rect class="hi" x="58" y="90" width="84" height="8" rx="4" opacity=".25"/>
        <circle [attr.fill]="url('r')" cx="100" cy="120" r="12"/><rect [attr.fill]="url('r')" x="95" y="124" width="10" height="24" rx="5"/>
      }
      @default {
        <circle [attr.fill]="url('w')" cx="92" cy="90" r="58" stroke="var(--bd-line)" stroke-width="2"/>
        <circle class="ln" cx="92" cy="90" r="34"/><path class="ln" d="M117 115l34 34" stroke-width="12"/>
        <path [attr.fill]="url('r')" d="M92 66s-15 18-15 28a15 15 0 0 0 30 0c0-10-15-28-15-28z" opacity=".9"/>
      }
    }
  </svg>`,
})
export class ArtComponent {
  readonly kind = input<ArtKind>('empty');
  private static seq = 0;
  private readonly uid = `art${ArtComponent.seq++}`;
  id(k: string) { return `${this.uid}-${k}`; }
  url(k: string) { return `url(#${this.id(k)})`; }
}
