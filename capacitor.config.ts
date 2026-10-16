import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Play Store package name: permanent once published, and needed when registering the Android app in Firebase.
  appId: 'com.donorlink.app',
  appName: 'DonorLink',
  webDir: 'www',
  android: { allowMixedContent: false, captureInput: true },
  plugins: {
    // Hidden by AppComponent after the first screen renders; auto-hide is a safety net.
    SplashScreen: { launchShowDuration: 3000, launchAutoHide: true, launchFadeOutDuration: 250, backgroundColor: '#FFFFFF', androidScaleType: 'CENTER_INSIDE', showSpinner: false },
    // Android 15+ draws edge-to-edge; Capacitor provides safe-area insets as CSS env() values.
    SystemBars: { insetsHandling: 'css', style: 'DARK', initialViewportFitValueHint: 'cover' },
    Keyboard: { resizeOnFullScreen: true },
  },
};

export default config;
