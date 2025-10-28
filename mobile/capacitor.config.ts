import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.workouttracker',
  appName: 'Workout Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
