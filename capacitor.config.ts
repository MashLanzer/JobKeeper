import type { CapacitorConfig } from '@capacitor/cli'

const liveUrl = process.env.NEXT_PUBLIC_APP_URL

const config: CapacitorConfig = {
  appId: 'com.workledger.app',
  appName: 'WorkLedger',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    ...(liveUrl ? { url: liveUrl, cleartext: false } : {}),
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1050862543307-u88inlu21qv80r3t072568t3fo357dn2.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
}

export default config
