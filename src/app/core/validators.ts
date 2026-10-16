import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/** Normalises Pakistani mobile numbers (0300 1234567, +92 300-1234567, 923001234567) to +923001234567. */
export function normalizePkMobile(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/[\s-()]/g, '');
  const m = /^(?:\+92|0092|92|0)?(3\d{9})$/.exec(d);
  return m ? `+92${m[1]}` : null;
}
export function pkMobileValidator(c: AbstractControl): ValidationErrors | null {
  return !c.value || normalizePkMobile(c.value) ? null : { pkMobile: true };
}
/** Only same-app paths, so ?returnUrl= can't send users to another site. */
export function safeReturnUrl(url: string | null | undefined, fallback = '/tabs/home'): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') ? url : fallback;
}
/** Validators.email, but tolerant of the leading/trailing spaces autofill and paste often add. */
export function emailValidator(c: AbstractControl): ValidationErrors | null {
  return Validators.email({ value: String(c.value ?? '').trim() } as AbstractControl);
}
