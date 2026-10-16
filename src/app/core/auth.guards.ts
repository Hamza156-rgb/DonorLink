import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, map, take } from 'rxjs';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';

// UX only. Access control is enforced by firestore.rules and Cloud Functions.
export const HOME = '/tabs/home';

/** App entry ("/"): guests and verified users go home, unverified accounts verify, new installs see onboarding. */
export const entryGuard: CanActivateFn = async () => {
  const router = inject(Router), onboarding = inject(OnboardingService);
  const u = await firstValueFrom(inject(AuthService).user$);
  if (u) return router.createUrlTree([u.isAnonymous || u.emailVerified ? HOME : '/verify-email']);
  return router.createUrlTree([(await onboarding.isDone()) ? '/login' : '/onboarding']);
};
/** Main tabs: guests and verified accounts. Unverified accounts finish verification first. */
export const appGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u =>
    !u ? router.createUrlTree(['/'])
      : u.isAnonymous || u.emailVerified ? true : router.createUrlTree(['/verify-email'])));
};
/** Real (non-guest) account, verified or not; otherwise to login with a return URL. */
export const authGuard: CanActivateFn = (_r, state) => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u => u && !u.isAnonymous ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })));
};
/** Verified account only (contacting donors, listing yourself). Guests are asked to sign in. */
export const verifiedGuard: CanActivateFn = (_r, state) => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u =>
    !u || u.isAnonymous ? router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
      : u.emailVerified ? true : router.createUrlTree(['/verify-email'])));
};
/** Onboarding, login, register, reset: open to signed-out users and guests (so they can upgrade). */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u => !u || u.isAnonymous ? true : router.createUrlTree([u.emailVerified ? HOME : '/verify-email'])));
};
