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
  await stage.locator('[data-fault-toggle="driver"]').check();
  await expect(stage).toHaveAttribute('data-lamp-test', 'false');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,white,off,off,off,off,off,off');
  await page.clock.runFor(2000);
  await expect(stage).toHaveAttribute('data-inputs-ready', 'false');
  await stage.locator('button[data-clear-causes]').click();
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

test('power interruption and fault toggles stop and recover predictably', async ({ page }) => {
  const stage = page.locator('.sa-stage'), power = stage.locator('input[data-power]');
  await start(stage); await stage.locator('button[data-j]').click();
  await expect(stage).toHaveAttribute('data-position', '40');
  await stage.locator('[data-fault-toggle="driver"]').check();
  await expect(stage.locator('button[data-j]')).toBeEnabled();
  await expect(stage.locator('button[data-j]')).toHaveAttribute('data-command-enabled', 'false');
  await expect(stage).toHaveAttribute('data-colors', 'off,off,off,white,off,off,off,off,off,off');
  await power.uncheck(); await expect(stage).toHaveAttribute('data-position', '40');
  await power.check(); await expect(stage.locator('button[data-j]')).toBeEnabled();
  await expect(stage.locator('button[data-j]')).toHaveAttribute('data-command-enabled', 'false');
  await stage.locator('button[data-clear-causes]').click();
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
  await stage.locator('[data-fault-toggle="position"]').check();
  await stage.locator('button[data-clear-causes]').click();
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

test('moving the rocker during a reset hold preserves its deadline and saved setting', async ({ page }) => {
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  const stage = page.locator('.sa-stage'), trigger = stage.locator('button[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await stage.locator('[data-fault-toggle="driver"]').check();
  await stage.locator('button[data-clear-causes]').click();
  await trigger.focus(); await page.keyboard.down('Space');
  await page.clock.runFor(1000); await stage.locator('button[data-g]').click();
  await stage.locator('button[data-center]').click();await stage.locator('button[data-h]').click();
  await page.clock.runFor(1999);
  await expect(stage).toHaveAttribute('data-fault', 'driver');
  await expect(stage).toHaveAttribute('data-fault-signal','holding');
  await page.clock.runFor(1);
  await expect(stage).toHaveAttribute('data-fault', 'normal');
  await expect(stage).toHaveAttribute('data-setting','4');
  await page.keyboard.up('Space');await stage.locator('button[data-center]').click();await page.clock.runFor(100);
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

test('independent fault toggles show mixed active and cleared codes and keep reset inhibited', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const stage=page.locator('.sa-stage');await start(stage);
  await expect(stage.locator('[data-fault-toggle]')).toHaveCount(9);
  await expect(stage.locator('[data-fault-toggle="temperature"]')).toHaveCount(0);
  await expect(stage.locator('.sa-lamp')).toHaveCount(10);
  await expect(stage.locator('[data-fault-toggle="trigger"]')).toHaveAttribute('aria-label','Fault 10: Stuck J trigger');
  await expect(stage.locator('select')).toHaveCount(0);
  const driver=stage.locator('[data-fault-toggle="driver"]'), position=stage.locator('[data-fault-toggle="position"]');
  await driver.check();await position.check();await driver.uncheck();
  await expect(stage).toHaveAttribute('data-active-faults','position');
  await expect(stage).toHaveAttribute('data-colors','off,off,off,blue,off,off,off,white,off,off');
  await expect(stage.locator('[data-fault-entry="driver"] [data-cause-status]')).toHaveText('Cause cleared · reset pending');
  await expect(stage.locator('[data-fault-entry="position"] [data-cause-status]')).toHaveText('Cause active · reset blocked');
  await expect(stage.locator('[data-reset-fault]')).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await testInfo.attach('simultaneous-faults',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await position.uncheck();await stage.locator('[data-reset-fault]').click();
  await expect(stage).toHaveAttribute('data-inputs-ready','true');
  await expect(stage).toHaveAttribute('data-on','false');
});

test('reset fill spends time behind blue fault codes then immediately restores the OFF display', async ({ page }, testInfo) => {
  await page.clock.install({time:new Date('2026-10-04T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-04T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await trigger.click();await page.clock.runFor(2200);
  for(const cause of ['driver','position']){await stage.locator(`[data-fault-toggle="${cause}"]`).check();}
  await stage.locator('[data-clear-causes]').click();
  await trigger.focus();await page.keyboard.down('Space');await page.clock.runFor(920);
  await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,off,off,off,blue,off,off');
  // The sweep crosses blue lamp 4 at 1.2 s without jumping to white lamp 5.
  await page.clock.runFor(300);
  await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,off,off,off,blue,off,off');
  await page.clock.runFor(270);
  await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,off,off,off,blue,off,off');
  await page.clock.runFor(20);
  await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,white,off,off,blue,off,off');
  await expect(stage).toHaveAttribute('data-fault-signal','holding');
  await testInfo.attach('reset-progress',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.clock.runFor(1490);await expect(stage).toHaveAttribute('data-fault','normal');
  await expect(stage).toHaveAttribute('data-colors','white,white,white,white,off,off,off,off,off,blue');
  await expect(stage).toHaveAttribute('data-fault-signal','none');
  await expect(stage).toHaveAttribute('data-recovering','true');
  await page.clock.runFor(500);await expect(stage.locator('[data-hold-progress]')).toHaveCSS('width','0px');
  await page.keyboard.up('Space');await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready','false');
  await page.clock.runFor(2000);await expect(stage).toHaveAttribute('data-inputs-ready','true');
  await expect(stage).toHaveAttribute('data-on','false');
});

test('active-cause reset warns once and a fresh valid retry replaces its warning', async ({ page }) => {
  await page.clock.install({time:new Date('2026-10-04T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-04T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await stage.locator('[data-fault-toggle="driver"]').check();
  await trigger.focus();await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-colors','blue,white,blue,white,blue,white,blue,white,blue,white');
  await page.clock.runFor(3000);await expect(stage).toHaveAttribute('data-fault-signal','rejected');
  await expect(stage).toHaveAttribute('data-colors',Array(10).fill('blue').join(','));
  await page.clock.runFor(250);await expect(stage).toHaveAttribute('data-colors',Array(10).fill('white').join(','));
  await stage.locator('[data-fault-toggle="driver"]').uncheck();
  await expect(stage).toHaveAttribute('data-fault-signal','cleared');
  await expect(stage.locator('[data-hold-progress]')).toHaveCSS('width','0px');
  await expect(stage).toHaveAttribute('data-fault','driver');
  await page.keyboard.up('Space');await trigger.focus();await page.keyboard.down('Space');await page.clock.runFor(3000);
  await expect(stage).toHaveAttribute('data-fault','normal');await page.keyboard.up('Space');
});

test('cleared faults reset while H stays held, with eligible progress and immediate OFF display', async ({page})=>{
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await stage.locator('[data-fault-toggle="driver"]').check();await stage.locator('[data-fault-toggle="driver"]').uncheck();
  await stage.locator('[data-h]').click();await trigger.focus();await page.keyboard.down('Space');
  await expect(stage).toHaveAttribute('data-fault-signal','holding');
  await expect(stage.locator('[data-switch-state]')).toContainText('Reset eligible');
  await expect(stage).toHaveAttribute('data-colors','off,off,off,blue,off,off,off,off,off,off');
  await page.clock.runFor(1510);
  await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,white,off,off,off,off,off');
  await page.clock.runFor(1490);await expect(stage).toHaveAttribute('data-fault','normal');
  await expect(stage.locator('[data-hold-progress]')).toHaveCSS('width','0px');
  await expect(stage).toHaveAttribute('data-colors','white,white,white,white,off,off,off,off,off,blue');
  await expect(stage).toHaveAttribute('data-on','false');await expect(stage).toHaveAttribute('data-rocker','h');
  await expect(trigger).toHaveAttribute('aria-label',/release J/);
  await page.keyboard.up('Space');await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready','true');
  await trigger.focus();await page.keyboard.down('Space');await page.clock.runFor(100);await page.keyboard.up('Space');
  await expect(stage).toHaveAttribute('data-on','true');await expect(stage).toHaveAttribute('data-rocker','h');
  await expect(stage).toHaveAttribute('data-setting','4');
});

test('clearing a cause mid-hold stops active-fault animation without promoting the blocked hold', async ({page})=>{
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await stage.locator('[data-fault-toggle="driver"]').check();await trigger.focus();await page.keyboard.down('Space');
  await page.clock.runFor(1000);await stage.locator('[data-fault-toggle="driver"]').uncheck();
  await expect(stage).toHaveAttribute('data-fault-signal','interlocked');await expect(stage.locator('[data-switch-state]')).toContainText('Release J, then start a fresh');
  await page.clock.runFor(2000);await expect(stage).toHaveAttribute('data-fault','driver');
  await expect(stage).toHaveAttribute('data-fault-signal','cleared');await expect(stage.locator('[data-hold-progress]')).toHaveCSS('width','0px');
  await page.keyboard.up('Space');await trigger.focus();await page.keyboard.down('Space');await page.clock.runFor(1510);
  await expect(stage).toHaveAttribute('data-fault-signal','holding');await expect(stage).toHaveAttribute('data-colors','white,white,white,blue,white,off,off,off,off,off');
  await page.clock.runFor(1490);await expect(stage).toHaveAttribute('data-fault','normal');await page.keyboard.up('Space');
});

test('an operator fault closes water while its code stays visible and reset causes no further movement',async({page})=>{
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await trigger.click();await page.clock.runFor(2200);
  await stage.locator('[data-fault-toggle="settings"]').check();
  await expect(stage).toHaveAttribute('data-fault-response','closing');
  await expect(stage).toHaveAttribute('data-colors','off,off,off,off,off,white,off,off,off,off');
  await expect(stage.locator('[data-target]')).toContainText('closing valve');
  await page.clock.runFor(1000);expect(Number(await stage.getAttribute('data-position'))).toBeLessThan(40);
  await page.clock.runFor(1200);await expect(stage).toHaveAttribute('data-position','0');
  await expect(stage).toHaveAttribute('data-fault-response','closed');await expect(stage).toHaveAttribute('data-fault','settings');
  await expect(stage.locator('[data-valve-state]')).toHaveText('Closed · fault latched');
  await stage.locator('[data-fault-toggle="settings"]').uncheck();await trigger.focus();
  await page.keyboard.down('Space');await page.clock.runFor(3000);
  await expect(stage).toHaveAttribute('data-fault','normal');await expect(stage).toHaveAttribute('data-moving','false');
  await expect(stage).toHaveAttribute('data-recovering','false');await page.keyboard.up('Space');await page.clock.runFor(100);
  await expect(stage).toHaveAttribute('data-inputs-ready','true');await expect(stage).toHaveAttribute('data-on','false');
});

test('a jam interrupts fault closing and only deliberate reset can authorize another attempt',async({page})=>{
  await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
  const stage=page.locator('.sa-stage'),trigger=stage.locator('[data-j]');
  await stage.locator('[data-power]').check();await page.clock.runFor(2100);
  await trigger.click();await page.clock.runFor(2200);
  await stage.locator('[data-fault-toggle="input"]').check();await page.clock.runFor(500);
  await stage.locator('[data-fault-toggle="stall"]').check();const stopped=await stage.getAttribute('data-position');
  expect(Number(stopped)).toBeGreaterThan(0);await expect(stage).toHaveAttribute('data-fault-response','inhibited');
  await expect(stage.locator('[data-target]')).toContainText('water may still be flowing');
  await stage.locator('[data-clear-causes]').click();await stage.locator('[data-fault-toggle="trigger"]').check();
  await page.clock.runFor(6000);await expect(stage).toHaveAttribute('data-position',stopped);
  await stage.locator('[data-clear-causes]').click();await trigger.focus();await page.keyboard.down('Space');
  await page.clock.runFor(3000);await expect(stage).toHaveAttribute('data-fault','normal');
  await expect(stage).toHaveAttribute('data-recovering','true');await expect(stage).toHaveAttribute('data-on','false');
  await page.keyboard.up('Space');await page.clock.runFor(2200);
  await expect(stage).toHaveAttribute('data-position','0');await expect(stage).toHaveAttribute('data-inputs-ready','true');
  await expect(stage).toHaveAttribute('data-on','false');
});
