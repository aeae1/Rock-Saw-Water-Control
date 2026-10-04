const { test, expect } = require('@playwright/test');

async function start(stage) {
  await stage.locator('input[data-power]').check();
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
}

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

test('startup shows all white then all blue, consumes held inputs, and restores the paused bar', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-04T12:00:01Z'));
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await stage.locator('input[data-power]').check();
  await trigger.focus(); await page.keyboard.down('Space');
  for (const color of ['white', 'blue']) {
    const expected = Array(10).fill(color);
    await expect(stage).toHaveAttribute('data-colors', expected.join(','));
    await expect(stage).toHaveAttribute('data-on', 'false');
    await expect(stage).toHaveAttribute('data-position', '0');
    await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
    await page.clock.runFor(1000);
  }
  await expect(stage).toHaveAttribute('data-lamp-test', 'false');
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await expect(stage).toHaveAttribute('data-colors', 'white,white,white,white,off,off,off,off,off,blue');
  await page.keyboard.up('Space'); await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-on', 'false');
  await trigger.click(); await expect(stage).toHaveAttribute('data-on', 'true');
});

test('reduced-motion lamp test checks both colors and yields immediately to a fault', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-04T12:00:01Z'));
  const stage = page.locator('.sa-stage');
  await stage.locator('input[data-power]').check();
  await expect(stage).toHaveAttribute('data-colors', Array(10).fill('white').join(','));
  await page.clock.runFor(1000);
  await expect(stage).toHaveAttribute('data-colors', Array(10).fill('blue').join(','));
  await stage.locator('select[data-fault]').selectOption('driver');
  await expect(stage).toHaveAttribute('data-lamp-test', 'false');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,white,off,off,off,off,off,off');
  await page.clock.runFor(2000);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
  await stage.locator('select[data-fault]').selectOption('normal');
  await stage.locator('button[data-reset-fault]').click(); await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-lamp-test', 'false');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('cold startup, toggle, rocker reversal, and responsive layout', async ({ page }, testInfo) => {
  const stage = page.locator('.sa-stage');
  await expect(stage.locator('button[data-j]')).toBeEnabled();
  await expect(stage.locator('button[data-j]')).toHaveAttribute('data-command-enabled', 'false');
  await start(stage);
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
  await start(stage);
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

test('paused 70% maximum blinks blue/off above the bar and blue/white within it', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await start(stage);
  await trigger.focus(); await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-mode', 'max'); await page.keyboard.up('Space');
  for (let i = 0; i < 3; i++) {
    await stage.locator('button[data-center]').click(); await stage.locator('button[data-h]').click();
  }
  await trigger.click();
  await expect(stage).toHaveAttribute('data-maximum', '70');
  // Saving remaps the original 40% opening to level 6 (42%). Select level 4.
  for (let i = 0; i < 2; i++) {
    await stage.locator('button[data-center]').click(); await stage.locator('button[data-h]').click();
  }
  await expect(stage).toHaveAttribute('data-setting', '4');
  await expect(stage).toHaveAttribute('data-colors', 'white,white,white,white,off,off,blue,off,off,off');
  await expect(stage).toHaveAttribute('data-colors', 'white,white,white,white,off,off,off,off,off,off');
  for (let i = 0; i < 3; i++) {
    await stage.locator('button[data-center]').click(); await stage.locator('button[data-g]').click();
  }
  await expect(stage).toHaveAttribute('data-setting', '7');
  await expect(stage).toHaveAttribute('data-colors', 'white,white,white,white,white,white,blue,off,off,off');
  await expect(stage).toHaveAttribute('data-colors', 'white,white,white,white,white,white,white,off,off,off');
  await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('second keyboard hold enters full-open cleaning and one tap restores paused operation', async ({ page }, testInfo) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await start(stage);
  await trigger.focus(); await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-mode', 'max'); await page.keyboard.up('Space');
  for (let i = 0; i < 5; i++) {
    await stage.locator('button[data-center]').click(); await stage.locator('button[data-h]').click();
  }
  await trigger.focus(); await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-mode', 'clean'); await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-maximum', '50');
  await expect(stage).toHaveAttribute('data-setting', '8');
  await expect(stage).toHaveAttribute('data-position', '100');
  await expect(stage.locator('button[data-g]')).toBeEnabled();
  await expect(stage.locator('button[data-g]')).toHaveAttribute('data-command-enabled', 'false');
  await expect(stage.locator('[data-status]')).toHaveText('Flush · ball 100% open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('full-open-cleaning', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await trigger.click();
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await expect(stage).toHaveAttribute('data-on', 'false');
  await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-run-opening', '40');
});

test('power interruption and real select controls stop and recover predictably', async ({ page }) => {
  const stage = page.locator('.sa-stage'), power = stage.locator('input[data-power]');
  await start(stage); await stage.locator('button[data-j]').click();
  await expect(stage).toHaveAttribute('data-position', '40');
  await stage.locator('select[data-fault]').selectOption('driver');
  await expect(stage.locator('button[data-j]')).toBeEnabled();
  await expect(stage.locator('button[data-j]')).toHaveAttribute('data-command-enabled', 'false');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,white,off,off,off,off,off,off');
  await power.uncheck(); await expect(stage).toHaveAttribute('data-position', '40');
  await power.check(); await expect(stage.locator('button[data-j]')).toBeEnabled();
  await expect(stage.locator('button[data-j]')).toHaveAttribute('data-command-enabled', 'false');
  await stage.locator('select[data-fault]').selectOption('normal');
  await expect(stage).toHaveAttribute('data-fault', 'driver');
  await stage.locator('button[data-reset-fault]').click();
  await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('canceled pointer, reduced motion, dark theme, and narrow viewport', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 360, height: 800 });
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await start(stage);
  await trigger.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', button: 0 });
  await trigger.dispatchEvent('pointercancel', { pointerId: 7, pointerType: 'touch' });
  await expect(stage).toHaveAttribute('data-on', 'false');
  await trigger.focus(); await page.keyboard.down('Enter');
  await expect(stage).toHaveAttribute('data-mode', 'max'); await page.keyboard.up('Enter');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,off,off,off,off,off,off,white');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('dark-narrow-setup', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});


test('an aborted hold does nothing and a fresh Flush press exits before release', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await start(stage);
  await page.clock.install();
  await trigger.focus(); await page.keyboard.down('Space');
  await page.clock.runFor(1000); await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-on', 'false');
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await page.keyboard.down('Space'); await page.clock.runFor(1500); await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-mode', 'max');
  await page.keyboard.down('Space'); await page.clock.runFor(1500); await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-mode', 'clean');
  await page.clock.runFor(1000); await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await expect(stage).toHaveAttribute('data-on', 'false');
  await page.clock.runFor(2000); await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('fault acknowledgement from J closes and requires release before rearming', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await start(stage); await trigger.click();
  await expect(stage).toHaveAttribute('data-position', '40');
  await stage.locator('select[data-fault]').selectOption('position');
  await stage.locator('select[data-fault]').selectOption('normal');
  await page.clock.install();
  await trigger.focus(); await page.keyboard.down('Space');
  await page.clock.runFor(3000); await expect(stage).toHaveAttribute('data-fault', 'normal');
  await page.clock.runFor(6000); await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
  await page.keyboard.up('Space'); await page.clock.runFor(100); await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-on', 'false');
});


for (const direction of ['g', 'h']) {
  test(`${direction.toUpperCase()} held before cold start blocks arming until centered`, async ({ page }) => {
    const stage = page.locator('.sa-stage');
    await stage.locator(`button[data-${direction}]`).click();
    await stage.locator('input[data-power]').check();
    await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
    await expect(stage).toHaveAttribute('data-rocker', direction);
    await stage.locator('button[data-j]').click();
    await expect(stage).toHaveAttribute('data-on', 'false');
    await stage.locator('button[data-center]').click();
    await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
    await expect(stage).toHaveAttribute('data-setting', '4');
    await stage.locator('button[data-j]').click();
    await expect(stage).toHaveAttribute('data-on', 'true');
  });
}

test('J held before power-on is consumed through release, then a fresh press operates', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await page.clock.install();
  await trigger.focus(); await page.keyboard.down('Space');
  await stage.locator('input[data-power]').check();
  await page.clock.runFor(2000);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
  await expect(stage).toHaveAttribute('data-mode', 'normal');
  await page.keyboard.up('Space'); await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-on', 'false');
  await page.clock.runFor(500); await trigger.click();
  await expect(stage).toHaveAttribute('data-on', 'true');
});

test('G/H changes during recovery remain visible and cannot arm or adjust the saved level', async ({ page }) => {
  const stage = page.locator('.sa-stage'); await start(stage);
  await stage.locator('button[data-j]').click(); await expect(stage).toHaveAttribute('data-position', '40');
  await page.clock.install();
  await stage.locator('input[data-power]').uncheck(); await stage.locator('input[data-power]').check();
  await stage.locator('button[data-h]').click(); await page.clock.runFor(6000);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
  await expect(stage).toHaveAttribute('data-position', '0');
  await expect(stage).toHaveAttribute('data-setting', '4');
  await stage.locator('button[data-center]').click(); await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('moving the rocker interrupts a reset hold until J is released and pressed again', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]'); await start(stage);
  await stage.locator('select[data-fault]').selectOption('driver');
  await stage.locator('select[data-fault]').selectOption('normal');
  await page.clock.install(); await trigger.focus(); await page.keyboard.down('Space');
  await page.clock.runFor(2000); await stage.locator('button[data-g]').click();
  await stage.locator('button[data-center]').click(); await page.clock.runFor(2000);
  await expect(stage).toHaveAttribute('data-fault', 'driver');
  await page.keyboard.up('Space'); await trigger.focus(); await page.keyboard.down('Space');
  await page.clock.runFor(3000); await page.keyboard.up('Space'); await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-fault', 'normal');
  await expect(stage).toHaveAttribute('data-inputs-ready', 'true');
  await expect(stage).toHaveAttribute('data-on', 'false');
});

test('startup-held J reaches the stuck-trigger fault and cannot acknowledge itself', async ({ page }) => {
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await page.clock.install(); await trigger.focus(); await page.keyboard.down('Enter');
  await stage.locator('input[data-power]').check(); await page.clock.runFor(30000);
  await expect(stage).toHaveAttribute('data-fault', 'trigger');
  await expect(stage.locator('button[data-reset-fault]')).toBeDisabled();
  await page.keyboard.up('Enter'); await stage.locator('button[data-reset-fault]').click();
  await page.clock.runFor(100); await expect(stage).toHaveAttribute('data-fault', 'normal');
  await expect(stage).toHaveAttribute('data-on', 'false');
});
