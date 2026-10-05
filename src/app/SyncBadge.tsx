import type { MailboxStatus } from '../lib/mailbox'
import type { SyncStatus } from '../lib/p2p'
import { EXPIRY_DAYS, daysLeft, inDays } from '../lib/expiry'

export function syncLabel(
  s: SyncStatus,
  m: MailboxStatus,
): { text: string; tone: 'live' | 'saved' | 'solo' | 'offline' } {
  if (!s.online) return { text: 'Offline', tone: 'offline' }
  if (s.peers > 0) return { text: `Live with ${s.peers}`, tone: 'live' }
  if (m.state === 'saved') return { text: 'Up to date', tone: 'saved' }
  if (m.state === 'sending') return { text: 'Sending…', tone: 'solo' }
  return { text: 'Only here', tone: 'solo' }
}

export function SyncBadge({
  status,
  mailbox,
  onClick,
}: {
  status: SyncStatus
  mailbox: MailboxStatus
  onClick: () => void
}) {
  const { text, tone } = syncLabel(status, mailbox)
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
  mailbox,
  lastSync,
  onShare,
}: {
  status: SyncStatus
  mailbox: MailboxStatus
  lastSync: number | null
  onShare: () => void
}) {
  const names = Object.values(status.presence).map((p) => p.name || 'Someone')
  return (
    <div class="sync-info">
      {!status.online ? (
        <p>
          <strong>You're offline.</strong> Everything is saved on this device. Changes will be sent next time you're
          online.
        </p>
      ) : status.peers > 0 ? (
        <p>
          <strong>Live.</strong> Connected directly to {names.length ? names.join(', ') : `${status.peers} device(s)`}.
          Changes appear on both instantly.
        </p>
      ) : mailbox.state === 'saved' ? (
        <p>
          <strong>Up to date.</strong> Nobody else has the list open right now, but your changes are waiting for them,
          encrypted. Whoever opens the list next gets them, even if this phone is off.
        </p>
      ) : mailbox.state === 'sending' ? (
        <p>
          <strong>Sending your changes…</strong> Keep the list open for a moment so whoever opens it next gets them.
        </p>
      ) : (
        <p>
          <strong>Only on this device right now.</strong> Your list is saved here, but it can't reach the relays that
          pass changes on. It syncs with others as soon as it can, or straight away when someone else has it open.
        </p>
      )}
      <p class="muted">Last synced with another device: {timeAgo(lastSync)}.</p>
      <KeepSafe mailbox={mailbox} alone={!lastSync && status.peers === 0} />
      <p class="muted small">
        There are no accounts and no database of lists. Every device keeps a full copy and they update each other
        directly. An encrypted copy also waits on public Nostr relays for devices that open the list later; the relays
        can't read it.
      </p>
      <button type="button" class="btn" onClick={onShare}>
        Share this list
      </button>
    </div>
  )
}

/**
 * When the relay copy runs out, and a nudge to share if no other device has ever synced this list. `lastSync`
 * is remembered per list on this device whenever a peer connects or the mailbox brings in someone else's changes.
 */
function KeepSafe({ mailbox, alone }: { mailbox: MailboxStatus; alone: boolean }) {
  const expiresAt = mailbox.expiresAt
  return (
    <>
      {expiresAt ? (
        <p class="muted small keep-safe">
          The encrypted relay copy is kept until {new Date(expiresAt).toLocaleDateString(undefined, dateOpts)} (
          {inDays(daysLeft(expiresAt, Date.now()))}). Opening or editing the list on any device pushes that back another{' '}
          {EXPIRY_DAYS} days.
        </p>
      ) : null}
      {alone && (
        <p class="keep-safe-alone">
          <strong>Only this device has this list.</strong> Share the words so it's not lost if you lose this phone.
        </p>
      )}
    </>
  )
}

const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
