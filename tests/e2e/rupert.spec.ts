import { expect, test } from '@playwright/test'

test('passage animates, pauses, orbits and restores normal display', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/cube')
  await page.getByRole('checkbox', { name: 'Spin', exact: true }).uncheck()
  const toggle = page.getByRole('checkbox', { name: 'Show Rupert passage' })
  await expect(toggle).toBeEnabled()
  await toggle.check()
  await expect(page.getByText('Blue: pierced original')).toBeVisible()
  await expect(page.getByText('Translucent: uncarved original')).toBeVisible()
  const canvas = page.locator('canvas')
  const initial = await canvas.screenshot()
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(false)

  await page.getByRole('checkbox', { name: 'Pause passage' }).check()
  await expect(page.getByText(/Passage paused/)).toBeVisible()
  // OrbitControls can still be damping the camera after Spin is switched off.
  await expect.poll(async () => {
    const before = await canvas.screenshot()
    await page.waitForTimeout(100)
    return (await canvas.screenshot()).equals(before)
  }).toBe(true)
  const paused = await canvas.screenshot()
  await page.waitForTimeout(250)
  expect((await canvas.screenshot()).equals(paused)).toBe(true)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 70, { steps: 15 })
  await page.mouse.up()
  await expect.poll(async () => (await canvas.screenshot()).equals(paused)).toBe(false)
  await page.getByRole('button', { name: 'Reset view' }).click()
  await page.screenshot({ path: 'test-results/rupert-desktop.png' })
  await toggle.uncheck()
  await expect(page.getByText('Blue: pierced original')).toBeHidden()
  await expect(page.getByRole('slider', { name: 'Explode faces' })).toBeEnabled()
  await expect(page.getByRole('combobox', { name: 'Colouring' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('the passage setting is sticky across models, duals and reloads', async ({ page }) => {
  await page.goto('/#/cube')
  const toggle = page.getByRole('checkbox', { name: 'Show Rupert passage' })
  await expect(toggle).toBeEnabled()
  await toggle.check()
  await expect(page.getByText('Blue: pierced original')).toBeVisible()

  const dual = page.getByRole('checkbox', { name: 'Show dual' })
  await dual.check()
  await expect(toggle).toBeChecked()
  await expect(page.getByText('Blue: pierced original')).toBeVisible()
  await dual.uncheck()

  // An unsupported model hides the passage without clearing the preference.
  await page.evaluate(() => { window.location.hash = '#/small-stellated-dodecahedron' })
  await expect(page.getByRole('status')).toContainText('closed convex solids')
  await expect(page.getByText('Blue: pierced original')).toBeHidden()
  await expect(toggle).toBeChecked()

  await page.evaluate(() => { window.location.hash = '#/cube' })
  await expect(page.getByText('Blue: pierced original')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Show Rupert passage' })).toBeChecked()
  await expect(page.getByText('Blue: pierced original')).toBeVisible()
})

test('mobile options preserve passage and touch navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/icosahedron')
  await page.getByRole('button', { name: 'options', exact: true }).click()
  const toggle = page.getByRole('checkbox', { name: 'Show Rupert passage' })
  await expect(toggle).toBeEnabled()
  await toggle.check()
  await expect(page.getByRole('checkbox', { name: 'Pause passage' })).toBeChecked()
  await page.getByRole('button', { name: 'view', exact: true }).click()
  await expect(page.getByText('Blue: pierced original')).toBeVisible()
  const box = (await page.locator('canvas').boundingBox())!
  expect(box.width).toBeLessThanOrEqual(390)
  expect(box.height).toBeGreaterThan(400)
  await page.screenshot({ path: 'test-results/rupert-mobile.png' })
  await page.getByRole('button', { name: 'options', exact: true }).click()
  await expect(toggle).toBeChecked()
})
