# CLAUDE.md: Pakistan Blood Donation App

## Current state (read first)
This folder is a partial slice, not a runnable Ionic project yet. It has Firebase rules, indexes, Cloud Functions,
design tokens, models and the donor search page. Nothing has been installed, built or tested.
Step 1 is always: scaffold the Ionic Angular shell (see README), copy `src/` in, get `ng build` passing.

## Stack
Ionic + Angular (standalone components, signals), strict TypeScript, Capacitor, Firebase Auth/Firestore/FCM/Functions/App Check.
No Express server. Use current stable, mutually compatible versions; check them, do not guess.

## Non-negotiable rules
- Private data (phone, email, exact location) lives only in `privateProfiles/{uid}`. Discovery uses `publicDonorProfiles` with consented, coarse fields only. Never merge them.
- Clients never set role, verified, suspended, request status, or notification recipients. Those go through Cloud Functions or custom claims. Route guards are not security.
- Any new collection or field needs a matching change in `firestore.rules`, `firestore.indexes.json`, and a rules test (Firebase Emulator, include the denied cases).
- Never claim medical eligibility or compatibility. Keep the "confirm with the hospital or blood bank" notes.
- No lock-screen notification text containing patient or donor details.
- No secrets, service-account files or real data in the repo. Never invent Firebase IDs.
- Do not say something works until you ran it. Report real command output.

## UI rules
Use tokens in `src/theme/variables.scss` (no hard-coded colors). Red = action/urgency only, green = available only.
Touch targets 48px, visible focus, sentence-case copy, action-named buttons ("Save changes"), errors say what to do next.
Every screen needs loading (skeleton), empty, error and offline states. No remote images or fonts at runtime.
Match the donor search page's look: it is the reference for new screens.

## Workflow
Build one module at a time: auth/onboarding, profile, blood requests, contact workflow, donation history,
notifications, reports/blocking, admin, account deletion. After each module run:
`ng lint`, `ng build`, `ng test --watch=false`, and `firebase emulators:exec "npm run test:rules"`.
Fix failures before moving on. Commit per module.

## Commands
`ionic serve` | `ng build` | `firebase emulators:start` | `firebase deploy --only firestore,storage` |
`cd functions && npm run build` | `ionic build && npx cap sync android && npx cap open android`
