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
      serverClientId: '379824223556-j3nl02vbf8b4cgebe9jisft80a3q7162.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
}

export default config
