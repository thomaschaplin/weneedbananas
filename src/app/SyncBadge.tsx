import type { SyncStatus } from '../lib/p2p'

export function syncLabel(s: SyncStatus): { text: string; tone: 'live' | 'solo' | 'offline' } {
  if (!s.online) return { text: 'Offline', tone: 'offline' }
  if (s.peers > 0) return { text: `Live with ${s.peers}`, tone: 'live' }
  return { text: 'Only here', tone: 'solo' }
}

export function SyncBadge({ status, onClick }: { status: SyncStatus; onClick: () => void }) {
  const { text, tone } = syncLabel(status)
  return (
    <button type="button" class={`sync-badge ${tone}`} onClick={onClick} aria-label={`Sync status: ${text}`}>
      <span class="dot" aria-hidden="true" />
      {text}
    </button>
  )
}

export function timeAgo(t: number | null): string {
  if (!t) return 'never'
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

export function SyncInfo({
  status,
  lastSync,
  onShare,
}: {
  status: SyncStatus
  lastSync: number | null
  onShare: () => void
}) {
  const names = Object.values(status.presence).map((p) => p.name || 'Someone')
  return (
    <div class="sync-info">
      {!status.online ? (
        <p>
          <strong>You're offline.</strong> Everything is saved on this device. Changes will sync next time you're online
          with someone else who has the list open.
        </p>
      ) : status.peers > 0 ? (
        <p>
          <strong>Live.</strong> Connected directly to {names.length ? names.join(', ') : `${status.peers} device(s)`}.
          Changes appear on both instantly.
        </p>
      ) : (
        <p>
          <strong>Only on this device right now.</strong> Your list is saved here. It syncs with others as soon as
          someone else opens it at the same time, even for a few seconds.
        </p>
      )}
      <p class="muted">Last synced with another device: {timeAgo(lastSync)}.</p>
      <p class="muted small">
        There's no server holding your list. Every device keeps a full copy and they update each other directly.
      </p>
      <button type="button" class="btn" onClick={onShare}>
        Share this list
      </button>
    </div>
  )
}
