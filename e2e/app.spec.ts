import { expect, test, type Page } from '@playwright/test'
import { MockRelay } from './relay'

const SLUG = /\/[a-z]+\.[a-z]+\.[a-z]+$/

async function add(page: Page, text: string) {
  await page.getByLabel('Add an item').fill(text)
  await page.getByLabel('Add an item').press('Enter')
}

test('landing page is prerendered and SEO-ready', async ({ request }) => {
  const res = await request.get('/')
  const html = await res.text()
  expect(html).toContain('<h1>')
  expect(html).toContain('three words')
  expect(html).toContain('"@type":"FAQPage"')
  expect(html).toContain('rel="canonical"')
  expect(html).not.toContain('noindex')

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /*.*.')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).not.toMatch(/\/[a-z]+\.[a-z]+\.[a-z]+</)
})

test('list pages are marked noindex', async ({ request }) => {
  const html = await (await request.get('/lemon.fork.bulb')).text()
  expect(html).toContain('noindex')
  expect(html).not.toContain('<h1>')
})

test('unknown pages get a real 404 with a way back', async ({ page, request }) => {
  const res = await request.get('/definitely-not-here', { headers: { accept: 'text/html' } })
  expect(res.status()).toBe(404)
  const html = await res.text()
  expect(html).toContain('noindex')
  expect(html).toContain('<h1>')

  await page.goto('/lemon-fork-bulb')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('every aisle')
  await expect(page.getByRole('link', { name: 'lemon.fork.bulb' })).toHaveAttribute('href', '/lemon.fork.bulb')
  await expect(page.getByRole('button', { name: 'Start a new list' })).toBeVisible()
})

test('offline page is prerendered and noindex', async ({ request }) => {
  const html = await (await request.get('/offline')).text()
  expect(html).toContain('<h1>')
  expect(html).toContain('noindex')
})

test('start a list, add, tick off in shop mode and finish', async ({ page, context }) => {
  await new MockRelay().attach(context)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new list' }).click()
  await expect(page).toHaveURL(SLUG)

  await add(page, '6 eggs, bananas, 500g mince, sourdough')
  await expect(page.getByRole('region', { name: 'Fruit & veg' })).toContainText('bananas')
  await expect(page.getByRole('region', { name: 'Dairy, eggs & chilled' })).toContainText('eggs')
  await expect(page.getByRole('region', { name: 'Meat & fish' })).toContainText('500g')

  // Adding eggs again merges instead of duplicating.
  await add(page, '6 eggs')
  await expect(page.getByRole('region', { name: 'Dairy, eggs & chilled' }).locator('.qty')).toHaveText('12')

  // Aisles appear in walking order.
  const aisles = await page.locator('.aisle-label').allTextContents()
  expect(aisles).toEqual(['Fruit & veg', 'Bakery', 'Meat & fish', 'Dairy, eggs & chilled'])

  await page.getByRole('tab', { name: /at the shop/i }).click()
  await expect(page.getByText('4 left')).toBeVisible()
  await page.getByRole('button', { name: 'Got bananas' }).click()
  await page.getByRole('button', { name: 'Got sourdough' }).click()
  await expect(page.getByText('2 left')).toBeVisible()

  await page.getByRole('button', { name: /Done shopping/ }).click()
  await expect(page.locator('.item')).toHaveCount(2)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.item')).toHaveCount(4)

  // Survives a reload (IndexedDB) and shows in recent lists on the home page.
  await page.reload()
  await expect(page.locator('.item')).toHaveCount(4)
  const slug = new URL(page.url()).pathname.slice(1)
  await page.goto('/')
  await expect(page.getByRole('link', { name: new RegExp(slug.replace(/\./g, '\\.')) })).toBeVisible()
})

test('two devices sync peer-to-peer', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'lemon.fork.bulb'
  const a = await browser.newContext()
  const b = await browser.newContext()
  await relay.attach(a)
  await relay.attach(b)
  const pa = await a.newPage()
  const pb = await b.newPage()

  // A writes while B isn't around yet.
  await pa.goto(`/${slug}`)
  await add(pa, 'eggs, bread')
  await expect(pa.locator('.item')).toHaveCount(2)

  // B opens later and catches up as soon as they meet.
  await pb.goto(`/${slug}`)
  await expect(pb.getByRole('button', { name: /Sync status: Live with 1/ })).toBeVisible({ timeout: 30_000 })
  await expect(pb.locator('.item')).toHaveCount(2)

  // Live edits in both directions.
  await add(pb, 'toothpaste')
  await expect(pa.getByRole('region', { name: 'Health & beauty' })).toContainText('toothpaste')
  await pa.getByRole('tab', { name: /at the shop/i }).click()
  await expect(pb.getByText(/at the shop\. Add anything/)).toBeVisible()
  await pa.getByRole('button', { name: 'Got eggs' }).click()
  await expect(pb.getByRole('button', { name: 'Put eggs back on the list' })).toBeVisible()

  await a.close()
  await b.close()
})

test('a device that opens the list after the first has gone still gets the items', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'apple.chair.lamp'
  const a = await browser.newContext()
  await relay.attach(a)
  const pa = await a.newPage()

  await pa.goto(`/${slug}`)
  await add(pa, 'eggs, bread, bananas')
  await expect(pa.getByRole('button', { name: 'Sync status: Up to date' })).toBeVisible({ timeout: 15_000 })
  // Put the phone down: this device is gone before the other one ever opens the list.
  await a.close()

  const b = await browser.newContext()
  await relay.attach(b)
  const pb = await b.newPage()
  await pb.goto(`/${slug}`)
  await expect(pb.locator('.item')).toHaveCount(3, { timeout: 15_000 })
  await expect(pb.getByRole('region', { name: 'Fruit & veg' })).toContainText('bananas')
  await b.close()
})

test('warns before a list that lives on one device could be lost', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'pear.drum.kite'
  const ctx = await browser.newContext()
  await relay.attach(ctx)
  const page = await ctx.newPage()

  await page.goto(`/${slug}`)
  await add(page, 'milk')
  await page.getByRole('button', { name: 'Sync status: Up to date' }).click({ timeout: 15_000 })
  const sheet = page.getByRole('dialog', { name: 'Sync' })
  await expect(sheet).toContainText('Only this device has this list.')
  await expect(sheet).toContainText(/relay copy is kept until .+ \(in 30 days\)/)

  // A list not opened here for 26 days gets a nudge on the home page.
  await page.evaluate((s) => {
    const old = Date.now() - 26 * 24 * 60 * 60 * 1000
    localStorage.setItem('wnb:recent', JSON.stringify([{ slug: s, openedAt: old, todo: 1 }]))
  }, slug)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /pear\.drum\.kite/ })).toContainText('Open to keep it safe · 4 days left')
  await ctx.close()
})

test('shop mode asks for your name and confirms it saved', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new list' }).click()
  await expect(page).toHaveURL(SLUG)
  await add(page, 'bananas')

  await page.getByRole('tab', { name: /at the shop/i }).click()
  const card = page.getByRole('region', { name: 'Your name' })
  await expect(card).toContainText("Who's shopping?")
  const save = card.getByRole('button', { name: 'Save' })
  await expect(save).toBeDisabled()
  await card.getByLabel('Your name').fill('Sam')
  await expect(card).toContainText('Not saved yet')
  await save.click()

  await expect(page.getByText('Shopping as Sam')).toBeVisible()
  await expect(page.getByText('✓ Saved')).toBeVisible()

  // The same name shows, already saved, in list settings.
  await page.getByRole('button', { name: 'List settings' }).click()
  const settings = page.getByRole('dialog', { name: 'List settings' })
  await expect(settings.getByLabel('Your name')).toHaveValue('Sam')
  await expect(settings.getByRole('button', { name: 'Save' })).toBeDisabled()
  await settings.getByLabel('Your name').fill('Sam B')
  await settings.getByLabel('Your name').press('Enter')
  await expect(settings.getByRole('button', { name: '✓ Saved' })).toBeVisible()
  await expect(settings).toContainText('Others on this list will see you as Sam B.')
  await settings.getByRole('button', { name: 'Close' }).click()

  await page.reload()
  await expect(page.getByText('Shopping as Sam B')).toBeVisible()
})

test('theme toggle overrides the system setting and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/how-it-works')
  const html = page.locator('html')
  const toggle = page.getByRole('button', { name: 'Dark mode' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(html).not.toHaveAttribute('data-theme')

  await toggle.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(await bg()).toBe('rgb(23, 21, 15)')

  // Survives navigation, including into a list.
  await page.goto('/lemon.fork.bulb')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true')

  // Switching back to what the system shows clears the override.
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect(html).not.toHaveAttribute('data-theme')
  expect(await page.evaluate(() => localStorage.getItem('wnb:theme'))).toBeNull()
})

test('a usual can be forgotten, with undo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new list' }).click()
  await expect(page).toHaveURL(SLUG)
  await add(page, 'mlik')
  await add(page, 'mlik')
  await page.getByRole('tab', { name: /at the shop/i }).click()
  await page.getByRole('button', { name: 'Got mlik' }).click()
  await page.getByRole('button', { name: /Done shopping/ }).click()
  await page.getByRole('tab', { name: /plan/i }).click()

  const usuals = page.getByLabel('Your usuals')
  await expect(usuals.getByRole('button', { name: '+ mlik' })).toBeVisible()
  await usuals.getByRole('button', { name: 'Forget mlik' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Forgot mlik' })).toBeVisible()
  await expect(usuals).toHaveCount(0)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Your usuals').getByRole('button', { name: '+ mlik' })).toBeVisible()
})

for (const width of [320, 360]) {
  test.describe(`${width}px phones`, () => {
    test.use({ viewport: { width, height: 640 } })

    for (const path of ['/', '/lemon.fork.bulb']) {
      test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(scrollWidth).toBe(width)
      })
    }
  })
}

test('copy the list as plain text, grouped by aisle', async ({ page, context }) => {
  await new MockRelay().attach(context)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/lemon.fork.bulb')
  await add(page, '6 bananas, 2 pints milk (semi-skimmed), bread')
  await expect(page.locator('.item')).toHaveCount(3)
  await page.getByRole('tab', { name: /at the shop/i }).click()
  await page.getByRole('button', { name: 'Got bread' }).click()

  await page.getByRole('button', { name: 'Share list lemon.fork.bulb' }).click()
  const sheet = page.getByRole('dialog', { name: 'Share this list' })
  await sheet.getByRole('button', { name: 'Copy items as text' }).click()
  await expect(sheet.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe(
    [
      'Shopping list (lemon.fork.bulb)',
      '',
      '🥦 Fruit & veg',
      '- 6 bananas',
      '',
      '🧀 Dairy, eggs & chilled',
      '- 2 pints milk (semi-skimmed)',
      '',
      'Shared list: https://weneedbananas.com/lemon.fork.bulb',
    ].join('\n'),
  )
})

test('text shared into the app goes into the chosen list for confirmation', async ({ page, context }) => {
  await new MockRelay().attach(context)
  await page.goto('/apple.chair.lamp')
  await expect(page.getByText('Nothing on the list yet')).toBeVisible()

  const shared = '100g flour\n2 eggs\nhttps://example.com/pancakes'
  await page.goto(`/share-target?title=Pancakes&text=${encodeURIComponent(shared)}`)
  // The shared text is gone from the address bar straight away.
  await expect(page).toHaveURL(/\/share-target$/)
  await expect(page.getByRole('heading', { name: 'Add to which list?' })).toBeVisible()
  await expect(page.getByText('2 items to check before adding')).toBeVisible()
  await page.getByRole('link', { name: /apple\.chair\.lamp/ }).click()

  await expect(page).toHaveURL(/\/apple\.chair\.lamp$/)
  await expect(page.getByLabel('Add an item')).toHaveValue('100g flour, 2 eggs')
  await expect(page.locator('.item')).toHaveCount(0)
  await page.getByLabel('Add an item').press('Enter')
  await expect(page.locator('.item')).toHaveCount(2)

  // Starting a new list from a share works too.
  await page.goto(`/share-target?text=${encodeURIComponent('bananas')}`)
  await page.getByRole('button', { name: 'Start a new list' }).click()
  await expect(page).toHaveURL(SLUG)
  await expect(page.getByLabel('Add an item')).toHaveValue('bananas')
})

test('share target page is noindex and in the manifest', async ({ request }) => {
  const html = await (await request.get('/share-target?text=eggs')).text()
  expect(html).toContain('noindex')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.share_target).toMatchObject({ action: '/share-target', method: 'GET' })
})

test('swipe right ticks an item, swipe left removes it with undo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a new list' }).click()
  await expect(page).toHaveURL(SLUG)
  await add(page, 'bananas, apples, sourdough')
  const row = (name: string) => page.locator('.item', { hasText: name })
  await expect(row('sourdough')).toBeVisible()

  async function swipe(name: string, fraction: number) {
    const box = (await row(name).boundingBox())!
    const y = box.y + box.height / 2
    const x0 = box.x + box.width / 2
    await page.mouse.move(x0, y)
    await page.mouse.down()
    await page.mouse.move(x0 + box.width * fraction, y, { steps: 12 })
    await page.mouse.up()
  }

  // A short, slow drag springs back without doing anything (or opening the editor).
  await swipe('bananas', 0.15)
  await expect(page.getByRole('button', { name: 'Got bananas' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('dialog[open]')).toHaveCount(0)

  // Plan mode: swipe right ticks, and the drag doesn't open the editor.
  await swipe('bananas', 0.45)
  await expect(page.getByRole('button', { name: 'Put bananas back on the list' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('dialog[open]')).toHaveCount(0)

  // Shop mode: swipe right again unticks (apples keep the aisle open so bananas stays shown).
  await page.getByRole('tab', { name: /at the shop/i }).click()
  await swipe('bananas', 0.45)
  await expect(page.getByRole('button', { name: 'Got bananas' })).toHaveAttribute('aria-pressed', 'false')

  // Swipe left removes, and Undo brings it back.
  await swipe('sourdough', -0.45)
  await expect(row('sourdough')).toHaveCount(0)
  await expect(page.getByText('Removed sourdough')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(row('sourdough')).toBeVisible()
})

test('moving a list to new words leaves the old words with only a notice', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'pear.drum.kite'
  const escaped = (s: string) => new RegExp(s.replace(/\./g, '\\.'))
  const a = await browser.newContext()
  const b = await browser.newContext()
  await relay.attach(a)
  await relay.attach(b)
  const pa = await a.newPage()
  const pb = await b.newPage()

  await pa.goto(`/${slug}`)
  await add(pa, 'eggs, bread, bananas')
  await pb.goto(`/${slug}`)
  await expect(pb.getByRole('button', { name: /Sync status: Live with 1/ })).toBeVisible({ timeout: 30_000 })
  await expect(pb.locator('.item')).toHaveCount(3)

  await pa.getByRole('button', { name: 'List settings' }).click()
  const settings = pa.getByRole('dialog', { name: 'List settings' })
  await settings.getByRole('button', { name: 'Move to new words' }).click()
  await expect(settings).toContainText('Everyone you want to keep on the list needs the new words')
  await settings.getByRole('button', { name: 'Move', exact: true }).click()

  // The mover lands on the new words, with the items, ready to share them.
  await expect(pa).not.toHaveURL(escaped(slug), { timeout: 15_000 })
  await expect(pa).toHaveURL(SLUG)
  const next = new URL(pa.url()).pathname.slice(1)
  await expect(pa.getByRole('dialog', { name: 'Share this list' })).toContainText(next.split('.')[2])
  await expect(pa.locator('.item')).toHaveCount(3)

  // Whoever is still on the old words sees it has moved, but not where to.
  await expect(pb.getByText('This list has been moved')).toBeVisible()
  await expect(pb.getByText('Ask whoever moved it for the new words.')).toBeVisible()
  await expect(pb.locator('.item')).toHaveCount(0)
  await expect(pb.getByLabel('Add an item')).toHaveCount(0)
  expect(await pb.content()).not.toContain(next)

  // The mover's recent lists swap the old words for the new.
  await pa.goto('/')
  await expect(pa.getByRole('link', { name: escaped(next) })).toBeVisible()
  await expect(pa.getByRole('link', { name: escaped(slug) })).toHaveCount(0)
  await a.close()
  await b.close()

  // A device opening the old words later gets the notice from the mailbox.
  const c = await browser.newContext()
  await relay.attach(c)
  const pc = await c.newPage()
  await pc.goto(`/${slug}`)
  await expect(pc.getByText('This list has been moved')).toBeVisible({ timeout: 15_000 })
  await expect(pc.locator('.item')).toHaveCount(0)
  await c.close()
})

test('a password keeps the list from anyone with only the words', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'plum.kettle.harp'
  const a = await browser.newContext()
  const b = await browser.newContext()
  await relay.attach(a)
  await relay.attach(b)
  const pa = await a.newPage()
  const pb = await b.newPage()

  await pa.goto(`/${slug}`)
  await add(pa, 'eggs, bread, bananas')
  await pb.goto(`/${slug}`)
  await expect(pb.locator('.item')).toHaveCount(3, { timeout: 30_000 })

  // Add a password.
  await pa.getByRole('button', { name: 'List settings' }).click()
  const settings = pa.getByRole('dialog', { name: 'List settings' })
  await settings.getByRole('button', { name: 'Add a password' }).click()
  await settings.getByLabel('New password').fill('short')
  await settings.getByLabel('Type it again').fill('short')
  await settings.getByRole('button', { name: 'Add password' }).click()
  await expect(settings.getByRole('alert')).toContainText('at least 8')
  await settings.getByLabel('New password').fill('pickled onions')
  await settings.getByLabel('Type it again').fill('pickled onions')
  await settings.getByRole('button', { name: 'Add password' }).click()
  await expect(pa.getByText('Password added')).toBeVisible({ timeout: 15_000 })
  // The device that set it keeps the list, and remembers the password.
  await expect(pa.locator('.item')).toHaveCount(3)
  await pa.reload()
  await expect(pa.locator('.item')).toHaveCount(3, { timeout: 15_000 })
  await pa.getByRole('button', { name: /Share list/ }).click()
  await expect(pa.getByRole('dialog', { name: 'Share this list' })).toContainText('also needs its password')
  await pa.keyboard.press('Escape')

  // The other device, on the words alone, is asked for it.
  await expect(pb.getByText('This list has a password')).toBeVisible({ timeout: 15_000 })
  await expect(pb.locator('.item')).toHaveCount(0)
  await pb.getByLabel('Password').fill('pickled onion')
  await pb.getByRole('button', { name: 'Open list' }).click()
  await expect(pb.getByText("That password doesn't open this list.")).toBeVisible({ timeout: 15_000 })
  await pb.getByLabel('Password').fill('pickled onions')
  await pb.getByRole('button', { name: 'Open list' }).click()
  await expect(pb.locator('.item')).toHaveCount(3, { timeout: 15_000 })

  // Change it: the other device must ask again.
  await pa.getByRole('button', { name: 'List settings' }).click()
  await settings.getByRole('button', { name: 'Change password' }).click()
  await settings.getByLabel('New password').fill('mushy peas forever')
  await settings.getByLabel('Type it again').fill('mushy peas forever')
  await settings.getByRole('button', { name: 'Change password' }).click()
  await expect(pa.getByText('Password changed')).toBeVisible({ timeout: 15_000 })
  await expect(pa.locator('.item')).toHaveCount(3)
  await expect(pb.getByText('The password has changed since this device last opened the list')).toBeVisible({
    timeout: 15_000,
  })
  await expect(pb.locator('.item')).toHaveCount(0)
  await a.close()
  await b.close()

  // A new device later gets nothing without the password, and everything with it.
  const c = await browser.newContext()
  await relay.attach(c)
  const pc = await c.newPage()
  await pc.goto(`/${slug}`)
  await expect(pc.getByText('This list has a password')).toBeVisible({ timeout: 15_000 })
  await pc.getByLabel('Password').fill('mushy peas forever')
  await pc.getByRole('button', { name: 'Open list' }).click()
  await expect(pc.locator('.item')).toHaveCount(3, { timeout: 15_000 })

  // Lock it on this device: the password and the copy here are forgotten, even across a reload.
  await pc.getByRole('button', { name: 'Lock this list on this device' }).click()
  await expect(pc.getByText('This list is locked')).toBeVisible({ timeout: 15_000 })
  await expect(pc.locator('.item')).toHaveCount(0)
  await pc.reload()
  await expect(pc.getByText('This list has a password')).toBeVisible({ timeout: 15_000 })
  expect(await pc.evaluate(() => localStorage.getItem('wnb:pw:plum.kettle.harp'))).toBeNull()
  // Unlocking brings the list back from the relays.
  await pc.getByLabel('Password').fill('mushy peas forever')
  await pc.getByRole('button', { name: 'Open list' }).click()
  await expect(pc.locator('.item')).toHaveCount(3, { timeout: 15_000 })

  // Remove it: the words alone open the list again.
  await pc.getByRole('button', { name: 'List settings' }).click()
  const cs = pc.getByRole('dialog', { name: 'List settings' })
  await cs.getByRole('button', { name: 'Remove password' }).click()
  await cs.getByRole('button', { name: 'Remove password' }).click()
  await expect(pc.getByText('Password removed')).toBeVisible({ timeout: 15_000 })
  await expect(pc.locator('.item')).toHaveCount(3)
  await c.close()

  const d = await browser.newContext()
  await relay.attach(d)
  const pd = await d.newPage()
  await pd.goto(`/${slug}`)
  await expect(pd.locator('.item')).toHaveCount(3, { timeout: 15_000 })
  await expect(pd.getByText('This list has a password')).toHaveCount(0)
  await d.close()
})

test('a passkey unlocks a list with a password without typing it', async ({ browser }) => {
  const relay = new MockRelay()
  const slug = 'fig.ladder.moss'
  const a = await browser.newContext()
  await relay.attach(a)
  const pa = await a.newPage()
  // A platform authenticator with PRF, like Face ID or Windows Hello with a synced passkey.
  const cdp = await a.newCDPSession(pa)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
    },
  })

  await pa.goto(`/${slug}`)
  await add(pa, 'eggs, bread, bananas')
  await pa.getByRole('button', { name: 'List settings' }).click()
  const settings = pa.getByRole('dialog', { name: 'List settings' })
  // No passkeys until the list has a password.
  await expect(settings.getByRole('button', { name: 'Add a passkey' })).toHaveCount(0)
  await settings.getByRole('button', { name: 'Add a password' }).click()
  await settings.getByLabel('New password').fill('pickled onions')
  await settings.getByLabel('Type it again').fill('pickled onions')
  await settings.getByRole('button', { name: 'Add password' }).click()
  await expect(pa.getByText('Password added')).toBeVisible({ timeout: 15_000 })

  await pa.getByRole('button', { name: 'List settings' }).click()
  await settings.getByRole('button', { name: 'Add a passkey' }).click()
  await expect(pa.getByText('Passkey added')).toBeVisible({ timeout: 15_000 })

  // Lock it here, then open it again with the passkey alone.
  await pa.getByRole('button', { name: 'Lock this list on this device' }).click()
  await expect(pa.getByText('This list is locked')).toBeVisible({ timeout: 15_000 })
  await pa.reload()
  await expect(pa.getByText('This list has a password')).toBeVisible({ timeout: 15_000 })
  await pa.getByRole('button', { name: 'Unlock with a passkey' }).click()
  await expect(pa.locator('.item')).toHaveCount(3, { timeout: 15_000 })

  // A device that has the words but none of the passkeys gets nothing from the sealed password.
  const b = await browser.newContext()
  await relay.attach(b)
  const pb = await b.newPage()
  await pb.goto(`/${slug}`)
  await expect(pb.getByText('This list has a password')).toBeVisible({ timeout: 15_000 })
  await expect(pb.locator('.item')).toHaveCount(0)
  await b.close()

  // Changing the password drops the passkeys: they hold the old one.
  await pa.getByRole('button', { name: 'List settings' }).click()
  await expect(settings).toContainText('One passkey has been added')
  await settings.getByRole('button', { name: 'Change password' }).click()
  await settings.getByLabel('New password').fill('mushy peas forever')
  await settings.getByLabel('Type it again').fill('mushy peas forever')
  await settings.getByRole('button', { name: 'Change password' }).click()
  await expect(pa.getByText('passkeys need adding again')).toBeVisible({ timeout: 15_000 })
  await pa.getByRole('button', { name: 'Lock this list on this device' }).click()
  await expect(pa.getByText('This list is locked')).toBeVisible({ timeout: 15_000 })
  await expect(pa.getByRole('button', { name: 'Unlock with a passkey' })).toHaveCount(0)
  await a.close()
})
