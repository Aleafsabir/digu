import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thaasbai.digu',
  appName: 'Holhuashi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Haptics: {},
    ScreenOrientation: {},
  },
};

export default config;
