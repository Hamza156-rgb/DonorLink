// End-to-end auth flow against the Auth + Firestore emulators, using the same SDK calls as AuthService.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, getIdToken, reload, sendEmailVerification, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, setLogLevel, where } from 'firebase/firestore';

const PROJECT = 'demo-donorlink', AUTH = 'http://127.0.0.1:9099';
const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-api-key' }, 'auth-flow');
const auth = getAuth(app), fs = getFirestore(app);
setLogLevel('silent');
const oob = async () => (await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes as { email: string; requestType: string; oobLink: string }[];
const donorQuery = () => getDocs(query(collection(fs, 'publicDonorProfiles'), where('discoverable', '==', true), limit(5)));

beforeAll(async () => {
  connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  connectFirestoreEmulator(fs, '127.0.0.1', 8080);
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
});
afterAll(() => deleteApp(app));

describe('registration → verification → donor search', () => {
  const email = 'sara@example.com';
  it('register creates the user and its private profile, and sends a verification email', async () => {
    const { user } = await createUserWithEmailAndPassword(auth, email, 'correct-horse-1');
    await updateProfile(user, { displayName: 'Sara Ali' });
    await setDoc(doc(fs, 'privateProfiles', user.uid), { fullName: 'Sara Ali', email: user.email, phone: '+923001234567', preferredContact: 'whatsapp', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await sendEmailVerification(user);
    expect((await oob()).some(c => c.email === email && c.requestType === 'VERIFY_EMAIL')).toBe(true);
  });
  it('unverified user is refused donor search by the rules (not only by the guard)', async () => {
    await expect(donorQuery()).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('after opening the link, reload + forced token refresh unlocks donor search', async () => {
    const link = (await oob()).find(c => c.email === email && c.requestType === 'VERIFY_EMAIL')!.oobLink;
    expect((await fetch(link)).ok).toBe(true);
    const u = auth.currentUser!;
    await reload(u); expect(u.emailVerified).toBe(true);
    await getIdToken(u, true);
    await expect(donorQuery()).resolves.toBeDefined();
  });
  it('password reset sends a reset email', async () => {
    await signOut(auth);
    await sendPasswordResetEmail(auth, email);
    expect((await oob()).some(c => c.email === email && c.requestType === 'PASSWORD_RESET')).toBe(true);
  });
});
