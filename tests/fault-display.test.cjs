const assert = require('node:assert/strict');
const { test } = require('node:test');
const { simulator } = require('./helpers/simulator.cjs');
const causes=['supply','stall','communication','driver','timeout','settings','input','position','temperature','trigger'];
const colors=s=>s.stage.dataset.colors.split(',');
const signal=s=>s.stage.dataset.faultSignal;
const row=(s,cause)=>s.stage.querySelector('[data-fault-entry="'+cause+'"]');
function cleared(...faults){const s=simulator();s.power(true);for(const f of faults)s.fault(f);s.fault('normal');return s;}

test('ten independent fault switches replace the dropdown, and stay truthful with power off',()=>{
  const s=simulator();assert.equal(s.stage.querySelectorAll('[data-fault-toggle]').length,10);
  assert.equal(s.stage.querySelectorAll('select').length,0);
  s.fault('driver');assert.equal(s.stage.dataset.fault,'normal');
  assert.equal(row(s,'driver').querySelector('input').checked,false);
  s.power(true);s.fault('driver');s.power(false);s.faultToggle('driver',false);
  assert.equal(row(s,'driver').querySelector('input').checked,true);
  assert.equal(signal(s),'off');assert.ok(colors(s).every(c=>c==='off'));
});

for(const [i,cause] of causes.entries())test(`fault ${i+1}: active white blinks continuously; removed cause blue blinks without clearing latch`,()=>{
  const s=simulator();s.power(true);s.fault(cause);
  for(let n=0;n<8;n++){
    assert.equal(colors(s)[i],'white');s.advance(600);assert.equal(colors(s)[i],'off');s.advance(600);
  }
  s.faultToggle(cause,false);assert.equal(colors(s)[i],'blue');assert.equal(signal(s),'cleared');
  assert.equal(s.stage.dataset.fault,cause);assert.match(row(s,cause).textContent,/Cause cleared/);
  s.advance(600);assert.equal(colors(s)[i],'off');s.advance(600);assert.equal(colors(s)[i],'blue');
  assert.equal(s.pendingFrames(),0,'idle blink uses timed color changes, not a frame loop');
});

test('several simultaneous faults keep independent active states; one active cause blocks the whole reset',()=>{
  const s=simulator();s.power(true);s.fault('driver');s.fault('position');s.fault('supply');
  assert.equal(s.stage.dataset.fault,'supply');assert.deepEqual(colors(s),['white','off','off','white','off','off','off','white','off','off']);
  s.faultToggle('driver',false);s.faultToggle('supply',false);
  assert.deepEqual(colors(s),['blue','off','off','blue','off','off','off','white','off','off']);
  assert.equal(s.stage.dataset.activeFaults,'position');assert.equal(s.q('reset-fault').disabled,true);
  s.click('reset-fault');assert.equal(s.stage.dataset.fault,'supply');
  s.faultToggle('position',false);assert.equal(s.q('reset-fault').disabled,false);
  assert.equal(s.stage.dataset.latchedFaults.split(',').length,3);
});

test('valid hold preserves all blue fault codes and fills only other lamps white left to right',()=>{
  const s=cleared('driver','position');s.down();
  assert.equal(signal(s),'holding');assert.deepEqual(colors(s),['off','off','off','blue','off','off','off','blue','off','off']);
  s.advance(1510);assert.deepEqual(colors(s),['white','white','white','blue','white','off','off','blue','off','off']);
  s.advance(1489);assert.equal(s.stage.dataset.fault,'driver');
  assert.equal(colors(s).filter(c=>c==='blue').length,2);assert.equal(colors(s).filter(c=>c==='white').length,7);
  s.advance(1);assert.equal(s.stage.dataset.fault,'normal');assert.equal(signal(s),'none');
  assert.deepEqual(colors(s),['white','white','white','white','off','off','off','off','off','blue']);
  assert.equal(s.stage.dataset.inputsReady,'false');assert.equal(s.q('hold-progress').style.width,'0%');
  s.advance(1000);assert.equal(signal(s),'none');s.up();s.advance(99);assert.equal(signal(s),'none');
  s.advance(1);assert.equal(signal(s),'none');assert.equal(s.stage.dataset.inputsReady,'true');assert.equal(s.stage.dataset.on,'false');
});

test('all ten simultaneous codes reset without division by zero or losing code lamps',()=>{
  const s=cleared(...causes);s.down();s.advance(1504);assert.ok(colors(s).every(c=>c==='blue'));
  s.advance(1496);assert.equal(signal(s),'none');assert.deepEqual(colors(s),['white','white','white','white','off','off','off','off','off','blue']);
  s.up();s.advance(100);assert.equal(s.stage.dataset.fault,'normal');assert.equal(s.stage.dataset.setting,'4');
});

test('reset immediately restores the paused bar and max marker while closing and neutral remain locked',()=>{
  for(const cap of [50,100])for(const reducedMotion of [false,true]){
    const s=simulator({reducedMotion});s.power(true);
    if(cap===50){s.hold();s.draft(cap);s.click('center');s.tap();}
    s.tap();s.advance(5000);s.fault('driver');s.faultToggle('driver',false);
    s.down();s.advance(2999);assert.equal(s.stage.dataset.fault,'driver');
    s.advance(1);assert.equal(signal(s),'none');assert.equal(s.stage.dataset.on,'false');
    const level=Number(s.stage.dataset.setting),expected=Array.from({length:10},(_,i)=>i<level?'white':'off');expected[cap/10-1]='blue';
    assert.deepEqual(colors(s),expected);assert.equal(s.q('mode-label').textContent,'NORMAL');
    assert.equal(s.stage.dataset.recovering,'true');assert.equal(s.stage.dataset.inputsReady,'false');assert.equal(s.stage.dataset.target,'0');
    assert.equal(s.q('hold-progress').style.width,'0%');
    s.advance(616);assert.equal(s.q('hold-progress').style.width,'0%');
    assert.equal(colors(s)[cap/10-1],reducedMotion?'blue':cap/10<=level?'white':'off');
    s.up();s.tap();s.advance(1600);assert.equal(s.pos(),0);assert.equal(s.stage.dataset.inputsReady,'true');assert.equal(s.stage.dataset.on,'false');
  }
});

test('blocked hold staggers, refuses once, warns briefly, then returns to continuous active indication',()=>{
  const s=simulator();s.power(true);s.fault('driver');s.down();
  assert.equal(signal(s),'blocked');assert.deepEqual(colors(s),['blue','white','blue','white','blue','white','blue','white','blue','white']);
  s.advance(608);assert.deepEqual(colors(s),['white','blue','white','blue','white','blue','white','blue','white','blue']);
  s.advance(2392);assert.equal(signal(s),'rejected');assert.ok(colors(s).every(c=>c==='blue'));
  s.advance(250);assert.ok(colors(s).every(c=>c==='white'));
  s.advance(1250);assert.equal(signal(s),'active');assert.equal(colors(s)[3],'white');
  s.advance(600);assert.equal(colors(s)[3],'off');assert.equal(s.stage.dataset.fault,'driver');
  assert.equal(s.pos(),0);assert.equal(s.stage.dataset.on,'false');
});

test('clearing causes during a blocked hold never promotes it into an acknowledgement',()=>{
  const s=simulator();s.power(true);s.fault('driver');s.down();s.advance(1000);s.faultToggle('driver',false);
  assert.equal(signal(s),'interlocked');assert.equal(s.q('hold-progress').style.width,'0%');s.advance(3500);assert.equal(signal(s),'cleared');assert.equal(s.stage.dataset.fault,'driver');
  s.advance(5000);assert.equal(s.stage.dataset.fault,'driver');s.up();s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
});

for(const interrupt of ['release','rocker','blur','cancel','new-fault','power'])test(`reset white fill cancels on ${interrupt} without acknowledgement or queued water`,()=>{
  const s=cleared('driver');s.down();s.advance(1504);assert.ok(colors(s).includes('white'));
  if(interrupt==='release')s.up();
  if(interrupt==='rocker'){s.click('g');s.click('center');}
  if(interrupt==='blur')s.emit(s.window,'blur');
  if(interrupt==='cancel')s.emit(s.q('j'),'pointercancel',{pointerId:1});
  if(interrupt==='new-fault')s.fault('position');
  if(interrupt==='power')s.power(false);
  s.advance(3500);assert.equal(s.stage.dataset.fault,'driver');assert.equal(s.stage.dataset.on,'false');
  assert.notEqual(signal(s),'holding');assert.notEqual(signal(s),'recovery');
});

test('reduced motion has steady codes, no white progress animation, and a bounded static rejection',()=>{
  const s=simulator({reducedMotion:true});s.power(true);s.fault('driver');s.advance(6000);assert.equal(colors(s)[3],'white');
  s.down();assert.ok(colors(s).every(c=>c==='white'));s.advance(3000);assert.equal(signal(s),'rejected');
  s.up();s.advance(1500);assert.equal(signal(s),'active');assert.equal(colors(s).filter(c=>c==='white').length,1);
  s.faultToggle('driver',false);s.down();s.advance(1504);assert.equal(colors(s)[3],'blue');assert.ok(!colors(s).includes('white'));
});

test('automatic stuck J survives removing every injected cause; release and a fresh reset are required',()=>{
  const s=simulator();s.power(true);s.fault('driver');s.down();s.advance(30000);
  assert.equal(s.stage.dataset.activeFaults,'driver,trigger');s.fault('normal');assert.equal(s.stage.dataset.activeFaults,'trigger');
  assert.equal(s.q('reset-fault').disabled,true);s.up();assert.equal(s.stage.dataset.activeFaults,'');
  assert.equal(s.stage.dataset.latchedFaults,'driver,trigger');s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
});

test('new fault during paused recovery overrides the OFF display and stops closure',()=>{
  const s=simulator();s.power(true);s.tap();s.advance(5000);s.fault('driver');s.fault('normal');s.click('reset-fault');
  s.advance(200);s.fault('position');assert.equal(signal(s),'active');assert.equal(colors(s)[3],'off');assert.equal(colors(s)[7],'white');
  const stopped=s.pos();s.advance(2000);assert.equal(s.pos(),stopped);
});

test('delayed release still completes a valid reset, but an overdue stuck trigger wins',()=>{
  for(const duration of [3000,29999,30000]){
    const s=cleared('driver');s.down();s.jump(duration);s.up();
    assert.equal(s.stage.dataset.fault,duration<30000?'normal':'driver');
    if(duration>=30000)assert.ok(s.stage.dataset.latchedFaults.includes('trigger'));
    assert.equal(s.stage.dataset.on,'false');
  }
});

test('rejection expires after a suspended tab without replaying missed flashes',()=>{
  const s=simulator();s.power(true);s.fault('driver');s.down();s.advance(3000);s.up();s.resumeAfter(10000);
  assert.equal(signal(s),'active');assert.equal(colors(s)[3],'white');assert.equal(s.pendingFrames(),0);
});
