// Local development runs against the Firebase Emulator Suite (`firebase emulators:start`).
// "demo-" project IDs are emulator-only by Firebase convention: no real project, no secrets.
export const environment = {
  production: false,
  appVersion: '1.0.0',
  functionsRegion: 'asia-south1',
  /** Contact workflow needs Cloud Functions (Blaze plan in production). The emulator always has them. */
  features: { contact: true },
  useEmulators: true,
  firebase: { projectId: 'demo-donorlink', apiKey: 'demo-api-key', authDomain: 'demo-donorlink.firebaseapp.com', appId: 'demo-app' },
};
