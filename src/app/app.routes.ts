import { Routes } from '@angular/router';
import { appGuard, authGuard, entryGuard, guestGuard } from './core/auth.guards';

const auth = () => import('./features/auth/routes');

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [entryGuard], children: [] },
  { path: 'onboarding', canActivate: [guestGuard], loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.LoginPage) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.RegisterPage) },
  { path: 'reset-password', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.ResetPasswordPage) },
  { path: 'verify-email', canActivate: [authGuard], loadComponent: () => auth().then((m) => m.VerifyEmailPage) },
  {
    path: 'tabs', canActivate: [appGuard], loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
      { path: 'donors', loadComponent: () => import('./features/donors/donor-search.page').then((m) => m.DonorSearchPage) },
      { path: 'requests', loadComponent: () => import('./features/requests/requests.page').then((m) => m.RequestsPage) },
      { path: 'account', loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'donors', redirectTo: 'tabs/donors' },
  { path: 'welcome', redirectTo: 'onboarding' },
  { path: '**', redirectTo: '' },
];
