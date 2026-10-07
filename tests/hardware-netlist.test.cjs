const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, '../hardware/rev-d/netlist.json')));

// This checks documentation topology, not semiconductor behavior or actual wiring.
function audit(n) {
  const pins = new Set(Object.entries(n.components).flatMap(([r,c]) => c.pins.map(p => `${r}.${p}`)));
  const parent = new Map([...pins].map(p => [p,p]));
  const used = new Set(), wireIds = new Set();
  function find(p) {
    assert(pins.has(p), `Unknown terminal ${p}`);
    if (parent.get(p) !== p) parent.set(p, find(parent.get(p)));
    return parent.get(p);
  }
  function join(a,b) { const x=find(a), y=find(b); parent.set(x,y); used.add(a);used.add(b); }
  for (const w of n.wires) {
    assert(!wireIds.has(w.id), 'Duplicate wire ID');wireIds.add(w.id);
    assert(n.nets[w.net], `Unknown net ${w.net}`);
    assert(n.nets[w.net].pins.includes(w.from) && n.nets[w.net].pins.includes(w.to), `Wire ${w.id} disagrees with net`);
    join(w.from,w.to);
  }
  for (const [a,b] of n.internal_connections) join(a,b);
  const nc = new Set(n.no_connect);
  assert.equal(nc.size,n.no_connect.length,'Duplicate NC terminal');
  for (const p of nc) {find(p);assert(!used.has(p), `NC terminal wired: ${p}`);}
  for (const p of pins) assert(used.has(p) || nc.has(p), `Unaccounted terminal ${p}`);
  const same = (a,b) => find(a)===find(b);
  const expect = (a,b) => assert(same(a,b), `${a} must connect to ${b}`);
  const separate = (a,b) => assert(!same(a,b), `${a} must be separate from ${b}`);
  for (const [name,net] of Object.entries(n.nets)) {
    assert(net.pins.length>1, `Orphan net ${name}`);
    for(const p of net.pins) expect(net.pins[0],p);
  }
  const rails = ['TB12.rail','TB5.rail','TB0.rail','U4.3'];
  for(let i=0;i<rails.length;i++) for(let j=i+1;j<rails.length;j++) separate(rails[i],rails[j]);
  expect('X1.1','TB12.rail');expect('X1.2','TB0.rail');expect('U1.VIN','TB12.rail');expect('U1.5V','TB5.rail');
  for(const p of ['A0','A4','A5','D2','D3','D4','D7','D8','D9','3V3']) separate('U1.'+p,'TB12.rail');
  for(const p of ['FM1.RED','FM1.YELLOW','FM1.WHITE','FM1.BLACK']) separate(p,'TB12.rail');
  for(const h of ['HSD1','HSD2','HSD3']) {
    expect(h+'.VIN','TB12.rail');expect(h+'.V','TB5.rail');expect(h+'.LOAD_GND','TB0.rail');
    expect(h+'.D','U1.A4');expect(h+'.C','U1.A5');
    assert.equal(n.jumper_configuration[h].SJSDA,false);assert.equal(n.jumper_configuration[h].SJSCL,false);
    assert.equal(n.jumper_configuration[h].MAX_AMP,false);
  }
  for(const [h,e,c] of [['HSD1','C7','C10'],['HSD2','C8','C11'],['HSD3','C9','C12']]) {
    expect(e+'.+',h+'.VIN');expect(e+'.-',h+'.LOAD_GND');expect(c+'.1',h+'.VIN');expect(c+'.2',h+'.LOAD_GND');
  }
  for(const p of ['U2.VCC','U3.VCC','O1.HV','O2.HV']) expect(p,'TB5.rail');
  for(const p of ['U2.GND','U3.GND','O1.INPUT_GND','O1.HV_GND','O2.INPUT_GND','O2.HV_GND']) expect(p,'TB0.rail');
  for(const ref of ['R1','R2','R3']) {assert.equal(n.components[ref].resistance_ohms,1000);assert(n.components[ref].power_w>=.5);}
  for(const ref of ['R6','R7']) assert.equal(n.components[ref].resistance_ohms,4700);
  expect('U2.SDA','U1.A4');expect('U2.SCL','U1.A5');separate('U1.A4','U1.A5');
  expect('U2.GND','U2.OUT_GND');expect('U2.OUT_GND','V1.WHITE');expect('U3.I-','V1.WHITE');
  separate('U2.OUT','U1.A0');separate('U2.OUT','TB5.rail');
  expect('U2.OUT','K1.3');expect('K1.4','V1.GREEN');expect('V1.YELLOW','K1.7');expect('K1.8','U3.I+');
  separate('K1.3','K1.4');separate('K1.8','K1.7');
  assert.deepEqual(n.relay.normally_open,[['K1.3','K1.4'],['K1.8','K1.7']]);
  expect('HSD3.CH4','V1.RED');expect('V1.RED','U4.1');expect('U4.3','K1.1');expect('K1.10','TB0.rail');
  expect('D4.K','K1.1');expect('D4.A','K1.10');separate('V1.RED','TB12.rail');
  expect('U3.SIGNAL','R4.1');expect('R4.2','U1.A0');expect('R5.1','U1.A0');expect('C1.1','U1.A0');
  expect('R5.2','TB0.rail');expect('C1.2','TB0.rail');separate('U3.SIGNAL','U1.A0');
  for (const [i,o,input,output,pin] of [[1,'O1','IN1','OUT1','D2'],[2,'O1','IN2','OUT2','D3'],[3,'O2','IN1','OUT1','D4']]) {
    expect(`X1.${i+2}`,`R${i}.1`);expect(`R${i}.2`,`${o}.${input}`);expect(`D${i}.K`,`${o}.${input}`);
    expect(`D${i}.A`,'TB0.rail');expect(`${o}.${output}`,`U1.${pin}`);expect(`${o}.HV`,'TB5.rail');
    separate(`X1.${i+2}`,`${o}.${input}`);separate(`X1.${i+2}`,`U1.${pin}`);
  }
  for(const [color,pull,series,pin] of [['YELLOW','R6','R8','D8'],['WHITE','R7','R9','D9']]) {
    expect(pull+'.1','TB5.rail');expect(pull+'.2','FM1.'+color);expect(series+'.1','FM1.'+color);expect(series+'.2','U1.'+pin);
    separate('FM1.'+color,'TB5.rail');separate(series+'.1',series+'.2');
  }
  expect('FM1.RED','TB5.rail');expect('FM1.BLACK','TB0.rail');
  assert(nc.has('U1.D7'), 'Unused D7 must remain unconnected');
  for(const ref of ['TS1','TS2','R10','C3','C6']) assert(!n.components[ref], 'Removed temperature component '+ref);
  const outputPins=[];
  for(let i=1;i<=10;i++) {
    const b=1+Math.floor((i-1)/4), ch=((i-1)%4)*2;
    expect(`L${i}.BLUE`,`HSD${b}.CH${ch}`);expect(`L${i}.WHITE`,`HSD${b}.CH${ch+1}`);expect(`L${i}.BLACK`,'TB0.rail');
    outputPins.push(`L${i}.BLUE`,`L${i}.WHITE`);
  }
  assert.equal(new Set(outputPins.map(find)).size,20,'Lamp colors must use 20 separate nets');
  for(const p of outputPins) {separate(p,'V1.RED');separate(p,'TB0.rail');separate(p,'TB5.rail');separate(p,'TB12.rail');}
  const addresses=Object.values(n.addresses).flat();assert.equal(new Set(addresses).size,7);
  assert.deepEqual(n.addresses,{U2:[0x58],HSD1:[0x60,0x61],HSD2:[0x62,0x63],HSD3:[0x64,0x65]});
  assert.equal(n.watchdog.channel,4);assert.equal(n.watchdog.address,0x64);assert.equal(n.watchdog.return_delay,65535);
  assert.equal(n.watchdog.qualified,false);assert.equal(n.status,'BENCH_DESIGN_HOLD_H1_H5');
  return { pins:pins.size,wires:n.wires.length };
}
test('Revision D: every declared terminal and every external wire has a consistent topology',()=>audit(base));
test('Revision D removes only the external temperature branch from Revision C',()=>{
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-c/netlist.json')));
  const removed=new Set(['TS1','TS2','R10','C3','C6']);
  const retained=pin=>!removed.has(pin.split('.')[0])&&pin!=='U1.D7';
  assert.deepEqual(Object.keys(old.components).filter(r=>!removed.has(r)),Object.keys(base.components));
  const connections=n=>n.wires.filter(w=>retained(w.from)&&retained(w.to)).map(({net,from,to})=>[net,from,to]);
  assert.deepEqual(connections(base),connections(old));
  for(const [net,v] of Object.entries(old.nets)){
    const pins=v.pins.filter(retained);
    if(pins.length)assert.deepEqual(base.nets[net].pins,pins);
    else assert(!base.nets[net]);
  }
  assert.deepEqual(base.internal_connections,old.internal_connections);
  assert.deepEqual(base.addresses,old.addresses);
  assert.deepEqual(base.watchdog,old.watchdog);
});
function damage(label,fn) {test(`Audit rejects: ${label}`,()=>{const n=structuredClone(base);fn(n);assert.throws(()=>audit(n));});}
function bridge(n,a,b,net='0V') {n.wires.push({id:'BAD',net,from:a,to:b});n.nets[net].pins.push(a,b);}
damage('12 V on the meter supply',n=>bridge(n,'TB12.rail','FM1.RED','MACHINE_12V'));
damage('12 V on Arduino signal input',n=>bridge(n,'TB12.rail','U1.D2','MACHINE_12V'));
damage('coil supply tied to Nano 5 V',n=>bridge(n,'U4.3','TB5.rail','LOGIC_5V'));
damage('direct valve power bypassing watchdog',n=>bridge(n,'TB12.rail','V1.RED','MACHINE_12V'));
damage('relay signal contact bypassed',n=>bridge(n,'K1.3','K1.4','DAC_OUT'));
damage('two lamp colors joined',n=>bridge(n,'L1.BLUE','L1.WHITE','L1_BLUE'));
damage('missing meter ground conductor',n=>{n.wires=n.wires.filter(w=>w.to!=='FM1.BLACK');});
damage('flyback diode reversed',n=>{for(const w of n.wires){if(w.to==='D4.K')w.to='D4.A';else if(w.to==='D4.A')w.to='D4.K';}});
damage('duplicate I2C address pair',n=>{n.addresses.HSD3=[0x62,0x63];});
damage('extra HSD I2C pull-ups enabled',n=>{n.jumper_configuration.HSD2.SJSDA=true;});
damage('a spare lamp-animation pin used for the watchdog',n=>{n.watchdog.channel=7;});
damage('unknown/misspelled terminal',n=>{n.wires[0].to='U1.NOT_A_PIN';});
damage('floating ADC bias omitted',n=>{n.wires=n.wires.filter(w=>w.to!=='R5.2');});
damage('unused relay NC contact wired',n=>bridge(n,'K1.2','V1.GREEN','VALVE_COMMAND'));
damage('input resistor value reduced to 100 ohms',n=>{n.components.R1.resistance_ohms=100;});
damage('input resistor power rating too small',n=>{n.components.R1.power_w=.125;});
test('analog scaling and component dissipation bounds are consistent with the stated design',()=>{
  assert.equal(Math.round(4/20*65535),13107);assert.equal(Math.round(12/20*65535),39321);
  assert.equal(Math.round(20/20*65535),65535);
  const R=ref=>base.components[ref].resistance_ohms;
  const attenuation=R('R5')/(R('R4')+R('R5'));
  assert(Math.abs(.004*120*attenuation-.4752475)<1e-6);
  assert(Math.abs(.020*120*attenuation-2.3762376)<1e-6);
  const minimumExternal=R('R1')*.99;
  const current=(16-1)/(minimumExternal+209), power=current*current*minimumExternal;
  assert(current<.013);assert(power<.17);assert(power<base.components.R1.power_w/2);
  assert(5/R('R6')<.004); // Meter output test-current limit is 4 mA.
  assert(1000/(.8473*4700)>250e-3); // ns/ohms -> nF: ~251 pF.
  assert(Math.abs(111/500*60-13.32)<1e-9);
  assert.equal(2*112+2*16,256,'Proposed persistence allocation fits Nano Every EEPROM exactly');
});
