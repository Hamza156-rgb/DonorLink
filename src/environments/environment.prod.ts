// Fill from Firebase console > Project settings > Your apps. Web config is not a secret,
// but keep real values out of commits (see README).
export const environment = {
  production: true,
  appVersion: '1.0.0',
  functionsRegion: 'asia-south1',
  /** Off while the project is on the free Spark plan (no Cloud Functions). Set true after upgrading to Blaze and deploying functions. */
  features: { contact: false },
  useEmulators: false,
  firebase: { projectId: '', apiKey: '', authDomain: '', appId: '', storageBucket: '', messagingSenderId: '' },
};
