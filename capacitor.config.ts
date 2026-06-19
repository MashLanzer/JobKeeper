// Capacitor configuration
// Install @capacitor/cli to use: npm install -D @capacitor/cli

interface CapacitorConfig {
  appId: string
  appName: string
  webDir: string
  server?: {
    androidScheme?: string
  }
}

const config: CapacitorConfig = {
  appId: 'com.workledger.app',
  appName: 'WorkLedger',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
}

export default config
