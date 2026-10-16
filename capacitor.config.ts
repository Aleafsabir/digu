import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thaasbai.digu',
  appName: 'Thaasbai',
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
