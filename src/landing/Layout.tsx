import type { ComponentChildren } from 'preact'
import { BananaMark } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header class="site-header">
      <a href="/" class="brand" aria-label="We Need Bananas home">
        <BananaMark size={30} />
        <span>we need bananas</span>
      </a>
      <nav aria-label="Main">
        <a href="/how-it-works">How it works</a>
        <a href="/privacy">Privacy</a>
        <ThemeToggle />
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer class="site-footer">
      <p>
        <strong>We Need Bananas</strong> is a free shared shopping list. No accounts, no ads, no server that
        stores your list.
      </p>
      <nav aria-label="Footer">
        <a href="/">Home</a>
        <a href="/how-it-works">How it works</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </footer>
  )
}

export function Page({ children }: { children: ComponentChildren }) {
  return (
    <>
      <SiteHeader />
      <main class="page">{children}</main>
      <SiteFooter />
    </>
  )
}
