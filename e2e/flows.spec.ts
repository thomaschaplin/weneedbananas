import { expect, test, type Page } from '@playwright/test'
import { add, blur, openList } from './helpers'

const items = (page: Page) => page.locator('.item')
const toast = (page: Page) => page.locator('.toast')
const undoButton = (page: Page) => toast(page).getByRole('button', { name: 'Undo' })
const editSheet = (page: Page) => page.getByRole('dialog', { name: 'Edit item' })
const shopTab = (page: Page) => page.getByRole('tab', { name: /at the shop/i })
const planTab = (page: Page) => page.getByRole('tab', { name: /plan/i })
const MISSING_TAG = "couldn't find last time"

test.describe('undo from the toast', () => {
  test('undoes adding an item', async ({ page, context }) => {
    await openList(page, context, 'undo.add.toast')
    await add(page, 'bananas')
    await expect(items(page)).toHaveCount(1)
    await expect(toast(page)).toContainText('bananas → 🥦 Fruit & veg')
    await undoButton(page).click()
    await expect(items(page)).toHaveCount(0)
    await expect(toast(page)).toHaveCount(0)
    await expect(page.getByText('Nothing on the list yet')).toBeVisible()
  })

  test('undoes removing an item from the edit sheet', async ({ page, context }) => {
    await openList(page, context, 'undo.remove.toast')
    await add(page, 'bananas, bread')
    await expect(items(page)).toHaveCount(2)

    await page.getByRole('button', { name: 'Edit bread' }).click()
    await editSheet(page).getByRole('button', { name: 'Remove' }).click()
    await expect(editSheet(page)).toBeHidden()
    await expect(items(page)).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Bakery' })).toHaveCount(0)
    await expect(toast(page)).toContainText('Removed bread')

    await undoButton(page).click()
    await expect(items(page)).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Bakery' })).toContainText('bread')
  })

  test('undoes finishing the shop', async ({ page, context }) => {
    await openList(page, context, 'undo.finish.toast')
    await add(page, 'bananas, bread, milk')
    await shopTab(page).click()
    await page.getByRole('button', { name: 'Got bananas' }).click()
    await page.getByRole('button', { name: 'Got milk' }).click()
    await expect(page.getByText('1 left', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Done shopping · clear 2 bought/ }).click()
    await expect(toast(page)).toContainText('Cleared 2 bought items. Nice shop!')
    await expect(items(page)).toHaveCount(1)
    await expect(items(page)).toContainText('bread')
    // Finishing drops back to planning.
    await expect(planTab(page)).toHaveAttribute('aria-selected', 'true')

    await undoButton(page).click()
    await expect(items(page)).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Put bananas back on the list' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Put milk back on the list' })).toBeVisible()
  })
})

test.describe('keyboard undo and redo', () => {
  test('Ctrl+Z and Ctrl+Shift+Z undo and redo outside inputs', async ({ page, context }) => {
    await openList(page, context, 'keys.undo.redo')
    await add(page, 'bananas')
    await expect(items(page)).toHaveCount(1)
    await add(page, 'bread')
    await expect(items(page)).toHaveCount(2)

    await blur(page)
    await page.keyboard.press('Control+z')
    await expect(items(page)).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Bakery' })).toHaveCount(0)
    await page.keyboard.press('Control+z')
    await expect(items(page)).toHaveCount(0)

    await page.keyboard.press('Control+Shift+z')
    await expect(items(page)).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Fruit & veg' })).toContainText('bananas')
    await page.keyboard.press('Control+Shift+z')
    await expect(items(page)).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Bakery' })).toContainText('bread')
  })

  test('Ctrl+Z inside the add box does not undo list changes', async ({ page, context }) => {
    await openList(page, context, 'keys.input.undo')
    await add(page, 'bananas, bread')
    await expect(items(page)).toHaveCount(2)

    const input = page.getByLabel('Add an item')
    await input.fill('milk')
    await expect(input).toBeFocused()
    await input.press('Control+z')
    await input.press('Control+Shift+z')
    await input.press('Control+z')
    await expect(items(page)).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Bakery' })).toContainText('bread')

    // The shortcut still works once focus leaves the input.
    await blur(page)
    await page.keyboard.press('Control+z')
    await expect(items(page)).toHaveCount(0)
  })
})

test.describe("couldn't find it", () => {
  test('missing items survive the shop, are tagged, and clear when re-added', async ({ page, context }) => {
    await openList(page, context, 'missing.readd.clears')
    await add(page, 'bananas, saffron')
    await expect(items(page)).toHaveCount(2)
    await shopTab(page).click()

    await page.getByRole('button', { name: 'Options for saffron' }).click()
    await editSheet(page).getByRole('button', { name: "Couldn't find it" }).click()
    await expect(toast(page)).toContainText('Kept for next time')
    const saffron = items(page).filter({ hasText: 'saffron' })
    await expect(saffron).toContainText(MISSING_TAG)

    await page.getByRole('button', { name: 'Got bananas' }).click()
    await expect(page.getByText("The 1 you didn't get stay on the list for next time.")).toBeVisible()
    await page.getByRole('button', { name: /Done shopping · clear 1 bought/ }).click()
    await expect(items(page)).toHaveCount(1)
    await expect(saffron).toContainText(MISSING_TAG)

    // Still flagged after a reload.
    await page.reload()
    await expect(saffron).toContainText(MISSING_TAG)

    // The edit sheet offers to take the flag back.
    await page.getByRole('button', { name: 'Edit saffron' }).click()
    await expect(editSheet(page).getByRole('button', { name: 'Found it after all' })).toBeVisible()
    await editSheet(page).getByRole('button', { name: 'Close' }).click()
    await expect(editSheet(page)).toBeHidden()

    await add(page, 'saffron')
    await expect(toast(page)).toContainText('saffron: updated amount')
    await expect(items(page)).toHaveCount(1)
    await expect(saffron).not.toContainText(MISSING_TAG)
  })

  test('ticking a missing item clears the flag', async ({ page, context }) => {
    await openList(page, context, 'missing.tick.clears')
    await add(page, 'saffron')
    await expect(items(page)).toHaveCount(1)
    await shopTab(page).click()
    await page.getByRole('button', { name: 'Options for saffron' }).click()
    await editSheet(page).getByRole('button', { name: "Couldn't find it" }).click()
    await expect(items(page)).toContainText(MISSING_TAG)

    await page.getByRole('button', { name: 'Got saffron' }).click()
    await expect(page.getByText('All got!')).toBeVisible()
    // The finished aisle folds away in the shop; open it to check the row.
    await page.getByRole('button', { name: /all got/ }).click()
    await expect(items(page)).toHaveCount(1)
    await expect(items(page)).not.toContainText(MISSING_TAG)
    await page.getByRole('button', { name: 'Put saffron back on the list' }).click()
    await expect(page.getByText('1 left', { exact: true })).toBeVisible()
    await expect(items(page)).not.toContainText(MISSING_TAG)
  })

  test('"Found it after all" clears the flag', async ({ page, context }) => {
    await openList(page, context, 'missing.found.after')
    await add(page, 'saffron')
    await page.getByRole('button', { name: 'Edit saffron' }).click()
    await editSheet(page).getByRole('button', { name: "Couldn't find it" }).click()
    await expect(items(page)).toContainText(MISSING_TAG)
    await page.getByRole('button', { name: 'Edit saffron' }).click()
    await editSheet(page).getByRole('button', { name: 'Found it after all' }).click()
    await expect(items(page)).not.toContainText(MISSING_TAG)
  })
})

test('adding the same item twice merges the amounts', async ({ page, context }) => {
  await openList(page, context, 'merge.two.milks')
  await add(page, '2 milk')
  await expect(items(page)).toHaveCount(1)
  await add(page, '1 milk')
  await expect(toast(page)).toContainText('milk: updated amount')
  const dairy = page.getByRole('region', { name: 'Dairy, eggs & chilled' })
  await expect(dairy.locator('.qty')).toHaveText('3')
  await expect(dairy.locator('.item')).toHaveCount(1)
  await expect(items(page)).toHaveCount(1)

  // Undo only takes back the second add.
  await undoButton(page).click()
  await expect(dairy.locator('.qty')).toHaveText('2')
})

test('moving an item to another aisle is remembered for next time', async ({ page, context }) => {
  await openList(page, context, 'aisle.move.memory')
  await add(page, 'halloumi')
  await expect(page.getByRole('region', { name: 'Dairy, eggs & chilled' })).toContainText('halloumi')

  await page.getByRole('button', { name: 'Edit halloumi' }).click()
  const picker = editSheet(page).getByRole('radiogroup', { name: 'Aisle' })
  await expect(picker.getByRole('radio', { name: 'Dairy, eggs & chilled' })).toHaveAttribute('aria-checked', 'true')
  await picker.getByRole('radio', { name: 'Meat & fish' }).click()
  await expect(editSheet(page)).toBeHidden()
  await expect(toast(page)).toContainText('Moved to Meat & fish')
  await expect(page.getByRole('region', { name: 'Meat & fish' })).toContainText('halloumi')
  await expect(page.getByRole('region', { name: 'Dairy, eggs & chilled' })).toHaveCount(0)

  // Remove it, then add it again in different wording: it goes straight to the remembered aisle.
  await page.getByRole('button', { name: 'Edit halloumi' }).click()
  await editSheet(page).getByRole('button', { name: 'Remove' }).click()
  await expect(items(page)).toHaveCount(0)
  await add(page, '2 Halloumi')
  await expect(toast(page)).toContainText('Halloumi → 🥩 Meat & fish')
  await expect(page.getByRole('region', { name: 'Meat & fish' })).toContainText('Halloumi')

  // And after a reload.
  await page.reload()
  await page.getByRole('button', { name: 'Edit Halloumi' }).click()
  await editSheet(page).getByRole('button', { name: 'Remove' }).click()
  await expect(items(page)).toHaveCount(0)
  await add(page, 'halloumi')
  await expect(page.getByRole('region', { name: 'Meat & fish' })).toContainText('halloumi')
})

test('reordering aisles in list settings changes the section order', async ({ page, context }) => {
  await openList(page, context, 'aisle.order.settings')
  await add(page, 'bananas, bread, milk')
  const labels = page.locator('main .aisle-label')
  await expect(labels).toHaveText(['Fruit & veg', 'Bakery', 'Dairy, eggs & chilled'])

  await page.getByRole('button', { name: 'List settings' }).click()
  const settings = page.getByRole('dialog', { name: 'List settings' })
  await expect(settings.getByRole('button', { name: 'Move Fruit & veg earlier' })).toBeDisabled()
  await expect(settings.getByRole('button', { name: 'Move Everything else later' })).toBeDisabled()
  await settings.getByRole('button', { name: 'Move Bakery earlier' }).click()
  await expect(settings.locator('.aisle-order li').first()).toContainText('Bakery')
  await expect(labels).toHaveText(['Bakery', 'Fruit & veg', 'Dairy, eggs & chilled'])

  // Fruit & veg is now second; two steps later puts it after Dairy.
  await settings.getByRole('button', { name: 'Move Fruit & veg later' }).click()
  await expect(settings.locator('.aisle-order li').nth(2)).toContainText('Fruit & veg')
  await settings.getByRole('button', { name: 'Move Fruit & veg later' }).click()
  await expect(settings.locator('.aisle-order li').nth(3)).toContainText('Fruit & veg')
  await settings.getByRole('button', { name: 'Close' }).click()
  await expect(settings).toBeHidden()
  await expect(labels).toHaveText(['Bakery', 'Dairy, eggs & chilled', 'Fruit & veg'])

  // The order is part of the list, so it survives a reload.
  await page.reload()
  await expect(labels).toHaveText(['Bakery', 'Dairy, eggs & chilled', 'Fruit & veg'])
})

test('plan or shop mode is remembered per list across reloads', async ({ page, context }) => {
  await openList(page, context, 'mode.persist.reload')
  await expect(planTab(page)).toHaveAttribute('aria-selected', 'true')
  await shopTab(page).click()
  await expect(shopTab(page)).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wnb:mode:mode.persist.reload'))).toBe('shop')

  await page.reload()
  await expect(shopTab(page)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.app')).toHaveClass(/\bshop\b/)

  // Another list on the same device starts in plan mode.
  await page.goto('/mode.other.list')
  await expect(planTab(page)).toHaveAttribute('aria-selected', 'true')

  await page.goto('/mode.persist.reload')
  await expect(shopTab(page)).toHaveAttribute('aria-selected', 'true')
  await planTab(page).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wnb:mode:mode.persist.reload'))).toBe('plan')
  await page.reload()
  await expect(planTab(page)).toHaveAttribute('aria-selected', 'true')
})

test('clear every item, then undo', async ({ page, context }) => {
  await openList(page, context, 'clear.all.undo')
  const settings = page.getByRole('dialog', { name: 'List settings' })
  await page.getByRole('button', { name: 'List settings' }).click()
  await expect(settings.getByRole('button', { name: 'Clear every item' })).toBeDisabled()
  await settings.getByRole('button', { name: 'Close' }).click()
  await expect(settings).toBeHidden()

  await add(page, 'bananas, bread, 2 milk, toothpaste')
  await expect(items(page)).toHaveCount(4)

  await page.getByRole('button', { name: 'List settings' }).click()
  await settings.getByRole('button', { name: 'Clear every item' }).click()
  await expect(settings).toBeHidden()
  await expect(items(page)).toHaveCount(0)
  await expect(page.getByText('Nothing on the list yet')).toBeVisible()
  await expect(toast(page)).toContainText('List cleared')

  await undoButton(page).click()
  await expect(items(page)).toHaveCount(4)
  await expect(page.getByRole('region', { name: 'Dairy, eggs & chilled' }).locator('.qty')).toHaveText('2')
  await expect(page.getByRole('region', { name: 'Health & beauty' })).toContainText('toothpaste')
})
