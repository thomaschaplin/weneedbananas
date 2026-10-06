import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps wrap the web app built by `npm run build:native` (see src/lib/nav.ts).
const config: CapacitorConfig = {
  appId: 'com.weneedbananas.app',
  appName: 'We Need Bananas',
  webDir: 'dist-native',
  backgroundColor: '#fffbea',
  ios: { contentInset: 'never' },
}

export default config
