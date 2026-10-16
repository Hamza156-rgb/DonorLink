import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard, entryGuard, guestGuard, verifiedGuard } from './auth.guards';
import { OnboardingService } from './onboarding.service';

type FakeUser = { emailVerified: boolean } | null;

function run(guard: CanActivateFn, u: FakeUser, url = '/tabs/donors', onboarded = false) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { user$: new BehaviorSubject(u) } },
    { provide: OnboardingService, useValue: { isDone: () => Promise.resolve(onboarded) } }] });
  const r = TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as Observable<boolean | UrlTree> | Promise<boolean | UrlTree>;
  return (r instanceof Promise ? r : firstValueFrom(r)).then(v => v === true ? true : TestBed.inject(Router).serializeUrl(v as UrlTree));
}

describe('route guards', () => {
  it('authGuard: signed out goes to login with return URL', async () => expect(await run(authGuard, null, '/verify-email')).toBe('/login?returnUrl=%2Fverify-email'));
  it('authGuard: unverified user may pass', async () => expect(await run(authGuard, { emailVerified: false })).toBe(true));

  it('verifiedGuard: signed out goes to login', async () => expect(await run(verifiedGuard, null)).toBe('/login?returnUrl=%2Ftabs%2Fdonors'));
  it('verifiedGuard: unverified goes to verify screen', async () => expect(await run(verifiedGuard, { emailVerified: false })).toBe('/verify-email'));
  it('verifiedGuard: verified passes', async () => expect(await run(verifiedGuard, { emailVerified: true })).toBe(true));

  it('guestGuard: signed out passes', async () => expect(await run(guestGuard, null)).toBe(true));
  it('guestGuard: unverified goes to verify screen', async () => expect(await run(guestGuard, { emailVerified: false })).toBe('/verify-email'));
  it('guestGuard: verified goes to home', async () => expect(await run(guestGuard, { emailVerified: true })).toBe('/tabs/home'));

  it('entryGuard: first launch shows onboarding', async () => expect(await run(entryGuard, null)).toBe('/onboarding'));
  it('entryGuard: returning signed-out user goes to login', async () => expect(await run(entryGuard, null, '/', true)).toBe('/login'));
  it('entryGuard: unverified user goes to verify screen', async () => expect(await run(entryGuard, { emailVerified: false })).toBe('/verify-email'));
  it('entryGuard: verified user goes to home', async () => expect(await run(entryGuard, { emailVerified: true }, '/', true)).toBe('/tabs/home'));
});
