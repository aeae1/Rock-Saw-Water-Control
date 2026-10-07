const assert = require('node:assert/strict');
const { test } = require('node:test');
const { simulator } = require('./helpers/simulator.cjs');

// Enumerate the available physical targets independently of the controller's
// rounding formula. Include every old/new cap, not only the default 100% cap.
for (const running of [false, true]) {
  for (let oldCap = 10; oldCap <= 100; oldCap += 10) {
    test(`all remaps from cap ${oldCap}, ${running ? 'running' : 'paused'}: 100 combinations`, () => {
      for (let oldLevel = 1; oldLevel <= 10; oldLevel++) {
        for (let nextCap = 10; nextCap <= 100; nextCap += 10) {
          const s = simulator({ reducedMotion: true }); s.power(true);
          s.hold(); s.draft(oldCap); s.tap(); s.click('center');
          for (let guard = 0; Number(s.stage.dataset.setting) !== oldLevel; guard++) {
            assert.ok(guard < 10); s.click('center');
            s.click(Number(s.stage.dataset.setting) < oldLevel ? 'g' : 'h');
          }
          const original = oldLevel * oldCap / 10;
          if (running) { s.tap(); s.advance(6000); assert.equal(s.pos(), original); }
          s.hold(); s.draft(nextCap);
          assert.equal(s.pos(), running ? original : 0, 'editing must hold the current state');
          const choices = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, opening: (i + 1) * nextCap / 10 }));
          choices.sort((a, b) => Math.abs(a.opening - original) - Math.abs(b.opening - original) || b.level - a.level);
          const expected = choices[0];
          s.tap(); s.advance(6000);
          assert.equal(Number(s.stage.dataset.setting), expected.level);
          assert.equal(Number(s.stage.dataset.runOpening), expected.opening);
          assert.equal(s.pos(), running ? expected.opening : 0);
          assert.equal(s.stage.dataset.on, String(running));
          assert.equal(s.stage.dataset.maximum, String(nextCap));
        }
      }
    });
  }
}

test('every ordered pair of distinct fault codes retains and displays both codes with the lower code in the heading', () => {
  const faults = ['supply', 'stall', 'communication', 'driver', 'timeout', 'settings', 'input', 'position', 'trigger'];
  for (let a = 0; a < faults.length; a++) {
    for (let b = 0; b < faults.length; b++) {
      if (a === b) continue;
      const s = simulator({ reducedMotion: true }); s.power(true);
      s.fault(faults[a]); s.fault(faults[b]);
      assert.equal(s.stage.dataset.fault, faults[Math.min(a, b)]);
      assert.deepEqual(s.stage.dataset.latchedFaults.split(',').sort(), [faults[a], faults[b]].sort());
      assert.equal(s.stage.dataset.colors.split(',').filter(c => c !== 'off').length, 2);
      s.fault('normal'); assert.equal(s.stage.dataset.on, 'false');
      s.click('reset-fault'); s.advance(100);
      assert.equal(s.stage.dataset.fault, 'normal'); assert.equal(s.stage.dataset.on, 'false');
      assert.equal(s.stage.dataset.inputsReady, 'true');
    }
  }
});
