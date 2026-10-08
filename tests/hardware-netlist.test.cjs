const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, '../hardware/rev-g/netlist.json')));

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
  const rails = ['TB12.rail','TB5.rail','TB0.rail'];
  for(let i=0;i<rails.length;i++) for(let j=i+1;j<rails.length;j++) separate(rails[i],rails[j]);
  expect('IN.12V','TB12.rail');expect('IN.0V','TB0.rail');expect('U1.VIN','TB12.rail');expect('U1.5V','TB5.rail');
  for(const p of ['A0','A4','A5','D2','D3','D4','D7','D8','D9','3V3']) separate('U1.'+p,'TB12.rail');
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
  expect('U2.SDA','U1.A4');expect('U2.SCL','U1.A5');separate('U1.A4','U1.A5');
  expect('U2.GND','U2.OUT_GND');expect('U2.OUT_GND','V1.WHITE');expect('U3.I-','V1.WHITE');
  separate('U2.OUT','U1.A0');separate('U2.OUT','TB5.rail');
  expect('U2.OUT','V1.GREEN');expect('V1.YELLOW','U3.I+');
  expect('V1.RED','TB12.rail');separate('HSD3.CH4','V1.RED');
  for(const p of ['HSD3.CH4','HSD3.CH5','HSD3.CH6','HSD3.CH7','U1.RESET1','U1.RESET2'])assert(nc.has(p));
  for(const r of ['Q1','R11','R12','X1'])assert(!n.components[r]);
  assert.equal(n.components.IN.kind,'wire_boundary');
  expect('U3.SIGNAL','R4.1');expect('R4.2','U1.A0');expect('R5.1','U1.A0');expect('C1.1','U1.A0');
  expect('R5.2','TB0.rail');expect('C1.2','TB0.rail');separate('U3.SIGNAL','U1.A0');
  for (const [i,o,input,output,pin] of [[1,'O1','IN1','OUT1','D2'],[2,'O1','IN2','OUT2','D3'],[3,'O2','IN1','OUT1','D4']]) {
    expect(`IN.${['G','H','J'][i-1]}`,`R${i}.1`);expect(`R${i}.2`,`${o}.${input}`);expect(`D${i}.K`,`${o}.${input}`);
    expect(`D${i}.A`,'TB0.rail');expect(`${o}.${output}`,`U1.${pin}`);expect(`${o}.HV`,'TB5.rail');
    separate(`IN.${['G','H','J'][i-1]}`,`${o}.${input}`);separate(`IN.${['G','H','J'][i-1]}`,`U1.${pin}`);
  }
  for(const pin of ['D7','D8','D9']) assert(nc.has('U1.'+pin),`Unused ${pin} must remain unconnected`);
  for(const ref of ['TS1','TS2','R10','C3','C6','FM1','R6','R7','R8','R9','C2','K1','U4','D4','C4','C5']) assert(!n.components[ref], 'Removed component '+ref);
  assert(!Object.keys(n.nets).some(net=>net.startsWith('FLOW')), 'No flow-acquisition nets in Revision E');
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
  assert.deepEqual(n.watchdog,{type:'ATmega4809_internal',timeout_ms_proposed:2048,external:false,qualified:false});
  assert.equal(n.watchdog.qualified,false);assert.equal(n.status,'BENCH_DESIGN_HOLD_H1_H5');
  return { pins:pins.size,wires:n.wires.length };
}
test('Revision G: every declared terminal and every external wire has a consistent topology',()=>audit(base));
test('Revision D removes only the external temperature branch from Revision C',()=>{
  const base=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-d/netlist.json')));
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
test('Revision E removes only the meter branch and preserves all retained wire IDs',()=>{
  const base=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-e/netlist.json')));
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-d/netlist.json')));
  const removed=new Set(['FM1','R6','R7','R8','R9','C2']);
  const retained=pin=>!removed.has(pin.split('.')[0])&&!['U1.D8','U1.D9'].includes(pin);
  assert.deepEqual(Object.keys(base.components),Object.keys(old.components).filter(r=>!removed.has(r)));
  for(const [ref,c] of Object.entries(base.components))assert.deepEqual(c,old.components[ref]);
  assert.deepEqual(base.wires,old.wires.filter(w=>retained(w.from)&&retained(w.to)));
  for(const [name,net] of Object.entries(old.nets)){
    const pins=net.pins.filter(retained);
    if(pins.length)assert.deepEqual(base.nets[name],{...net,pins});
    else assert(!base.nets[name]);
  }
  for(const field of ['internal_connections','addresses','watchdog','relay','lamp_channels','jumper_configuration'])assert.deepEqual(base[field],old[field]);
  assert.deepEqual(new Set(base.no_connect),new Set([...old.no_connect,'U1.D8','U1.D9']));
  assert.deepEqual(base.pullups,{SDA:old.pullups.SDA,SCL:old.pullups.SCL});
});
function damage(label,fn) {test(`Audit rejects: ${label}`,()=>{const n=structuredClone(base);fn(n);assert.throws(()=>audit(n));});}
function bridge(n,a,b,net='0V') {n.wires.push({id:'BAD',net,from:a,to:b});n.nets[net].pins.push(a,b);}
damage('removed meter input D8 accidentally connected',n=>bridge(n,'U1.D8','TB5.rail','LOGIC_5V'));
damage('12 V on Arduino signal input',n=>bridge(n,'TB12.rail','U1.D2','MACHINE_12V'));
damage('reset tied to 12 V',n=>bridge(n,'U1.RESET1','TB12.rail','MACHINE_12V'));
damage('12 V HSD output connected directly to RESET',n=>bridge(n,'HSD3.CH4','U1.RESET1','0V'));
damage('two lamp colors joined',n=>bridge(n,'L1.BLUE','L1.WHITE','L1_BLUE'));
damage('missing position receiver ground conductor',n=>{n.wires=n.wires.filter(w=>w.to!=='U3.GND');});
damage('duplicate I2C address pair',n=>{n.addresses.HSD3=[0x62,0x63];});
damage('extra HSD I2C pull-ups enabled',n=>{n.jumper_configuration.HSD2.SJSDA=true;});
damage('unknown/misspelled terminal',n=>{n.wires[0].to='U1.NOT_A_PIN';});
damage('floating ADC bias omitted',n=>{n.wires=n.wires.filter(w=>w.to!=='R5.2');});
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
  assert(1000/(.8473*4700)>250e-3); // ns/ohms -> nF: ~251 pF.
  assert(2*24<=256,'Two transactional firmware records fit Nano Every EEPROM');
});

test('Revision F removes only the relay branch, changes three valve wires, and adds host reset',()=>{
  const base=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-f/netlist.json')));
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-e/netlist.json')));
  const removed=new Set(['K1','U4','D4','C4','C5']);
  assert.deepEqual(Object.keys(base.components).sort(),[...Object.keys(old.components).filter(r=>!removed.has(r)),'Q1','R11','R12'].sort());
  const changed=new Set(['W086','W095','W097']);
  for(const w of old.wires){
    if(removed.has(w.from.split('.')[0])||removed.has(w.to.split('.')[0]))continue;
    if(!changed.has(w.id))assert.deepEqual(base.wires.find(x=>x.id===w.id),w);
  }
  assert.deepEqual(base.addresses,old.addresses);assert.deepEqual(base.lamp_channels,old.lamp_channels);
  assert.deepEqual(base.jumper_configuration,old.jumper_configuration);
  assert.equal(base.wires.filter(w=>Number(w.id.slice(1))>=127).length,6);
});
test('host reset has base drive at 9 V, leakage margin, and resistor thermal margin at 16 V',()=>{
  const b=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-f/netlist.json'))).components;
  const minDrive=(9-.85)/(b.R11.resistance_ohms*1.05)-.85/(b.R12.resistance_ohms*.99);
  assert(minDrive>.0007); // >700 uA available; RESET pull-up load is about 50 uA.
  assert(minDrive*10>5/100000); // conservative forced beta of 10 after capacitor discharge.
  const seriesPower=(16-.65)**2/(b.R11.resistance_ohms*.95);
  assert(seriesPower<b.R11.power_w/4);
  assert(.85**2/(b.R12.resistance_ohms*.99)<b.R12.power_w/100);
  assert(100e-6*b.R12.resistance_ohms*1.01<.2); // conservative 100 uA off-leak assumption.
});

damage('external watchdog restored without approval',n=>{n.watchdog.external=true;});
damage('spare HSD3 channel assigned to a load',n=>bridge(n,'HSD3.CH4','L1.BLUE','L1_BLUE'));
test('Revision G removes only external reset components and renames the five incoming endpoints',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../hardware/rev-f/netlist.json')));
 const removed=new Set(['Q1','R11','R12']);
 const renamed={'X1.1':'IN.12V','X1.2':'IN.0V','X1.3':'IN.G','X1.4':'IN.H','X1.5':'IN.J'};
 const wires=old.wires.filter(w=>!removed.has(w.from.split('.')[0])&&!removed.has(w.to.split('.')[0])).map(w=>({...w,from:renamed[w.from]||w.from,to:renamed[w.to]||w.to}));
 assert.deepEqual(base.wires,wires);assert.equal(base.wires.length,102);assert.equal(Object.keys(base.components).length,38);
 for(const [r,c] of Object.entries(base.components))if(r!=='IN')assert.deepEqual(c,old.components[r]);
 for(const f of ['addresses','lamp_channels','jumper_configuration','pullups'])assert.deepEqual(base[f],old[f]);
});
