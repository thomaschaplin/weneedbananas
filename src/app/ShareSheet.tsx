import qrcode from 'qrcode-generator'
import { useMemo, useState } from 'preact/hooks'

export function ShareContent({ slug }: { slug: string }) {
  const url = `https://weneedbananas.com/${slug}`
  const [copied, setCopied] = useState(false)
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
        Anyone with these three words can see and edit this list, so share them only with the people you shop with.
        Say them out loud, scan the code, or type them on the home page.
      </p>
    </div>
  )
}
