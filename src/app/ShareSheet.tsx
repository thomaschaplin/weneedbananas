import qrcode from 'qrcode-generator'
import { useMemo, useState } from 'preact/hooks'
import type { Item } from '../lib/doc'
import { listAsText } from '../lib/export'

export function ShareContent({ slug, items, order }: { slug: string; items?: Item[]; order?: string[] }) {
  const url = `https://weneedbananas.com/${slug}`
  const [copied, setCopied] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const text = () => listAsText(slug, items ?? [], order ?? [], url)
  const qrSvg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the words are on screen anyway */
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Our shopping list', text: `Our shopping list: ${slug}`, url })
    } catch {
      /* cancelled */
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text())
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const shareText = async () => {
    try {
      await navigator.share({ text: text() })
    } catch {
      /* cancelled */
    }
  }

  return (
    <div class="share">
      <p class="share-words" aria-label={`List name: ${slug.split('.').join(' ')}`}>
        {slug.split('.').map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </p>
      <div class="share-actions">
        {'share' in navigator && (
          <button type="button" class="btn btn-primary" onClick={share}>
            Send link
          </button>
        )}
        <button type="button" class="btn" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>
      <div class="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code for this list" role="img" />
      <p class="muted small">
        Anyone with these three words can see and edit this list, so share them only with the people you shop with. Say
        them out loud, scan the code, or type them on the home page.
      </p>
      {items && items.some((i) => !i.done) && (
        <div class="share-text">
          <p class="muted small">Or send what's left to get as a plain message, with the list link at the bottom.</p>
          <div class="share-actions">
            <button type="button" class="btn" onClick={copyText}>
              {copiedText ? 'Copied ✓' : 'Copy items as text'}
            </button>
            {'share' in navigator && (
              <button type="button" class="btn" onClick={shareText}>
                Send items as text
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
