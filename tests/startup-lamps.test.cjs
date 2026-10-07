const assert = require('node:assert/strict');
const { test } = require('node:test');
const { simulator } = require('./helpers/simulator.cjs');

const colors = s => s.stage.dataset.colors.split(',');
const paused = s => {
  assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.stage.dataset.target, '0');
  assert.equal(s.stage.dataset.mode, 'normal');
};

test('startup checks all twenty color channels once, then restores the paused display', () => {
  const s = simulator(); s.power(true, false);
  for (const color of ['white', 'blue']) {
    const expected = Array(10).fill(color);
    assert.deepEqual(colors(s), expected);
    assert.equal(s.stage.dataset.lampTest, 'true');
    assert.equal(s.stage.dataset.inputsReady, 'false');
    assert.equal(s.pendingFrames(), 0);
    assert.equal(s.pendingJobs(), 1);
    paused(s); assert.equal(s.pos(), 0);
    s.advance(999); assert.deepEqual(colors(s), expected); s.advance(1);
  }
  assert.equal(s.stage.dataset.lampTest, 'false');
  assert.equal(s.stage.dataset.colors, 'white,white,white,white,off,off,off,off,off,blue');
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.advance(99); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.advance(1); assert.equal(s.stage.dataset.inputsReady, 'true'); paused(s);
  s.tap(); assert.equal(s.stage.dataset.on, 'true');
});

test('a J press spanning the end of the lamp test is consumed through release', () => {
  const s = simulator(); s.power(true, false); s.advance(1900); s.down();
  s.advance(2000); assert.equal(s.stage.dataset.lampTest, 'false');
  paused(s); assert.equal(s.stage.dataset.inputsReady, 'false');
  s.up(); paused(s); s.advance(100);
  assert.equal(s.stage.dataset.inputsReady, 'true');
  s.tap(); assert.equal(s.stage.dataset.on, 'true');
});

test('rocker and accessibility activations during testing never queue setting or water changes', () => {
  const s = simulator(); s.power(true, false);
  s.click('g'); s.click('h'); s.click('j'); s.advance(2100);
  paused(s); assert.equal(s.stage.dataset.setting, '4');
  assert.equal(s.stage.dataset.rocker, 'h');
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.click('center'); s.advance(100); s.click('h');
  assert.equal(s.stage.dataset.setting, '3'); paused(s);
});

test('lamp test runs concurrently with closure and cannot certify closure itself', () => {
  const s = simulator(); s.power(true); s.hold(); s.hold(); s.advance(6000);
  assert.equal(s.pos(), 100); s.power(false); s.power(true, false);
  assert.equal(s.stage.dataset.lampTest, 'true');
  assert.equal(s.stage.dataset.recovering, 'true'); paused(s);
  s.advance(2100);
  assert.equal(s.stage.dataset.lampTest, 'false');
  assert.ok(s.pos() > 50 && s.pos() < 65, 'closing progressed during the test');
  assert.equal(s.stage.dataset.inputsReady, 'false');
  s.tap(); s.advance(4000); paused(s);
  assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.inputsReady, 'true');
});

test('every fault cancels startup testing immediately and acknowledgement never resumes it', () => {
  const faults = ['supply','stall','communication','driver','timeout','settings','input','position','trigger'];
  faults.forEach((cause, index) => {
    const s = simulator(); s.power(true, false); s.advance(700); s.fault(cause);
    const expected = Array(10).fill('off'); expected[cause === 'trigger' ? 9 : index] = 'white';
    assert.equal(s.stage.dataset.lampTest, 'false');
    assert.deepEqual(colors(s), expected); s.advance(2400);
    assert.deepEqual(colors(s), expected); paused(s);
    s.fault('normal'); s.click('reset-fault'); s.advance(100);
    assert.equal(s.stage.dataset.lampTest, 'false');
    assert.equal(s.stage.dataset.inputsReady, 'true'); paused(s);
  });
});

test('a latched fault at power-up keeps its fault display instead of running the lamp test', () => {
  const s = simulator(); s.power(true); s.fault('driver'); s.power(false);
  s.power(true, false); assert.equal(s.stage.dataset.lampTest, 'false');
  assert.equal(s.stage.dataset.colors, 'off,off,off,white,off,off,off,off,off,off');
  s.advance(3000); paused(s);
  s.fault('normal'); s.click('reset-fault'); s.advance(100);
  assert.equal(s.stage.dataset.inputsReady, 'true');
  assert.equal(s.stage.dataset.lampTest, 'false');
});

test('power loss cancels the test and its wakeup; each fresh power-up starts with all white', () => {
  const s = simulator();
  for (const duration of [0, 99, 100, 999, 1000, 1999, 2000]) {
    s.power(true, false);
    assert.deepEqual(colors(s), Array(10).fill('white'));
    s.advance(duration); s.power(false); s.advance(5000);
    assert.deepEqual(colors(s), Array(10).fill('off'));
    assert.equal(s.stage.dataset.lampTest, 'false');
    assert.equal(s.pendingJobs(), 0); paused(s);
  }
});

test('suspended-browser startup completes by elapsed time without replaying missed lamp steps', () => {
  const s = simulator(); s.power(true, false); s.resumeAfter(86400000);
  assert.equal(s.stage.dataset.lampTest, 'false'); paused(s);
  assert.equal(s.stage.dataset.inputsReady, 'false');
  assert.equal(s.pendingFrames(), 0); assert.equal(s.pendingJobs(), 2);
  s.advance(100); assert.equal(s.stage.dataset.inputsReady, 'true');
  assert.equal(s.pendingJobs(), 1);
});

test('reduced motion uses the same one-second white then one-second blue test', () => {
  const s = simulator({ reducedMotion: true }); s.power(true, false);
  assert.deepEqual(colors(s), Array(10).fill('white'));
  s.advance(999); assert.deepEqual(colors(s), Array(10).fill('white'));
  s.advance(1); assert.deepEqual(colors(s), Array(10).fill('blue'));
  s.advance(999); assert.deepEqual(colors(s), Array(10).fill('blue'));
  assert.equal(s.pendingFrames(), 0); assert.equal(s.pendingJobs(), 1);
  s.advance(101); assert.equal(s.stage.dataset.lampTest, 'false');
  assert.equal(s.stage.dataset.inputsReady, 'true'); assert.equal(s.pendingJobs(), 0);
  paused(s);
});

test('changing reduced-motion preference does not restart or extend the startup test', () => {
  const s = simulator(); s.power(true, false); s.advance(450);
  s.setReducedMotion(true); assert.deepEqual(colors(s), Array(10).fill('white'));
  s.advance(600); assert.deepEqual(colors(s), Array(10).fill('blue'));
  s.setReducedMotion(false);
  assert.deepEqual(colors(s), Array(10).fill('blue'));
  assert.equal(s.pendingJobs(), 1); s.advance(950);
  assert.equal(s.stage.dataset.lampTest, 'false'); paused(s);
});

test('startup lamp testing preserves a saved cap and level without changing the resume opening', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(70); s.tap();
  const saved = ['setting','maximum','runOpening'].map(key => s.stage.dataset[key]);
  s.click('center'); s.power(false); s.power(true);
  assert.deepEqual(['setting','maximum','runOpening'].map(key => s.stage.dataset[key]), saved);
  assert.equal(s.stage.dataset.colors, 'white,white,white,white,white,white,blue,off,off,off');
  paused(s);
});

test('a fault at the test deadline takes precedence over neutral qualification and lamp rendering', () => {
  const s = simulator(); s.power(true, false); s.jump(2000); s.fault('driver');
  s.resumeAfter(1200);
  assert.equal(s.stage.dataset.lampTest, 'false');
  assert.equal(s.stage.dataset.inputsReady, 'false');
  assert.equal(s.stage.dataset.colors, 'off,off,off,white,off,off,off,off,off,off');
  paused(s);
});
