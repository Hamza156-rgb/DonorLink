// Local development runs against the Firebase Emulator Suite (`firebase emulators:start`).
// "demo-" project IDs are emulator-only by Firebase convention: no real project, no secrets.
export const environment = {
  production: false,
  appVersion: '1.0.0',
  functionsRegion: 'asia-south1',
  /** Contact runs on Firestore security rules (no Cloud Functions), so it works on the free Spark plan. */
  features: { contact: true },
  useEmulators: true,
  firebase: { projectId: 'demo-donorlink', apiKey: 'demo-api-key', authDomain: 'demo-donorlink.firebaseapp.com', appId: 'demo-app' },
};
