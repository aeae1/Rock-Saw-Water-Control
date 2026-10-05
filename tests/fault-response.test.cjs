const assert=require('node:assert/strict');
const {test}=require('node:test');
const {simulator}=require('./helpers/simulator.cjs');
const closing=['settings','input','trigger'];
const inhibited=['supply','stall','communication','driver','timeout','position','temperature'];
const all=['supply','stall','communication','driver','timeout','settings','input','position','temperature','trigger'];
function opened(mode='normal',reducedMotion=false){
  const s=simulator({reducedMotion});s.power(true);s.tap();s.advance(5000);
  if(mode!=='normal')s.hold();if(mode==='clean'){s.hold();s.advance(5000);}return s;
}
const off=s=>{assert.equal(s.stage.dataset.on,'false');assert.equal(s.stage.dataset.mode,'normal');assert.equal(s.stage.dataset.inputsReady,'false');};

for(const cause of closing)test(`${cause} commands closed in every mode while its code remains latched`,()=>{
  for(const mode of ['normal','max','clean'])for(const reducedMotion of [false,true]){
    const s=opened(mode,reducedMotion),before=s.pos();s.fault(cause);off(s);
    assert.equal(s.stage.dataset.target,'0');assert.equal(s.stage.dataset.faultResponse,'closing');
    assert.match(s.q('target').textContent,/closing valve/);s.advance(500);
    assert.ok(s.pos()<before);assert.equal(s.stage.dataset.fault,cause);
    s.advance(5000);assert.equal(s.pos(),0);assert.equal(s.stage.dataset.faultResponse,'closed');
    assert.equal(s.stage.dataset.positionKnown,'true');assert.equal(s.stage.dataset.moving,'false');
    assert.equal(s.stage.dataset.fault,cause);assert.match(s.q('valve-state').textContent,/Closed/);
    assert.equal(s.q('reset-fault').disabled,true);assert.equal(s.stage.dataset.lampTest,'false');
    s.fault('normal');s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
    assert.equal(s.stage.dataset.recovering,'false');assert.equal(s.stage.dataset.moving,'false');
    assert.equal(s.q('hold-progress').style.width,'0%');s.up();s.advance(100);
    assert.equal(s.stage.dataset.on,'false');assert.equal(s.stage.dataset.inputsReady,'true');
  }
});

for(const cause of inhibited)test(`${cause} inhibits drive until a deliberate closing recovery`,()=>{
  const s=opened('clean');s.fault(cause);const stopped=s.pos();off(s);
  assert.equal(s.stage.dataset.faultResponse,'inhibited');assert.equal(s.stage.dataset.positionKnown,'false');
  assert.match(s.q('target').textContent,/water may still be flowing/);
  s.advance(6000);assert.equal(s.pos(),stopped);assert.equal(s.stage.dataset.moving,'false');
  s.fault('normal');s.advance(6000);assert.equal(s.pos(),stopped);
  s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');off(s);
  assert.equal(s.stage.dataset.recovering,'true');s.up();s.advance(6000);
  assert.equal(s.pos(),0);assert.equal(s.stage.dataset.on,'false');assert.equal(s.stage.dataset.inputsReady,'true');
});

test('all 90 ordered fault pairs give drive inhibition priority over automatic closing',()=>{
  for(const first of all)for(const second of all){
    if(first===second)continue;
    const s=opened();s.fault(first);s.advance(240);s.fault(second);const atSecond=s.pos();
    const blocked=inhibited.includes(first)||inhibited.includes(second);
    assert.equal(s.stage.dataset.faultResponse,blocked?'inhibited':'closing');off(s);
    s.fault('normal');s.advance(6000);assert.equal(s.pos(),blocked?atSecond:0);
    assert.equal(s.stage.dataset.latchedFaults.split(',').length,2);
    if(blocked){s.fault('input');s.advance(6000);assert.equal(s.pos(),atSecond);}
  }
});

test('an operator fault preserves the original deadline of a valve already closing',()=>{
  const s=opened('clean');s.tap(); // Flush returns to the previous running level.
  s.advance(5000);s.tap();s.advance(500);s.fault('input');
  assert.equal(s.stage.dataset.faultResponse,'closing');s.advance(1499);
  assert.ok(s.pos()>0);s.advance(17);assert.equal(s.pos(),0);
  assert.equal(s.stage.dataset.fault,'input');
});

test('acknowledgement during automatic closing preserves its deadline and immediate OFF display',()=>{
  const s=opened('clean');s.fault('input');s.fault('normal');s.down();s.advance(3000);
  assert.equal(s.stage.dataset.fault,'normal');assert.equal(s.stage.dataset.recovering,'true');
  assert.equal(s.stage.dataset.target,'0');assert.equal(s.q('hold-progress').style.width,'0%');
  assert.equal(s.stage.dataset.colors,'white,white,white,white,off,off,off,off,off,blue');
  s.up();s.advance(1999);assert.ok(s.pos()>0);s.advance(17);assert.equal(s.pos(),0);
  s.advance(100);assert.equal(s.stage.dataset.inputsReady,'true');assert.equal(s.stage.dataset.on,'false');
});

test('power loss interrupts fault closing without automatic restart on power or cause changes',()=>{
  const s=opened('clean');s.fault('input');s.advance(1000);s.power(false);const stopped=s.pos();
  s.advance(5000);assert.equal(s.pos(),stopped);s.power(true);assert.equal(s.stage.dataset.faultResponse,'inhibited');
  s.fault('normal');s.fault('settings');s.fault('normal');s.advance(6000);assert.equal(s.pos(),stopped);
  assert.equal(s.stage.dataset.lampTest,'false');s.down();s.advance(3000);s.up();s.advance(6000);
  assert.equal(s.pos(),0);assert.equal(s.stage.dataset.on,'false');assert.equal(s.stage.dataset.inputsReady,'true');
});

test('repeated operator faults and cause chatter do not restart the automatic-closing deadline',()=>{
  const s=opened('clean');s.fault('input');
  for(let i=0;i<9;i++){
    s.advance(500);s.fault('normal');s.fault(closing[i%closing.length]);
    assert.equal(s.stage.dataset.faultResponse,'closing');
  }
  s.advance(499);assert.ok(s.pos()>0);s.advance(17);assert.equal(s.pos(),0);
  assert.equal(s.stage.dataset.faultResponse,'closed');s.fault('trigger');s.advance(6000);
  assert.equal(s.stage.dataset.moving,'false');assert.equal(s.pos(),0);
});

test('the actual stuck-J watchdog closes water while the physical trigger remains held',()=>{
  const s=opened('max');s.down();s.advance(30000);
  assert.equal(s.stage.dataset.fault,'trigger');assert.equal(s.stage.dataset.faultResponse,'closing');
  s.advance(6000);assert.equal(s.pos(),0);assert.equal(s.stage.dataset.faultResponse,'closed');
  assert.equal(s.stage.dataset.activeFaults,'trigger');s.fault('normal');assert.equal(s.q('reset-fault').disabled,true);
  s.up();s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
  assert.equal(s.stage.dataset.moving,'false');assert.equal(s.stage.dataset.on,'false');
});

test('operator faults during startup continue closing without replaying the lamp test',()=>{
  const s=opened('clean');s.power(false);s.power(true,false);s.advance(700);s.fault('input');
  assert.equal(s.stage.dataset.lampTest,'false');assert.equal(s.stage.dataset.faultResponse,'closing');
  s.advance(4299);assert.ok(s.pos()>0);s.advance(17);assert.equal(s.pos(),0);
  assert.equal(s.stage.dataset.fault,'input');assert.equal(s.stage.dataset.lampTest,'false');
});

test('any drive-inhibiting fault interrupts automatic closing and cause removal never retries it',()=>{
  for(const cause of inhibited)for(const elapsed of [0,2500,4999]){
    const s=opened('clean');s.fault('input');s.advance(elapsed);s.fault(cause);const stopped=s.pos();
    assert.equal(s.stage.dataset.faultResponse,'inhibited');assert.equal(s.stage.dataset.moving,'false');
    s.faultToggle(cause,false);s.fault('trigger');s.advance(6000);assert.equal(s.pos(),stopped);
    assert.equal(s.stage.dataset.faultResponse,'inhibited');
  }
});

test('reset after a confirmed automatic close restores invalid settings without another valve movement',()=>{
  const s=opened();s.hold();s.draft(50);s.click('center');s.tap();s.advance(5000);
  s.fault('settings');s.advance(6000);assert.equal(s.stage.dataset.maximum,'50');
  assert.equal(s.stage.dataset.faultResponse,'closed');s.fault('normal');s.click('reset-fault');
  assert.equal(s.stage.dataset.maximum,'100');assert.equal(s.stage.dataset.setting,'4');
  assert.equal(s.stage.dataset.moving,'false');assert.equal(s.stage.dataset.recovering,'false');assert.equal(s.pos(),0);
});

test('post-reset rearming ignores G/H through closing and stable J release without replaying rocker commands',()=>{
  for(const direction of ['g','h'])for(const cause of ['input','driver'])for(const method of ['hold','shortcut']){
    const s=opened('clean');s.fault(cause);s.click(direction);s.fault('normal');
    if(method==='hold'){s.down();s.advance(3000);s.up();}else s.click('reset-fault');
    // Rocker activity is tracked but must neither edit settings nor restart the
    // J-release qualification. Closing, if needed, still gates commands.
    s.click('center');s.click(direction);s.advance(6000);
    assert.equal(s.stage.dataset.inputsReady,'true');assert.equal(s.stage.dataset.setting,'4');
    assert.equal(s.stage.dataset.rocker,direction);assert.equal(s.stage.dataset.on,'false');
    s.click(direction);assert.equal(s.stage.dataset.setting,'4');
    s.tap();assert.equal(s.stage.dataset.on,'true');assert.equal(s.stage.dataset.rocker,direction);
    s.click('center');s.click(direction);assert.equal(s.stage.dataset.setting,direction==='g'?'5':'3');
  }
});

test('post-reset requires 100 ms of released J, and a later power cycle restores startup centering',()=>{
  for(const direction of ['g','h']){
    const s=opened();s.fault('input');s.advance(6000);s.fault('normal');s.click(direction);
    s.down();s.advance(3000);assert.equal(s.stage.dataset.inputsReady,'false');
    s.up();s.advance(99);s.click('center');s.click(direction);assert.equal(s.stage.dataset.inputsReady,'false');
    s.advance(1);assert.equal(s.stage.dataset.inputsReady,'true');
    s.power(false);s.power(true);assert.equal(s.stage.dataset.inputsReady,'false');
    s.click('center');s.advance(100);assert.equal(s.stage.dataset.inputsReady,'true');
  }
});
