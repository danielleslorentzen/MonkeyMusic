import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lyd.companion',
  appName: 'Lyd',
  webDir: '../web/dist',
  android: {
    // Zero-network default is a kid-safety requirement (TDD §5.4):
    // the P0 app makes no network requests at all.
    allowMixedContent: false,
  },
};

export default config;
