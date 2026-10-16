// End-to-end flow against the Auth + Firestore + Functions emulators, using the same SDK calls as AuthService.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { EmailAuthProvider, connectAuthEmulator, getAuth, getIdToken, linkWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, signInAnonymously, signOut, updateProfile } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, setLogLevel, Timestamp, where } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const PROJECT = 'demo-donorlink', AUTH = 'http://127.0.0.1:9099', FS = 'http://127.0.0.1:8080';
const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-api-key' }, 'auth-flow');
const auth = getAuth(app), fs = getFirestore(app), fns = getFunctions(app, 'asia-south1');
const contact = httpsCallable(fns, 'createContactRequest');
const respond = httpsCallable(fns, 'respondToContactRequest');
const REQ = { bloodGroup: 'O+', urgency: 'today', hospital: 'Mayo Hospital, Lahore', message: 'Patient in ward 4' };
const signIn = (email: string) => import('firebase/auth').then(m => m.signInWithEmailAndPassword(auth, email, 'correct-horse-1'));
setLogLevel('silent');
const oob = async () => (await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes as { email: string; requestType: string; oobLink: string }[];
const donorSearch = () => getDocs(query(collection(fs, 'publicDonorProfiles'), where('discoverable', '==', true), limit(15)));

beforeAll(async () => {
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  connectFirestoreEmulator(fs, '127.0.0.1', 8080);
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  // One listed donor, written with the emulator's owner token (bypasses rules).
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/publicDonorProfiles/donor1`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { displayName: { stringValue: 'Donor' }, bloodGroup: { stringValue: 'O+' }, city: { stringValue: 'Lahore' }, discoverable: { booleanValue: true }, updatedAt: { timestampValue: Timestamp.now().toDate().toISOString() } } }),
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
  it('a guest cannot contact a donor (Cloud Function refuses)', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'functions/permission-denied' });
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
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'functions/permission-denied' });
  });
  it('after verifying, the account can contact a donor', async () => {
    const link = (await oob()).find(c => c.email === email && c.requestType === 'VERIFY_EMAIL')!.oobLink;
    expect((await fetch(link)).ok).toBe(true);
    const u = auth.currentUser!;
    await reload(u); expect(u.emailVerified).toBe(true);
    await getIdToken(u, true);
    await expect(contact({ toUid: 'donor1', ...REQ })).resolves.toMatchObject({ data: { id: `${u.uid}_donor1` } });
  });
  it('a second request to the same donor is refused while the first is open', async () => {
    await expect(contact({ toUid: 'donor1', ...REQ })).rejects.toMatchObject({ code: 'functions/already-exists' });
  });
  it('requests need a hospital and a valid blood group', async () => {
    await expect(contact({ toUid: 'donor2', ...REQ, hospital: '' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
    await expect(contact({ toUid: 'donor2', ...REQ, bloodGroup: 'Z+' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
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
    const { data } = await contact({ toUid: donorUid, ...REQ }) as { data: { id: string } };
    expect(data.id).toBe(`${saraUid}_${donorUid}`);
    const before = (await getDoc(doc(fs, 'contactRequests', data.id))).data()!;
    expect(before.status).toBe('pending'); expect(before.sharedContact).toBeUndefined(); expect(before.hospital).toBe(REQ.hospital);
    await expect(respond({ id: data.id, accept: true })).rejects.toMatchObject({ code: 'functions/permission-denied' });   // requester can't accept
    await signOut(auth); await signIn('donor2@example.com');
    await expect(respond({ id: data.id, accept: true })).resolves.toMatchObject({ data: { status: 'accepted' } });
    await expect(respond({ id: data.id, accept: false })).rejects.toMatchObject({ code: 'functions/failed-precondition' });   // can't answer twice
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
    const { data } = await contact({ toUid: donorUid, ...REQ }) as { data: { id: string } };
    await signOut(auth); await signIn('donor3@example.com');
    await respond({ id: data.id, accept: false });
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
