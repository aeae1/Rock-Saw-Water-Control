const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseHTML } = require('linkedom');

function simulator({ reducedMotion = false } = {}) {
  const { document, window } = parseHTML(readFileSync(resolve(__dirname, '../docs/index.html'), 'utf8'));
  let clock = 0, id = 0;
  const jobs = new Map();
  const schedule = (fn, ms, raf = false) => { jobs.set(++id, { fn, at: clock + ms, raf }); return id; };
  vm.runInNewContext(readFileSync(resolve(__dirname, '../docs/assets/simulator.js'), 'utf8'), {
    document,
    window: { matchMedia: () => ({ matches: reducedMotion }), addEventListener: window.addEventListener.bind(window) },
    performance: { now: () => clock },
    setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => jobs.delete(id),
    requestAnimationFrame: fn => schedule(fn, 16, true), cancelAnimationFrame: id => jobs.delete(id)
  });
  const stage = document.querySelector('.sa-stage');
  const q = name => stage.querySelector('[data-' + name + ']');
  function emit(el, type, props = {}) {
    const e = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, props); el.dispatchEvent(e);
  }
  function advance(ms) {
    const end = clock + ms; let count = 0;
    while (true) {
      const job = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!job || job[1].at > end) break;
      clock = job[1].at; jobs.delete(job[0]);
      job[1].raf ? job[1].fn(clock) : job[1].fn();
      if (++count > 10000) throw Error('Runaway frame loop');
    }
    clock = end;
  }
  const click = key => emit(q(key), 'click');
  const power = value => { q('power').checked = value; emit(q('power'), 'change'); };
  const down = () => emit(q('j'), 'pointerdown', { pointerType: 'touch', pointerId: 1, button: 0 });
  const up = () => { emit(q('j'), 'pointerup', { pointerType: 'touch', pointerId: 1, button: 0 }); click('j'); };
  const tap = () => { down(); advance(100); up(); };
  const hold = () => { down(); advance(2501); up(); };
  function draft(cap) {
    while (Number(stage.dataset.draft) !== cap) {
      click('center'); click(Number(stage.dataset.draft) > cap ? 'h' : 'g');
    }
  }
  // LinkeDOM exposes a read-only select.value; select the option as the UI does.
  const fault = value => {
    q('fault').querySelector('option[value="' + value + '"]').selected = true;
    emit(q('fault'), 'change');
  };
  const pos = () => Number(stage.dataset.position);
  return { stage, q, emit, advance, click, power, down, up, tap, hold, draft, fault, pos };
}

test('startup is off and shows saved level plus temporary maximum marker', () => {
  const s = simulator();
  assert.equal(s.stage.dataset.power, 'false');
  assert.equal(s.stage.dataset.colors, Array(10).fill('off').join(','));
  s.power(true);
  assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.pos(), 0);
  assert.equal(s.stage.dataset.colors, 'white,white,white,white,off,off,off,off,off,blue');
  s.advance(650); assert.equal(s.stage.dataset.colors.split(',')[9], 'white');
  s.advance(3100); assert.equal(s.stage.dataset.colors.split(',')[9], 'off');
});

test('long press latches setup, holds position, then remaps to repeatable steps', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(2300);
  assert.equal(s.pos(), 40);
  s.down(); s.advance(2499); assert.equal(s.stage.dataset.mode, 'normal');
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
  s.advance(2000); assert.equal(s.pos(), 0);
  assert.equal(s.stage.dataset.setting, '8'); assert.equal(s.stage.dataset.maximum, '50');
  s.hold(); s.draft(20); s.power(false); s.power(true);
  assert.equal(s.stage.dataset.maximum, '50'); assert.equal(s.stage.dataset.mode, 'normal');
});

test('canceled gestures do not toggle and keyboard long hold enters setup', () => {
  const s = simulator(); s.power(true);
  s.down(); s.advance(100); s.emit(s.q('j'), 'pointercancel', { pointerId: 1 });
  s.advance(3000); assert.equal(s.stage.dataset.on, 'false'); assert.equal(s.stage.dataset.mode, 'normal');
  s.emit(s.q('j'), 'keydown', { key: ' ', repeat: false }); s.advance(2501);
  s.emit(s.q('j'), 'keyup', { key: ' ' }); s.click('j');
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.on, 'false');
});

test('fault stops movement and inhibits controls until cleared', () => {
  const s = simulator(); s.power(true); s.tap(); s.advance(800);
  s.fault('driver'); const stopped = s.pos(); s.advance(3000);
  assert.equal(s.pos(), stopped); assert.equal(s.q('j').disabled, true);
  assert.equal(s.stage.dataset.colors, 'off,off,off,white,off,off,off,off,off,off');
  s.click('g'); assert.equal(s.stage.dataset.setting, '4');
  s.fault('input'); assert.equal(s.stage.dataset.colors.split(',')[6], 'white');
  s.fault('normal'); s.advance(2500); assert.equal(s.pos(), 0); assert.equal(s.q('j').disabled, false);
});

test('reduced motion uses a steady maximum marker', () => {
  const s = simulator({ reducedMotion: true }); s.power(true); s.hold(); s.draft(50);
  const colors = s.stage.dataset.colors;
  s.advance(2000); assert.equal(s.stage.dataset.colors, colors);
  assert.equal(colors, 'off,off,off,off,white,off,off,off,off,off');
});
