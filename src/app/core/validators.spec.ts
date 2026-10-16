import { FormControl } from '@angular/forms';
import { emailValidator, normalizePkMobile, pkMobileValidator, safeReturnUrl } from './validators';

describe('normalizePkMobile', () => {
  it.each([['03001234567'], ['0300 1234567'], ['0300-1234567'], ['+92 300 1234567'], ['923001234567'], ['00923001234567'], ['3001234567']])(
    'accepts %s', (raw) => expect(normalizePkMobile(raw)).toBe('+923001234567'));
  it.each([[''], ['0421234567'], ['0300123456'], ['030012345678'], ['+443001234567'], ['phone']])(
    'rejects %s', (raw) => expect(normalizePkMobile(raw)).toBeNull());
  it('validator flags invalid numbers only', () => {
    expect(pkMobileValidator(new FormControl('0300 1234567'))).toBeNull();
    expect(pkMobileValidator(new FormControl('12345'))).toEqual({ pkMobile: true });
  });
});

describe('safeReturnUrl', () => {
  it('keeps in-app paths', () => expect(safeReturnUrl('/donors?city=Lahore')).toBe('/donors?city=Lahore'));
  it.each([['https://evil.example'], ['//evil.example'], ['/\\evil.example'], [''], [null], [undefined]])(
    'falls back for %s', (u) => expect(safeReturnUrl(u)).toBe('/tabs/home'));
});

describe('emailValidator', () => {
  it('accepts emails with surrounding spaces', () => expect(emailValidator(new FormControl(' a@b.co '))).toBeNull());
  it('rejects malformed emails', () => expect(emailValidator(new FormControl('a@'))).toEqual({ email: true }));
});
