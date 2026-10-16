import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Auth, EmailAuthProvider, User, createUserWithEmailAndPassword, getIdToken, linkWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, signInAnonymously, signInWithEmailAndPassword, signOut, updateProfile, user } from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { PrivateProfile } from './models';

export interface Registration extends PrivateProfile { password: string; }

/** Anonymous session used for guest search. Guests can browse donors but cannot contact or be listed. */
export const isGuest = (u: Pick<User, 'isAnonymous'> | null | undefined): boolean => !!u?.isAnonymous;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth); private fs = inject(Firestore); private inj = inject(EnvironmentInjector);
  /** Emits the resolved user on sign-in, sign-out and token refresh (so emailVerified updates after refreshVerified). */
  readonly user$: Observable<User | null> = user(this.auth);
  get current(): User | null { return this.auth.currentUser; }

  /** AngularFire APIs must run inside an injection context; click handlers are not one. */
  private run<T>(fn: () => Promise<T>): Promise<T> { return runInInjectionContext(this.inj, fn); }

  /** Starts (or reuses) a guest session so people who need blood can search without an account. */
  async continueAsGuest(): Promise<User> {
    const u = this.current; if (u) return u;
    return (await this.run(() => signInAnonymously(this.auth))).user;
  }

  /**
   * Creates the account, the owner-only private profile, then sends the verification email.
   * A guest is upgraded in place (same uid), so nothing from the guest session is lost.
   */
  async register(r: Registration): Promise<void> {
    const guest = this.current?.isAnonymous ? this.current : null;
    const { user: u } = guest
      ? await this.run(() => linkWithCredential(guest, EmailAuthProvider.credential(r.email, r.password)))
      : await this.run(() => createUserWithEmailAndPassword(this.auth, r.email, r.password));
    await this.run(() => getIdToken(u, true));   // rules check token.email when the profile is written
    await this.run(() => updateProfile(u, { displayName: r.fullName }));
    await this.run(() => setDoc(doc(this.fs, 'privateProfiles', u.uid), {
      fullName: r.fullName, email: u.email, phone: r.phone, preferredContact: r.preferredContact,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await this.run(() => sendEmailVerification(u));
  }
  async login(email: string, password: string): Promise<User> {
    return (await this.run(() => signInWithEmailAndPassword(this.auth, email, password))).user;
  }
  resetPassword(email: string): Promise<void> { return this.run(() => sendPasswordResetEmail(this.auth, email)); }
  async resendVerification(): Promise<void> { const u = this.current; if (u) await this.run(() => sendEmailVerification(u)); }
  /** Reloads the user and, once verified, forces a new ID token so security rules see email_verified. */
  async refreshVerified(): Promise<boolean> {
    const u = this.current; if (!u) return false;
    await this.run(() => reload(u));
    if (u.emailVerified) await this.run(() => getIdToken(u, true));
    return u.emailVerified;
  }
  logout(): Promise<void> { return this.run(() => signOut(this.auth)); }
}
