import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setLogLevel, addDoc, deleteDoc, doc, getDoc, getDocs, collection, limit, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

setLogLevel('silent'); // denied writes are expected; keep output readable
let env: RulesTestEnvironment;
const ALICE = { email: 'alice@example.com', email_verified: false };
const profile = (over: Record<string, unknown> = {}) => ({
  fullName: 'Alice Khan', email: 'alice@example.com', phone: '+923001234567', preferredContact: 'in_app',
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over,
});
const alice = () => env.authenticatedContext('alice', ALICE).firestore();
const GUEST = { firebase: { sign_in_provider: 'anonymous' } };
const guest = () => env.authenticatedContext('guest1', GUEST).firestore();
const verifiedBob = () => env.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore();
const donor = (over: Record<string, unknown> = {}) => ({ displayName: 'Bob', bloodGroup: 'O+', province: 'Punjab', city: 'Lahore', availability: 'available', discoverable: true, verified: false, updatedAt: serverTimestamp(), ...over });
const search = (fs: ReturnType<typeof alice>, n?: number) => getDocs(n === undefined
  ? query(collection(fs, 'publicDonorProfiles'), where('bloodGroup', '==', 'O+'))
  : query(collection(fs, 'publicDonorProfiles'), where('bloodGroup', '==', 'O+'), limit(n)));

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

describe('publicDonorProfiles: search (guests included)', () => {
  beforeEach(() => env.withSecurityRulesDisabled(c =>
    setDoc(doc(c.firestore(), 'publicDonorProfiles/d1'), { ...donor(), updatedAt: Timestamp.now() })));

  it('guest can search, 15 per page', () => assertSucceeds(search(guest(), 15)));
  it('guest can open one donor', () => assertSucceeds(getDoc(doc(guest(), 'publicDonorProfiles/d1'))));
  it('unverified and verified accounts can search', async () => {
    await assertSucceeds(search(alice(), 15));
    await assertSucceeds(search(verifiedBob(), 10));
  });
  it('denied: search without a limit (bulk copy)', () => assertFails(search(guest())));
  it('denied: more than 15 per page', () => assertFails(search(guest(), 50)));
  it('denied: no session at all', async () => {
    await assertFails(search(env.unauthenticatedContext().firestore(), 15));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicDonorProfiles/d1')));
  });
});

describe('publicDonorProfiles: listing yourself needs a verified account', () => {
  it('verified account can list itself', () => assertSucceeds(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor())));
  it('denied: guest lists itself', () => assertFails(setDoc(doc(guest(), 'publicDonorProfiles/guest1'), donor())));
  it('denied: unverified account lists itself', () => assertFails(setDoc(doc(alice(), 'publicDonorProfiles/alice'), donor())));
  it('denied: verified account sets verified=true', () => assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ verified: true }))));
  it('denied: listing someone else', () => assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/carol'), donor())));
});

describe('guests cannot write account data', () => {
  it('denied: private profile', () => assertFails(setDoc(doc(guest(), 'privateProfiles/guest1'), profile({ email: 'x@example.com' }))));
  it('denied: blood request', () => assertFails(addDoc(collection(guest(), 'bloodRequests'), { requesterId: 'guest1', status: 'pending_review', confirmedAccurate: true })));
  it('denied: report', () => assertFails(addDoc(collection(guest(), 'userReports'), { reporterId: 'guest1' })));
  it('denied: donation history, blocks, device tokens', async () => {
    await assertFails(setDoc(doc(guest(), 'donationHistory/guest1/entries/e1'), { at: 1 }));
    await assertFails(setDoc(doc(guest(), 'blockedUsers/guest1/blocked/x'), { at: 1 }));
    await assertFails(setDoc(doc(guest(), 'deviceTokens/guest1/tokens/t1'), { at: 1 }));
  });
  it('verified account can still create a blood request', () =>
    assertSucceeds(addDoc(collection(verifiedBob(), 'bloodRequests'), { requesterId: 'bob', status: 'pending_review', confirmedAccurate: true })));
  it('denied: unverified account creates a blood request', () =>
    assertFails(addDoc(collection(alice(), 'bloodRequests'), { requesterId: 'alice', status: 'pending_review', confirmedAccurate: true })));
});
