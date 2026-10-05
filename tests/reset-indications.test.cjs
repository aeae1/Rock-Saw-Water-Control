const assert=require('node:assert/strict');
const {test}=require('node:test');
const {simulator}=require('./helpers/simulator.cjs');
const colors=s=>s.stage.dataset.colors.split(',');
const signal=s=>s.stage.dataset.faultSignal;
const prepared=()=>{const s=simulator();s.power(true);s.fault('driver');s.fault('normal');return s;};

test('every cleared fault accepts J reset with G/H held and shows eligible progress',()=>{
 const causes=['supply','stall','communication','driver','timeout','settings','input','position','temperature','trigger'];
 for(const direction of ['g','h'])for(const reducedMotion of [false,true])for(const cause of causes){
  const s=simulator({reducedMotion});s.power(true);s.fault(cause);s.click(direction);
  assert.equal(s.q('reset-fault').disabled,true);s.fault('normal');
  assert.equal(s.q('reset-fault').disabled,false);s.down();
  assert.equal(signal(s),'holding');assert.match(s.q('switch-state').textContent,/Reset eligible/);
  assert.match(s.q('j').textContent,/Hold 3 s: reset/);
  s.advance(1504);assert.equal(colors(s)[causes.indexOf(cause)],'blue');
  assert.ok(parseFloat(s.q('hold-progress').style.width)>=50);
  assert.equal(colors(s).includes('white'),!reducedMotion);
  s.advance(1495);assert.equal(s.stage.dataset.fault,cause);
  s.advance(1);assert.equal(s.stage.dataset.fault,'normal');assert.equal(s.stage.dataset.on,'false');
  assert.equal(s.stage.dataset.setting,'4');assert.equal(s.stage.dataset.rocker,direction);
  assert.equal(s.q('hold-progress').style.width,'0%');
 }
});

test('removing the last cause during a blocked hold immediately stops its warning and still requires a fresh press',()=>{
 const s=simulator();s.power(true);s.fault('driver');s.down();s.advance(1000);
 assert.equal(signal(s),'blocked');assert.equal(s.q('hold-progress').style.width,'0%');
 s.fault('normal');assert.equal(signal(s),'interlocked');assert.equal(colors(s)[3],'blue');
 assert.match(s.q('switch-state').textContent,/Release J, then start a fresh/);
 s.advance(2000);assert.equal(s.stage.dataset.fault,'driver');assert.equal(signal(s),'cleared');
 assert.equal(s.q('hold-progress').style.width,'0%');s.up();s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
});

test('removing a cause during the fast rejection immediately returns to blue-code indication',()=>{
 const s=simulator();s.power(true);s.fault('driver');s.down();s.advance(3250);
 assert.equal(signal(s),'rejected');s.fault('normal');assert.equal(signal(s),'cleared');
 assert.deepEqual(colors(s),['off','off','off','blue','off','off','off','off','off','off']);
 s.advance(2000);assert.equal(s.stage.dataset.fault,'driver');assert.equal(s.q('hold-progress').style.width,'0%');
});

test('all blocked/cause-removal/retry timings keep the display consistent with reset eligibility',()=>{
 for(const rocker of ['center','g','h'])for(const clearAt of ['before','during','after'])for(const retryAt of [0,250,1499,1500,1600]){
  const s=simulator();s.power(true);s.fault('driver');s.click(rocker);if(clearAt==='before')s.fault('normal');
  s.down();s.advance(1000);if(clearAt==='during')s.fault('normal');
  const eligible=clearAt==='before';assert.equal(signal(s)==='holding',eligible);
  s.advance(1999);assert.equal(s.stage.dataset.fault,'driver');s.advance(1);assert.equal(s.stage.dataset.fault==='normal',eligible);
  s.up();if(eligible)continue;
  if(clearAt==='after')s.fault('normal');s.advance(retryAt);s.down();
  assert.equal(signal(s),'holding');
  for(let time=0;time<2990;time+=10){s.advance(10);assert.equal(signal(s),'holding');assert.equal(colors(s)[3],'blue');}
  s.advance(10);assert.equal(s.stage.dataset.fault,'normal');assert.equal(s.stage.dataset.on,'false');
 }
});

test('alternating numbered fault codes stay fixed blue throughout a successful fill rather than swapping colors',()=>{
 const s=simulator();s.power(true);for(const f of ['supply','communication','timeout','input','temperature'])s.fault(f);
 s.fault('normal');s.down();let white=0;
 for(let i=0;i<149;i++){
  s.advance(20);const c=colors(s);assert.equal(signal(s),'holding');
  for(const index of [0,2,4,6,8])assert.equal(c[index],'blue');
  const count=c.filter(x=>x==='white').length;assert.ok(count>=white);white=count;
 }
 s.advance(20);assert.equal(s.stage.dataset.fault,'normal');
});

test('normal operation permits fresh J taps while either rocker direction stays held',()=>{
 for(const direction of ['g','h']){
  const s=simulator();s.power(true);s.click(direction);s.tap();assert.equal(s.stage.dataset.on,'true');
  assert.match(s.q('switch-state').textContent,/J remains available/);
  s.advance(5000);s.tap();assert.equal(s.stage.dataset.on,'false');assert.equal(s.stage.dataset.rocker,direction);
 }
});

test('startup and post-reset neutral locks explicitly name a held rocker and recover after centering',()=>{
 for(const afterReset of [false,true])for(const direction of ['g','h']){
  const s=simulator();
  if(afterReset){s.power(true);s.fault('driver');s.fault('normal');s.down();s.advance(3000);s.click(direction);s.up();}
  else{s.click(direction);s.power(true);}
  s.advance(2100);s.tap();assert.equal(s.stage.dataset.on,'false');
  assert.match(s.q('status').textContent,new RegExp('center '+direction.toUpperCase()+' to enable J'));
  s.click('center');s.advance(100);s.tap();assert.equal(s.stage.dataset.on,'true');
 }
});

test('a fault interrupting a valid retry takes priority over fill and cannot be acknowledged by the old hold',()=>{
 const s=prepared();s.fault('driver');s.down();s.advance(3000);s.up();s.fault('normal');s.down();s.advance(1500);
 assert.equal(signal(s),'holding');s.fault('position');assert.equal(signal(s),'active');assert.equal(s.q('hold-progress').style.width,'0%');
 s.fault('normal');s.advance(2500);assert.equal(s.stage.dataset.fault,'driver');s.up();s.down();s.advance(3000);assert.equal(s.stage.dataset.fault,'normal');
});
