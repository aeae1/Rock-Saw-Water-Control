const assert = require('node:assert/strict');
const { test } = require('node:test');
const { simulator } = require('./helpers/simulator.cjs');

function paused(s) {
  assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.stage.dataset.mode, 'normal');
  assert.equal(s.stage.dataset.target, '0');
}

for (const rocker of ['center', 'g', 'h']) {
  for (const heldJ of [false, true]) {
    for (const releaseOrder of ['trigger-first', 'rocker-first']) {
      test(`cold start: ${rocker}, J ${heldJ ? 'held' : 'released'}, ${releaseOrder}`, () => {
        const s = simulator({ reducedMotion: true });
        s.click(rocker); if (heldJ) s.down();
        s.power(true, false);
        assert.equal(s.stage.dataset.rocker, rocker);
        assert.equal(s.stage.dataset.inputsReady, 'false'); paused(s);
        s.advance(2100); paused(s);
        assert.equal(s.stage.dataset.setting, '4');
        assert.equal(s.stage.dataset.inputsReady, String(rocker === 'center' && !heldJ));
        if (releaseOrder === 'trigger-first') { if (heldJ) s.up(); s.click('center'); }
        else { s.click('center'); if (heldJ) s.up(); }
        s.advance(100); paused(s);
        assert.equal(s.stage.dataset.inputsReady, 'true');
        s.tap(); assert.equal(s.stage.dataset.on, 'true');
      });
    }
  }
}

test('neutral must be continuous for 100 ms; switch activity restarts qualification', () => {
  const s = simulator(); s.power(true, false); s.advance(2099);
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.click('g'); s.advance(1); s.click('center'); s.advance(99);
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.down(); s.advance(2000); paused(s);
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); s.advance(99); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.advance(1); assert.equal(s.stage.dataset.inputsReady, 'true'); paused(s);
  assert.equal(s.stage.dataset.setting, '4');
});

test('startup-locked taps and holds never queue a future water command', () => {
  for (const duration of [0, 100, 499, 500, 1499, 1500, 6000]) {
    const s = simulator(); s.power(true, false);
    s.down(); s.advance(duration); s.up(); s.advance(2100); paused(s);
    assert.equal(s.stage.dataset.inputsReady, 'true');
    s.tap(); assert.equal(s.stage.dataset.on, 'true');
  }
});

for (const direction of ['g', 'h']) {
  test(`${direction.toUpperCase()} engaged during startup closure remains tracked and blocks arming`, () => {
    const s = simulator(); s.power(true); s.tap(); s.advance(6000);
    s.power(false); s.power(true, false); s.advance(40); s.click(direction);
    s.advance(6000); assert.equal(s.pos(), 0); paused(s);
    assert.equal(s.stage.dataset.rocker, direction);
    assert.equal(s.stage.dataset.inputsReady, 'false');
    s.tap(); s.advance(1000); paused(s);
    s.click(direction); assert.equal(s.stage.dataset.setting, '4');
    s.click('center'); s.advance(100); s.click(direction);
    assert.equal(s.stage.dataset.setting, direction === 'g' ? '5' : '3');
    paused(s);
  });
}

test('rapid power interruptions restart closure and discard held commands', () => {
  const s = simulator(); s.power(true); s.hold(); s.hold(); s.advance(6000);
  s.click('g'); s.down(); // Exit Flush, then keep the exit press held.
  let last = s.pos();
  for (let i = 0; i < 8; i++) {
    s.power(false); s.advance(10); s.power(true, false); s.advance(50);
    paused(s); assert.ok(s.pos() <= last); last = s.pos();
    assert.equal(s.stage.dataset.inputsReady, 'false');
  }
  s.advance(6000); s.up(); s.click('center'); s.advance(100);
  paused(s); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.inputsReady, 'true');
});

test('input-only activity with power off neither edits settings nor runs timers', () => {
  const s = simulator({ reducedMotion: true });
  s.click('g'); s.click('h'); s.down(); s.advance(60000);
  assert.equal(s.stage.dataset.setting, '4'); assert.equal(s.stage.dataset.maximum, '100');
  assert.equal(s.stage.dataset.rocker, 'h'); assert.equal(s.stage.dataset.triggerHeld, 'true');
  assert.equal(s.stage.dataset.fault, 'normal'); assert.equal(s.pendingJobs(), 0);
  s.power(true, false); s.advance(29999); assert.equal(s.stage.dataset.fault, 'normal');
  s.advance(1); assert.equal(s.stage.dataset.fault, 'trigger');
  s.up(); s.click('center'); s.click('reset-fault'); s.advance(100); paused(s);
});

test('rocker activations during a J gesture are consumed, with physical latch preserved', () => {
  const s = simulator(); s.power(true); s.down(); s.click('g'); s.advance(1500); s.up();
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.setting, '4');
  assert.equal(s.stage.dataset.rocker, 'g');
  s.click('g'); assert.equal(s.stage.dataset.draft, '100');
  s.click('h'); assert.equal(s.stage.dataset.draft, '90');
});

test('rocker movement during Flush is tracked without editing or replaying it on exit', () => {
  const s = simulator(); s.power(true); s.hold(); s.hold();
  s.click('g'); assert.equal(s.stage.dataset.rocker, 'g'); assert.equal(s.stage.dataset.setting, '4');
  s.tap(); s.click('g'); assert.equal(s.stage.dataset.setting, '4');
  s.click('h'); assert.equal(s.stage.dataset.setting, '3');
});

test('rocker movement throughout acknowledgement preserves the hold deadline and saved settings', () => {
  const s = simulator(); s.power(true); s.fault('driver'); s.fault('normal');
  s.down(); s.advance(500); s.click('g'); s.advance(500); s.click('center');
  s.advance(500); s.click('h'); s.advance(1499);
  assert.equal(s.stage.dataset.fault, 'driver');assert.equal(s.stage.dataset.faultSignal,'holding');
  s.advance(1); assert.equal(s.stage.dataset.fault, 'normal');assert.equal(s.stage.dataset.setting,'4');
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); s.advance(100); paused(s); assert.equal(s.stage.dataset.inputsReady, 'true');
  assert.equal(s.stage.dataset.rocker,'h');s.tap();assert.equal(s.stage.dataset.on,'true');
});

test('removing a cause while J remains held cannot start acknowledgement, regardless of rocker movement', () => {
  const s = simulator(); s.power(true); s.fault('driver'); s.click('g'); s.down();
  s.fault('normal'); s.click('center'); s.advance(4000);
  assert.equal(s.stage.dataset.fault, 'driver');
  s.up(); s.down(); s.advance(3000); assert.equal(s.stage.dataset.fault, 'normal');
  s.up(); s.advance(100); paused(s);
});

test('a new fault during recovery stops closing and requires another acknowledgement', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(6000);
  s.fault('driver'); s.fault('normal'); s.click('reset-fault'); s.advance(500);
  s.fault('position'); const stopped = s.pos(); s.advance(6000);
  assert.equal(s.pos(), stopped); assert.equal(s.stage.dataset.fault, 'position');
  s.fault('normal'); s.click('reset-fault'); s.advance(6000); paused(s); assert.equal(s.pos(), 0);
});

test('a trigger held through a fault and power cycle is not an acknowledgement', () => {
  const s = simulator(); s.power(true); s.down(); s.fault('supply'); s.power(false);
  s.power(true, false); s.fault('normal'); s.advance(4000);
  assert.equal(s.stage.dataset.fault, 'supply');
  s.up(); s.down(); s.advance(3000); s.up(); s.advance(100);
  assert.equal(s.stage.dataset.fault, 'normal'); paused(s);
});

for (const from of ['normal', 'max']) {
  for (const duration of [499, 500, 1499, 1500, 30000, 86400000]) {
    test(`delayed callbacks: ${from} J released at ${duration} ms is classified by elapsed time`, () => {
      const s = simulator({ reducedMotion: true }); s.power(true);
      if (from === 'max') s.hold();
      s.down(); s.jump(duration); s.up();
      if (duration >= 30000) {
        assert.equal(s.stage.dataset.fault, 'trigger'); assert.equal(s.stage.dataset.on, 'false');
      } else if (duration >= 1500) {
        assert.equal(s.stage.dataset.mode, from === 'normal' ? 'max' : 'clean');
      } else if (duration >= 500) {
        assert.equal(s.stage.dataset.mode, from); assert.equal(s.stage.dataset.on, 'false');
      } else {
        assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, String(from === 'normal'));
      }
    });
  }
}

test('an overdue mode callback cannot enter Flush before an overdue stuck-trigger callback', () => {
  const s = simulator({ reducedMotion: true }); s.power(true); s.hold();
  s.down(); s.resumeAfter(31000);
  assert.equal(s.stage.dataset.fault, 'trigger'); assert.equal(s.stage.dataset.mode, 'normal');
  assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.pos(), 0);
});

test('unrelated capture loss and secondary mouse-button release cannot finish J', () => {
  const s = simulator(); s.power(true);
  s.emit(s.q('j'), 'pointerdown', { pointerId: 7, pointerType: 'mouse', button: 0 });
  s.advance(100);
  s.emit(s.q('j'), 'lostpointercapture', { pointerId: 8 });
  s.emit(s.window, 'pointerup', { pointerId: 7, pointerType: 'mouse', button: 2 });
  assert.equal(s.stage.dataset.triggerHeld, 'true'); assert.equal(s.stage.dataset.on, 'false');
  s.emit(s.window, 'pointerup', { pointerId: 7, pointerType: 'mouse', button: 0 });
  assert.equal(s.stage.dataset.on, 'true');
});
