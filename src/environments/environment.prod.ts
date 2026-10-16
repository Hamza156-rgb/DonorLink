export const environment = {
  production: true,
  appVersion: '1.0.0',
  functionsRegion: 'asia-south1',
  /** Contact runs on Firestore security rules (no Cloud Functions), so it works on the free Spark plan. */
  features: { contact: true },
  useEmulators: false,
  // Firebase web config for project donorlink-b261c. Not a secret: it only identifies the project; firestore.rules protect the data.
  firebase: {
    apiKey: 'AIzaSyBXWPI9UQM62FniYWmLrSI8-WESnUKveuo',
    authDomain: 'donorlink-b261c.firebaseapp.com',
    projectId: 'donorlink-b261c',
    storageBucket: 'donorlink-b261c.firebasestorage.app',
    messagingSenderId: '701425166331',
    appId: '1:701425166331:web:a5756d6ddaa07319c3cd5e',
  },
};
