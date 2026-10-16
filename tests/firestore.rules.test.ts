import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setLogLevel, deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

setLogLevel('silent'); // denied writes are expected; keep output readable
let env: RulesTestEnvironment;
const ALICE = { email: 'alice@example.com', email_verified: false };
const profile = (over: Record<string, unknown> = {}) => ({
  fullName: 'Alice Khan', email: 'alice@example.com', phone: '+923001234567', preferredContact: 'in_app',
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over,
});
const alice = () => env.authenticatedContext('alice', ALICE).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-donorlink',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

describe('privateProfiles: registration create', () => {
  it('owner can create a valid profile (unverified email is fine at sign-up)', () =>
    assertSucceeds(setDoc(doc(alice(), 'privateProfiles/alice'), profile())));
  it('phone is optional', () => {
    const { phone: _p, ...rest } = profile(); return assertSucceeds(setDoc(doc(alice(), 'privateProfiles/alice'), rest));
  });
  it('denied: signed out', () =>
    assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'privateProfiles/alice'), profile())));
  it('denied: writing someone else’s profile', () =>
    assertFails(setDoc(doc(env.authenticatedContext('bob', { email: 'alice@example.com' }).firestore(), 'privateProfiles/alice'), profile())));
  it('denied: extra field such as role', () => assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ role: 'admin' }))));
  it('denied: suspended or verified flags', async () => {
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ suspended: false })));
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ verified: true })));
  });
  it('denied: email that is not the signed-in account’s', () =>
    assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ email: 'someone@else.com' }))));
  it('denied: missing required field', () => {
    const { fullName: _f, ...rest } = profile(); return assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), rest));
  });
  it('denied: name too short or not a string', async () => {
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ fullName: 'A' })));
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ fullName: 42 })));
  });
  it('denied: unknown preferredContact', () =>
    assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ preferredContact: 'sms' }))));
  it('denied: phone not in +923XXXXXXXXX form', async () => {
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ phone: '03001234567' })));
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ phone: '+92300123456' })));
  });
  it('denied: client-chosen timestamps', async () => {
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ createdAt: Timestamp.fromMillis(0) })));
    await assertFails(setDoc(doc(alice(), 'privateProfiles/alice'), profile({ updatedAt: Timestamp.fromMillis(0) })));
  });
});

describe('privateProfiles: read, update, delete', () => {
  beforeEach(() => env.withSecurityRulesDisabled(c =>
    setDoc(doc(c.firestore(), 'privateProfiles/alice'), { ...profile(), createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) })));

  it('owner can read', () => assertSucceeds(getDoc(doc(alice(), 'privateProfiles/alice'))));
  it('denied: another verified user reads it', () =>
    assertFails(getDoc(doc(env.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true }).firestore(), 'privateProfiles/alice'))));
  it('denied: signed-out read', () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'privateProfiles/alice'))));
  it('denied: listing the collection', () =>
    assertFails(getDocs(collection(env.authenticatedContext('bob', { email_verified: true }).firestore(), 'privateProfiles'))));
  it('owner can update phone', () =>
    assertSucceeds(updateDoc(doc(alice(), 'privateProfiles/alice'), { phone: '+923111234567', updatedAt: serverTimestamp() })));
  it('denied: update without fresh updatedAt', () =>
    assertFails(updateDoc(doc(alice(), 'privateProfiles/alice'), { phone: '+923111234567' })));
  it('denied: update adds role', () =>
    assertFails(updateDoc(doc(alice(), 'privateProfiles/alice'), { role: 'admin', updatedAt: serverTimestamp() })));
  it('denied: update changes createdAt', () =>
    assertFails(updateDoc(doc(alice(), 'privateProfiles/alice'), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
  it('denied: update with invalid phone', () =>
    assertFails(updateDoc(doc(alice(), 'privateProfiles/alice'), { phone: 'call me', updatedAt: serverTimestamp() })));
  it('denied: update by another user', () =>
    assertFails(updateDoc(doc(env.authenticatedContext('bob', { email: 'alice@example.com' }).firestore(), 'privateProfiles/alice'), { phone: '+923111234567', updatedAt: serverTimestamp() })));
  it('denied: owner deletes', () => assertFails(deleteDoc(doc(alice(), 'privateProfiles/alice'))));
});

describe('publicDonorProfiles: read requires verified email', () => {
  beforeEach(() => env.withSecurityRulesDisabled(c =>
    setDoc(doc(c.firestore(), 'publicDonorProfiles/d1'), { displayName: 'Donor', bloodGroup: 'O+', province: 'Punjab', city: 'Lahore', availability: 'available', discoverable: true, verified: false, updatedAt: Timestamp.now() })));

  it('verified user can read and list', async () => {
    const fs = env.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true }).firestore();
    await assertSucceeds(getDoc(doc(fs, 'publicDonorProfiles/d1')));
    await assertSucceeds(getDocs(collection(fs, 'publicDonorProfiles')));
  });
  it('denied: signed in but email not verified', async () => {
    await assertFails(getDoc(doc(alice(), 'publicDonorProfiles/d1')));
    await assertFails(getDocs(collection(alice(), 'publicDonorProfiles')));
  });
  it('denied: signed out', () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicDonorProfiles/d1'))));
});
