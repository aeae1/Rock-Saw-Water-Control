const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');

function simulator({ reducedMotion = false } = {}) {
  const { document, window } = parseHTML(readFileSync(resolve(__dirname, '../../docs/index.html'), 'utf8'));
  let clock = 0, id = 0;
  const jobs = new Map();
  const media = { matches: reducedMotion, addEventListener: (_, listener) => { media.onchange = listener; } };
  const schedule = (fn, ms, raf = false) => { jobs.set(++id, { fn, at: clock + ms, raf }); return id; };
  vm.runInNewContext(readFileSync(resolve(__dirname, '../../docs/assets/simulator.js'), 'utf8'), {
    document,
    window: { matchMedia: () => media, addEventListener: window.addEventListener.bind(window) },
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
  // Model a suspended browser delivering overdue callbacks at its current time.
  function resumeAfter(ms) {
    clock += ms;
    const overdue = [...jobs].filter(([, job]) => job.at <= clock);
    for (const [key, job] of overdue) {
      if (!jobs.delete(key)) continue;
      job.raf ? job.fn(clock) : job.fn();
    }
  }
  const click = key => emit(q(key), 'click');
  // Most scenarios start after the 2 s lamp test + neutral qualification.
  // Closure/held controls can still inhibit commands; timing tests opt out.
  const power = (value, settle = true) => { q('power').checked = value; emit(q('power'), 'change'); if (value && settle) advance(2100); };
  const jump = ms => { clock += ms; };
  const down = () => emit(q('j'), 'pointerdown', { pointerType: 'touch', pointerId: 1, button: 0 });
  const up = () => { emit(q('j'), 'pointerup', { pointerType: 'touch', pointerId: 1, button: 0 }); click('j'); };
  const tap = () => { down(); advance(100); up(); };
  const hold = () => { down(); advance(1501); up(); };
  function draft(cap) {
    assert.equal(stage.dataset.mode, 'max', 'draft edits require maximum setup');
    let attempts = 0;
    while (Number(stage.dataset.draft) !== cap) {
      assert.ok(++attempts <= 10, 'draft adjustment must make bounded progress');
      click('center'); click(Number(stage.dataset.draft) > cap ? 'h' : 'g');
    }
  }
  // LinkeDOM exposes a read-only select.value; select the option as the UI does.
  const fault = value => {
    q('fault').querySelector('option[value="' + value + '"]').selected = true;
    emit(q('fault'), 'change');
  };
  const pos = () => Number(stage.dataset.position);
  const setReducedMotion = value => { media.matches = value; media.onchange?.(); };
  return { stage, q, emit, advance, jump, resumeAfter, setReducedMotion, click, power, down, up, tap, hold, draft, fault, pos, document, window, pendingJobs: () => jobs.size, pendingFrames: () => [...jobs.values()].filter(job => job.raf).length };
}


module.exports = { simulator };
