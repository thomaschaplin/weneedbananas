// Behaviour lives in public/theme.js, so this also works on pages that are never hydrated.
// It sets aria-pressed; leave that out of the JSX so Preact never resets it.
export function ThemeToggle() {
  return (
    <button type="button" class="icon-btn theme-toggle" data-theme-toggle aria-label="Dark mode">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="theme-moon">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="theme-sun">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  )
}
