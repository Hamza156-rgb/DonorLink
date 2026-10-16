// End-to-end flow against the Auth + Firestore + Functions emulators, using the same SDK calls as AuthService.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { EmailAuthProvider, connectAuthEmulator, getAuth, getIdToken, linkWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, signInAnonymously, signOut, updateProfile } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, updateDoc, writeBatch, getFirestore, limit, query, serverTimestamp, setDoc, setLogLevel, Timestamp, where } from 'firebase/firestore';

const PROJECT = process.env.RULES_TEST_PROJECT ?? 'demo-donorlink', AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`, FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`;
const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-api-key' }, 'auth-flow');
const auth = getAuth(app), fs = getFirestore(app);
// Mirrors ContactService (src/app/core/contact.service.ts): one batch = request + rate-limit counter.
async function contact(r: { toUid: string; bloodGroup: string; urgency: string; hospital: string; message: string }) {
  const me = auth.currentUser!, id = `${me.uid}_${r.toUid}`;
  const [donor, profile, quota] = await Promise.all([getDoc(doc(fs, 'publicDonorProfiles', r.toUid)), getDoc(doc(fs, 'privateProfiles', me.uid)), getDoc(doc(fs, 'requestQuota', me.uid))]);
  const q = quota.data(); const inWindow = !!q && q['windowStart'].toMillis() > Date.now() - 3600_000;
  const b = writeBatch(fs);
  b.set(doc(fs, 'contactRequests', id), { fromUid: me.uid, toUid: r.toUid, status: 'pending', fromName: profile.data()?.['fullName'], toName: donor.data()?.['displayName'],
    bloodGroup: r.bloodGroup, urgency: r.urgency, hospital: r.hospital, city: donor.data()?.['city'], message: r.message, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  b.set(doc(fs, 'requestQuota', me.uid), inWindow ? { windowStart: q!['windowStart'], count: q!['count'] + 1, lastRequestId: id, lastRequestAt: serverTimestamp() }
    : { windowStart: serverTimestamp(), count: 1, lastRequestId: id, lastRequestAt: serverTimestamp() });
  await b.commit(); return id;
}
async function respond(id: string, accept: boolean) {
  const me = auth.currentUser!, p = (await getDoc(doc(fs, 'privateProfiles', me.uid))).data()!;
  await updateDoc(doc(fs, 'contactRequests', id), { status: accept ? 'accepted' : 'declined', respondedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...(accept ? { sharedContact: { name: p['fullName'], phone: p['phone'], preferredContact: p['preferredContact'] } } : {}) });
}
const REQ = { bloodGroup: 'O+', urgency: 'today', hospital: 'Mayo Hospital, Lahore', message: 'Patient in ward 4' };
const signIn = (email: string) => import('firebase/auth').then(m => m.signInWithEmailAndPassword(auth, email, 'correct-horse-1'));
setLogLevel('silent');
const oob = async () => (await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes as { email: string; requestType: string; oobLink: string }[];
const donorSearch = () => getDocs(query(collection(fs, 'publicDonorProfiles'), where('discoverable', '==', true), limit(15)));

beforeAll(async () => {
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  connectFirestoreEmulator(fs, new URL(FS).hostname, Number(new URL(FS).port));
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  // One listed donor, written with the emulator's owner token (bypasses rules).
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/publicDonorProfiles/donor1`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { displayName: { stringValue: 'Donor' }, bloodGroup: { stringValue: 'O+' }, city: { stringValue: 'Lahore' }, province: { stringValue: 'Punjab' }, availability: { stringValue: 'available' }, discoverable: { booleanValue: true }, updatedAt: { timestampValue: Timestamp.now().toDate().toISOString() } } }),
  });
});
afterAll(() => deleteApp(app));

describe('guest → account → verified', () => {
  const email = 'sara@example.com';
  let guestUid = '';

  it('a guest can search donors without an account', async () => {
    const { user } = await signInAnonymously(auth);
    guestUid = user.uid;
    expect((await donorSearch()).size).toBe(1);
  });
  it('a guest cannot contact a donor (rules refuse)', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('signing up upgrades the guest in place (same uid) and writes the private profile', async () => {
    const { user } = await linkWithCredential(auth.currentUser!, EmailAuthProvider.credential(email, 'correct-horse-1'));
    expect(user.uid).toBe(guestUid);
    expect(user.isAnonymous).toBe(false);
    await getIdToken(user, true);
    await updateProfile(user, { displayName: 'Sara Ali' });
    await setDoc(doc(fs, 'privateProfiles', user.uid), { fullName: 'Sara Ali', email: user.email, phone: '+923001234567', preferredContact: 'whatsapp', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await sendEmailVerification(user);
    expect((await oob()).some(c => c.email === email && c.requestType === 'VERIFY_EMAIL')).toBe(true);
  });
  it('an unverified account cannot contact donors yet', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('after verifying, the account can contact a donor', async () => {
    const link = (await oob()).find(c => c.email === email && c.requestType === 'VERIFY_EMAIL')!.oobLink;
    expect((await fetch(link)).ok).toBe(true);
    const u = auth.currentUser!;
    await reload(u); expect(u.emailVerified).toBe(true);
    await getIdToken(u, true);
    await expect(contact({ toUid: 'donor1', ...REQ })).resolves.toBe(`${u.uid}_donor1`);
  });
  it('a second request to the same donor is refused while the first is open', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('requests need a hospital and a valid blood group', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ, hospital: '' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(contact({ toUid: 'donor1', ...REQ, bloodGroup: 'Z+' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('only the donor can answer, and accepting shares the donor’s number with the requester', async () => {
    const saraUid = auth.currentUser!.uid;
    // A real donor account (verified, with a private profile and a public listing) for Sara to contact.
    await signOut(auth);
    const { user: donor } = await import('firebase/auth').then(m => m.createUserWithEmailAndPassword(auth, 'donor2@example.com', 'correct-horse-1'));
    await setDoc(doc(fs, 'privateProfiles', donor.uid), { fullName: 'Bilal Khan', email: 'donor2@example.com', phone: '+923000000002', preferredContact: 'whatsapp', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await sendEmailVerification(donor);
    await fetch((await oob()).filter(c => c.email === 'donor2@example.com').pop()!.oobLink); await reload(donor); await getIdToken(donor, true);
    await setDoc(doc(fs, 'publicDonorProfiles', donor.uid), { displayName: 'Bilal K.', bloodGroup: 'O+', province: 'Punjab', city: 'Lahore', availability: 'available', discoverable: true, verified: false, updatedAt: serverTimestamp() });
    const donorUid = donor.uid;
    await signOut(auth); await signIn(email);
    const data = { id: await contact({ toUid: donorUid, ...REQ }) };
    expect(data.id).toBe(`${saraUid}_${donorUid}`);
    const before = (await getDoc(doc(fs, 'contactRequests', data.id))).data()!;
    expect(before.status).toBe('pending'); expect(before.sharedContact).toBeUndefined(); expect(before.hospital).toBe(REQ.hospital);
    await expect(respond(data.id, true)).rejects.toMatchObject({ code: 'permission-denied' });   // requester can't accept
    await signOut(auth); await signIn('donor2@example.com');
    await expect(respond(data.id, true)).resolves.toBeUndefined();
    await expect(respond(data.id, false)).rejects.toMatchObject({ code: 'permission-denied' });   // can't answer twice
    await signOut(auth); await signIn(email);
    const after = (await getDoc(doc(fs, 'contactRequests', data.id))).data()!;
    expect(after.status).toBe('accepted');
    expect(after.sharedContact).toEqual({ name: 'Bilal Khan', phone: '+923000000002', preferredContact: 'whatsapp' });
  });
  it('declining shares nothing', async () => {
    const r = await import('firebase/auth').then(m => m.createUserWithEmailAndPassword(auth, 'donor3@example.com', 'correct-horse-1'));
    await setDoc(doc(fs, 'privateProfiles', r.user.uid), { fullName: 'Hira Shah', email: 'donor3@example.com', phone: '+923000000003', preferredContact: 'phone', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await sendEmailVerification(r.user);
    await fetch((await oob()).filter(c => c.email === 'donor3@example.com').pop()!.oobLink); await reload(r.user); await getIdToken(r.user, true);
    await setDoc(doc(fs, 'publicDonorProfiles', r.user.uid), { displayName: 'Hira S.', bloodGroup: 'O+', province: 'Sindh', city: 'Karachi', availability: 'available', discoverable: true, verified: false, updatedAt: serverTimestamp() });
    const donorUid = r.user.uid;
    await signOut(auth); await signIn(email);
    const data = { id: await contact({ toUid: donorUid, ...REQ }) };
    await signOut(auth); await signIn('donor3@example.com');
    await respond(data.id, false);
    await signOut(auth); await signIn(email);
    const after = (await getDoc(doc(fs, 'contactRequests', data.id))).data()!;
    expect(after.status).toBe('declined'); expect(after.sharedContact).toBeUndefined();
  });
  it('password reset sends a reset email', async () => {
    await signOut(auth);
    await sendPasswordResetEmail(auth, email);
    expect((await oob()).some(c => c.email === email && c.requestType === 'PASSWORD_RESET')).toBe(true);
  });
});
