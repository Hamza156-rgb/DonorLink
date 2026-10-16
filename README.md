# Pakistan Blood Donation App (core slice)
Status: source written, NOT yet installed, built or tested.

## What is here
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`
- `functions/`: setAdminRole, createContactRequest (rate-limited), setRequestStatus, expireRequests
- `src/`: design tokens, models, donor search service + page (cursor pagination, privacy-safe public profile)

## Setup
1. `npm i -g @ionic/cli firebase-tools` (Node 20+)
2. `ionic start bloodapp blank --type=angular --capacitor`, then copy this `src/` over its `src/`
3. `ng add @angular/fire`, add your Firebase config to `src/environments/environment.ts` (never commit secrets)
4. `firebase login && firebase use <your-project-id>`
5. `firebase deploy --only firestore,storage` and `cd functions && npm i && npm run build`
6. First admin: in Firebase console create the user, then run once with a service account kept OUTSIDE the repo:
   `node -e "require('firebase-admin').initializeApp();require('firebase-admin').auth().setCustomUserClaims('<UID>',{admin:true})"`
7. `ionic serve`; Android: `ionic build && npx cap add android && npx cap open android`

## Not built yet
Auth screens, profile, blood requests UI, contact inbox, notifications/FCM, admin dashboard, rules tests, other screens.
