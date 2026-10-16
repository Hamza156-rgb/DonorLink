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

// Contact requests (create / accept / decline) run on Firestore security rules, not here, so they work on the free plan.

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
