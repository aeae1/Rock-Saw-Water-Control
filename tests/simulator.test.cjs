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
  const hold = () => { down(); advance(1501); up(); };
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
  return { stage, q, emit, advance, click, power, down, up, tap, hold, draft, fault, pos, document, window, pendingJobs: () => jobs.size };
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
  s.advance(2000); assert.equal(s.pos(), 0);
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


test('short/long boundary is exact and a long release never toggles water', () => {
  for (const [duration, mode, on] of [[1499, 'normal', 'true'], [1500, 'max', 'false'], [1501, 'max', 'false']]) {
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
  assert.equal(s.q('j').disabled, true);
});

for (const cancellation of ['lostpointercapture', 'blur', 'visibilitychange']) {
  test(cancellation + ' cancels an unfinished J gesture', () => {
    const s = simulator(); s.power(true); s.down(); s.advance(1400);
    if (cancellation === 'blur') s.emit(s.window, 'blur');
    else if (cancellation === 'visibilitychange') {
      Object.defineProperty(s.document, 'hidden', { value: true }); s.emit(s.document, 'visibilitychange');
    } else s.emit(s.q('j'), cancellation);
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

test('a second long hold in setup does not save a draft', () => {
  const s = simulator(); s.power(true); s.hold(); s.draft(30); s.hold();
  assert.equal(s.stage.dataset.mode, 'max'); assert.equal(s.stage.dataset.maximum, '100');
  s.tap(); assert.equal(s.stage.dataset.maximum, '30'); assert.equal(s.stage.dataset.on, 'false');
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
  assert.equal(s.pos(), 40); assert.equal(s.q('j').disabled, true);
  s.fault('normal'); s.advance(2500); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false');
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

test('setup entered while closing holds motion, then continues closing on save', () => {
  const s = simulator(); s.power(true);
  for (let i = 0; i < 6; i++) { s.click('center'); s.click('g'); }
  s.tap(); s.advance(6000); s.tap(); s.hold(); const frozen = s.pos();
  assert.ok(frozen > 0 && frozen < 100); s.draft(60); s.advance(8000); assert.equal(s.pos(), frozen);
  s.tap(); s.advance(6000); assert.equal(s.pos(), 0); assert.equal(s.stage.dataset.on, 'false');
  assert.equal(s.stage.dataset.runOpening, '60');
});

test('paused mode is quiescent after startup; long-idle input remains responsive', () => {
  const s = simulator(); s.power(true); s.advance(10000); assert.equal(s.pendingJobs(), 0);
  s.advance(24 * 60 * 60 * 1000); assert.equal(s.pendingJobs(), 0);
  s.tap(); s.advance(6000); assert.equal(s.pos(), 40);
});

for (const running of [false, true]) {
  for (let cap = 10; cap <= 100; cap += 10) {
    test('all ten levels remap to nearest available position at max ' + cap + '%, ' + (running ? 'running' : 'paused'), () => {
      for (let startingLevel = 1; startingLevel <= 10; startingLevel++) {
        const s = simulator({ reducedMotion: true }); s.power(true);
        while (Number(s.stage.dataset.setting) !== startingLevel) {
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
      switch (next(10)) {
        case 0: s.power(s.stage.dataset.power !== 'true'); break;
        case 1: s.tap(); break;
        case 2: s.hold(); break;
        case 3: s.click('g'); break;
        case 4: s.click('h'); break;
        case 5: s.click('center'); break;
        case 6: if (!s.q('fault').disabled) s.fault(['normal', 'driver', 'input'][next(3)]); break;
        case 7: s.down(); s.advance(next(2600)); s.emit(s.q('j'), 'pointercancel', { pointerId: 1 }); break;
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
      assert.ok(s.pendingJobs() <= 2, 'no timer accumulation at action ' + i);
      if (d.power === 'false') {
        assert.equal(d.on, 'false'); assert.equal(d.mode, 'normal');
        assert.equal(d.colors, Array(10).fill('off').join(','));
      }
      if (d.mode === 'max') assert.equal(d.moving, 'false');
    }
  });
}
