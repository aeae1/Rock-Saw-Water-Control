const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
  });
  // Only local static assets are allowed; the simulator must not require a service.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
  page.simulatorErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.simulatorErrors).toEqual([]);
});

test('cold startup, toggle, rocker reversal, and responsive layout', async ({ page }, testInfo) => {
  const stage = page.locator('.sa-stage');
  await expect(stage.locator('button[data-j]')).toBeDisabled();
  await stage.locator('input[data-power]').check();
  await expect(stage).toHaveAttribute('data-on', 'false');
  await stage.locator('button[data-j]').click();
  await expect(stage).toHaveAttribute('data-position', '40');
  await stage.locator('button[data-g]').click();
  await stage.locator('button[data-g]').click();
  await expect(stage).toHaveAttribute('data-setting', '5');
  await stage.locator('button[data-h]').click();
  await expect(stage).toHaveAttribute('data-setting', '4');
  await expect(stage).toHaveAttribute('data-position', '40');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('simulator', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('keyboard long press enters setup and saving preserves the on command', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await stage.locator('input[data-power]').check();
  await trigger.click(); await expect(stage).toHaveAttribute('data-position', '40');
  await trigger.focus(); await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-mode', 'max');
  await page.keyboard.up('Space');
  for (let i = 0; i < 5; i++) {
    await stage.locator('button[data-center]').click(); await stage.locator('button[data-h]').click();
  }
  await expect(stage).toHaveAttribute('data-draft', '50');
  await expect(stage).toHaveAttribute('data-position', '40');
  await trigger.click();
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await expect(stage).toHaveAttribute('data-setting', '8');
  await expect(stage).toHaveAttribute('data-on', 'true');
  await expect(stage).toHaveAttribute('data-position', '40');
});

test('power interruption and real select controls stop and recover predictably', async ({ page }) => {
  const stage = page.locator('.sa-stage'), power = stage.locator('input[data-power]');
  await power.check(); await stage.locator('button[data-j]').click();
  await expect(stage).toHaveAttribute('data-position', '40');
  await stage.locator('select[data-fault]').selectOption('driver');
  await expect(stage.locator('button[data-j]')).toBeDisabled();
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,white,off,off,off,off,off,off');
  await power.uncheck(); await expect(stage).toHaveAttribute('data-position', '40');
  await power.check(); await expect(stage.locator('button[data-j]')).toBeDisabled();
  await stage.locator('select[data-fault]').selectOption('normal');
  await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('canceled pointer, reduced motion, dark theme, and narrow viewport', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 360, height: 800 });
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await stage.locator('input[data-power]').check();
  await trigger.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', button: 0 });
  await trigger.dispatchEvent('pointercancel', { pointerId: 7, pointerType: 'touch' });
  await expect(stage).toHaveAttribute('data-on', 'false');
  await trigger.focus(); await page.keyboard.down('Enter');
  await expect(stage).toHaveAttribute('data-mode', 'max'); await page.keyboard.up('Enter');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,off,off,off,off,off,off,white');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('dark-narrow-setup', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
