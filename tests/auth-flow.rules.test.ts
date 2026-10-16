// End-to-end flow against the Auth + Firestore + Functions emulators, using the same SDK calls as AuthService.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { EmailAuthProvider, connectAuthEmulator, getAuth, getIdToken, linkWithCredential, reload, sendEmailVerification, sendPasswordResetEmail, signInAnonymously, signOut, updateProfile } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, setLogLevel, Timestamp, where } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const PROJECT = 'demo-donorlink', AUTH = 'http://127.0.0.1:9099', FS = 'http://127.0.0.1:8080';
const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-api-key' }, 'auth-flow');
const auth = getAuth(app), fs = getFirestore(app), fns = getFunctions(app);
const contact = httpsCallable(fns, 'createContactRequest');
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
    await expect(contact({ toUid: 'donor1' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
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
    await expect(contact({ toUid: 'donor1' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
  });
  it('after verifying, the account can contact a donor', async () => {
    const link = (await oob()).find(c => c.email === email && c.requestType === 'VERIFY_EMAIL')!.oobLink;
    expect((await fetch(link)).ok).toBe(true);
    const u = auth.currentUser!;
    await reload(u); expect(u.emailVerified).toBe(true);
    await getIdToken(u, true);
    await expect(contact({ toUid: 'donor1' })).resolves.toMatchObject({ data: { id: `${u.uid}_donor1` } });
  });
  it('password reset sends a reset email', async () => {
    await signOut(auth);
    await sendPasswordResetEmail(auth, email);
    expect((await oob()).some(c => c.email === email && c.requestType === 'PASSWORD_RESET')).toBe(true);
  });
});
