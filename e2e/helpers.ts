import { expect, type BrowserContext, type Page } from '@playwright/test'
import { MockRelay } from './relay'

export async function add(page: Page, text: string) {
  await page.getByLabel('Add an item').fill(text)
  await page.getByLabel('Add an item').press('Enter')
}

/** Open a fresh list on a mock relay and wait until it has loaded from IndexedDB. */
export async function openList(page: Page, context: BrowserContext, slug: string) {
  await new MockRelay().attach(context)
  await page.goto(`/${slug}`)
  await expect(page.getByText('Nothing on the list yet')).toBeVisible()
}

/** Move focus out of any input so global keyboard shortcuts apply. */
export async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}
