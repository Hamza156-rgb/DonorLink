# Pakistan Blood Donation App (core slice)
Status: Ionic shell, branded UI, onboarding, auth module, home/donor search/account tabs, Android project. `ng lint`, `ng build`, `ng test`, rules tests pass (2026-10-16).

## What is here
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`
- `functions/`: setAdminRole, createContactRequest (rate-limited), setRequestStatus, expireRequests
- `src/`: design tokens, models, donor search service + page (cursor pagination, privacy-safe public profile)

## Run locally (no Firebase project needed)
Needs Node 20.19+ or 22.12+ (`nvm use` picks 22 from `.nvmrc`) and Java 21+ for the emulators (`export JAVA_HOME=/usr/local/opt/openjdk@21` on this Mac).
1. `npm install && npm --prefix tests install && npm --prefix functions install && npm --prefix functions run build`
2. Terminal 1: `npm run emulators` (Auth 9099, Firestore 8080, Functions 5001, UI http://127.0.0.1:4000)
3. Terminal 2: `ionic serve` (http://localhost:8100). Dev builds talk to the emulators (`src/environments/environment.ts`, project `demo-donorlink`).
4. Register, then open the verification link printed in the emulator terminal (or Emulator UI > Authentication), then tap "I've verified my email".
Test data: with emulators running, `npm run seed` (or `npm run dev` = emulators + seed + ionic serve). Local-only logins:
`donor@donorlink.test` / `Donor@12345` (verified, listed donor), `seeker@donorlink.test` / `Seeker@12345` (verified),
`newuser@donorlink.test` / `Newuser@12345` (unverified). Emulator data resets when the emulators stop; run the seed again.
Checks: `ng lint`, `ng build`, `ng test --watch=false`, `npm run test:rules:ci`.
If you change `angular.json` (styles, fonts, budgets), restart `ionic serve`; the dev server doesn't reload it.

## Android
- Package `com.donorlink.app` (set in `capacitor.config.ts`; permanent once published on Play).
- Icons and splash come from `resources/` (made from the logo). Regenerate after changing them:
  `npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FFFFFF'`
  Android 12+ uses `android/app/src/main/res/drawable-nodpi/splash_icon.png` on a white background (`values/styles.xml`).
- Debug APK: `ionic build && npx cap sync android && (cd android && ./gradlew assembleDebug)` (needs Java 21 and `ANDROID_HOME=~/Library/Android/sdk`).
- A phone can't reach emulators at 127.0.0.1; the device build needs the real Firebase project (next step).

## Access model
- Guest ("I need blood"): anonymous Firebase session; can search donors (rules cap each page at 15). Cannot contact, list, or post.
- Account: email + password; a guest who signs up is upgraded in place (same uid).
- Verified account: can list as a donor, post blood requests, and contact donors (`createContactRequest` refuses guests and unverified accounts).
- Firebase console: enable Anonymous and Email/Password sign-in, and App Check before launch.

## Contact workflow
Seeker taps Contact → `createContactRequest` (hospital, urgency, message; 5/hour; one open request per donor) → donor sees it in Requests → Received →
`respondToContactRequest`: Accept copies the donor's name + mobile into that one request (Call / WhatsApp appear under Requests → Sent); Decline shares nothing.
Only the two parties can read a request; no client can write one directly.

## Design system
Tokens: `src/theme/variables.scss` (brand navy/red from the logo). Shared UI: `src/theme/ui.scss` (`dl-` classes: hero, sheet, keycaps, raised CTA, alerts, skeletons).
`appPress` directive adds the pressed state and a light haptic on devices. Illustrations are inline SVG (`app-art`), font is bundled (no remote assets).

Versions: Angular is pinned to 20.3 because the latest stable `@angular/fire` (20.1.1) supports Angular 20 only.

## Setup (real Firebase project)
1. `npm i -g @ionic/cli firebase-tools` (Node 20+)
2. (Done: Ionic shell is scaffolded in this repo.)
3. Put your web config in `src/environments/environment.prod.ts` (keep real values out of commits); enable Email/Password sign-in and email enumeration protection in the console
4. `firebase login && firebase use <your-project-id>`
5. `firebase deploy --only firestore,storage` and `cd functions && npm i && npm run build`
6. First admin: in Firebase console create the user, then run once with a service account kept OUTSIDE the repo:
   `node -e "require('firebase-admin').initializeApp();require('firebase-admin').auth().setCustomUserClaims('<UID>',{admin:true})"`
7. `ionic serve`; Android: `ionic build && npx cap add android && npx cap open android`

## Not built yet
Profile, blood requests UI, contact inbox, notifications/FCM, admin dashboard, rules tests, other screens.
