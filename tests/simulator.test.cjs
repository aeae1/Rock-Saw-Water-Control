const assert = require('node:assert/strict');
const { test } = require('node:test');
const { simulator } = require('./helpers/simulator.cjs');

test('startup is off and keeps the paused maximum marker indefinitely', () => {
  const s = simulator();
  assert.equal(s.stage.dataset.power, 'false');
  assert.equal(s.stage.dataset.colors, Array(10).fill('off').join(','));
  s.power(true);
  assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.pos(), 0);
  assert.equal(s.stage.dataset.colors, 'white,white,white,white,off,off,off,off,off,blue');
  s.advance(650); assert.equal(s.stage.dataset.colors.split(',')[9], 'off');
  s.advance(2950); assert.equal(s.stage.dataset.colors.split(',')[9], 'blue');
  s.advance(7200); assert.equal(s.stage.dataset.colors.split(',')[9], 'blue');
  s.advance(600); assert.equal(s.stage.dataset.colors.split(',')[9], 'off');
  assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false');
});

test('every paused maximum/level combination alternates blue with the underlying bar', () => {
  for (let cap = 10; cap <= 100; cap += 10) {
    const s = simulator(); s.power(true); s.hold(); s.draft(cap); s.tap(); s.advance(32);
    for (let level = 1; level <= 10; level++) {
      for (let guard=0; Number(s.stage.dataset.setting) !== level; guard++) {
        assert.ok(guard < 12, 'level adjustment must make progress');
        s.click('center'); s.click(Number(s.stage.dataset.setting) > level ? 'h' : 'g');
      }
      const base = Array.from({ length: 10 }, (_, i) => i < level ? 'white' : 'off');
      const marker = [...base]; marker[cap / 10 - 1] = 'blue';
      const first = s.stage.dataset.colors; s.advance(600);
      assert.deepEqual([first, s.stage.dataset.colors].sort(), [base.join(','), marker.join(',')].sort(), 'max ' + cap + ', level ' + level);
      assert.match(s.q('panel').getAttribute('aria-label'), new RegExp('Maximum lamp ' + cap / 10 + ' alternates blue and ' + (cap / 10 <= level ? 'white' : 'off')));
      assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.target, '0'); assert.equal(s.stage.dataset.on, 'false');
      assert.equal(Number(s.stage.dataset.runOpening), level * cap / 10);
      assert.equal(s.pendingJobs(), 1); assert.equal(s.pendingFrames(), 0);
    }
  }
});

test('running, drain, setup, fault, and power-off displays take priority over the paused marker', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(70);
  assert.equal(s.stage.dataset.colors.split(',').filter(c => c !== 'off').length, 1);
  s.tap();
  for (let guard=0; Number(s.stage.dataset.setting) > 4; guard++) { assert.ok(guard < 12); s.click('center'); s.click('h'); }
  s.tap(); s.advance(6000);
  assert.equal(s.stage.dataset.colors, 'blue,blue,blue,blue,off,off,off,off,off,off');
  s.tap(); s.advance(700);
  assert.equal(s.stage.dataset.moving, 'true'); assert.equal(s.stage.dataset.colors.split(',')[6], 'off');
  s.advance(1000);
  const a = s.stage.dataset.colors.split(',')[6]; s.advance(600);
  assert.deepEqual([a, s.stage.dataset.colors.split(',')[6]].sort(), ['blue', 'off']);
  s.fault('driver'); s.advance(1200);
  assert.equal(s.stage.dataset.colors, 'off,off,off,white,off,off,off,off,off,off');
  assert.equal(s.pendingFrames(), 0); assert.equal(s.pendingJobs(), 1); // Continuous fault blink.
  s.fault('normal'); s.power(false); s.advance(1200);
  assert.equal(s.stage.dataset.colors, Array(10).fill('off').join(',')); assert.equal(s.pendingJobs(), 0);
});

test('long press latches setup, holds position, then remaps to repeatable steps', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(2300);
  assert.equal(s.pos(), 40);
  s.down(); s.advance(1499); assert.equal(s.stage.dataset.mode, 'normal');
  s.advance(2); assert.equal(s.stage.dataset.mode, 'max'); s.up();
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.on, 'true');
  s.draft(50); s.advance(1500);
  assert.equal(s.pos(), 40); assert.equal(s.stage.dataset.maximum, '100');
  assert.equal(s.stage.dataset.colors.split(',').filter(c => c !== 'off').length, 1);
  assert.notEqual(s.stage.dataset.colors.split(',')[4], 'off');
  s.tap(); s.advance(300);
  assert.equal(s.stage.dataset.setting, '8'); assert.equal(s.pos(), 40);
  s.hold(); s.draft(60); s.tap(); s.advance(500);
  assert.equal(s.stage.dataset.setting, '7'); assert.equal(s.pos(), 42);
  s.hold(); s.draft(30); s.advance(500); assert.equal(s.pos(), 42);
  s.tap(); s.advance(1000); assert.equal(s.stage.dataset.setting, '10'); assert.equal(s.pos(), 30);
});

test('paused setup preserves off command and remaps the resume setting', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(50); s.tap();
  s.advance(500);
  assert.equal(s.stage.dataset.setting, '8'); assert.equal(s.pos(), 0);
  assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.stage.dataset.runOpening, '40');
});

test('rocker latches once, rearms at center or reversal, and stays within bounds', () => {
  const s = simulator(); s.power(true); s.click('g');
  assert.equal(s.stage.dataset.setting, '5');
  s.click('g'); s.advance(5000); assert.equal(s.stage.dataset.setting, '5');
  s.click('h'); assert.equal(s.stage.dataset.setting, '4');
  for (let i = 0; i < 15; i++) { s.click('center'); s.click('h'); }
  assert.equal(s.stage.dataset.setting, '1');
  for (let i = 0; i < 15; i++) { s.click('center'); s.click('g'); }
  assert.equal(s.stage.dataset.setting, '10');
});

test('power interruption stops travel, retains settings, and discards draft', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(50); s.tap();
  s.tap(); s.advance(500); s.power(false);
  const stopped = s.pos(); assert.ok(stopped > 0 && stopped < 40);
  s.advance(3000); assert.equal(s.pos(), stopped);
  assert.equal(s.stage.dataset.colors, Array(10).fill('off').join(','));
  s.power(true); assert.equal(s.stage.dataset.on, 'false');
  s.advance(2000); s.click('center'); s.advance(100); assert.equal(s.pos(), 0);
  assert.equal(s.stage.dataset.setting, '8'); assert.equal(s.stage.dataset.maximum, '50');
  s.hold(); s.draft(20); s.power(false); s.power(true);
  assert.equal(s.stage.dataset.maximum, '50'); assert.equal(s.stage.dataset.mode, 'normal');
});

test('canceled gestures do not toggle and keyboard long hold enters setup', () => {
  const s = simulator(); s.power(true);
  s.down(); s.advance(100); s.emit(s.q('j'), 'pointercancel', { pointerId: 1 });
  s.advance(3000); assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.stage.dataset.mode, 'normal');
  s.emit(s.q('j'), 'keydown', { key: ' ', repeat: false }); s.advance(1501);
  s.emit(s.q('j'), 'keyup', { key: ' ' }); s.click('j');
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.on, 'false');
});

test('fault stops movement and inhibits controls until cleared', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(800);
  s.fault('driver'); const stopped = s.pos(); s.advance(3000);
  assert.equal(s.pos(), stopped); assert.equal(s.q('j').dataset.commandEnabled, 'false');
  assert.equal(s.stage.dataset.colors, 'off,off,off,white,off,off,off,off,off,off');
  s.click('g'); assert.equal(s.stage.dataset.setting, '4');
  s.fault('input'); assert.equal(s.stage.dataset.colors.split(',')[3], 'white');
  assert.equal(s.stage.dataset.latchedFaults, 'driver,input');
  s.fault('normal'); s.click('center'); s.click('reset-fault'); s.advance(2500); assert.equal(s.pos(), 0); assert.equal(s.q('j').dataset.commandEnabled, 'true');
});

test('reduced motion uses a steady maximum marker', () => {
  const s = simulator({ reducedMotion: true }); s.power(true);
  const paused = s.stage.dataset.colors; s.advance(24 * 60 * 60 * 1000);
  assert.equal(s.stage.dataset.colors, paused); assert.equal(s.pendingJobs(), 0);
  assert.equal(paused, 'white,white,white,white,off,off,off,off,off,blue');
  assert.match(s.q('panel').getAttribute('aria-label'), /Maximum lamp 10 is steady blue/);
  s.hold(); s.draft(50);
  const colors = s.stage.dataset.colors;
  s.advance(2000); assert.equal(s.stage.dataset.colors, colors);
  assert.equal(colors, 'off,off,off,off,white,off,off,off,off,off');
});

test('changing reduced-motion preference stops and restarts idle blinking without timer accumulation', () => {
  const s = simulator(); s.power(true); s.advance(650);
  assert.equal(s.stage.dataset.colors.split(',')[9], 'off');
  for (let i = 0; i < 20; i++) {
    s.setReducedMotion(true);
    assert.equal(s.stage.dataset.colors.split(',')[9], 'blue'); assert.equal(s.pendingJobs(), 0);
    s.setReducedMotion(false);
    assert.equal(s.pendingJobs(), 1); assert.equal(s.pendingFrames(), 0);
  }
  s.advance(600); assert.equal(s.stage.dataset.colors.split(',')[9], 'blue');
  s.power(false); assert.equal(s.pendingJobs(), 0);
});


test('short/long boundary is exact and a long release never toggles water', () => {
  for (const [duration, mode, on] of [[499, 'normal', 'true'], [500, 'normal', 'false'], [1499, 'normal', 'false'], [1500, 'max', 'false'], [1501, 'max', 'false']]) {
    const s = simulator(); s.power(true); s.down(); s.advance(duration); s.up();
    assert.equal(s.stage.dataset.mode, mode); assert.equal(s.stage.dataset.on, on);
  }
});

test('power loss during a held J cancels the pending long press', () => {
  const s = simulator(); s.power(true); s.down(); s.advance(1400); s.power(false); s.advance(6000); s.up();
  assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'false');
  s.power(true); s.advance(4000); assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.pos(), 0);
});

test('a fault during a held J cancels setup and cannot produce a release toggle', () => {
  const s = simulator(); s.power(true); s.down(); s.advance(1400); s.fault('driver'); s.advance(6000); s.up();
  assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.q('j').dataset.commandEnabled, 'false');
});

for (const cancellation of ['lostpointercapture', 'blur', 'visibilitychange']) {
  test(cancellation + ' cancels an unfinished J gesture', () => {
    const s = simulator(); s.power(true); s.down(); s.advance(1400);
    if (cancellation === 'blur') s.emit(s.window, 'blur');
    else if (cancellation === 'visibilitychange') {
      Object.defineProperty(s.document, 'hidden', { value: true }); s.emit(s.document, 'visibilitychange');
    } else s.emit(s.q('j'), cancellation, { pointerId: 1 });
    s.advance(6000);
    assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'false');
  });
}

test('right clicks, another pointer, and keyboard repeat do not create extra commands', () => {
  const s = simulator(); s.power(true);
  s.emit(s.q('j'), 'pointerdown', { pointerType: 'mouse', pointerId: 1, button: 2 });
  s.advance(3000); assert.equal(s.stage.dataset.mode, 'normal');
  s.down(); s.advance(100);
  s.emit(s.q('j'), 'pointerup', { pointerType: 'touch', pointerId: 2, button: 0 });
  assert.equal(s.stage.dataset.on, 'false'); s.up(); assert.equal(s.stage.dataset.on, 'true');
  s.emit(s.q('j'), 'keydown', { key: 'Enter', repeat: false });
  s.advance(500); s.emit(s.q('j'), 'keydown', { key: 'Enter', repeat: true }); s.advance(1001);
  assert.equal(s.stage.dataset.mode, 'max');
  s.emit(s.q('j'), 'keyup', { key: 'Enter' }); assert.equal(s.stage.dataset.on, 'true');
});

test('a second long hold saves the maximum and enters full-open cleaning; a tap restores paused operation', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(30); s.hold();
  assert.equal(s.stage.dataset.mode, 'clean'); assert.equal(s.stage.dataset.maximum, '30');
  assert.equal(s.stage.dataset.target, '100'); assert.equal(s.stage.dataset.on, 'true');
  s.advance(6000); assert.equal(s.pos(), 100);
  s.tap(); s.advance(6000);
  assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.maximum, '30');
  assert.equal(s.stage.dataset.setting, '10'); assert.equal(s.stage.dataset.runOpening, '30');
});

test('cleaning restores the quantized running opening and locks G/H against accidental setting changes', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(2500);
  s.hold(); s.draft(60); s.hold(); s.advance(6000);
  assert.equal(s.pos(), 100); assert.equal(s.stage.dataset.setting, '7'); assert.equal(s.stage.dataset.runOpening, '42');
  for (const key of ['g', 'h']) {
    assert.equal(s.q(key).dataset.commandEnabled, 'false'); s.click(key);
  }
  assert.equal(s.stage.dataset.setting, '7'); assert.equal(s.stage.dataset.maximum, '60');
  s.down(); assert.equal(s.stage.dataset.mode, 'normal');
  s.advance(6000); s.up();
  assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'true');
  assert.equal(s.pos(), 42); assert.equal(s.q('g').dataset.commandEnabled, 'true');
});

test('second-hold boundary is 1.5 seconds, and its release never exits cleaning', () => {
  for (const duration of [1499, 1500, 1501]) {
    const s = simulator(); s.power(true); s.hold(); s.draft(70);
    s.down(); s.advance(duration); s.up();
    assert.equal(s.stage.dataset.mode, duration < 1500 ? 'max' : 'clean');
    assert.equal(s.stage.dataset.target, duration < 1500 ? '0' : '100');
    assert.equal(s.stage.dataset.maximum, duration < 1500 ? '100' : '70');
  }
});

test('one continuous J hold cannot advance through two modes', () => {
  const s = simulator(); s.power(true); s.down(); s.advance(10000);
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.pos(), 0);
  s.up(); s.down(); s.advance(10000);
  assert.equal(s.stage.dataset.mode, 'clean'); assert.equal(s.pos(), 100);
  s.up(); assert.equal(s.stage.dataset.mode, 'clean');
});

test('canceling a second hold preserves setup and its uncommitted draft', () => {
  for (const cancellation of ['pointercancel', 'lostpointercapture', 'blur', 'visibilitychange']) {
    const s = simulator(); s.power(true); s.hold(); s.draft(20); s.down(); s.advance(1400);
    if (cancellation === 'blur') s.emit(s.window, 'blur');
    else if (cancellation === 'visibilitychange') {
      Object.defineProperty(s.document, 'hidden', { value: true }); s.emit(s.document, 'visibilitychange');
    } else s.emit(s.q('j'), cancellation, { pointerId: 1 });
    s.advance(3000);
    assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.maximum, '100');
    assert.equal(s.stage.dataset.draft, '20'); assert.equal(s.pos(), 0);
  }
});

test('power loss or fault during the second hold cannot enter cleaning later', () => {
  for (const interrupt of ['power', 'fault']) {
    const s = simulator(); s.power(true); s.hold(); s.down(); s.advance(1400);
    interrupt === 'power' ? s.power(false) : s.fault('driver');
    s.advance(6000); s.up();
    assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.pos(), 0);
  }
});

test('power interruption or fault during cleaning stops travel and recovery closes without resuming cleaning', () => {
  for (const interrupt of ['power', 'fault']) {
    const s = simulator(); s.power(true); s.hold(); s.draft(50); s.hold(); s.advance(500);
    interrupt === 'power' ? s.power(false) : s.fault('driver');
    const stopped = s.pos(); assert.ok(stopped > 0 && stopped < 100);
    s.advance(6000); assert.equal(s.pos(), stopped); assert.equal(s.stage.dataset.mode, 'normal');
    s.click('center');
    interrupt === 'power' ? s.power(true) : (s.fault('normal'), s.click('reset-fault'));
    s.advance(6000);
    assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.maximum, '50');
  }
});

test('cleaning can be exited before reaching full open from both paused and running operation', () => {
  for (const running of [false, true]) {
    const s = simulator(); s.power(true);
    if (running) { s.tap(); s.advance(2500); }
    s.hold(); s.hold(); s.advance(500); const before = s.pos();
    assert.ok(before > (running ? 40 : 0) && before < 100);
    s.tap(); s.advance(6000);
    assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, String(running));
    assert.equal(s.pos(), running ? 40 : 0);
  }
});

test('normal J taps under 500 ms never show hold feedback and still toggle on release', () => {
  for (const reducedMotion of [false, true]) {
    for (const running of [false, true]) {
      for (const duration of [100, 499]) {
        const s = simulator({ reducedMotion }); s.power(true);
        if (running) { s.tap(); s.advance(2500); }
        const colors = s.stage.dataset.colors, label = s.q('panel').getAttribute('aria-label');
        s.down(); s.advance(duration);
        assert.equal(s.stage.dataset.colors, colors);
        assert.equal(s.q('panel').getAttribute('aria-label'), label);
        assert.equal(s.q('mode-label').textContent, 'NORMAL');
        assert.equal(s.q('hold-caption').textContent, 'Hold 1.5 s to set max');
        assert.equal(s.q('hold-progress').style.width, '0%');
        assert.equal(s.stage.dataset.on, String(running));
        s.up(); assert.equal(s.stage.dataset.on, String(!running));
        s.advance(600); assert.equal(s.stage.dataset.mode, 'normal');
      }
    }
  }
});

test('both mode holds delay feedback for 500 ms, fill inward, and transition at 1500 ms', () => {
  const s = simulator(); s.power(true);
  for (const nextMode of ['max', 'clean']) {
    const label = s.q('panel').getAttribute('aria-label');
    s.down(); s.advance(499);
    assert.equal(s.q('panel').getAttribute('aria-label'), label);
    assert.equal(s.q('hold-progress').style.width, '0%');
    s.advance(29); // Allow one render frame after the 500 ms threshold.
    for (let pair = 0; pair < 5; pair++) {
      if (pair) s.advance(200);
      const colors = Array(10).fill('off');
      for (let i = 0; i <= pair; i++) colors[i] = colors[9 - i] = 'white';
      assert.equal(s.stage.dataset.colors, colors.join(',')); assert.equal(s.pos(), 0);
    }
    assert.match(s.q('panel').getAttribute('aria-label'), /White lamps fill inward/);
    s.advance(171); assert.equal(s.stage.dataset.mode, nextMode === 'max' ? 'normal' : 'max');
    s.advance(1); assert.equal(s.stage.dataset.mode, nextMode);
    s.up(); assert.equal(s.stage.dataset.mode, nextMode);
  }
});

test('cleaning ripple travels symmetrically outward; reduced motion keeps a steady center pair', () => {
  const s = simulator(); s.power(true); s.hold(); s.hold(); s.advance(32);
  for (let ring = 0; ring < 6; ring++) {
    if (ring) s.advance(180);
    const colors = Array(10).fill('blue');
    if (ring < 5) colors[4 - ring] = colors[5 + ring] = 'white';
    assert.equal(s.stage.dataset.colors, colors.join(','));
  }
  s.setReducedMotion(true); s.advance(6000);
  assert.equal(s.pos(), 100); assert.equal(s.pendingJobs(), 0);
  assert.equal(s.stage.dataset.colors, 'blue,blue,blue,blue,white,white,blue,blue,blue,blue');
  s.advance(24 * 60 * 60 * 1000); assert.equal(s.stage.dataset.mode, 'clean');
  s.tap(); s.advance(6000); assert.equal(s.pos(), 0);
});

test('maximum cannot be adjusted beyond either bound', () => {
  const s = simulator(); s.power(true); s.hold();
  for (let i = 0; i < 15; i++) { s.click('center'); s.click('g'); }
  assert.equal(s.stage.dataset.draft, '100');
  for (let i = 0; i < 15; i++) { s.click('center'); s.click('h'); }
  assert.equal(s.stage.dataset.draft, '10'); assert.equal(s.stage.dataset.maximum, '100');
});

test('fault clearing closes the valve; a power cycle alone does not clear the fault', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(2500); s.fault('driver');
  s.power(false); s.power(true); s.advance(4000);
  assert.equal(s.pos(), 40); assert.equal(s.q('j').dataset.commandEnabled, 'false');
  s.fault('normal'); s.click('reset-fault'); s.advance(2500); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false');
});

test('rapid on/off reversals settle at the final command without overshoot', () => {
  const s = simulator(); s.power(true);
  for (let i = 0; i < 31; i++) { s.tap(); s.advance(37); assert.ok(s.pos() >= 0 && s.pos() <= 40); }
  s.advance(6000); assert.equal(s.pos(), 40); assert.equal(s.stage.dataset.on, 'true');
  s.tap(); s.advance(6000); assert.equal(s.pos(), 0);
});

test('setup entered during motion freezes the position reached at entry', () => {
  const s = simulator(); s.power(true);
  for (let i = 0; i < 6; i++) { s.click('center'); s.click('g'); }
  s.tap(); s.hold(); const frozen = s.pos();
  assert.ok(frozen > 0 && frozen < 100);
  s.draft(30); s.advance(10000); assert.equal(s.pos(), frozen);
  s.tap(); s.advance(6000); assert.equal(s.pos(), 30);
});

test('Set Max never interrupts an OFF command that is still closing', () => {
  const s = simulator(); s.power(true);
  for (let i = 0; i < 6; i++) { s.click('center'); s.click('g'); }
  s.tap(); s.advance(6000); s.tap(); s.hold(); const frozen = s.pos();
  assert.ok(frozen > 0 && frozen < 100); s.draft(60); s.advance(8000); assert.equal(s.pos(), 0);
  s.tap(); s.advance(6000); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.stage.dataset.runOpening, '60');
});

test('paused blinking uses one timeout and remains responsive after a day of browser suspension', () => {
  const s = simulator(); s.power(true); s.advance(10000);
  assert.equal(s.pendingJobs(), 1); assert.equal(s.pendingFrames(), 0);
  s.resumeAfter(24 * 60 * 60 * 1000 + 800);
  assert.equal(s.pendingJobs(), 1); assert.equal(s.pendingFrames(), 0);
  assert.equal(s.stage.dataset.colors.split(',')[9], 'blue');
  s.advance(600); assert.equal(s.stage.dataset.colors.split(',')[9], 'off');
  s.tap(); s.advance(6000); assert.equal(s.pos(), 40);
});

for (const running of [false, true]) {
  for (let cap = 10; cap <= 100; cap += 10) {
    test('all ten levels remap to nearest available position at max ' + cap + '%, ' + (running ? 'running' : 'paused'), () => {
      for (let startingLevel = 1; startingLevel <= 10; startingLevel++) {
        const s = simulator({ reducedMotion: true }); s.power(true);
        for (let guard=0; Number(s.stage.dataset.setting) !== startingLevel; guard++) {
          assert.ok(guard < 12, 'starting level adjustment must make progress');
          s.click('center'); s.click(Number(s.stage.dataset.setting) < startingLevel ? 'g' : 'h');
        }
        if (running) { s.tap(); s.advance(6000); }
        s.hold(); const frozen = s.pos(); s.draft(cap); assert.equal(s.pos(), frozen);
        s.tap(); s.advance(6000);
        const selected = Number(s.stage.dataset.setting), resume = Number(s.stage.dataset.runOpening);
        const alternatives = Array.from({ length: 10 }, (_, i) => (i + 1) * cap / 10);
        const distance = Math.abs(resume - startingLevel * 10);
        assert.equal(resume, alternatives[selected - 1]);
        assert.ok(alternatives.every(p => Math.abs(p - startingLevel * 10) >= distance - 1e-9));
        assert.equal(s.stage.dataset.on, String(running)); assert.equal(s.pos(), running ? resume : 0);
      }
    });
  }
}

for (const seed of [17, 103, 4099, 65537]) {
  test('seeded stress sequence ' + seed + ': 1,000 mixed actions preserve state invariants', () => {
    let rng = seed;
    const next = n => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng % n; };
    const s = simulator({ reducedMotion: true });
    for (let i = 0; i < 1000; i++) {
      switch (next(12)) {
        case 0: s.power(s.stage.dataset.power !== 'true'); break;
        case 1: s.tap(); break;
        case 2: s.hold(); break;
        case 3: s.click('g'); break;
        case 4: s.click('h'); break;
        case 5: s.click('center'); break;
        case 6: if (!s.q('fault-toggle').disabled) s.fault(['normal', 'normal', 'driver', 'input', 'supply', 'stall', 'communication', 'timeout', 'settings', 'position', 'temperature', 'trigger'][next(12)]); break;
        case 7: s.down(); s.advance(next(2600)); s.emit(s.q('j'), 'pointercancel', { pointerId: 1 }); break;
        case 8: s.fault('normal'); s.click('center'); s.click('reset-fault'); break;
        default: s.advance(next(7000));
      }
      const d = s.stage.dataset, level = Number(d.setting), cap = Number(d.maximum);
      assert.ok(Number.isInteger(level) && level >= 1 && level <= 10, 'level at action ' + i);
      assert.ok(cap >= 10 && cap <= 100 && cap % 10 === 0, 'maximum at action ' + i);
      assert.ok(Number(d.position) >= 0 && Number(d.position) <= 100, 'position at action ' + i);
      assert.ok(Number(d.target) >= 0 && Number(d.target) <= 100, 'target at action ' + i);
      assert.equal(Number(d.runOpening), level * cap / 10, 'repeatability at action ' + i);
      assert.equal(d.colors.split(',').length, 10);
      assert.ok(d.colors.split(',').every(c => ['off', 'blue', 'white'].includes(c)));
      assert.ok(s.pendingJobs() <= 3, 'no timer accumulation at action ' + i);
      if (d.power === 'false') {
        assert.equal(d.on, 'false'); assert.equal(d.mode, 'normal');
        assert.equal(d.colors, Array(10).fill('off').join(','));
      }
      if (d.mode === 'max' && d.on === 'true') assert.equal(d.moving, 'false');
      if (d.fault !== 'normal') {
        assert.equal(d.on, 'false');assert.equal(d.inputsReady,'false');
        if(d.moving==='true'){
          assert.equal(d.faultResponse,'closing');assert.equal(d.target,'0');
          assert.ok(d.latchedFaults.split(',').every(c=>['settings','input','trigger'].includes(c)));
        }
        if(d.positionKnown==='true'){assert.equal(d.position,'0');assert.equal(d.faultResponse,'closed');}
      }
      if (d.recovering === 'true') { assert.equal(d.target, '0'); assert.equal(d.on, 'false'); assert.equal(d.inputsReady, 'false'); }
    }
  });
}

test('aborted holds cannot toggle water or commit a draft', () => {
  for (const duration of [500, 501, 1000, 1499]) {
    for (const running of [false, true]) {
      const s = simulator(); s.power(true);
      if (running) { s.tap(); s.advance(6000); }
      s.down(); s.advance(duration); s.up();
      assert.equal(s.stage.dataset.on, String(running)); assert.equal(s.stage.dataset.mode, 'normal');
      s.hold(); s.draft(30); s.down(); s.advance(duration); s.up();
      assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.maximum, '100');
    }
  }
});

test('a Flush hold started during closing cannot queue entry after closing completes', () => {
  const s = simulator(); s.power(true);
  for (let i = 0; i < 6; i++) { s.click('center'); s.click('g'); }
  s.tap(); s.advance(6000); s.tap(); s.hold();
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.moving, 'true');
  s.down(); s.advance(6000); s.up();
  assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.mode, 'max');
  s.hold(); assert.equal(s.stage.dataset.mode, 'clean');
});

test('fresh Flush press exits immediately and consumes its hold and release', () => {
  for (const running of [false, true]) {
    const s = simulator(); s.power(true);
    if (running) { s.tap(); s.advance(6000); }
    s.hold(); s.hold(); s.advance(1000); s.down();
    assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.stage.dataset.on, String(running));
    s.advance(2000); s.up(); s.advance(6000);
    assert.equal(s.stage.dataset.mode, 'normal'); assert.equal(s.pos(), running ? 40 : 0);
    assert.equal(s.stage.dataset.on, String(running));
  }
});

test('startup closes fully and requires released J and centered rocker; nothing is queued', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(6000); s.click('g');
  s.down(); s.power(false); s.power(true, false);
  assert.equal(s.stage.dataset.recovering, 'true'); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.advance(7000); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.click('center'); s.advance(100); assert.equal(s.stage.dataset.inputsReady, 'true'); assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.stage.dataset.mode, 'normal'); s.tap(); assert.equal(s.stage.dataset.on, 'true');
});

test('J commands during recovery are discarded until release even after closing finishes', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(6000); s.power(false); s.power(true, false);
  s.down(); s.advance(6000); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); s.advance(100); assert.equal(s.stage.dataset.inputsReady, 'true'); assert.equal(s.stage.dataset.on, 'false');
  s.tap(); assert.equal(s.stage.dataset.on, 'true');
});

const faultTypes = ['supply', 'stall', 'communication', 'driver', 'timeout', 'settings', 'input', 'position', 'temperature', 'trigger'];
for (const [index, cause] of faultTypes.entries()) {
  test('fault ' + (index + 1) + ' ' + cause + ': latches, blocks restart, then acknowledges and references closed', () => {
    for (const mode of ['normal', 'max', 'clean']) {
      const s = simulator(); s.power(true); s.tap(); s.advance(6000);
      if (mode !== 'normal') s.hold();
      if (mode === 'clean') s.hold();
      s.advance(1000); s.fault(cause); const stopped = s.pos();
      assert.equal(s.stage.dataset.colors.split(',')[index], 'white');
      assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.stage.dataset.mode, 'normal');
      const faultPosition=['settings','input','trigger'].includes(cause)?0:stopped;
      s.click('reset-fault'); s.tap(); s.advance(6000); assert.equal(s.pos(), faultPosition);
      s.power(false); s.power(true); assert.equal(s.stage.dataset.fault, cause);
      s.fault('normal'); s.advance(6000); assert.equal(s.pos(), faultPosition); // Cause removal never starts another attempt.
      s.click('reset-fault'); assert.equal(s.stage.dataset.fault, 'normal');
      assert.equal(s.stage.dataset.recovering, String(faultPosition>0)); s.advance(6000);
      assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.stage.dataset.inputsReady, 'true');
    }
  });
}

test('fault reset accepts a fresh 3-second J hold with G held and consumes release before rearming', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(6000); s.click('g'); s.fault('driver'); s.fault('normal');
  s.down(); s.advance(2999); assert.equal(s.stage.dataset.fault, 'driver');
  s.up(); assert.equal(s.stage.dataset.fault, 'driver');
  s.down(); s.advance(3000); assert.equal(s.stage.dataset.fault, 'normal');
  s.advance(6000); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); s.advance(100);assert.equal(s.stage.dataset.inputsReady,'true');assert.equal(s.stage.dataset.setting,'5');
  assert.equal(s.stage.dataset.rocker,'g');assert.equal(s.stage.dataset.on,'false');
  s.tap(); assert.equal(s.stage.dataset.on, 'true');
});

test('a new cause during reset cancels acknowledgement and multiple faults stay latched', () => {
  const s = simulator(); s.power(true); s.fault('driver'); s.fault('normal');
  s.down(); s.advance(2000); s.fault('supply'); s.advance(2000); s.up();
  assert.equal(s.stage.dataset.fault, 'supply'); assert.equal(s.stage.dataset.latchedFaults, 'driver,supply');
  s.fault('normal'); assert.equal(s.stage.dataset.fault, 'supply');
  s.click('reset-fault'); assert.equal(s.stage.dataset.latchedFaults, '');
});

test('invalid settings reset to documented defaults only on acknowledgement', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(30); s.tap(); s.click('center');
  s.fault('settings'); s.fault('normal'); assert.equal(s.stage.dataset.maximum, '30');
  s.click('reset-fault'); assert.equal(s.stage.dataset.maximum, '100'); assert.equal(s.stage.dataset.setting, '4');
  assert.equal(s.stage.dataset.runOpening, '40'); assert.equal(s.stage.dataset.on, 'false');
});

test('30-second stuck-J watchdog latches fault 10 and requires release before reset', () => {
  const s = simulator(); s.power(true); s.down(); s.advance(29999);
  assert.equal(s.stage.dataset.fault, 'normal'); s.advance(1);
  assert.equal(s.stage.dataset.fault, 'trigger'); assert.equal(s.q('reset-fault').disabled, true);
  s.click('reset-fault'); assert.equal(s.stage.dataset.fault, 'trigger');
  s.up(); s.click('reset-fault'); assert.equal(s.stage.dataset.fault, 'normal'); assert.equal(s.stage.dataset.on, 'false');
});

test('unrelated keyboard release does not end a J hold and pointer compatibility clicks cannot toggle twice', () => {
  const s = simulator(); s.power(true);
  s.emit(s.q('j'), 'keydown', { key: 'Enter', repeat: false }); s.advance(100);
  s.emit(s.q('j'), 'keyup', { key: ' ' }); assert.equal(s.stage.dataset.on, 'false');
  s.advance(1400); assert.equal(s.stage.dataset.mode, 'max');
  s.emit(s.q('j'), 'keyup', { key: 'Enter' }); s.advance(1000);
  s.emit(s.q('j'), 'click', { detail: 1 }); assert.equal(s.stage.dataset.mode, 'max');
});
