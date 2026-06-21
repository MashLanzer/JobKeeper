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
}

export default config
