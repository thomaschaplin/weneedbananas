import { NATIVE } from './nav'

/** Whether there's a system share sheet: always in the apps, and in browsers that have the Web Share API. */
export const canShare = (): boolean => NATIVE || 'share' in navigator

/** Open the system share sheet. Rejects if it's cancelled or unavailable. */
export async function share(data: { title?: string; text?: string; url?: string }): Promise<void> {
  if (!NATIVE) return navigator.share(data)
  const { Share } = await import('@capacitor/share')
  await Share.share(data)
}
