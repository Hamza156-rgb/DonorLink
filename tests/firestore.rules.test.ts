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
  it('verified account can update, pause and remove its listing', async () => {
    await assertSucceeds(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor()));
    await assertSucceeds(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ availability: 'temporarily_unavailable', discoverable: false })));
    await assertSucceeds(deleteDoc(doc(verifiedBob(), 'publicDonorProfiles/bob')));
  });
  it('denied: unknown province or blood group', async () => {
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ province: 'Atlantis' })));
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ bloodGroup: 'C+' })));
  });
  it('denied: name too short or too long', async () => {
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ displayName: 'B' })));
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ displayName: 'B'.repeat(41) })));
  });
  it('denied: missing city, non-boolean discoverable, or client timestamp', async () => {
    const { city: _c, ...noCity } = donor();
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), noCity));
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ discoverable: 'yes' })));
    await assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ updatedAt: Timestamp.fromMillis(0) })));
  });
  it('denied: adding a phone number to the public listing', () =>
    assertFails(setDoc(doc(verifiedBob(), 'publicDonorProfiles/bob'), donor({ phone: '+923000000001' }))));
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

describe('contact workflow (rules only, works on the free plan)', () => {
  const V = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore();
  const prof = (name: string, phone = '+923000000001') => ({ fullName: name, email: 'x@example.com', phone, preferredContact: 'whatsapp', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  beforeEach(() => env.withSecurityRulesDisabled(async c => {
    const fs = c.firestore();
    await setDoc(doc(fs, 'privateProfiles/sara'), prof('Sara Ali', '+923000000002'));
    await setDoc(doc(fs, 'privateProfiles/bob'), prof('Bob Khan', '+923000000001'));
    await setDoc(doc(fs, 'publicDonorProfiles/bob'), { ...donor({ displayName: 'Bob K.' }), updatedAt: Timestamp.now() });
    await setDoc(doc(fs, 'publicDonorProfiles/hid'), { ...donor({ displayName: 'Hidden H.', discoverable: false }), updatedAt: Timestamp.now() });
  }));
  const reqData = (from: string, to: string, over: Record<string, unknown> = {}) => ({ fromUid: from, toUid: to, status: 'pending', fromName: 'Sara Ali', toName: 'Bob K.',
    bloodGroup: 'O+', urgency: 'today', hospital: 'Mayo Hospital', city: 'Lahore', message: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over });
  const quota = (id: string, over: Record<string, unknown> = {}) => ({ windowStart: serverTimestamp(), count: 1, lastRequestId: id, lastRequestAt: serverTimestamp(), ...over });
  /** Same as the app: continue the current window (copying its server-set start) and count +1. */
  async function nextQuota(fs: ReturnType<typeof alice>, from: string, id: string) {
    const q = (await getDoc(doc(fs, 'requestQuota', from))).data()!;
    return quota(id, { windowStart: q['windowStart'], count: q['count'] + 1 });
  }
  async function send(fs: ReturnType<typeof alice>, from: string, to: string, over: Record<string, unknown> = {}, q?: Record<string, unknown> | null) {
    const { writeBatch } = await import('firebase/firestore');
    const id = `${from}_${to}`, b = writeBatch(fs);
    b.set(doc(fs, 'contactRequests', id), reqData(from, to, over));
    if (q !== null) b.set(doc(fs, 'requestQuota', from), q ?? quota(id));
    return b.commit();
  }

  it('verified account can send a request (with its rate-limit counter)', () => assertSucceeds(send(V('sara'), 'sara', 'bob')));
  it('denied: without bumping the rate-limit counter', () => assertFails(send(V('sara'), 'sara', 'bob', {}, null)));
  it('denied: guest or unverified sender', async () => {
    await assertFails(send(guest(), 'guest1', 'bob'));
    await assertFails(send(alice(), 'alice', 'bob'));
  });
  it('denied: faked names, city or a donor who is hidden/unlisted', async () => {
    await assertFails(send(V('sara'), 'sara', 'bob', { fromName: 'Someone Else' }));
    await assertFails(send(V('sara'), 'sara', 'bob', { toName: 'Fake' }));
    await assertFails(send(V('sara'), 'sara', 'bob', { city: 'Karachi' }));
    await assertFails(send(V('sara'), 'sara', 'hid', { toName: 'Hidden H.' }));
    await assertFails(send(V('sara'), 'sara', 'nobody'));
  });
  it('denied: requesting yourself, wrong id, or extra fields', async () => {
    await assertFails(send(V('bob'), 'bob', 'bob', { fromName: 'Bob Khan' }));
    await assertFails(send(V('sara'), 'sara', 'bob', { status: 'accepted' }));
    await assertFails(send(V('sara'), 'sara', 'bob', { sharedContact: { name: 'x', phone: 'y', preferredContact: 'phone' } }));
  });
  it('denied: missing hospital or bad urgency', async () => {
    await assertFails(send(V('sara'), 'sara', 'bob', { hospital: '' }));
    await assertFails(send(V('sara'), 'sara', 'bob', { urgency: 'now' }));
  });
  it('denied: blocked by the donor', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'blockedUsers/bob/blocked/sara'), { at: 1 }));
    await assertFails(send(V('sara'), 'sara', 'bob'));
  });
  it('denied: a second request while the first is open', async () => {
    await assertSucceeds(send(V('sara'), 'sara', 'bob'));
    await assertFails(send(V('sara'), 'sara', 'bob', {}, await nextQuota(V('sara'), 'sara', 'sara_bob')));
  });
  it('rate limit: the 6th request in an hour is refused', async () => {
    const fs = V('sara');
    await env.withSecurityRulesDisabled(async c => {
      for (const d of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']) await setDoc(doc(c.firestore(), `publicDonorProfiles/${d}`), { ...donor({ displayName: 'Bob K.' }), updatedAt: Timestamp.now() });
      await setDoc(doc(c.firestore(), 'requestQuota/sara'), { windowStart: Timestamp.now(), count: 5, lastRequestId: 'x', lastRequestAt: Timestamp.now() });
    });
    await assertFails(send(fs, 'sara', 'd6', {}, await nextQuota(fs, 'sara', 'sara_d6')));
    await assertFails(send(fs, 'sara', 'd6', {}, quota('sara_d6')));   // can't reset the window early either
  });
  it('rate limit: an old window can be restarted', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'requestQuota/sara'), { windowStart: Timestamp.fromMillis(Date.now() - 2 * 3600_000), count: 5, lastRequestId: 'x', lastRequestAt: Timestamp.now() }));
    await assertSucceeds(send(V('sara'), 'sara', 'bob'));
  });

  describe('answering', () => {
    beforeEach(() => send(V('sara'), 'sara', 'bob'));
    const accept = (fs: ReturnType<typeof alice>, shared = { name: 'Bob Khan', phone: '+923000000001', preferredContact: 'whatsapp' }) =>
      updateDoc(doc(fs, 'contactRequests/sara_bob'), { status: 'accepted', respondedAt: serverTimestamp(), updatedAt: serverTimestamp(), sharedContact: shared });

    it('both parties can read it; a third person cannot', async () => {
      await assertSucceeds(getDoc(doc(V('sara'), 'contactRequests/sara_bob')));
      await assertSucceeds(getDoc(doc(V('bob'), 'contactRequests/sara_bob')));
      await assertFails(getDoc(doc(V('eve'), 'contactRequests/sara_bob')));
      await assertFails(getDoc(doc(guest(), 'contactRequests/sara_bob')));
    });
    it('each can list their own side; nobody can list someone else’s', async () => {
      await assertSucceeds(getDocs(query(collection(V('sara'), 'contactRequests'), where('fromUid', '==', 'sara'))));
      await assertSucceeds(getDocs(query(collection(V('bob'), 'contactRequests'), where('toUid', '==', 'bob'))));
      await assertFails(getDocs(query(collection(V('eve'), 'contactRequests'), where('toUid', '==', 'bob'))));
      await assertFails(getDocs(collection(V('sara'), 'contactRequests')));
    });
    it('donor can accept, sharing exactly their own details', () => assertSucceeds(accept(V('bob'))));
    it('denied: donor shares a fake number', () => assertFails(accept(V('bob'), { name: 'Bob Khan', phone: '+923000000077', preferredContact: 'whatsapp' })));
    it('denied: the requester accepts on the donor’s behalf', () => assertFails(accept(V('sara'), { name: 'Sara Ali', phone: '+923000000002', preferredContact: 'whatsapp' })));
    it('donor can decline; declining shares nothing', async () => {
      await assertFails(updateDoc(doc(V('bob'), 'contactRequests/sara_bob'), { status: 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp(), sharedContact: { name: 'Bob Khan', phone: '+923000000001', preferredContact: 'whatsapp' } }));
      await assertSucceeds(updateDoc(doc(V('bob'), 'contactRequests/sara_bob'), { status: 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    });
    it('denied: answering twice or editing the request', async () => {
      await assertSucceeds(accept(V('bob')));
      await assertFails(updateDoc(doc(V('bob'), 'contactRequests/sara_bob'), { status: 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(V('bob'), 'contactRequests/sara_bob'), { hospital: 'Elsewhere' }));
    });
    it('after a decline, the requester can ask again', async () => {
      await updateDoc(doc(V('bob'), 'contactRequests/sara_bob'), { status: 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await assertSucceeds(send(V('sara'), 'sara', 'bob', {}, await nextQuota(V('sara'), 'sara', 'sara_bob')));
    });
    it('nobody can delete a request', () => assertFails(deleteDoc(doc(V('sara'), 'contactRequests/sara_bob'))));
  });
});
