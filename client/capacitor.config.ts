import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.player1205.guardcall',
  appName: 'GuardCall',
  webDir: 'dist',
  server: {
    // Allow mixed content for socket.io connections
    androidScheme: 'https',
    // Allow navigation to all URLs (needed for external links)
    allowNavigation: ['*']
  },
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true
  }
};

export default config;
