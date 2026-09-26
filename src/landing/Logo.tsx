export function BananaMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" class="mark">
      <rect width="64" height="64" rx="16" fill="var(--banana, #ffd23f)" />
      <path
        d="M17 16C10 32 18 50 39 52c6 .5 10-1.5 13-5-12 0-22-6-27-15-3-6-3.5-11-2-16z"
        fill="#fff6c9"
        stroke="#2b2200"
        stroke-width="3.2"
        stroke-linejoin="round"
      />
      <path d="M16.5 17l.5-7h6l.5 7z" fill="#2b2200" />
      <path d="M52 47l3 1.5-2.5 2.5z" fill="#2b2200" stroke="#2b2200" stroke-width="2" stroke-linejoin="round" />
    </svg>
  )
}
