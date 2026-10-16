import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, map, take } from 'rxjs';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';

// UX only. Access control is enforced by firestore.rules and Cloud Functions.
export const HOME = '/tabs/home';

/** App entry ("/"): signed-in users go to home or the verify screen; new installs see onboarding first. */
export const entryGuard: CanActivateFn = async () => {
  const router = inject(Router), onboarding = inject(OnboardingService);
  const u = await firstValueFrom(inject(AuthService).user$);
  if (u) return router.createUrlTree([u.emailVerified ? HOME : '/verify-email']);
  return router.createUrlTree([(await onboarding.isDone()) ? '/login' : '/onboarding']);
};
/** Signed in (verified or not); otherwise to login with a return URL. */
export const authGuard: CanActivateFn = (_r, state) => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u => u ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })));
};
/** Signed in with a verified email; unverified users go to the verify screen. */
export const verifiedGuard: CanActivateFn = (_r, state) => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u =>
    !u ? router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
      : u.emailVerified ? true : router.createUrlTree(['/verify-email'])));
};
/** Signed-out screens (onboarding, login, register, reset); signed-in users skip ahead. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).user$.pipe(take(1), map(u => !u ? true : router.createUrlTree([u.emailVerified ? HOME : '/verify-email'])));
};
