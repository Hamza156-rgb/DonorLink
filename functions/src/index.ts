import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
// Mumbai: closest region to Pakistan. Must match environment.functionsRegion in the app.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });
initializeApp();
const db = getFirestore();

/** Only an existing admin can grant admin. First admin: see README. */
export const setAdminRole = onCall(async (req) => {
  if (req.auth?.token.admin !== true) throw new HttpsError('permission-denied', 'Admins only.');
  const uid = String(req.data?.uid ?? '');
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');
  await getAuth().setCustomUserClaims(uid, { admin: req.data?.admin === true });
  await db.collection('adminAuditLogs').add({ actor: req.auth.uid, action: 'setAdminRole', target: uid, at: FieldValue.serverTimestamp() });
  return { ok: true };
});

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY = ['today', 'this_week', 'planned'];
const text = (v: unknown, min: number, max: number, field: string): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw new HttpsError('invalid-argument', `${field} must be ${min}–${max} characters.`);
  return s;
};
const requireVerifiedAccount = (auth: { token: Record<string, any> } | undefined, message: string) => {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  // Guests (anonymous sessions) can search but not contact; donors only deal with verified accounts.
  if (auth.token.firebase?.sign_in_provider === 'anonymous' || auth.token.email_verified !== true) throw new HttpsError('permission-denied', message);
};

/**
 * Seeker → donor contact request. Rate-limited (5/hour), blocked users refused, one open request per pair.
 * No phone numbers are exchanged here; the donor decides in respondToContactRequest.
 */
export const createContactRequest = onCall(async (req) => {
  requireVerifiedAccount(req.auth, 'Create an account and verify your email to contact donors.');
  const from = req.auth!.uid, to = String(req.data?.toUid ?? '');
  if (!to || to === from) throw new HttpsError('invalid-argument', 'Invalid donor.');
  const bloodGroup = String(req.data?.bloodGroup ?? ''), urgency = String(req.data?.urgency ?? '');
  if (!BLOOD_GROUPS.includes(bloodGroup)) throw new HttpsError('invalid-argument', 'Choose the blood group needed.');
  if (!URGENCY.includes(urgency)) throw new HttpsError('invalid-argument', 'Choose when blood is needed.');
  const hospital = text(req.data?.hospital, 2, 120, 'Hospital'), message = text(req.data?.message ?? '', 0, 300, 'Message');

  const donor = await db.doc(`publicDonorProfiles/${to}`).get();
  if (!donor.exists || donor.data()!.discoverable !== true) throw new HttpsError('not-found', 'This donor is no longer listed.');
  if ((await db.doc(`blockedUsers/${to}/blocked/${from}`).get()).exists) throw new HttpsError('permission-denied', 'Request not allowed.');
  const id = `${from}_${to}`, ref = db.doc(`contactRequests/${id}`), existing = await ref.get();
  if (existing.exists && existing.data()!.status !== 'declined') throw new HttpsError('already-exists', 'You already have a request with this donor. Check Requests for their reply.');
  const since = Timestamp.fromMillis(Date.now() - 3600_000);
  const recent = await db.collection('contactRequests').where('fromUid', '==', from).where('createdAt', '>', since).count().get();
  if (recent.data().count >= 5) throw new HttpsError('resource-exhausted', 'You’ve sent several requests in the last hour. Try again later.');

  const me = await db.doc(`privateProfiles/${from}`).get();
  await ref.set({
    fromUid: from, toUid: to, status: 'pending',
    fromName: me.data()?.fullName ?? req.auth!.token.name ?? 'DonorLink member', toName: donor.data()!.displayName,
    bloodGroup, urgency, hospital, city: donor.data()!.city ?? '', message,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  // Lock-screen safe: no patient, hospital or donor details in notification text.
  await db.doc(`userNotifications/${to}/items/${id}`).set({ type: 'contact_request', title: 'New contact request', read: false, createdAt: FieldValue.serverTimestamp() });
  return { id };
});

/** Donor answers a request. Accepting shares the donor's name and mobile with that one requester only. */
export const respondToContactRequest = onCall(async (req) => {
  requireVerifiedAccount(req.auth, 'Verify your email to answer requests.');
  const id = String(req.data?.id ?? ''), accept = req.data?.accept === true;
  const ref = db.doc(`contactRequests/${id}`), snap = id ? await ref.get() : null;
  if (!snap?.exists) throw new HttpsError('not-found', 'Request not found.');
  const r = snap.data()!;
  if (r.toUid !== req.auth!.uid) throw new HttpsError('permission-denied', 'Only the donor can answer this request.');
  if (r.status !== 'pending') throw new HttpsError('failed-precondition', 'This request was already answered.');
  const update: Record<string, unknown> = { status: accept ? 'accepted' : 'declined', respondedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
  if (accept) {
    const p = (await db.doc(`privateProfiles/${r.toUid}`).get()).data();
    if (!p?.phone) throw new HttpsError('failed-precondition', 'Add a mobile number to your profile before accepting.');
    update['sharedContact'] = { name: p.fullName, phone: p.phone, preferredContact: p.preferredContact ?? 'phone' };
  }
  await ref.update(update);
  await db.doc(`userNotifications/${r.fromUid}/items/${id}_reply`).set({ type: 'contact_reply', title: 'A donor replied to your request', read: false, createdAt: FieldValue.serverTimestamp() });
  return { status: update['status'] };
});

/** Status changes happen here so clients cannot skip moderation. */
export const setRequestStatus = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { id, status } = req.data ?? {};
  const ref = db.doc(`bloodRequests/${id}`); const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Request not found.');
  const owner = snap.data()!.requesterId === req.auth.uid, isAdmin = req.auth.token.admin === true;
  if (!((owner && ['fulfilled', 'cancelled'].includes(status)) || (isAdmin && ['open', 'rejected'].includes(status)))) throw new HttpsError('permission-denied', 'Not allowed.');
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const expireRequests = onSchedule('every 60 minutes', async () => {
  const q = await db.collection('bloodRequests').where('status', 'in', ['open', 'in_progress']).where('neededBy', '<', Timestamp.now()).limit(400).get();
  const b = db.batch(); q.docs.forEach(d => b.update(d.ref, { status: 'expired' })); await b.commit();
});
